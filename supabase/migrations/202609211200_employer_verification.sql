begin;

do $$
begin
  if to_regtype('public.employer_status') is null then
    create type public.employer_status as enum ('pending', 'approved', 'suspended', 'revoked');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'employer_status'
  ) then
    alter table public.profiles add column employer_status public.employer_status;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'company_name'
  ) then
    alter table public.profiles add column company_name text check (company_name is null or char_length(company_name) between 2 and 150);
  end if;
end
$$;

create or replace function public.handle_new_employer()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'employer' and new.employer_status is null then
    new.employer_status := 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists set_employer_status_trigger on public.profiles;
create trigger set_employer_status_trigger
before insert or update on public.profiles
for each row execute function public.handle_new_employer();

create or replace function public.is_approved_employer()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'employer' and employer_status = 'approved'
  )
$$;

grant execute on function public.is_approved_employer() to authenticated;

commit;