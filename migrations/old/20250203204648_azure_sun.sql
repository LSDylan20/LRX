/*
  # Add Additional Tables for FreightConnect

  1. New Tables
    - `quotes` - For carrier bidding
    - `shipments` - For tracking active shipments
    - `documents` - For load documentation
    - `carrier_vehicles` - For vehicle management
    - `messages` - For in-app communication
    - `notifications` - For system alerts

  2. Security
    - Enable RLS on all new tables
    - Add appropriate policies for each table
*/

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id uuid REFERENCES loads(id) ON DELETE CASCADE,
  carrier_id uuid REFERENCES users(id) ON DELETE CASCADE,
  price numeric NOT NULL,
  delivery_date timestamptz NOT NULL,
  terms_and_conditions text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create shipments table
CREATE TABLE IF NOT EXISTS shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id uuid REFERENCES loads(id) ON DELETE CASCADE,
  carrier_id uuid REFERENCES users(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES users(id) ON DELETE CASCADE,
  current_location point,
  eta timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id uuid REFERENCES loads(id) ON DELETE CASCADE,
  carrier_id uuid REFERENCES users(id),
  document_type text NOT NULL,
  file_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create carrier_vehicles table
CREATE TABLE IF NOT EXISTS carrier_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid REFERENCES users(id) ON DELETE CASCADE,
  vehicle_type text NOT NULL,
  vehicle_id text NOT NULL,
  capacity numeric,
  equipment_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES users(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES users(id) ON DELETE CASCADE,
  load_id uuid REFERENCES loads(id) ON DELETE SET NULL,
  message_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  message text NOT NULL,
  read_status boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE carrier_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for quotes
CREATE POLICY "Users can view their own quotes"
  ON quotes
  FOR SELECT
  TO authenticated
  USING (
    carrier_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM loads 
      WHERE loads.id = quotes.load_id 
      AND loads.shipper_id = auth.uid()
    )
  );

-- Create policies for shipments
CREATE POLICY "Users can view their shipments"
  ON shipments
  FOR SELECT
  TO authenticated
  USING (
    carrier_id = auth.uid() OR 
    driver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM loads 
      WHERE loads.id = shipments.load_id 
      AND loads.shipper_id = auth.uid()
    )
  );

-- Create policies for documents
CREATE POLICY "Users can view their documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (
    carrier_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM loads 
      WHERE loads.id = documents.load_id 
      AND loads.shipper_id = auth.uid()
    )
  );

-- Create policies for carrier_vehicles
CREATE POLICY "Carriers can manage their vehicles"
  ON carrier_vehicles
  FOR ALL
  TO authenticated
  USING (carrier_id = auth.uid())
  WITH CHECK (carrier_id = auth.uid());

-- Create policies for messages
CREATE POLICY "Users can view their messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Create policies for notifications
CREATE POLICY "Users can view their notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());