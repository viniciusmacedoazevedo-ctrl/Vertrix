-- =============================================================================
-- VELTRIX — core schema
-- Multi-tenant model: every business row carries organization_id and is protected
-- by Row Level Security. Cross-tenant references are prevented by composite
-- foreign keys (organization_id, id) so a row can never point to another
-- organization's data, even if a client forges an identifier.
-- =============================================================================

create schema if not exists extensions;
create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.member_role as enum ('owner', 'admin', 'member');
create type public.opportunity_stage as enum ('new', 'in_conversation', 'proposal_sent', 'negotiation', 'won', 'lost');
create type public.priority_level as enum ('low', 'medium', 'high');
create type public.task_status as enum ('open', 'done');
create type public.activity_type as enum (
  'note',
  'customer_created', 'customer_updated', 'customer_archived', 'customer_restored',
  'opportunity_created', 'opportunity_stage_changed',
  'task_created', 'task_completed', 'task_reopened'
);
create type public.ai_message_role as enum ('user', 'assistant');

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Forces created_by to the authenticated user so clients cannot impersonate.
create or replace function private.set_created_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

create or replace function private.validate_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'invalid_timezone' using errcode = '22023';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Organizations & membership
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{1,46}[a-z0-9])$'),
  segment text not null default 'professional_services' check (segment in (
    'it_services', 'consulting', 'agency', 'professional_services', 'beauty_wellness',
    'health', 'education', 'retail', 'other'
  )),
  country text not null default 'BR' check (country ~ '^[A-Z]{2}$'),
  locale text not null default 'pt-BR' check (locale in ('pt-BR', 'en')),
  currency text not null default 'BRL' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'America/Sao_Paulo',
  modules text[] not null default array['sales']
    check (cardinality(modules) >= 1 and modules <@ array['sales', 'scheduling']),
  followup_stale_days integer not null default 7 check (followup_stale_days between 1 and 90),
  -- Subscription plan placeholder. Billing is NOT implemented; limits live in src/lib/plans.ts.
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_updated_at before update on public.organizations
  for each row execute function private.set_updated_at();
create trigger organizations_timezone before insert or update of timezone on public.organizations
  for each row execute function private.validate_timezone();

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members (user_id);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  locale text check (locale in ('pt-BR', 'en')),
  current_organization_id uuid references public.organizations (id) on delete set null,
  preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(preferences) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- Authorization helpers. SECURITY DEFINER so they can read membership without
-- recursive RLS evaluation; they only ever answer for auth.uid().
create or replace function private.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_org and m.user_id = auth.uid()
  );
$$;

create or replace function private.has_org_role(p_org uuid, p_roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_org and m.user_id = auth.uid() and m.role = any (p_roles)
  );
$$;

revoke all on function private.is_org_member(uuid) from public;
revoke all on function private.has_org_role(uuid, public.member_role[]) from public;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_role(uuid, public.member_role[]) to authenticated;

-- A user may only point current_organization_id at an organization they belong to.
create or replace function private.check_profile_current_org()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.current_organization_id is not null
     and new.current_organization_id is distinct from old.current_organization_id
     and not private.is_org_member(new.current_organization_id) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger profiles_current_org before update of current_organization_id on public.profiles
  for each row execute function private.check_profile_current_org();

-- Create a profile row for every new auth user.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 120))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 160),
  company_name text check (char_length(company_name) <= 160),
  email text check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (char_length(phone) <= 40),
  source text check (source in (
    'referral', 'website', 'social', 'event', 'outbound', 'inbound_call', 'walk_in', 'booking_page', 'other'
  )),
  notes text check (char_length(notes) <= 5000),
  archived_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);
create unique index customers_org_email_active_key
  on public.customers (organization_id, lower(email))
  where email is not null and archived_at is null;
create index customers_org_created_idx on public.customers (organization_id, created_at desc);
create index customers_org_name_idx on public.customers (organization_id, lower(full_name));

create trigger customers_updated_at before update on public.customers
  for each row execute function private.set_updated_at();
