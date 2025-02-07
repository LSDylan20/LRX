-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgvector";

-- Create custom types
create type user_role as enum ('shipper', 'carrier', 'broker', 'admin');
create type carrier_status as enum ('pending', 'active', 'suspended');
create type load_status as enum ('pending', 'assigned', 'in_transit', 'delivered', 'cancelled');
create type quote_status as enum ('pending', 'accepted', 'rejected', 'expired');
create type shipment_status as enum ('pending', 'in_transit', 'at_pickup', 'picked_up', 'at_delivery', 'delivered', 'cancelled');
create type vehicle_status as enum ('available', 'in_use', 'maintenance', 'inactive');
create type message_type as enum ('text', 'document', 'location', 'system');
create type message_status as enum ('sent', 'delivered', 'read');

-- Create users table
create table public.users (
  id uuid references auth.users primary key,
  company_name text,
  role user_role not null,
  email text unique not null,
  phone text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create carrier_profiles table
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

-- Create carrier_vehicles table
create table public.carrier_vehicles (
  id uuid primary key default uuid_generate_v4(),
  carrier_id uuid references public.carrier_profiles not null,
  type text not null,
  make text not null,
  model text not null,
  year integer not null,
  vin text unique,
  license_plate text,
  status vehicle_status default 'available',
  current_location jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create loads table
create table public.loads (
  id uuid primary key default uuid_generate_v4(),
  shipper_id uuid references public.users not null,
  carrier_id uuid references public.users,
  origin text not null,
  destination text not null,
  pickup_date timestamp with time zone not null,
  delivery_date timestamp with time zone not null,
  equipment_type text not null,
  weight numeric not null,
  dimensions jsonb,
  special_requirements text[],
  status load_status default 'pending',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create quotes table
create table public.quotes (
  id uuid primary key default uuid_generate_v4(),
  load_id uuid references public.loads not null,
  carrier_id uuid references public.carrier_profiles not null,
  rate numeric not null,
  expiry_date timestamp with time zone not null,
  status quote_status default 'pending',
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create shipments table
create table public.shipments (
  id uuid primary key default uuid_generate_v4(),
  load_id uuid references public.loads not null,
  carrier_id uuid references public.carrier_profiles not null,
  vehicle_id uuid references public.carrier_vehicles,
  current_location jsonb,
  status shipment_status default 'pending',
  pickup_time timestamp with time zone,
  delivery_time timestamp with time zone,
  tracking_number text unique,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create documents table
create table public.documents (
  id uuid primary key default uuid_generate_v4(),
  shipment_id uuid references public.shipments not null,
  type text not null,
  url text not null,
  name text not null,
  size integer not null,
  uploaded_by uuid references public.users not null,
  created_at timestamp with time zone default now()
);

-- Create messages table
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null,
  sender_id uuid references public.users not null,
  recipient_id uuid references public.users not null,
  content text not null,
  type message_type default 'text',
  status message_status default 'sent',
  metadata jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create notifications table
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users not null,
  title text not null,
  message text not null,
  type text not null,
  read boolean default false,
  data jsonb,
  created_at timestamp with time zone default now()
);

-- Create indexes
create index idx_carrier_profiles_user_id on public.carrier_profiles(user_id);
create index idx_carrier_vehicles_carrier_id on public.carrier_vehicles(carrier_id);
create index idx_loads_shipper_id on public.loads(shipper_id);
create index idx_loads_carrier_id on public.loads(carrier_id);
create index idx_quotes_load_id on public.quotes(load_id);
create index idx_quotes_carrier_id on public.quotes(carrier_id);
create index idx_shipments_load_id on public.shipments(load_id);
create index idx_shipments_carrier_id on public.shipments(carrier_id);
create index idx_documents_shipment_id on public.documents(shipment_id);
create index idx_messages_conversation_id on public.messages(conversation_id);
create index idx_messages_sender_id on public.messages(sender_id);
create index idx_messages_recipient_id on public.messages(recipient_id);
create index idx_notifications_user_id on public.notifications(user_id);

-- Enable Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.carrier_profiles enable row level security;
alter table public.carrier_vehicles enable row level security;
alter table public.loads enable row level security;
alter table public.quotes enable row level security;
alter table public.shipments enable row level security;
alter table public.documents enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
