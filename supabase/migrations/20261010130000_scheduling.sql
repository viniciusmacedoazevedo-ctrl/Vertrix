-- =============================================================================
-- VELTRIX — scheduling module (services, professionals, working hours,
-- appointments and public booking). Generic for any appointment-based business.
-- =============================================================================

create extension if not exists btree_gist with schema extensions;

create type public.appointment_status as enum ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');

alter type public.activity_type add value if not exists 'appointment_created';
alter type public.activity_type add value if not exists 'appointment_status_changed';
alter type public.activity_type add value if not exists 'appointment_rescheduled';

-- Public booking settings per organization.
alter table public.organizations
  add column booking_enabled boolean not null default false,
  add column booking_slot_interval_minutes integer not null default 30
    check (booking_slot_interval_minutes in (5, 10, 15, 20, 30, 60)),
  add column booking_min_notice_minutes integer not null default 120
    check (booking_min_notice_minutes between 0 and 10080),
  add column booking_max_days_ahead integer not null default 30
    check (booking_max_days_ahead between 1 and 365);

-- ---------------------------------------------------------------------------
-- Services & professionals
-- ---------------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text check (char_length(description) <= 1000),
  duration_minutes integer not null check (duration_minutes between 5 and 720),
  price numeric(12, 2) check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);
create index services_org_idx on public.services (organization_id, active);
create trigger services_updated_at before update on public.services
  for each row execute function private.set_updated_at();

create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  email text check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (char_length(phone) <= 40),
  -- Optional link to a platform user (future: professionals log in to see their own agenda).
  user_id uuid references auth.users (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);
create index professionals_org_idx on public.professionals (organization_id, active);
create trigger professionals_updated_at before update on public.professionals
  for each row execute function private.set_updated_at();

create table public.professional_services (
  organization_id uuid not null,
  professional_id uuid not null,
  service_id uuid not null,
  primary key (professional_id, service_id),
  foreign key (organization_id, professional_id)
    references public.professionals (organization_id, id) on delete cascade,
  foreign key (organization_id, service_id)
    references public.services (organization_id, id) on delete cascade
);
create index professional_services_service_idx on public.professional_services (organization_id, service_id);

-- Weekly availability. Several rows per weekday express breaks (e.g. 09–12 and 13–18).
create table public.working_hours (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  professional_id uuid not null,
  weekday smallint not null check (weekday between 1 and 7), -- ISO: 1 = Monday … 7 = Sunday
  start_time time not null,
  end_time time not null,
  check (start_time < end_time),
  foreign key (organization_id, professional_id)
    references public.professionals (organization_id, id) on delete cascade,
  constraint working_hours_no_overlap exclude using gist (
    professional_id with =,
    weekday with =,
    int4range(
      (extract(hour from start_time) * 60 + extract(minute from start_time))::integer,
      (extract(hour from end_time) * 60 + extract(minute from end_time))::integer
    ) with &&
  )
);
create index working_hours_professional_idx on public.working_hours (organization_id, professional_id, weekday);

-- One-off unavailability (vacation, appointments outside the platform, etc.).
create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  professional_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text check (char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  check (starts_at < ends_at),
  foreign key (organization_id, professional_id)
    references public.professionals (organization_id, id) on delete cascade
);
create index time_off_professional_idx on public.time_off (organization_id, professional_id, starts_at);

-- ---------------------------------------------------------------------------
-- Appointments
-- ---------------------------------------------------------------------------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null,
  professional_id uuid not null,
  service_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'scheduled',
  price numeric(12, 2) check (price >= 0),
  notes text check (char_length(notes) <= 2000),
  source text not null default 'internal' check (source in ('internal', 'public_booking')),
  cancelled_at timestamptz,
  cancellation_reason text check (char_length(cancellation_reason) <= 500),
  idempotency_key text check (char_length(idempotency_key) between 8 and 80),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (ends_at - starts_at <= interval '12 hours'),
  unique (organization_id, id),
  unique (organization_id, idempotency_key),
  foreign key (organization_id, customer_id) references public.customers (organization_id, id),
  foreign key (organization_id, professional_id) references public.professionals (organization_id, id),
  foreign key (organization_id, service_id) references public.services (organization_id, id),
  -- Database-level guarantee: a professional can never be double-booked.
  constraint appointments_no_overlap exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status <> 'cancelled')
);
create index appointments_org_starts_idx on public.appointments (organization_id, starts_at);
create index appointments_org_customer_idx on public.appointments (organization_id, customer_id, starts_at desc);
create index appointments_org_professional_idx on public.appointments (organization_id, professional_id, starts_at);

