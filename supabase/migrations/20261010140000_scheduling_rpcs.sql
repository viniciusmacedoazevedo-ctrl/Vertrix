-- Atomic replacement helpers. SECURITY INVOKER: RLS policies of the caller apply,
-- so only owners/admins of the professional's organization can use them.

create or replace function public.replace_working_hours(p_professional_id uuid, p_rows jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select organization_id into v_org from public.professionals where id = p_professional_id;
  if v_org is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 50 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  delete from public.working_hours where professional_id = p_professional_id;
  insert into public.working_hours (organization_id, professional_id, weekday, start_time, end_time)
  select v_org, p_professional_id, (r ->> 'weekday')::smallint, (r ->> 'start')::time, (r ->> 'end')::time
  from jsonb_array_elements(p_rows) r;
end;
$$;

create or replace function public.set_professional_services(p_professional_id uuid, p_service_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select organization_id into v_org from public.professionals where id = p_professional_id;
  if v_org is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  delete from public.professional_services where professional_id = p_professional_id;
  insert into public.professional_services (organization_id, professional_id, service_id)
  select v_org, p_professional_id, s from unnest(coalesce(p_service_ids, '{}')) s;
end;
$$;

revoke all on function public.replace_working_hours(uuid, jsonb) from public;
revoke all on function public.set_professional_services(uuid, uuid[]) from public;
grant execute on function public.replace_working_hours(uuid, jsonb) to authenticated;
grant execute on function public.set_professional_services(uuid, uuid[]) to authenticated;
