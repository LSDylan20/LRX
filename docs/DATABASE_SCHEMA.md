# LaneRunner Database Schema Documentation

## Overview
This document details the database schema, relationships, and access patterns for the LaneRunner platform using Supabase (PostgreSQL).

## Tables

### users
```sql
create table public.users (
  id uuid references auth.users primary key,
  company_name text,
  role user_role not null,
  email text unique not null,
  phone text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create type user_role as enum ('shipper', 'carrier', 'broker', 'admin');
```

### carrier_profiles
```sql
create table public.carrier_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users not null,
  mc_number text unique,
  dot_number text unique,
  equipment_types text[] not null,
  service_areas jsonb not null,
  insurance jsonb not null,
  rating numeric default 0,
  total_reviews integer default 0,
  status carrier_status default 'pending',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create type carrier_status as enum ('pending', 'active', 'suspended');
```

### loads
```sql
create table public.loads (
  id uuid primary key default uuid_generate_v4(),
  shipper_id uuid references public.users not null,
  carrier_id uuid references public.users,
  origin text not null,
  destination text not null,
  pickup_date timestamp with time zone not null,
  delivery_date timestamp with time zone not null,
  equipment_type text not null,
  weight numeric,
  dimensions jsonb,
  special_instructions text,
  status load_status default 'pending',
  rate_cents integer,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create type load_status as enum (
  'pending',
  'matching',
  'assigned',
  'in_transit',
  'delivered',
  'completed',
  'cancelled'
);
```

### shipments
```sql
create table public.shipments (
  id uuid primary key default uuid_generate_v4(),
  load_id uuid references public.loads not null,
  carrier_id uuid references public.users not null,
  current_location jsonb,
  eta timestamp with time zone,
  status shipment_status default 'pending',
  tracking_number text unique,
  documents jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create type shipment_status as enum (
  'pending',
  'in_transit',
  'delayed',
  'delivered',
  'cancelled'
);
```

### quotes
```sql
create table public.quotes (
  id uuid primary key default uuid_generate_v4(),
  load_id uuid references public.loads not null,
  carrier_id uuid references public.users not null,
  rate_cents integer not null,
  expiry timestamp with time zone not null,
  status quote_status default 'pending',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create type quote_status as enum ('pending', 'accepted', 'rejected', 'expired');
```

### messages
```sql
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null,
  sender_id uuid references public.users not null,
  content text not null,
  attachments jsonb,
  read_by uuid[] default '{}',
  created_at timestamp with time zone default now()
);
```

### notifications
```sql
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users not null,
  type notification_type not null,
  title text not null,
  message text not null,
  data jsonb,
  read boolean default false,
  created_at timestamp with time zone default now()
);

create type notification_type as enum (
  'load_match',
  'quote_received',
  'quote_accepted',
  'shipment_update',
  'message_received',
  'system'
);
```

### vector_embeddings
```sql
create table public.vector_embeddings (
  id uuid primary key default uuid_generate_v4(),
  entity_type text not null,
  entity_id uuid not null,
  embedding vector(1536) not null,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

create index on vector_embeddings using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
```

## Functions

### match_carriers
```sql
create or replace function match_carriers(
  load_id uuid,
  limit_count int default 10,
  similarity_threshold float default 0.7
) returns table (
  carrier_id uuid,
  similarity float,
  metadata jsonb
) language plpgsql as $$
begin
  return query
  select
    c.user_id,
    1 - (e.embedding <=> (
      select embedding
      from vector_embeddings
      where entity_type = 'load'
      and entity_id = load_id
    )) as similarity,
    e.metadata
  from vector_embeddings e
  join carrier_profiles c on c.id = e.entity_id
  where e.entity_type = 'carrier'
  and 1 - (e.embedding <=> (
    select embedding
    from vector_embeddings
    where entity_type = 'load'
    and entity_id = load_id
  )) > similarity_threshold
  order by similarity desc
  limit limit_count;
end;
$$;
```

## Policies

### Load Policies
```sql
-- Shippers can create loads
create policy "Shippers can create loads"
  on loads for insert
  with check (auth.uid() = shipper_id);

-- Users can view loads they're involved with
create policy "Users can view their loads"
  on loads for select
  using (
    auth.uid() = shipper_id
    or auth.uid() = carrier_id
    or exists (
      select 1 from quotes
      where quotes.load_id = loads.id
      and quotes.carrier_id = auth.uid()
    )
  );
```

### Carrier Profile Policies
```sql
-- Carriers can create their profile
create policy "Carriers can create their profile"
  on carrier_profiles for insert
  with check (auth.uid() = user_id);

-- Carriers can update their profile
create policy "Carriers can update their profile"
  on carrier_profiles for update
  using (auth.uid() = user_id);
```

## Indexes

