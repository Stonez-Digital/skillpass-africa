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

  if target.employer_status = new_status then
    return target;
  end if;

  update public.profiles
  set employer_status = new_status, updated_at = now()
  where id = target_user_id
  returning * into updated;

  if new_status in ('suspended', 'revoked') then
    update public.opportunities
    set is_published = false, updated_at = now()
    where employer_id = target_user_id
      and is_published = true;
  end if;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, description, metadata)
  values (
    actor,
    'administrator',
    'ADMIN_ACTION',
    'profile',
    target_user_id,
    'Administrator changed employer verification status from ' || coalesce(target.employer_status::text, 'none') || ' to ' || new_status::text || '.',
    jsonb_build_object('previous_status', target.employer_status, 'new_status', new_status)
  );

  return updated;
end;
$$;

commit;