-- Non-destructive RimauLog upgrade. Existing records are preserved.
alter table public.profiles add column if not exists mentorship_start date;
alter table public.profiles add column if not exists mentorship_end date;
alter table public.profiles add column if not exists calendar_booking_url text;

alter table public.assignments add column if not exists resource_url text;
alter table public.assignments add column if not exists completed_at timestamptz;

alter table public.notes add column if not exists proposed_body_markdown text;
alter table public.notes add column if not exists proposed_by uuid references public.profiles(id);
alter table public.notes add column if not exists proposal_status text not null default 'none'
  check (proposal_status in ('none','pending','accepted','rejected'));

create table if not exists public.progress_reports (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles(id),
  mentee_id uuid not null references public.profiles(id),
  objective_target text,
  latest_student_update text,
  mentor_comment text,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  updated_at timestamptz not null default now(),
  unique (mentee_id)
);

create table if not exists public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'free' check (status in ('free','requested','confirmed','blocked')),
  booked_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

alter table public.progress_reports enable row level security;
alter table public.availability_slots enable row level security;

drop policy if exists "participants read progress reports" on public.progress_reports;
create policy "participants read progress reports" on public.progress_reports for select using
  (public.is_approved() and (mentor_id=auth.uid() or mentee_id=auth.uid()));
drop policy if exists "mentors manage progress reports" on public.progress_reports;
create policy "mentors manage progress reports" on public.progress_reports for all using
  (public.is_mentor() and mentor_id=auth.uid()) with check (public.is_mentor() and mentor_id=auth.uid());

drop policy if exists "participants read availability" on public.availability_slots;
create policy "participants read availability" on public.availability_slots for select using
  (public.is_approved() and (mentor_id=auth.uid() or booked_by=auth.uid() or
   (status='free' and exists(select 1 from public.profiles p where p.id=auth.uid() and p.mentor_id=availability_slots.mentor_id))));
drop policy if exists "mentors manage availability" on public.availability_slots;
create policy "mentors manage availability" on public.availability_slots for all using
  (public.is_mentor() and mentor_id=auth.uid()) with check (public.is_mentor() and mentor_id=auth.uid());
drop policy if exists "students request availability" on public.availability_slots;
create policy "students request availability" on public.availability_slots for update using
  (public.is_approved() and status='free') with check (booked_by=auth.uid() and status='requested');

drop policy if exists "mentors propose note edits" on public.notes;
create policy "mentors propose note edits" on public.notes for update using
  (public.is_mentor() and exists(select 1 from public.profiles p where p.id=notes.mentee_id and p.mentor_id=auth.uid()));

create or replace function public.protect_student_assignment_fields() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid()=old.mentee_id and (
   new.title is distinct from old.title or new.objective is distinct from old.objective or
   new.instructions is distinct from old.instructions or new.due_at is distinct from old.due_at or
   new.resource_url is distinct from old.resource_url or new.mentor_feedback is distinct from old.mentor_feedback
 ) then raise exception 'Students may only update assignment completion fields'; end if;
 if auth.uid()=old.mentee_id and new.status not in ('not_started','in_progress','completed') then
   raise exception 'Invalid student assignment status'; end if;
 return new;
end; $$;
drop trigger if exists protect_student_assignment_fields on public.assignments;
create trigger protect_student_assignment_fields before update on public.assignments
for each row execute function public.protect_student_assignment_fields();

create or replace function public.protect_student_slot_request() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid()<>old.mentor_id and (
   new.mentor_id is distinct from old.mentor_id or new.starts_at is distinct from old.starts_at or
   new.ends_at is distinct from old.ends_at or old.status<>'free' or new.status<>'requested' or
   new.booked_by is distinct from auth.uid()
 ) then raise exception 'Students may only request an unchanged free slot'; end if;
 return new;
end; $$;
drop trigger if exists protect_student_slot_request on public.availability_slots;
create trigger protect_student_slot_request before update on public.availability_slots
for each row execute function public.protect_student_slot_request();

create or replace function public.protect_student_note_content() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid()<>old.author_id and (
   new.title is distinct from old.title or new.body_markdown is distinct from old.body_markdown or
   new.mentee_id is distinct from old.mentee_id or new.author_id is distinct from old.author_id
 ) then raise exception 'Mentors must propose edits; student-authored content cannot be overwritten'; end if;
 return new;
end; $$;
drop trigger if exists protect_student_note_content on public.notes;
create trigger protect_student_note_content before update on public.notes
for each row execute function public.protect_student_note_content();

do $$ begin
 alter publication supabase_realtime add table public.progress_reports;
exception when duplicate_object then null; end $$;
do $$ begin
 alter publication supabase_realtime add table public.availability_slots;
exception when duplicate_object then null; end $$;
