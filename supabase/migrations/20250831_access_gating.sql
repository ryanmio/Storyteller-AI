-- Access gating schema and RPCs
-- Run with: supabase db push (or your CI migration runner)

-- Extensions (for gen_random_uuid)
create extension if not exists pgcrypto;

-- Enums
do $$ begin
  create type public.access_code_type as enum ('pack','monthly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.access_code_status as enum ('active','revoked');
exception when duplicate_object then null; end $$;

-- Devices: tracks one-time free usage and basic fingerprint
create table if not exists public.devices (
  device_id text primary key,
  free_used boolean not null default false,
  created_at timestamptz not null default now(),
  first_ip text,
  first_ua text
);

-- Access codes: represents purchasable entitlements
create table if not exists public.access_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type public.access_code_type not null,
  status public.access_code_status not null default 'active',
  pack_uses integer,
  monthly_quota integer,
  max_devices integer not null default 1,
  created_at timestamptz not null default now(),
  check ((type = 'pack' and pack_uses is not null and pack_uses > 0) or (type = 'monthly' and monthly_quota is not null and monthly_quota > 0))
);

-- Device grants: binds a code to a device and holds quota state
create table if not exists public.device_grants (
  id uuid primary key default gen_random_uuid(),
  device_id text not null references public.devices(device_id) on delete cascade,
  code_id uuid not null references public.access_codes(id) on delete cascade,
  revoked boolean not null default false,
  -- For pack codes
  pack_remaining integer,
  -- For monthly codes
  period_start date,
  period_end date,
  used_in_period integer not null default 0,
  created_at timestamptz not null default now(),
  unique (device_id, code_id)
);

create index if not exists idx_device_grants_device on public.device_grants(device_id);
create index if not exists idx_device_grants_code on public.device_grants(code_id);
create index if not exists idx_device_grants_revoked on public.device_grants(revoked);

-- Helper: get current UTC month period [start, end)
create or replace function public._month_bounds_utc(now_ts timestamptz)
returns table (period_start date, period_end date)
language sql stable as $$
  select date_trunc('month', now_ts at time zone 'utc')::date as period_start,
         (date_trunc('month', now_ts at time zone 'utc') + interval '1 month')::date as period_end;
$$;

-- RPC: Redeem a code for a device. Returns grant id.
create or replace function public.redeem_code(p_device_id text, p_code_text text, p_ip text default null, p_ua text default null)
returns uuid
language plpgsql
security definer
as $$
declare
  v_code record;
  v_grant_id uuid;
  v_device_exists boolean;
  v_active_grants int;
  v_period_start date;
  v_period_end date;
begin
  -- Load and validate code
  select * into v_code from public.access_codes where code = p_code_text;
  if not found then
    raise exception 'invalid_code';
  end if;
  if v_code.status <> 'active' then
    raise exception 'code_revoked';
  end if;

  -- Ensure device exists; set fingerprint on first sight
  select exists(select 1 from public.devices d where d.device_id = p_device_id) into v_device_exists;
  if not v_device_exists then
    insert into public.devices(device_id, first_ip, first_ua)
    values (p_device_id, p_ip, p_ua)
    on conflict (device_id) do nothing;
  end if;

  -- Enforce max devices per code (count active grants)
  select count(*) into v_active_grants
  from public.device_grants dg
  where dg.code_id = v_code.id and dg.revoked = false;
  if v_active_grants >= coalesce(v_code.max_devices, 1) then
    raise exception 'max_devices_reached';
  end if;

  -- Idempotent: if a grant already exists for this device and code, return it
  select id into v_grant_id from public.device_grants where device_id = p_device_id and code_id = v_code.id;
  if v_grant_id is not null then
    return v_grant_id;
  end if;

  -- Initialize monthly period if needed
  if v_code.type = 'monthly' then
    select * into v_period_start, v_period_end from public._month_bounds_utc(now());
  end if;

  -- Create grant with initial quotas
  insert into public.device_grants(device_id, code_id, pack_remaining, period_start, period_end, used_in_period)
  values (
    p_device_id,
    v_code.id,
    case when v_code.type = 'pack' then v_code.pack_uses else null end,
    case when v_code.type = 'monthly' then v_period_start else null end,
    case when v_code.type = 'monthly' then v_period_end else null end,
    0
  ) returning id into v_grant_id;

  return v_grant_id;
end;
$$;

-- RPC: Check and consume a single story usage. Enforces grants or one-time free.
-- Returns: allowed, reason, was_free, grant_id
create or replace function public.check_and_consume_story(p_device_id text)
returns table(allowed boolean, reason text, was_free boolean, grant_id uuid)
language plpgsql
security definer
as $$
declare
  v_grant record;
  v_code record;
  v_now date := (now() at time zone 'utc')::date;
  v_month_start date;
  v_month_end date;
begin
  -- Try to find an active, non-revoked grant
  select dg.*, ac.*
  into v_grant
  from public.device_grants dg
  join public.access_codes ac on ac.id = dg.code_id
  where dg.device_id = p_device_id and dg.revoked = false and ac.status = 'active'
  limit 1;

  if found then
    -- Enforce quota by type
    if v_grant.type = 'pack' then
      update public.device_grants
      set pack_remaining = pack_remaining - 1
      where id = v_grant.id and pack_remaining > 0
      returning id into grant_id;

      if grant_id is not null then
        allowed := true; reason := null; was_free := false; return;
      else
        allowed := false; reason := 'quota_exhausted'; was_free := false; grant_id := v_grant.id; return;
      end if;
    else
      -- monthly: rollover if needed, then increment if under quota
      if v_grant.period_start is null or v_grant.period_end is null or v_now >= v_grant.period_end then
        select * into v_month_start, v_month_end from public._month_bounds_utc(now());
        update public.device_grants
        set period_start = v_month_start,
            period_end = v_month_end,
            used_in_period = 0
        where id = v_grant.id;
      end if;

      update public.device_grants dg
      set used_in_period = used_in_period + 1
      from public.access_codes ac
      where dg.id = v_grant.id
        and dg.code_id = ac.id
        and dg.used_in_period < ac.monthly_quota
      returning dg.id into grant_id;

      if grant_id is not null then
        allowed := true; reason := null; was_free := false; return;
      else
        allowed := false; reason := 'quota_exhausted'; was_free := false; grant_id := v_grant.id; return;
      end if;
    end if;
  end if;

  -- No grant: consume one-time free if available
  update public.devices
  set free_used = true
  where device_id = p_device_id and free_used = false
  returning null::uuid into grant_id; -- no grant id for free

  if found then
    allowed := true; reason := null; was_free := true; return;
  end if;

  -- If device row did not exist, create and grant free now
  if not exists(select 1 from public.devices where device_id = p_device_id) then
    insert into public.devices(device_id, free_used)
    values (p_device_id, true);
    allowed := true; reason := null; was_free := true; grant_id := null; return;
  end if;

  -- Otherwise, blocked
  allowed := false; reason := 'free_used_and_no_access'; was_free := false; grant_id := null; return;
end;
$$;

-- Enable RLS (admin/service role will bypass during server checks)
alter table public.devices enable row level security;
alter table public.access_codes enable row level security;
alter table public.device_grants enable row level security;

-- No public policies added; server should use service role for RPCs.