create trigger customers_created_by before insert on public.customers
  for each row execute function private.set_created_by();

-- ---------------------------------------------------------------------------
-- Opportunities
-- ---------------------------------------------------------------------------
create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  estimated_value numeric(14, 2) check (estimated_value >= 0),
  stage public.opportunity_stage not null default 'new',
  priority public.priority_level not null default 'medium',
  last_interaction_at timestamptz not null default now(),
  next_action text check (char_length(next_action) <= 500),
  follow_up_on date,
  notes text check (char_length(notes) <= 5000),
  owner_id uuid references auth.users (id) on delete set null,
  closed_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, customer_id) references public.customers (organization_id, id) on delete cascade
);
create index opportunities_org_stage_idx on public.opportunities (organization_id, stage);
create index opportunities_org_follow_up_idx on public.opportunities (organization_id, follow_up_on);
create index opportunities_org_last_interaction_idx on public.opportunities (organization_id, last_interaction_at);
create index opportunities_org_customer_idx on public.opportunities (organization_id, customer_id);

create or replace function private.opportunity_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id is not null and not exists (
    select 1 from public.organization_members m
    where m.organization_id = new.organization_id and m.user_id = new.owner_id
  ) then
    raise exception 'owner_not_member' using errcode = '23503';
  end if;

  if new.stage in ('won', 'lost') then
    if tg_op = 'INSERT' or old.stage not in ('won', 'lost') then
      new.closed_at := now();
    end if;
  else
    new.closed_at := null;
  end if;
  return new;
end;
$$;
create trigger opportunities_before_write before insert or update on public.opportunities
  for each row execute function private.opportunity_before_write();
create trigger opportunities_updated_at before update on public.opportunities
  for each row execute function private.set_updated_at();
create trigger opportunities_created_by before insert on public.opportunities
  for each row execute function private.set_created_by();

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text check (char_length(description) <= 5000),
  due_at timestamptz,
  priority public.priority_level not null default 'medium',
  status public.task_status not null default 'open',
  completed_at timestamptz,
  customer_id uuid,
  opportunity_id uuid,
  assignee_id uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, customer_id)
    references public.customers (organization_id, id) on delete set null (customer_id),
  foreign key (organization_id, opportunity_id)
    references public.opportunities (organization_id, id) on delete set null (opportunity_id)
);
create index tasks_org_status_due_idx on public.tasks (organization_id, status, due_at);
create index tasks_org_customer_idx on public.tasks (organization_id, customer_id);
create index tasks_org_opportunity_idx on public.tasks (organization_id, opportunity_id);

create or replace function private.task_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.assignee_id is not null and not exists (
    select 1 from public.organization_members m
    where m.organization_id = new.organization_id and m.user_id = new.assignee_id
  ) then
    raise exception 'assignee_not_member' using errcode = '23503';
  end if;

  if new.status = 'done' then
    if tg_op = 'INSERT' or old.status <> 'done' then
      new.completed_at := now();
    end if;
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;
create trigger tasks_before_write before insert or update on public.tasks
  for each row execute function private.task_before_write();
create trigger tasks_updated_at before update on public.tasks
  for each row execute function private.set_updated_at();
create trigger tasks_created_by before insert on public.tasks
  for each row execute function private.set_created_by();

-- ---------------------------------------------------------------------------
-- Activities (business timeline). Immutable once written.
-- ---------------------------------------------------------------------------
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_id uuid default auth.uid() references auth.users (id) on delete set null,
  type public.activity_type not null,
  customer_id uuid,
  opportunity_id uuid,
  task_id uuid,
  body text check (char_length(body) <= 5000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (organization_id, customer_id)
    references public.customers (organization_id, id) on delete cascade,
  foreign key (organization_id, opportunity_id)
    references public.opportunities (organization_id, id) on delete set null (opportunity_id),
  foreign key (organization_id, task_id)
    references public.tasks (organization_id, id) on delete set null (task_id)
);
create index activities_org_created_idx on public.activities (organization_id, created_at desc);
create index activities_org_customer_idx on public.activities (organization_id, customer_id, created_at desc);
create index activities_org_opportunity_idx on public.activities (organization_id, opportunity_id, created_at desc);

