/*
  # Add user registration policies

  1. Security
    - Add policy to allow user registration
    - Add policy for users to read their own data
    - Add policy for users to update their own data
*/

-- Policy to allow user registration during signup
CREATE POLICY "Allow user registration during signup"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy to allow users to read their own data
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy to allow users to update their own data
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);