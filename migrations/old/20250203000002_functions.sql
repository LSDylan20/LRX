-- Function to get nearby carriers based on service areas
create or replace function get_nearby_carriers(
  origin text,
  destination text,
  equipment_type text,
  max_distance numeric default 100
) returns table (
  carrier_id uuid,
  distance numeric
) language plpgsql security definer as $$
begin
  return query
  select 
    cp.id as carrier_id,
    0 as distance -- TODO: Implement actual distance calculation
  from public.carrier_profiles cp
  where 
    cp.status = 'active'
    and equipment_type = any(cp.equipment_types)
    and exists (
      select 1 from jsonb_array_elements(cp.service_areas) as area
      where (area->>'state')::text in (
        -- TODO: Implement actual area matching
        select unnest(array[origin, destination])
      )
    );
end;
$$;

-- Function to calculate shipment price
create or replace function calculate_shipment_price(
  distance numeric,
  weight numeric,
  equipment_type text,
  special_requirements text[] default array[]::text[]
) returns numeric language plpgsql security definer as $$
declare
  base_rate numeric;
  weight_factor numeric;
  special_factor numeric;
begin
  -- Base rate per mile
  base_rate := case equipment_type
    when 'flatbed' then 2.5
    when 'reefer' then 3.0
    when 'van' then 2.0
    else 2.0
  end;

  -- Weight factor
  weight_factor := case
    when weight <= 10000 then 1.0
    when weight <= 20000 then 1.2
    when weight <= 30000 then 1.4
    else 1.6
  end;

  -- Special requirements factor
  special_factor := 1.0 + (array_length(special_requirements, 1)::numeric * 0.1);

  return (distance * base_rate * weight_factor * special_factor)::numeric(10,2);
end;
$$;

-- Function to update carrier rating
create or replace function update_carrier_rating(
  carrier_profile_id uuid,
  new_rating numeric
) returns void language plpgsql security definer as $$
begin
  update public.carrier_profiles
  set 
    rating = (rating * total_reviews + new_rating) / (total_reviews + 1),
    total_reviews = total_reviews + 1
  where id = carrier_profile_id;
end;
$$;

-- Function to get user's unread message count
create or replace function get_unread_message_count(user_id uuid)
returns bigint language plpgsql security definer as $$
declare
  count bigint;
begin
  select count(*)
  into count
  from public.messages
  where recipient_id = user_id
  and status = 'sent';
  
  return count;
end;
$$;

-- Function to get user's active shipments
create or replace function get_active_shipments(user_id uuid)
returns setof shipments language plpgsql security definer as $$
begin
  return query
  select s.*
  from public.shipments s
  join public.loads l on s.load_id = l.id
  where 
    (l.shipper_id = user_id or s.carrier_id = (
      select id from public.carrier_profiles where user_id = user_id
    ))
    and s.status not in ('delivered', 'cancelled');
end;
$$;
