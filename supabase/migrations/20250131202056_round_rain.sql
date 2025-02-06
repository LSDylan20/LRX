/*
  # Initial Schema Setup for LaneRunner

  1. New Tables
    - users
      - id (uuid, primary key)
      - role (enum: shipper, carrier, broker, admin)
      - company_name (text)
      - contact_name (text)
      - phone (text)
      - created_at (timestamp)
    - loads
      - id (uuid, primary key)
      - shipper_id (uuid, references users)
      - origin (text)
      - destination (text)
      - pickup_date (timestamp)
      - delivery_date (timestamp)
      - equipment_type (text)
      - weight (numeric)
      - status (enum: posted, assigned, in_transit, delivered)
      - rate (numeric)
      - created_at (timestamp)
    - carrier_profiles
      - id (uuid, primary key)
      - user_id (uuid, references users)
      - mc_number (text)
      - dot_number (text)
      - insurance_expiry (timestamp)
      - equipment_types (text[])
      - service_areas (text[])
      - created_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create enum types
CREATE TYPE user_role AS ENUM ('shipper', 'carrier', 'broker', 'admin');
CREATE TYPE load_status AS ENUM ('posted', 'assigned', 'in_transit', 'delivered');

-- Create users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  role user_role NOT NULL,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Create loads table
CREATE TABLE loads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipper_id uuid REFERENCES users (id) ON DELETE CASCADE,
  origin text NOT NULL,
  destination text NOT NULL,
  pickup_date timestamptz NOT NULL,
  delivery_date timestamptz NOT NULL,
  equipment_type text NOT NULL,
  weight numeric NOT NULL,
  status load_status DEFAULT 'posted',
  rate numeric,
  created_at timestamptz DEFAULT now()
);

-- Create carrier_profiles table
CREATE TABLE carrier_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users (id) ON DELETE CASCADE,
  mc_number text UNIQUE,
  dot_number text UNIQUE,
  insurance_expiry timestamptz,
  equipment_types text[] NOT NULL DEFAULT '{}',
  service_areas text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE carrier_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Public can view loads"
  ON loads
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Shippers can create loads"
  ON loads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'shipper'
    )
  );

CREATE POLICY "Shippers can update their own loads"
  ON loads
  FOR UPDATE
  TO authenticated
  USING (shipper_id = auth.uid());

CREATE POLICY "Carriers can view their own profiles"
  ON carrier_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Carriers can update their own profiles"
  ON carrier_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());