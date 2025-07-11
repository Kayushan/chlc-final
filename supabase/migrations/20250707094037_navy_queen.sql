/*
  # Phase 3: AI Settings and Behavior Reports

  1. New Tables
    - `ai_settings`
      - `id` (uuid, primary key)
      - `api_key` (text)
      - `model` (text)
      - `access_level` (jsonb) - role-based access control
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `behavior_reports`
      - `id` (uuid, primary key)
      - `student_name` (text)
      - `class_level` (text)
      - `incident` (text)
      - `action_taken` (text)
      - `teacher_id` (uuid)
      - `created_at` (timestamp)

  2. Security
    - No RLS enabled (following Phase 2 approach)
    - No foreign key constraints
*/

-- Create ai_settings table
CREATE TABLE IF NOT EXISTS ai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key text,
  model text DEFAULT 'gpt-3.5-turbo',
  access_level jsonb DEFAULT '{"creator": true, "admin": true, "head": true, "teacher": false}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create behavior_reports table
CREATE TABLE IF NOT EXISTS behavior_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name text NOT NULL,
  class_level text NOT NULL,
  incident text NOT NULL,
  action_taken text NOT NULL,
  teacher_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at trigger to ai_settings
CREATE TRIGGER update_ai_settings_updated_at
  BEFORE UPDATE ON ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default AI settings
INSERT INTO ai_settings (api_key, model, access_level)
VALUES (
  null,
  'gpt-3.5-turbo',
  '{"creator": true, "admin": true, "head": true, "teacher": false}'::jsonb
)
ON CONFLICT DO NOTHING;