-- Automatic timeline entries (SECURITY DEFINER: the business write was already authorized by RLS).
create or replace function private.log_activity(
  p_org uuid, p_type public.activity_type, p_customer uuid, p_opportunity uuid, p_task uuid,
  p_body text, p_metadata jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.activities (organization_id, actor_id, type, customer_id, opportunity_id, task_id, body, metadata)
  values (p_org, auth.uid(), p_type, p_customer, p_opportunity, p_task, p_body, coalesce(p_metadata, '{}'::jsonb));
$$;
revoke all on function private.log_activity(uuid, public.activity_type, uuid, uuid, uuid, text, jsonb) from public;

create or replace function private.customers_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.log_activity(new.organization_id, 'customer_created', new.id, null, null, new.full_name, null);
  elsif old.archived_at is null and new.archived_at is not null then
    perform private.log_activity(new.organization_id, 'customer_archived', new.id, null, null, null, null);
  elsif old.archived_at is not null and new.archived_at is null then
    perform private.log_activity(new.organization_id, 'customer_restored', new.id, null, null, null, null);
  elsif (old.full_name, old.company_name, old.email, old.phone, old.source, old.notes)
        is distinct from (new.full_name, new.company_name, new.email, new.phone, new.source, new.notes) then
    perform private.log_activity(new.organization_id, 'customer_updated', new.id, null, null, null, null);
  end if;
  return null;
end;
$$;
create trigger customers_activity after insert or update on public.customers
  for each row execute function private.customers_activity();

create or replace function private.opportunities_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.log_activity(new.organization_id, 'opportunity_created', new.customer_id, new.id, null, new.title,
      jsonb_build_object('stage', new.stage));
  elsif old.stage is distinct from new.stage then
    perform private.log_activity(new.organization_id, 'opportunity_stage_changed', new.customer_id, new.id, null, new.title,
      jsonb_build_object('from', old.stage, 'to', new.stage));
  end if;
  return null;
end;
$$;
create trigger opportunities_activity after insert or update on public.opportunities
  for each row execute function private.opportunities_activity();

create or replace function private.tasks_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.log_activity(new.organization_id, 'task_created', new.customer_id, new.opportunity_id, new.id, new.title, null);
  elsif old.status <> new.status then
    perform private.log_activity(new.organization_id,
      case when new.status = 'done' then 'task_completed'::public.activity_type else 'task_reopened'::public.activity_type end,
      new.customer_id, new.opportunity_id, new.id, new.title, null);
  end if;
  return null;
end;
$$;
create trigger tasks_activity after insert or update on public.tasks
  for each row execute function private.tasks_activity();

-- Interacting with an opportunity (a note) refreshes its last interaction date.
create or replace function private.activities_touch_opportunity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.type = 'note' and new.opportunity_id is not null then
    update public.opportunities set last_interaction_at = new.created_at
    where organization_id = new.organization_id and id = new.opportunity_id;
  end if;
  return null;
end;
$$;
create trigger activities_touch_opportunity after insert on public.activities
  for each row execute function private.activities_touch_opportunity();

-- ---------------------------------------------------------------------------
-- AI assistant history (private to each user inside their organization)
-- ---------------------------------------------------------------------------
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default '' check (char_length(title) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);
create index ai_conversations_user_idx on public.ai_conversations (organization_id, user_id, updated_at desc);
create trigger ai_conversations_updated_at before update on public.ai_conversations
  for each row execute function private.set_updated_at();

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  conversation_id uuid not null,
  role public.ai_message_role not null,
  content text not null check (char_length(content) between 1 and 100000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (organization_id, conversation_id)
    references public.ai_conversations (organization_id, id) on delete cascade
);
create index ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);
create index ai_messages_org_created_idx on public.ai_messages (organization_id, created_at);

