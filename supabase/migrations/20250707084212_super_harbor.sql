/*
  # EduSync Phase 2 - Attendance and Schedule Tables

  1. New Tables
    - `attendance_logs`
      - `id` (uuid, primary key)
      - `teacher_id` (uuid, foreign key to users)
      - `date` (date)
      - `status` (enum: present, break, absent)
      - `remarks` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `schedules`
      - `id` (uuid, primary key)
      - `day` (text)
      - `time` (text)
      - `level` (text)
      - `subject` (text)
      - `teacher_id` (uuid, foreign key to users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Teachers can only manage their own attendance
    - Admins can manage schedules
    - Head can read all attendance data
    - Creator has full access
*/

-- Create attendance status enum
CREATE TYPE attendance_status AS ENUM ('present', 'break', 'absent');

-- Create attendance_logs table
CREATE TABLE IF NOT EXISTS attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  status attendance_status NOT NULL DEFAULT 'present',
  remarks text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(teacher_id, date)
);

-- Create schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day text NOT NULL,
  time text NOT NULL,
  level text NOT NULL,
  subject text NOT NULL,
  teacher_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance_logs
CREATE POLICY "Teachers can manage own attendance"
  ON attendance_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'teacher' 
      AND users.id = attendance_logs.teacher_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'teacher' 
      AND users.id = attendance_logs.teacher_id
    )
  );

CREATE POLICY "Head can read all attendance"
  ON attendance_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('head', 'creator')
    )
  );

CREATE POLICY "Creator has full access to attendance"
  ON attendance_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'creator'
    )
  );

-- RLS Policies for schedules
CREATE POLICY "Admin can manage schedules"
  ON schedules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'creator')
    )
  );

CREATE POLICY "Teachers can read schedules"
  ON schedules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('teacher', 'head', 'admin', 'creator')
    )
  );

-- Add updated_at trigger for attendance_logs
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_attendance_logs_updated_at
  BEFORE UPDATE ON attendance_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at
  BEFORE UPDATE ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();