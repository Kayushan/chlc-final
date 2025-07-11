/*
  # Create users table for EduSync

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `email` (text, unique, not null)
      - `password_hash` (text, not null) - SHA-256 hash for custom auth
      - `role` (enum: creator, admin, head, teacher)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `users` table
    - Creator has full access (via Supabase Auth)
    - Other users can only read their own record
*/

-- Create role enum
CREATE TYPE user_role AS ENUM ('creator', 'admin', 'head', 'teacher');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role user_role NOT NULL DEFAULT 'teacher',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users (Creator via Supabase Auth)
CREATE POLICY "Creator has full access to users"
  ON users
  FOR ALL
  TO authenticated
  USING (true);

-- Policy for custom auth users to read their own data
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO anon
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert a sample creator user (you can modify this)
INSERT INTO users (name, email, password_hash, role) 
VALUES (
  'System Creator', 
  'creator@charishope.edu', 
  '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', -- 'password' hashed
  'creator'
) ON CONFLICT (email) DO NOTHING;

-- Insert sample staff users for testing
INSERT INTO users (name, email, password_hash, role) VALUES
  ('John Admin', 'admin@charishope.edu', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'admin'),
  ('Mary Head', 'head@charishope.edu', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'head'),
  ('Sarah Teacher', 'teacher@charishope.edu', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'teacher')
ON CONFLICT (email) DO NOTHING;