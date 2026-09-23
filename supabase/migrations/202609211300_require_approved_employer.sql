drop policy if exists "Approved employers can create opportunities" on public.opportunities;

create policy "Approved employers can create opportunities"
on public.opportunities for insert to authenticated
with check (
  employer_id = auth.uid()
  and public.is_approved_employer()
);