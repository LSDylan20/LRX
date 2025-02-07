/*
  # Add carrier_id to loads table

  1. Changes
    - Add carrier_id column to loads table
    - Add foreign key constraint to users table
    - Update RLS policies for carrier access

  2. Security
    - Enable RLS policies for carrier access to their assigned loads
*/

-- Add carrier_id column to loads table
ALTER TABLE loads 
ADD COLUMN carrier_id uuid REFERENCES users(id);

-- Update RLS policies for carrier access
CREATE POLICY "Carriers can view their assigned loads"
  ON loads
  FOR SELECT
  TO authenticated
  USING (
    carrier_id = auth.uid() OR
    shipper_id = auth.uid()
  );

CREATE POLICY "Carriers can update their assigned loads"
  ON loads
  FOR UPDATE
  TO authenticated
  USING (carrier_id = auth.uid())
  WITH CHECK (carrier_id = auth.uid());