-- Run this once if the original RimauLog schema is already installed.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare pending public.invitations%rowtype;
begin
  select * into pending from public.invitations where lower(email) = lower(new.email) limit 1;
  insert into public.profiles (id, email, full_name, role, approved, mentor_id)
  values (new.id,new.email,coalesce(new.raw_user_meta_data ->> 'full_name',new.raw_user_meta_data ->> 'name'),coalesce(pending.role,'student'::public.user_role),pending.id is not null,pending.invited_by)
  on conflict (id) do update set full_name=excluded.full_name,approved=excluded.approved,mentor_id=excluded.mentor_id;
  return new;
end;
$$;

-- Invitations previously marked accepted merely because Auth created the user
-- are returned to Pending. The app marks them Accepted after a real sign-in.
update public.invitations set accepted_at = null where role = 'student';
