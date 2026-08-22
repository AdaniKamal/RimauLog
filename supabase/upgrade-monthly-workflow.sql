-- Non-destructive V8 upgrade: custom meeting requests within mentor availability.
create table if not exists public.meeting_requests (
  id uuid primary key default gen_random_uuid(),
  availability_id uuid not null references public.availability_slots(id) on delete cascade,
  mentor_id uuid not null references public.profiles(id),
  mentee_id uuid not null references public.profiles(id),
  requested_start timestamptz not null,
  requested_end timestamptz not null,
  status text not null default 'requested' check(status in ('requested','confirmed','declined','cancelled')),
  created_at timestamptz not null default now(),
  check(requested_end>requested_start)
);
alter table public.meeting_requests enable row level security;
drop policy if exists "participants read meeting requests" on public.meeting_requests;
create policy "participants read meeting requests" on public.meeting_requests for select using
  (public.is_approved() and (mentor_id=auth.uid() or mentee_id=auth.uid()));
drop policy if exists "students create meeting requests" on public.meeting_requests;
create policy "students create meeting requests" on public.meeting_requests for insert with check
  (public.is_approved() and mentee_id=auth.uid() and exists(
    select 1 from public.availability_slots a join public.profiles p on p.id=auth.uid()
    where a.id=availability_id and a.mentor_id=p.mentor_id and a.status='free'
      and requested_start>=a.starts_at and requested_end<=a.ends_at));
drop policy if exists "mentors manage meeting requests" on public.meeting_requests;
create policy "mentors manage meeting requests" on public.meeting_requests for all using
  (public.is_mentor() and mentor_id=auth.uid()) with check(public.is_mentor() and mentor_id=auth.uid());
drop policy if exists "students cancel meeting requests" on public.meeting_requests;
create policy "students cancel meeting requests" on public.meeting_requests for update using
  (mentee_id=auth.uid()) with check(mentee_id=auth.uid() and status='cancelled');

create or replace function public.validate_meeting_request() returns trigger
language plpgsql security definer set search_path='' as $$
declare a public.availability_slots%rowtype;
begin
 select * into a from public.availability_slots where id=new.availability_id;
 if a.id is null or new.mentor_id<>a.mentor_id or new.requested_start<a.starts_at or new.requested_end>a.ends_at
 then raise exception 'Request must remain inside the selected free slot'; end if;
 if exists(select 1 from public.meeting_requests r where r.id<>new.id and r.mentor_id=new.mentor_id
   and r.status in ('requested','confirmed') and tstzrange(r.requested_start,r.requested_end,'[)') && tstzrange(new.requested_start,new.requested_end,'[)'))
 then raise exception 'This time overlaps another request'; end if;
 return new;
end; $$;
drop trigger if exists validate_meeting_request on public.meeting_requests;
create trigger validate_meeting_request before insert or update on public.meeting_requests
for each row execute function public.validate_meeting_request();

create or replace function public.protect_student_meeting_request() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid()=old.mentee_id and (
   new.availability_id is distinct from old.availability_id or new.mentor_id is distinct from old.mentor_id or
   new.mentee_id is distinct from old.mentee_id or new.requested_start is distinct from old.requested_start or
   new.requested_end is distinct from old.requested_end or new.status<>'cancelled'
 ) then raise exception 'Students may only cancel their own unchanged request'; end if;
 return new;
end; $$;
drop trigger if exists protect_student_meeting_request on public.meeting_requests;
create trigger protect_student_meeting_request before update on public.meeting_requests
for each row execute function public.protect_student_meeting_request();

drop policy if exists "mentors read assigned student notes" on public.notes;
create policy "mentors read assigned student notes" on public.notes for select using
  (public.is_mentor() and exists(select 1 from public.profiles p where p.id=notes.mentee_id and p.mentor_id=auth.uid()));
do $$ begin alter publication supabase_realtime add table public.meeting_requests;
exception when duplicate_object then null; end $$;