-- ---------------------------------------------------------------------------
-- Audit log (security-relevant events)
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_id uuid default auth.uid() references auth.users (id) on delete set null,
  action text not null check (char_length(action) <= 80),
  entity_type text check (char_length(entity_type) <= 40),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Rate limiting (fixed window, stored in the database so it works across
-- serverless instances). Not exposed through the API.
-- ---------------------------------------------------------------------------
create table private.rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);

create or replace function private.consume_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into private.rate_limits as r (bucket, window_start, hits)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start) do update set hits = r.hits + 1
  returning hits into v_hits;

  -- Opportunistic cleanup of old windows.
  if random() < 0.01 then
    delete from private.rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_hits <= p_limit;
end;
$$;
revoke all on function private.consume_rate_limit(text, integer, integer) from public;

-- Authenticated callers can only consume buckets scoped to their own user id.
create or replace function public.consume_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_bucket !~ '^[a-z_:.-]{1,40}$' or p_limit < 1 or p_window_seconds not between 1 and 86400 then
    raise exception 'invalid_rate_limit' using errcode = '22023';
  end if;
  return private.consume_rate_limit(p_bucket || ':' || auth.uid()::text, p_limit, p_window_seconds);
end;
$$;
revoke all on function public.consume_rate_limit(text, integer, integer) from public;
grant execute on function public.consume_rate_limit(text, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Organization lifecycle RPCs
-- ---------------------------------------------------------------------------
-- The only way to create an organization: the caller becomes its owner.
-- Nobody can add themselves to an existing organization by changing an id.
create or replace function public.create_organization(
  p_name text,
  p_slug text,
  p_segment text,
  p_country text,
  p_locale text,
  p_currency text,
  p_timezone text,
  p_modules text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_slug text := p_slug;
  v_attempt integer := 0;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if (select count(*) from public.organization_members where user_id = v_uid and role = 'owner') >= 5 then
    raise exception 'organization_limit_reached' using errcode = '54000';
  end if;

  loop
    begin
      insert into public.organizations (name, slug, segment, country, locale, currency, timezone, modules)
      values (btrim(p_name), v_slug, p_segment, p_country, p_locale, p_currency, p_timezone, p_modules)
      returning id into v_org;
      exit;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      if v_attempt > 5 then
        raise exception 'slug_unavailable' using errcode = '23505';
      end if;
      v_slug := left(p_slug, 41) || '-' || substr(md5(random()::text), 1, 5);
    end;
  end loop;

  insert into public.organization_members (organization_id, user_id, role) values (v_org, v_uid, 'owner');
  insert into public.profiles (id) values (v_uid) on conflict (id) do nothing;
  update public.profiles set current_organization_id = v_org where id = v_uid;
  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id)
  values (v_org, v_uid, 'organization.created', 'organization', v_org);

  return v_org;
end;
$$;
revoke all on function public.create_organization(text, text, text, text, text, text, text, text[]) from public;
grant execute on function public.create_organization(text, text, text, text, text, text, text, text[]) to authenticated;

-- Permanently deletes an organization and all its data (owner only, name must match).
create or replace function public.delete_organization(p_org uuid, p_confirm_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_org_role(p_org, array['owner']::public.member_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.organizations where id = p_org and name = p_confirm_name) then
    raise exception 'confirmation_mismatch' using errcode = '22023';
  end if;
  delete from public.organizations where id = p_org;
end;
$$;
revoke all on function public.delete_organization(uuid, text) from public;
grant execute on function public.delete_organization(uuid, text) to authenticated;

-- Counts assistant usage for the whole organization (used for plan limits).
create or replace function public.ai_user_messages_since(p_org uuid, p_since timestamptz)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when private.is_org_member(p_org) then (
    select count(*)::integer from public.ai_messages
    where organization_id = p_org and role = 'user' and created_at >= p_since
  ) else 0 end;
$$;
revoke all on function public.ai_user_messages_since(uuid, timestamptz) from public;
grant execute on function public.ai_user_messages_since(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.opportunities enable row level security;
alter table public.tasks enable row level security;
alter table public.activities enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.audit_logs enable row level security;

-- organizations: members read; owners/admins update; create/delete only via RPC.
create policy organizations_select on public.organizations for select to authenticated
  using (private.is_org_member(id));
create policy organizations_update on public.organizations for update to authenticated
  using (private.has_org_role(id, array['owner', 'admin']::public.member_role[]))
  with check (private.has_org_role(id, array['owner', 'admin']::public.member_role[]));

-- organization_members: members can see who else belongs to their organization.
-- No insert/update/delete policies: membership changes only through SECURITY DEFINER RPCs.
create policy organization_members_select on public.organization_members for select to authenticated
  using (private.is_org_member(organization_id));

-- profiles: own profile + profiles of people in the same organization (names for assignment).
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.organization_members m
      where m.user_id = profiles.id and private.is_org_member(m.organization_id)
    )
  );
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Business tables: full access for members of the row's organization.
create policy customers_select on public.customers for select to authenticated
  using (private.is_org_member(organization_id));
create policy customers_insert on public.customers for insert to authenticated
  with check (private.is_org_member(organization_id));
create policy customers_update on public.customers for update to authenticated
  using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));