create or replace function private.appointment_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'cancelled' then
    if tg_op = 'INSERT' or old.status <> 'cancelled' then
      new.cancelled_at := now();
    end if;
  else
    new.cancelled_at := null;
    new.cancellation_reason := null;
  end if;
  return new;
end;
$$;
create trigger appointments_before_write before insert or update on public.appointments
  for each row execute function private.appointment_before_write();
create trigger appointments_updated_at before update on public.appointments
  for each row execute function private.set_updated_at();
create trigger appointments_created_by before insert on public.appointments
  for each row execute function private.set_created_by();

alter table public.activities add column appointment_id uuid;
alter table public.activities add constraint activities_appointment_fk
  foreign key (organization_id, appointment_id)
  references public.appointments (organization_id, id) on delete set null (appointment_id);
create index activities_org_appointment_idx on public.activities (organization_id, appointment_id);

create or replace function private.appointments_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activities (organization_id, actor_id, type, customer_id, appointment_id, metadata)
    values (new.organization_id, auth.uid(), 'appointment_created', new.customer_id, new.id,
      jsonb_build_object('starts_at', new.starts_at, 'source', new.source));
  elsif old.status is distinct from new.status then
    insert into public.activities (organization_id, actor_id, type, customer_id, appointment_id, metadata)
    values (new.organization_id, auth.uid(), 'appointment_status_changed', new.customer_id, new.id,
      jsonb_build_object('from', old.status, 'to', new.status));
  elsif old.starts_at is distinct from new.starts_at or old.professional_id is distinct from new.professional_id then
    insert into public.activities (organization_id, actor_id, type, customer_id, appointment_id, metadata)
    values (new.organization_id, auth.uid(), 'appointment_rescheduled', new.customer_id, new.id,
      jsonb_build_object('from', old.starts_at, 'to', new.starts_at));
  end if;
  return null;
end;
$$;
create trigger appointments_activity after insert or update on public.appointments
  for each row execute function private.appointments_activity();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.services enable row level security;
alter table public.professionals enable row level security;
alter table public.professional_services enable row level security;
alter table public.working_hours enable row level security;
alter table public.time_off enable row level security;
alter table public.appointments enable row level security;

-- Members read and operate; configuration (services, professionals, hours) is
-- managed by owners/admins.
create policy services_select on public.services for select to authenticated
  using (private.is_org_member(organization_id));
create policy services_write on public.services for all to authenticated
  using (private.has_org_role(organization_id, array['owner', 'admin']::public.member_role[]))
  with check (private.has_org_role(organization_id, array['owner', 'admin']::public.member_role[]));

create policy professionals_select on public.professionals for select to authenticated
  using (private.is_org_member(organization_id));
create policy professionals_write on public.professionals for all to authenticated
  using (private.has_org_role(organization_id, array['owner', 'admin']::public.member_role[]))
  with check (private.has_org_role(organization_id, array['owner', 'admin']::public.member_role[]));

create policy professional_services_select on public.professional_services for select to authenticated
  using (private.is_org_member(organization_id));
create policy professional_services_write on public.professional_services for all to authenticated
  using (private.has_org_role(organization_id, array['owner', 'admin']::public.member_role[]))
  with check (private.has_org_role(organization_id, array['owner', 'admin']::public.member_role[]));

create policy working_hours_select on public.working_hours for select to authenticated
  using (private.is_org_member(organization_id));
create policy working_hours_write on public.working_hours for all to authenticated
  using (private.has_org_role(organization_id, array['owner', 'admin']::public.member_role[]))
  with check (private.has_org_role(organization_id, array['owner', 'admin']::public.member_role[]));

create policy time_off_select on public.time_off for select to authenticated
  using (private.is_org_member(organization_id));
create policy time_off_write on public.time_off for all to authenticated
  using (private.is_org_member(organization_id))
  with check (private.is_org_member(organization_id));

create policy appointments_select on public.appointments for select to authenticated
  using (private.is_org_member(organization_id));
create policy appointments_insert on public.appointments for insert to authenticated
  with check (private.is_org_member(organization_id));
create policy appointments_update on public.appointments for update to authenticated
  using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));
-- No delete policy: appointments are cancelled, never erased (keeps history and reports honest).