```sql
-- Loads
create index loads_shipper_id_idx on loads(shipper_id);
create index loads_carrier_id_idx on loads(carrier_id);
create index loads_status_idx on loads(status);
create index loads_equipment_type_idx on loads(equipment_type);

-- Carrier Profiles
create index carrier_profiles_user_id_idx on carrier_profiles(user_id);
create index carrier_profiles_equipment_types_idx on carrier_profiles using gin(equipment_types);
create index carrier_profiles_service_areas_idx on carrier_profiles using gin(service_areas);

-- Shipments
create index shipments_load_id_idx on shipments(load_id);
create index shipments_carrier_id_idx on shipments(carrier_id);
create index shipments_status_idx on shipments(status);

-- Messages
create index messages_room_id_idx on messages(room_id);
create index messages_sender_id_idx on messages(sender_id);
create index messages_created_at_idx on messages(created_at);

-- Notifications
create index notifications_user_id_idx on notifications(user_id);
create index notifications_read_idx on notifications(read);
create index notifications_created_at_idx on notifications(created_at);
```

## Access Patterns

### Common Queries

1. Find Available Loads
```sql
select *
from loads
where status = 'pending'
and equipment_type = any($1)
and pickup_date >= current_date
order by created_at desc;
```

2. Get Carrier Matches
```sql
select *
from match_carriers($1, 10, 0.7)
where similarity > 0.8
order by similarity desc;
```

3. Get User's Active Loads
```sql
select *
from loads
where (shipper_id = auth.uid() or carrier_id = auth.uid())
and status not in ('completed', 'cancelled')
order by pickup_date asc;
```

4. Get Unread Notifications
```sql
select *
from notifications
where user_id = auth.uid()
and read = false
order by created_at desc;
```

## Backup and Recovery
- Daily automated backups
- Point-in-time recovery enabled
- 30-day retention period
- Automated backup testing weekly

## Performance Considerations

### Indexing Strategy
- B-tree indexes for exact matches and ranges
- GiST indexes for geographical queries
- Partial indexes for frequently filtered subsets
- Expression indexes for computed values

### Partitioning
```sql
-- Partition tracking updates by month
CREATE TABLE tracking_updates (
    id UUID NOT NULL,
    load_id UUID,
    latitude DECIMAL NOT NULL,
    longitude DECIMAL NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions
CREATE TABLE tracking_updates_y2025m01 PARTITION OF tracking_updates
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### Materialized Views
```sql
-- Market rate averages
CREATE MATERIALIZED VIEW market_rate_averages AS
SELECT
    origin_state,
    destination_state,
    equipment_type,
    date_trunc('day', date) as day,
    AVG(rate) as average_rate,
    COUNT(*) as volume
FROM rate_history
GROUP BY origin_state, destination_state, equipment_type, date_trunc('day', date)
WITH DATA;

-- Refresh schedule
REFRESH MATERIALIZED VIEW market_rate_averages
    WITH DATA
    CONCURRENTLY;
```

## Security

### Row Level Security
```sql
-- Enable RLS
ALTER TABLE loads ENABLE ROW LEVEL SECURITY;

-- Define policies
CREATE POLICY load_access ON loads
    USING (
        shipper_id IN (SELECT company_id FROM users WHERE id = current_user_id())
        OR carrier_id IN (SELECT company_id FROM users WHERE id = current_user_id())
        OR broker_id IN (SELECT company_id FROM users WHERE id = current_user_id())
    );
```

### Audit Logging
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_id UUID REFERENCES users(id),
    ip_address TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_table ON audit_logs(table_name);
CREATE INDEX idx_audit_record ON audit_logs(record_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_time ON audit_logs(timestamp);
```

## Maintenance

### Vacuum Schedule
```sql
-- Regular vacuum
VACUUM ANALYZE loads;
VACUUM ANALYZE tracking_updates;
VACUUM ANALYZE messages;

-- Configure autovacuum
ALTER TABLE loads SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);
```

### Backup Strategy
```sql
-- Daily backups
pg_dump -Fc -f backup_%Y%m%d.dump lanerunner

-- Point-in-time recovery
ALTER SYSTEM SET wal_level = replica;
ALTER SYSTEM SET archive_mode = on;
ALTER SYSTEM SET archive_command = 'test ! -f /archive/%f && cp %p /archive/%f';
```

## Monitoring

### Performance Metrics
```sql
-- Query performance
SELECT
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

-- Table statistics
SELECT
    schemaname,
    relname,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch
FROM pg_stat_user_tables;
```

### Health Checks
```sql
-- Connection status
SELECT
    datname,
    numbackends,
    xact_commit,
    xact_rollback,
    blks_read,
    blks_hit
FROM pg_stat_database;

-- Lock monitoring
SELECT
    locktype,
    relation::regclass,
    mode,
    granted
FROM pg_locks;
```
