-- Fix check_and_consume_story to always return a row (use RETURN QUERY)

create or replace function public.check_and_consume_story(p_device_id text)
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
begin
  -- Try to find an active, non-revoked grant
  select dg.*, ac.*
  into v_grant
  from public.device_grants dg
  join public.access_codes ac on ac.id = dg.code_id
  where dg.device_id = p_device_id and dg.revoked = false and ac.status = 'active'
  limit 1;

  if found then
    if v_grant.type = 'pack' then
      update public.device_grants
      set pack_remaining = pack_remaining - 1
      where id = v_grant.id and pack_remaining > 0
      returning id into v_updated_id;

      if v_updated_id is not null then
        return query select true, null::text, false, v_updated_id;
        return;
      else
        return query select false, 'quota_exhausted', false, v_grant.id::uuid;
        return;
      end if;
    else
      -- monthly: rollover if needed, then increment if under quota
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
        return query select true, null::text, false, v_updated_id;
        return;
      else
        return query select false, 'quota_exhausted', false, v_grant.id::uuid;
        return;
      end if;
    end if;
  end if;

  -- No grant: consume one-time free if available
  update public.devices
  set free_used = true
  where device_id = p_device_id and free_used = false;

  if found then
    return query select true, null::text, true, null::uuid;
    return;
  end if;

  -- If device row did not exist, create and grant free now
  if not exists(select 1 from public.devices where device_id = p_device_id) then
    insert into public.devices(device_id, free_used)
    values (p_device_id, true);
    return query select true, null::text, true, null::uuid;
    return;
  end if;

  -- Otherwise, blocked
  return query select false, 'free_used_and_no_access', false, null::uuid;
  return;
end;
$$;