revoke all on public.services, public.professionals, public.professional_services,
  public.working_hours, public.time_off, public.appointments from anon;

-- ---------------------------------------------------------------------------
-- Public booking RPCs (callable by anonymous visitors). They expose only what a
-- booking page needs: no customer data, no notes, no other organization data.
-- ---------------------------------------------------------------------------
create or replace function private.booking_org(p_slug text)
returns public.organizations
language sql
stable
security definer
set search_path = ''
as $$
  select o.* from public.organizations o
  where o.slug = p_slug and o.booking_enabled and 'scheduling' = any (o.modules);
$$;
revoke all on function private.booking_org(text) from public;

create or replace function public.get_booking_page(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org public.organizations;
begin
  v_org := private.booking_org(p_slug);
  if v_org.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'organization', jsonb_build_object(
      'name', v_org.name, 'slug', v_org.slug, 'timezone', v_org.timezone, 'currency', v_org.currency,
      'locale', v_org.locale, 'slot_interval_minutes', v_org.booking_slot_interval_minutes,
      'min_notice_minutes', v_org.booking_min_notice_minutes, 'max_days_ahead', v_org.booking_max_days_ahead
    ),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'description', s.description,
        'duration_minutes', s.duration_minutes, 'price', s.price
      ) order by s.name)
      from public.services s
      where s.organization_id = v_org.id and s.active and exists (
        select 1 from public.professional_services ps
        join public.professionals p on p.id = ps.professional_id and p.active
        where ps.service_id = s.id
      )
    ), '[]'::jsonb),
    'professionals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name,
        'service_ids', (select coalesce(jsonb_agg(ps.service_id), '[]'::jsonb)
                        from public.professional_services ps where ps.professional_id = p.id)
      ) order by p.name)
      from public.professionals p
      where p.organization_id = v_org.id and p.active
    ), '[]'::jsonb)
  );
end;
$$;