create policy customers_delete on public.customers for delete to authenticated
  using (private.has_org_role(organization_id, array['owner', 'admin']::public.member_role[]));

create policy opportunities_select on public.opportunities for select to authenticated
  using (private.is_org_member(organization_id));
create policy opportunities_insert on public.opportunities for insert to authenticated
  with check (private.is_org_member(organization_id));
create policy opportunities_update on public.opportunities for update to authenticated
  using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));
create policy opportunities_delete on public.opportunities for delete to authenticated
  using (private.has_org_role(organization_id, array['owner', 'admin']::public.member_role[]));

create policy tasks_select on public.tasks for select to authenticated
  using (private.is_org_member(organization_id));
create policy tasks_insert on public.tasks for insert to authenticated
  with check (private.is_org_member(organization_id));
create policy tasks_update on public.tasks for update to authenticated
  using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));
create policy tasks_delete on public.tasks for delete to authenticated
  using (private.is_org_member(organization_id));

create policy activities_select on public.activities for select to authenticated
  using (private.is_org_member(organization_id));
-- Manual entries (notes) only; automatic entries are written by triggers.
create policy activities_insert on public.activities for insert to authenticated
  with check (private.is_org_member(organization_id) and actor_id = auth.uid() and type = 'note');

create policy ai_conversations_select on public.ai_conversations for select to authenticated
  using (user_id = auth.uid() and private.is_org_member(organization_id));
create policy ai_conversations_insert on public.ai_conversations for insert to authenticated
  with check (user_id = auth.uid() and private.is_org_member(organization_id));
create policy ai_conversations_update on public.ai_conversations for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and private.is_org_member(organization_id));
create policy ai_conversations_delete on public.ai_conversations for delete to authenticated
  using (user_id = auth.uid());

create policy ai_messages_select on public.ai_messages for select to authenticated
  using (exists (
    select 1 from public.ai_conversations c
    where c.id = ai_messages.conversation_id and c.user_id = auth.uid()
  ));
create policy ai_messages_insert on public.ai_messages for insert to authenticated
  with check (exists (
    select 1 from public.ai_conversations c
    where c.id = ai_messages.conversation_id and c.organization_id = ai_messages.organization_id
      and c.user_id = auth.uid() and private.is_org_member(c.organization_id)
  ));

create policy audit_logs_select on public.audit_logs for select to authenticated
  using (private.has_org_role(organization_id, array['owner', 'admin']::public.member_role[]));
create policy audit_logs_insert on public.audit_logs for insert to authenticated
  with check (private.is_org_member(organization_id) and actor_id = auth.uid());

-- Anonymous visitors never read tables directly (public booking uses RPCs).
revoke all on all tables in schema public from anon;
