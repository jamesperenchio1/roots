-- Trigger price-alert notifications when a listing price changes.
-- Runs with SECURITY DEFINER so it can update alerts/notifications across users.
create or replace function public.check_price_alerts()
returns trigger
language plpgsql
security definer
as $$
declare
  alert_record record;
  condition_met boolean;
  species_name text;
begin
  -- Only active listings generate alerts.
  if NEW.status is not null and NEW.status != 'active' then
    return NEW;
  end if;

  species_name := coalesce(NEW.species_common_en, NEW.species_scientific, NEW.species_id);

  for alert_record in
    select *
    from public.price_alerts
    where species_id = NEW.species_id
      and (size_category is null or size_category = NEW.size_category)
  loop
    condition_met := case alert_record.direction
      when 'below' then NEW.price_thb <= alert_record.threshold_thb
      when 'above' then NEW.price_thb >= alert_record.threshold_thb
      else false
    end;

    if condition_met and alert_record.triggered_at is null then
      update public.price_alerts
        set triggered_at = now()
        where id = alert_record.id;

      insert into public.notifications (user_id, type, title, message, link, read, created_at)
      values (
        alert_record.user_id,
        'price_alert',
        'Price alert triggered',
        species_name || ' is now ' || NEW.price_thb || ' THB (' || alert_record.direction || ' your ' || alert_record.threshold_thb || ' THB alert).',
        '/species/' || NEW.species_id,
        false,
        now()
      );
    elsif not condition_met and alert_record.triggered_at is not null then
      update public.price_alerts
        set triggered_at = null
        where id = alert_record.id;
    end if;
  end loop;

  return NEW;
end;
$$;

-- Recreate trigger cleanly.
drop trigger if exists listings_price_alerts on public.listings;
create trigger listings_price_alerts
  after insert or update of price_thb on public.listings
  for each row
  execute function public.check_price_alerts();

-- Backfill: evaluate existing active listings once so current alerts notify immediately.
do $$
declare
  listing_record record;
  alert_record record;
  condition_met boolean;
  species_name text;
begin
  for listing_record in
    select * from public.listings where status = 'active' or status is null
  loop
    species_name := coalesce(listing_record.species_common_en, listing_record.species_scientific, listing_record.species_id);

    for alert_record in
      select *
      from public.price_alerts
      where species_id = listing_record.species_id
        and (size_category is null or size_category = listing_record.size_category)
    loop
      condition_met := case alert_record.direction
        when 'below' then listing_record.price_thb <= alert_record.threshold_thb
        when 'above' then listing_record.price_thb >= alert_record.threshold_thb
        else false
      end;

      if condition_met and alert_record.triggered_at is null then
        update public.price_alerts
          set triggered_at = now()
          where id = alert_record.id;

        insert into public.notifications (user_id, type, title, message, link, read, created_at)
        values (
          alert_record.user_id,
          'price_alert',
          'Price alert triggered',
          species_name || ' is now ' || listing_record.price_thb || ' THB (' || alert_record.direction || ' your ' || alert_record.threshold_thb || ' THB alert).',
          '/species/' || listing_record.species_id,
          false,
          now()
        );
      end if;
    end loop;
  end loop;
end $$;
