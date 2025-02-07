# LaneRunner Database Schema Documentation

## Overview
This document provides comprehensive documentation for the LaneRunner application's database schema implemented in Supabase.

## Table of Contents
1. Custom Types
2. Tables Schema
3. Relationships
4. Indexes
5. RLS Policies
6. Migrations

## 1. Custom Types

### User Roles
```sql
create type user_role as enum (
    'admin',    -- System administrator
    'shipper',  -- Freight shipper
    'carrier',  -- Trucking company
    'broker',   -- Freight broker
    'driver'    -- Truck driver
);
```

### Load Status
```sql
create type load_status as enum (
    'draft',       -- Initial creation
    'posted',      -- Available for carriers
    'matching',    -- AI matching in progress
    'negotiating', -- Price negotiation
    'booked',      -- Successfully assigned
    'in_transit',  -- Currently moving
    'delivered',   -- Reached destination
    'completed'    -- All paperwork done
);
```

### Negotiation Status
```sql
create type negotiation_status as enum (
    'pending',   -- Initial offer made
    'active',    -- Counter-offers ongoing
    'accepted',  -- Deal agreed
    'rejected',  -- Deal declined
    'expired'    -- Time limit reached
);
```

## 2. Tables Schema

### Users
```sql
create table public.users (
    id uuid primary key default uuid_generate_v4(),
    email text unique not null,
    role user_role not null default 'shipper',
    phone_number text,
    email_verified boolean default false,
    phone_verified boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    constraint email_format check (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'),
    constraint phone_format check (phone_number ~* '^\+[1-9]\d{1,14}$')
);

comment on table public.users is 'User accounts for the LaneRunner platform';
```

### User Profiles
```sql
create table public.user_profiles (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.users(id) on delete cascade,
    company_id uuid references public.companies(id),
    first_name text,
    last_name text,
    avatar_url text,
    preferences jsonb default '{
        "notifications": {
            "email": true,
            "sms": false,
            "push": true
        },
        "display": {
            "theme": "light",
            "language": "en"
        }
    }'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.user_profiles is 'Extended profile information for users';
```

### Companies
```sql
create table public.companies (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    type text not null check (type in ('carrier', 'shipper', 'broker')),
    mc_number text unique,
    dot_number text unique,
    tax_id text,
    address jsonb not null default '{
        "street": "",
        "city": "",
        "state": "",
        "zip": "",
        "country": "US"
    }'::jsonb,
    contact_info jsonb not null default '{
        "phone": "",
        "email": "",
        "website": ""
    }'::jsonb,
    verification_status text default 'pending' check (
        verification_status in ('pending', 'verified', 'rejected')
    ),
    insurance_info jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    constraint mc_number_format check (mc_number ~* '^[0-9]{6}$'),
    constraint dot_number_format check (dot_number ~* '^[0-9]{7}$')
);

comment on table public.companies is 'Company profiles for carriers, shippers, and brokers';
```

### Loads
```sql
create table public.loads (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.users(id) on delete cascade,
    company_id uuid references public.companies(id),
    reference_number text unique,
    origin jsonb not null default '{
        "address": "",
        "city": "",
        "state": "",
        "zip": "",
        "country": "US",
        "coordinates": {
            "lat": 0,
            "lng": 0
        }
    }'::jsonb,
    destination jsonb not null default '{
        "address": "",
        "city": "",
        "state": "",
        "zip": "",
        "country": "US",
        "coordinates": {
            "lat": 0,
            "lng": 0
        }
    }'::jsonb,
    equipment_type text not null,
    weight numeric check (weight > 0),
    dimensions jsonb default '{
        "length": 0,
        "width": 0,
        "height": 0,
        "unit": "ft"
    }'::jsonb,
    status load_status default 'draft',
    rate_details jsonb default '{
        "asking_rate": 0,
        "minimum_rate": 0,
        "maximum_rate": 0,
        "currency": "USD"
    }'::jsonb,
    pickup_date timestamp with time zone,
    delivery_date timestamp with time zone,
    special_requirements jsonb default '{
        "team_required": false,
        "hazmat": false,
        "temperature_controlled": false,
        "temperature_range": null
    }'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    constraint valid_dates check (pickup_date < delivery_date)
);

comment on table public.loads is 'Freight loads available for transport';
```

### Negotiations
```sql
create table public.negotiations (
    id uuid primary key default uuid_generate_v4(),
    load_id uuid references public.loads(id) on delete cascade,
    carrier_id uuid references public.users(id),
    shipper_id uuid references public.users(id),
    status negotiation_status default 'pending',
    current_offer numeric not null check (current_offer >= 0),
    offer_history jsonb default '[]'::jsonb,
    ai_suggestions jsonb default '[]'::jsonb,
    expiration_time timestamp with time zone,
    terms_accepted jsonb default '{
        "carrier": false,
        "shipper": false
    }'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.negotiations is 'Load price negotiations between carriers and shippers';
```

### Market Data
```sql
create table public.market_data (
    id uuid primary key default uuid_generate_v4(),
    origin_region text not null,
    destination_region text not null,
    equipment_type text not null,
    rate numeric not null check (rate >= 0),
    volume integer not null check (volume >= 0),
    fuel_price numeric,
    weather_conditions jsonb,
    timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
    
    constraint unique_market_data unique (
        origin_region,
        destination_region,
        equipment_type,
        timestamp
    )
);

comment on table public.market_data is 'Historical and real-time market rate data';
```

