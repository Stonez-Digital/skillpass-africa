begin;

create or replace function public.admin_update_employer_status(
  target_user_id uuid,
  new_status public.employer_status
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target public.profiles;
  updated public.profiles;
begin
  if actor is null or not public.is_administrator() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;

  select * into target from public.profiles where id = target_user_id for update;
  if target.id is null then raise exception 'User not found.' using errcode = 'P0002'; end if;
  if target.role <> 'employer' then raise exception 'Target user is not an employer.' using errcode = '42501'; end if;

  update public.profiles
  set employer_status = new_status, updated_at = now()
  where id = target_user_id
  returning * into updated;

  return updated;
end;
$$;

revoke all on function public.admin_update_employer_status(uuid, public.employer_status) from public, anon;
grant execute on function public.admin_update_employer_status(uuid, public.employer_status) to authenticated;

commit;