-- Working hours + busy intervals for one professional in a window (max 14 days).
create or replace function public.get_booking_schedule(p_slug text, p_professional_id uuid, p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org public.organizations;
begin
  v_org := private.booking_org(p_slug);
  if v_org.id is null or p_to <= p_from or p_to - p_from > interval '14 days' then
    return null;
  end if;
  if not exists (select 1 from public.professionals where id = p_professional_id and organization_id = v_org.id and active) then
    return null;
  end if;

  return jsonb_build_object(
    'working_hours', coalesce((
      select jsonb_agg(jsonb_build_object('weekday', w.weekday, 'start_time', w.start_time, 'end_time', w.end_time))
      from public.working_hours w
      where w.organization_id = v_org.id and w.professional_id = p_professional_id
    ), '[]'::jsonb),
    'busy', coalesce((
      select jsonb_agg(jsonb_build_object('starts_at', b.starts_at, 'ends_at', b.ends_at))
      from (
        select a.starts_at, a.ends_at from public.appointments a
        where a.organization_id = v_org.id and a.professional_id = p_professional_id
          and a.status <> 'cancelled' and a.starts_at < p_to and a.ends_at > p_from
        union all
        select t.starts_at, t.ends_at from public.time_off t
        where t.organization_id = v_org.id and t.professional_id = p_professional_id
          and t.starts_at < p_to and t.ends_at > p_from
      ) b
    ), '[]'::jsonb)
  );
end;
$$;

-- Validates that [p_start, p_end) fits inside the professional's working hours,
-- outside time off. Shared by public booking and internal checks.
create or replace function private.slot_within_working_hours(
  p_org uuid, p_professional uuid, p_tz text, p_start timestamptz, p_end timestamptz
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_local_start timestamp := p_start at time zone p_tz;
  v_local_end timestamp := p_end at time zone p_tz;
  -- Minutes since local midnight of the start day (end may equal 1440 = midnight).
  v_start_min numeric := extract(epoch from (v_local_start - date_trunc('day', v_local_start))) / 60;
  v_end_min numeric := extract(epoch from (v_local_end - date_trunc('day', v_local_start))) / 60;
begin
  if v_end_min > 1440 then
    return false; -- appointments may not cross local midnight
  end if;
  if not exists (
    select 1 from public.working_hours w
    where w.organization_id = p_org and w.professional_id = p_professional
      and w.weekday = extract(isodow from v_local_start)
      and extract(epoch from w.start_time) / 60 <= v_start_min
      and extract(epoch from w.end_time) / 60 >= v_end_min
  ) then
    return false;
  end if;
  return not exists (
    select 1 from public.time_off t
    where t.organization_id = p_org and t.professional_id = p_professional
      and t.starts_at < p_end and t.ends_at > p_start
  );
end;
$$;
revoke all on function private.slot_within_working_hours(uuid, uuid, text, timestamptz, timestamptz) from public;

create or replace function public.create_public_booking(
  p_slug text,
  p_service_id uuid,
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_full_name text,
  p_email text,
  p_phone text,
  p_notes text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_org public.organizations;
  v_service public.services;
  v_ends_at timestamptz;
  v_customer uuid;
  v_appointment public.appointments;
  v_email text := lower(nullif(btrim(p_email), ''));
begin
  v_org := private.booking_org(p_slug);
  if v_org.id is null then
    raise exception 'booking_unavailable' using errcode = 'P0002';
  end if;

  -- Idempotency: replaying the same request returns the original booking.
  select * into v_appointment from public.appointments
  where organization_id = v_org.id and idempotency_key = p_idempotency_key;
  if v_appointment.id is not null then
    return jsonb_build_object('id', v_appointment.id, 'starts_at', v_appointment.starts_at,
      'ends_at', v_appointment.ends_at, 'replayed', true);
  end if;

  if char_length(btrim(coalesce(p_full_name, ''))) not between 2 and 160
     or v_email is null or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254
     or char_length(coalesce(p_phone, '')) > 40 or char_length(coalesce(p_notes, '')) > 500
     or p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 80 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  -- Abuse protection: per organization and per e-mail.
  if not private.consume_rate_limit('booking:org:' || v_org.id::text, 60, 3600)
     or not private.consume_rate_limit('booking:email:' || v_org.id::text || ':' || v_email, 3, 3600) then
    raise exception 'rate_limited' using errcode = '54000';
  end if;

  select s.* into v_service from public.services s
  where s.id = p_service_id and s.organization_id = v_org.id and s.active
    and exists (
      select 1 from public.professional_services ps
      join public.professionals p on p.id = ps.professional_id and p.active
      where ps.service_id = s.id and ps.professional_id = p_professional_id
    );
  if v_service.id is null then
    raise exception 'invalid_service' using errcode = '22023';
  end if;

  v_ends_at := p_starts_at + make_interval(mins => v_service.duration_minutes);

  if p_starts_at < now() + make_interval(mins => v_org.booking_min_notice_minutes)
     or p_starts_at > now() + make_interval(days => v_org.booking_max_days_ahead) then
    raise exception 'slot_out_of_range' using errcode = '22023';
  end if;

  if not private.slot_within_working_hours(v_org.id, p_professional_id, v_org.timezone, p_starts_at, v_ends_at) then
    raise exception 'slot_unavailable' using errcode = '23P01';
  end if;

  -- Match an existing active customer by e-mail; never overwrite their data.
  select c.id into v_customer from public.customers c
  where c.organization_id = v_org.id and lower(c.email) = v_email and c.archived_at is null
  limit 1;
  if v_customer is null then
    insert into public.customers (organization_id, full_name, email, phone, source)
    values (v_org.id, btrim(p_full_name), v_email, nullif(btrim(p_phone), ''), 'booking_page')
    returning id into v_customer;
  end if;

  begin
    insert into public.appointments (
      organization_id, customer_id, professional_id, service_id, starts_at, ends_at,
      status, price, notes, source, idempotency_key
    ) values (
      v_org.id, v_customer, p_professional_id, v_service.id, p_starts_at, v_ends_at,
      'scheduled', v_service.price, nullif(btrim(p_notes), ''), 'public_booking', p_idempotency_key
    ) returning * into v_appointment;
  exception when exclusion_violation then
    raise exception 'slot_unavailable' using errcode = '23P01';
  end;

  return jsonb_build_object('id', v_appointment.id, 'starts_at', v_appointment.starts_at,
    'ends_at', v_appointment.ends_at, 'replayed', false);
end;
$$;

revoke all on function public.get_booking_page(text) from public;
revoke all on function public.get_booking_schedule(text, uuid, timestamptz, timestamptz) from public;
revoke all on function public.create_public_booking(text, uuid, uuid, timestamptz, text, text, text, text, text) from public;
grant execute on function public.get_booking_page(text) to anon, authenticated;
grant execute on function public.get_booking_schedule(text, uuid, timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.create_public_booking(text, uuid, uuid, timestamptz, text, text, text, text, text) to anon, authenticated;