### AI Results
```sql
create table public.ai_results (
    id uuid primary key default uuid_generate_v4(),
    input jsonb not null,
    result jsonb not null,
    model text not null,
    confidence_score numeric check (
        confidence_score >= 0 and confidence_score <= 1
    ),
    processing_time numeric,
    processed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.ai_results is 'AI processing results for load matching and negotiations';
```

## 3. Relationships

### Primary Relationships
- Users -> Companies (Many-to-One)
- Users -> Loads (One-to-Many)
- Companies -> Loads (One-to-Many)
- Loads -> Negotiations (One-to-Many)
- Users -> Negotiations (One-to-Many)

## 4. Indexes

```sql
-- Users
create index users_email_idx on public.users(email);
create index users_role_idx on public.users(role);

-- User Profiles
create index user_profiles_user_id_idx on public.user_profiles(user_id);
create index user_profiles_company_id_idx on public.user_profiles(company_id);

-- Companies
create index companies_type_idx on public.companies(type);
create index companies_mc_number_idx on public.companies(mc_number);
create index companies_dot_number_idx on public.companies(dot_number);

-- Loads
create index loads_user_id_idx on public.loads(user_id);
create index loads_company_id_idx on public.loads(company_id);
create index loads_status_idx on public.loads(status);
create index loads_equipment_type_idx on public.loads(equipment_type);
create index loads_pickup_date_idx on public.loads(pickup_date);

-- Negotiations
create index negotiations_load_id_idx on public.negotiations(load_id);
create index negotiations_carrier_id_idx on public.negotiations(carrier_id);
create index negotiations_shipper_id_idx on public.negotiations(shipper_id);
create index negotiations_status_idx on public.negotiations(status);

-- Market Data
create index market_data_regions_idx on public.market_data(origin_region, destination_region);
create index market_data_equipment_type_idx on public.market_data(equipment_type);
create index market_data_timestamp_idx on public.market_data(timestamp);
```

## 5. RLS Policies

### Users Table
```sql
-- Users can view their own data
create policy "Users can view their own data"
    on public.users
    for select
    using (auth.uid() = id);

-- Users can update their own data
create policy "Users can update their own data"
    on public.users
    for update
    using (auth.uid() = id);
```

### Loads Table
```sql
-- Anyone can view posted loads
create policy "Anyone can view posted loads"
    on public.loads
    for select
    using (status = 'posted');

-- Users can view their own loads
create policy "Users can view their own loads"
    on public.loads
    for select
    using (auth.uid() = user_id);

-- Shippers can create loads
create policy "Shippers can create loads"
    on public.loads
    for insert
    with check (
        exists (
            select 1 from public.users
            where id = auth.uid()
            and role = 'shipper'
        )
    );

-- Load owners can update their loads
create policy "Load owners can update their loads"
    on public.loads
    for update
    using (auth.uid() = user_id);
```

### Negotiations Table
```sql
-- Participants can view negotiations
create policy "Participants can view negotiations"
    on public.negotiations
    for select
    using (
        auth.uid() = carrier_id or
        auth.uid() = shipper_id
    );

-- Participants can update negotiations
create policy "Participants can update negotiations"
    on public.negotiations
    for update
    using (
        auth.uid() = carrier_id or
        auth.uid() = shipper_id
    );
```

## 6. Migrations

### Initial Migration
```sql
-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Create types
-- ... (all enum types)

-- Create tables
-- ... (all table creation SQL)

-- Create indexes
-- ... (all index creation SQL)

-- Enable RLS
-- ... (all RLS enabling SQL)

-- Create policies
-- ... (all policy creation SQL)
```

### Rollback
```sql
-- Drop tables
drop table if exists public.ai_results;
drop table if exists public.market_data;
drop table if exists public.negotiations;
drop table if exists public.loads;
drop table if exists public.user_profiles;
drop table if exists public.companies;
drop table if exists public.users;

-- Drop types
drop type if exists negotiation_status;
drop type if exists load_status;
drop type if exists user_role;
```

## 7. Real-time Configuration

```sql
-- Enable real-time for specific tables
alter publication supabase_realtime add table public.loads;
alter publication supabase_realtime add table public.negotiations;
alter publication supabase_realtime add table public.market_data;

-- Configure real-time for specific columns
comment on column public.loads.status is '@realtime';
comment on column public.negotiations.status is '@realtime';
comment on column public.negotiations.current_offer is '@realtime';
```

## 8. Backup Configuration

```sql
-- Create backup schema
create schema if not exists backup;

-- Create backup function
create or replace function backup.create_table_backup(table_name text)
returns void as $$
begin
    execute format(
        'create table if not exists backup.%I_backup as table public.%I',
        table_name,
        table_name
    );
end;
$$ language plpgsql;

-- Schedule regular backups
select cron.schedule(
    'daily-backup',
    '0 0 * * *',
    $$
    select backup.create_table_backup('users');
    select backup.create_table_backup('loads');
    select backup.create_table_backup('negotiations');
    $$
);
```
