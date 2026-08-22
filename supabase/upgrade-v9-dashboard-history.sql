-- RimauLog V9: report-card history for ordered mentoring records.
-- Run once after the V8 monthly workflow migration.

create table if not exists public.progress_report_history (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles(id),
  mentee_id uuid not null references public.profiles(id),
  objective_target text,
  latest_student_update text,
  mentor_comment text,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  created_at timestamptz not null default now()
);

create index if not exists progress_report_history_mentee_created_idx
  on public.progress_report_history (mentee_id, created_at desc);

alter table public.progress_report_history enable row level security;

drop policy if exists "participants read report history" on public.progress_report_history;
create policy "participants read report history"
  on public.progress_report_history for select using (
    public.is_approved() and (mentor_id = auth.uid() or mentee_id = auth.uid())
  );

drop policy if exists "mentors create report history" on public.progress_report_history;
create policy "mentors create report history"
  on public.progress_report_history for insert with check (
    public.is_mentor() and mentor_id = auth.uid() and
    exists (
      select 1 from public.profiles p
      where p.id = mentee_id and p.mentor_id = auth.uid()
    )
  );

do $$ begin
  alter publication supabase_realtime add table public.progress_report_history;
exception when duplicate_object then null; end $$;
