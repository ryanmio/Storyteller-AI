-- Access control schema for Storyteller-AI
-- Tables: access_codes, device_usage, device_codes
-- Functions: consume_free_story, consume_prepaid_use, consume_monthly_use

create extension if not exists pgcrypto;

-- access codes table
create table if not exists public.access_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'active' check (status in ('active','revoked')),
  kind text not null check (kind in ('prepaid','monthly')),
  allowed_uses integer,
  uses_total integer not null default 0,
  monthly_quota integer,
  period_start timestamptz,
  uses_in_period integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists access_codes_code_idx on public.access_codes (code);
create index if not exists access_codes_status_idx on public.access_codes (status);
create index if not exists access_codes_kind_idx on public.access_codes (kind);

-- update timestamp trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_timestamp_access_codes on public.access_codes;
create trigger set_timestamp_access_codes
before update on public.access_codes
for each row execute function public.set_updated_at();

-- device usage table to track free story per device
create table if not exists public.device_usage (
  device_id text primary key,
  free_used boolean not null default false,
  free_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_timestamp_device_usage on public.device_usage;
create trigger set_timestamp_device_usage
before update on public.device_usage
for each row execute function public.set_updated_at();

-- optional mapping table between devices and codes for observability
create table if not exists public.device_codes (
  device_id text not null,
  code_id uuid not null references public.access_codes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (device_id, code_id)
);

-- Function: consume free story atomically
create or replace function public.consume_free_story(p_device_id text)
returns boolean
language plpgsql
as $$
declare
  did_consume boolean := false;
begin
  -- Try insert as consumed on first seen device
  insert into public.device_usage(device_id, free_used, free_used_at)
  values (p_device_id, true, now())
  on conflict (device_id) do nothing;

  -- If already existed but not used, mark as used
  update public.device_usage
  set free_used = true, free_used_at = coalesce(free_used_at, now()), updated_at = now()
  where device_id = p_device_id and free_used = false;

  -- Determine if consumed
  select du.free_used into did_consume
  from public.device_usage du
  where du.device_id = p_device_id;

  return did_consume;
end;
$$;

-- Function: consume prepaid use atomically if quota remains
create or replace function public.consume_prepaid_use(p_code_id uuid)
returns boolean
language plpgsql
as $$
declare
  did_consume boolean := false;
begin
  update public.access_codes
  set uses_total = uses_total + 1
  where id = p_code_id
    and status = 'active'
    and kind = 'prepaid'
    and (allowed_uses is null or uses_total < allowed_uses);

  get diagnostics did_consume = row_count > 0;
  return did_consume;
end;
$$;

-- Function: consume monthly use, resetting period on month boundary
create or replace function public.consume_monthly_use(p_code_id uuid)
returns boolean
language plpgsql
as $$
declare
  did_consume boolean := false;
  v_month_start timestamptz := date_trunc('month', now());
begin
  -- Lock the row to avoid races
  update public.access_codes ac
  set 
    period_start = case when ac.period_start is null or ac.period_start < v_month_start then v_month_start else ac.period_start end,
    uses_in_period = case when ac.period_start is null or ac.period_start < v_month_start then 0 else ac.uses_in_period end
  where ac.id = p_code_id
    and ac.status = 'active'
    and ac.kind = 'monthly';

  -- Now attempt to consume within the period
  update public.access_codes ac
  set uses_in_period = ac.uses_in_period + 1
  where ac.id = p_code_id
    and ac.status = 'active'
    and ac.kind = 'monthly'
    and ac.monthly_quota is not null
    and ac.uses_in_period < ac.monthly_quota;

  get diagnostics did_consume = row_count > 0;
  return did_consume;
end;
$$;

