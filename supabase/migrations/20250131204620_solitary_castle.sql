/*
  # Update load management policies

  1. Security Changes
    - Drop existing policies
    - Recreate policies with proper permissions
    - Ensure proper access control for load management
*/

-- First drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Public can view loads" ON loads;
  DROP POLICY IF EXISTS "Shippers can create loads" ON loads;
  DROP POLICY IF EXISTS "Shippers can update their own loads" ON loads;
  DROP POLICY IF EXISTS "Authenticated users can view loads" ON loads;
  DROP POLICY IF EXISTS "Shippers can delete their own loads" ON loads;
END $$;

-- Recreate policies with proper permissions
CREATE POLICY "Authenticated users can view loads"
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
  USING (shipper_id = auth.uid())
  WITH CHECK (shipper_id = auth.uid());

CREATE POLICY "Shippers can delete their own loads"
  ON loads
  FOR DELETE
  TO authenticated
  USING (shipper_id = auth.uid());