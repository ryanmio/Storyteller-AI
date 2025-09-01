-- Prefer a grant that still has quota when multiple exist

create or replace function public.check_and_consume_story(p_device_id text, p_ip text default null, p_ua text default null)
returns table(allowed boolean, reason text, was_free boolean, grant_id uuid)
language plpgsql
security definer
as $$
declare
  v_grant record;
  v_now date := (now() at time zone 'utc')::date;
  v_month_start date;
  v_month_end date;
  v_updated_id uuid;
  v_free_cap int := 2; -- keep same as previous migration, adjust as needed
  v_recent_devices int := 0;
  v_has_device boolean := false;
begin
  -- Choose best grant: non-revoked, active code, and order by likely availability
  select dg.*, ac.*
  into v_grant
  from public.device_grants dg
  join public.access_codes ac on ac.id = dg.code_id
  where dg.device_id = p_device_id and dg.revoked = false and ac.status = 'active'
  order by
    case when ac.type = 'pack' then coalesce(dg.pack_remaining, 0) else 1 end desc,
    case when ac.type = 'monthly' then coalesce(ac.monthly_quota - dg.used_in_period, 0) else 1 end desc,
    dg.created_at asc
  limit 1;

  if found then
    if v_grant.type = 'pack' then
      update public.device_grants
      set pack_remaining = pack_remaining - 1
      where id = v_grant.id and pack_remaining > 0
      returning id into v_updated_id;
      if v_updated_id is not null then
        return query select true, null::text, false, v_updated_id; return;
      else
        return query select false, 'quota_exhausted', false, v_grant.id::uuid; return;
      end if;
    else
      if v_grant.period_start is null or v_grant.period_end is null or v_now >= v_grant.period_end then
        select period_start, period_end into v_month_start, v_month_end from public._month_bounds_utc(now());
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
      returning dg.id into v_updated_id;
      if v_updated_id is not null then
        return query select true, null::text, false, v_updated_id; return;
      else
        return query select false, 'quota_exhausted', false, v_grant.id::uuid; return;
      end if;
    end if;
  end if;

  -- Free path with soft throttle (same behavior)
  select exists(select 1 from public.devices d where d.device_id = p_device_id) into v_has_device;
  if not v_has_device then
    if p_ip is not null and p_ua is not null then
      select count(*) into v_recent_devices
      from public.devices d
      where d.first_ip = p_ip and d.first_ua = p_ua and d.created_at >= (now() - interval '30 days');
    end if;
    if v_recent_devices >= v_free_cap then
      return query select false, 'free_throttled', false, null::uuid; return;
    end if;
    insert into public.devices(device_id, free_used, first_ip, first_ua)
    values (p_device_id, true, p_ip, p_ua)
    on conflict (device_id) do nothing;
    return query select true, null::text, true, null::uuid; return;
  end if;

  update public.devices
  set free_used = true
  where device_id = p_device_id and free_used = false;
  if found then
    return query select true, null::text, true, null::uuid; return;
  end if;

  return query select false, 'free_used_and_no_access', false, null::uuid; return;
end;
$$;


