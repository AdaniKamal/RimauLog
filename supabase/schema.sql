-- RimauLog database schema for Supabase
create extension if not exists pgcrypto;

create type public.user_role as enum ('mentor', 'student');
create type public.task_status as enum ('not_started', 'in_progress', 'submitted', 'revision_requested', 'completed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.user_role not null default 'student',
  approved boolean not null default false,
  mentor_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role public.user_role not null default 'student',
  invited_by uuid references public.profiles(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare pending public.invitations%rowtype;
begin
  select * into pending from public.invitations where lower(email) = lower(new.email) limit 1;
  insert into public.profiles (id, email, full_name, role, approved, mentor_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(pending.role, 'student'::public.user_role),
    pending.id is not null,
    pending.invited_by
  );
  if pending.id is not null then
    update public.invitations set accepted_at = now() where id = pending.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles(id),
  mentee_id uuid not null references public.profiles(id),
  session_number integer not null,
  title text not null,
  scheduled_at timestamptz,
  status text not null default 'planned',
  topics text,
  learning_outcomes text,
  knowledge_gaps text,
  mentor_feedback text,
  mentee_reflection text,
  next_session_plan text,
  created_at timestamptz not null default now(),
  unique(mentee_id, session_number)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles(id),
  mentee_id uuid not null references public.profiles(id),
  session_id uuid references public.sessions(id) on delete set null,
  title text not null,
  objective text,
  instructions text,
  due_at timestamptz,
  status public.task_status not null default 'not_started',
  evidence_url text,
  mentee_reflection text,
  mentor_feedback text,
  created_at timestamptz not null default now()
);

create table public.competencies (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles(id),
  mentee_id uuid not null references public.profiles(id),
  name text not null,
  level text not null default 'not_assessed',
  progress integer not null default 0 check (progress between 0 and 100),
  evidence_url text,
  mentor_comment text,
  updated_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id),
  mentee_id uuid not null references public.profiles(id),
  session_id uuid references public.sessions(id) on delete set null,
  title text not null,
  body_markdown text not null default '',
  updated_at timestamptz not null default now(),
  unique(author_id, title)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id),
  mentee_id uuid not null references public.profiles(id),
  session_id uuid references public.sessions(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  check (session_id is not null or assignment_id is not null)
);

alter table public.profiles enable row level security;
alter table public.invitations enable row level security;
alter table public.sessions enable row level security;
alter table public.assignments enable row level security;
alter table public.competencies enable row level security;
alter table public.notes enable row level security;
alter table public.comments enable row level security;

create function public.is_approved() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and approved = true);
$$;

create function public.is_mentor() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'mentor' and approved = true);
$$;

create policy "approved users read own profile" on public.profiles for select using
  (public.is_approved() and (id = auth.uid() or mentor_id = auth.uid() or public.is_mentor()));
create policy "mentors manage profiles" on public.profiles for all using (public.is_mentor()) with check (public.is_mentor());
create policy "mentors manage invitations" on public.invitations for all using (public.is_mentor()) with check (public.is_mentor());

create policy "participants read sessions" on public.sessions for select using
  (public.is_approved() and (mentor_id = auth.uid() or mentee_id = auth.uid()));
create policy "mentors manage sessions" on public.sessions for all using
  (public.is_mentor() and mentor_id = auth.uid()) with check (public.is_mentor() and mentor_id = auth.uid());

create policy "participants read assignments" on public.assignments for select using
  (public.is_approved() and (mentor_id = auth.uid() or mentee_id = auth.uid()));
create policy "mentors manage assignments" on public.assignments for all using
  (public.is_mentor() and mentor_id = auth.uid()) with check (public.is_mentor() and mentor_id = auth.uid());
create policy "students update own assignments" on public.assignments for update using
  (public.is_approved() and mentee_id = auth.uid());

create policy "participants read competencies" on public.competencies for select using
  (public.is_approved() and (mentor_id = auth.uid() or mentee_id = auth.uid()));
create policy "mentors manage competencies" on public.competencies for all using
  (public.is_mentor() and mentor_id = auth.uid()) with check (public.is_mentor() and mentor_id = auth.uid());

create policy "participants manage notes" on public.notes for all using
  (public.is_approved() and (author_id = auth.uid() or mentee_id = auth.uid()))
  with check (public.is_approved() and author_id = auth.uid());
create policy "participants manage comments" on public.comments for all using
  (public.is_approved() and (author_id = auth.uid() or mentee_id = auth.uid() or public.is_mentor()))
  with check (public.is_approved() and author_id = auth.uid());

-- Bootstrap the owner before the first Google login. Change this email if needed.
insert into public.invitations (email, role)
values ('adanikamal@gmail.com', 'mentor')
on conflict (email) do update set role = excluded.role;

alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.assignments;
alter publication supabase_realtime add table public.notes;
alter publication supabase_realtime add table public.comments;
