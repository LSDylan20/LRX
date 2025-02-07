-- Create GiST index for location-based queries
create index idx_carrier_vehicles_location 
  on public.carrier_vehicles using gist (
    cast(current_location->'coordinates' as jsonb)
  );

create index idx_shipments_location 
  on public.shipments using gist (
    cast(current_location->'coordinates' as jsonb)
  );

-- Create indexes for timestamp range queries
create index idx_loads_pickup_date 
  on public.loads (pickup_date);

create index idx_loads_delivery_date 
  on public.loads (delivery_date);

create index idx_shipments_pickup_time 
  on public.shipments (pickup_time);

create index idx_shipments_delivery_time 
  on public.shipments (delivery_time);

-- Create indexes for status-based queries
create index idx_loads_status 
  on public.loads (status);

create index idx_quotes_status 
  on public.quotes (status);

create index idx_shipments_status 
  on public.shipments (status);

-- Create indexes for full-text search
alter table public.loads 
  add column if not exists search_vector tsvector 
  generated always as (
    setweight(to_tsvector('english', coalesce(origin, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(destination, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(equipment_type, '')), 'B')
  ) stored;

create index idx_loads_search 
  on public.loads using gin(search_vector);

-- Create function to update search_vector
create or replace function loads_search_update() returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.origin, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.destination, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.equipment_type, '')), 'B');
  return new;
end
$$ language plpgsql;

-- Create trigger for search vector updates
create trigger loads_search_update_trigger
  before insert or update
  on public.loads
  for each row
  execute function loads_search_update();
