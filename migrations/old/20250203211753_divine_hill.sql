/*
  # Fix carrier load relationship and add missing columns

  1. Changes
    - Add read column to messages table
    - Add rating column to carrier_profiles
    - Add indexes for performance optimization
  
  2. Security
    - Update RLS policies for better access control
*/

-- Add read column to messages
ALTER TABLE messages
ADD COLUMN read boolean DEFAULT false;

-- Add rating to carrier_profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'carrier_profiles' AND column_name = 'rating'
  ) THEN
    ALTER TABLE carrier_profiles ADD COLUMN rating numeric;
  END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_loads_carrier_id ON loads(carrier_id);
CREATE INDEX IF NOT EXISTS idx_loads_shipper_id ON loads(shipper_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read);
CREATE INDEX IF NOT EXISTS idx_notifications_read_status ON notifications(read_status);

-- Update message policies
CREATE POLICY "Users can update their received messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());