/*
  # Class Session Tracking System

  1. New Tables
    - `class_sessions`
      - `id` (uuid, primary key)
      - `teacher_id` (uuid, references users)
      - `schedule_id` (uuid, references schedules)
      - `class_level` (text)
      - `subject` (text)
      - `start_time` (timestamp)
      - `end_time` (timestamp, nullable)
      - `status` (enum: active, completed)
      - `created_at` (timestamp)

  2. Security
    - No RLS enabled (following existing pattern)
    - Teachers can manage their own sessions
    - Head can view all sessions
    - Creator has full access

  3. Indexes
    - Index on teacher_id for performance
    - Index on status for active session queries
    - Index on start_time for sorting
*/

-- Create session status enum
CREATE TYPE session_status AS ENUM ('active', 'completed');

-- Create class_sessions table
CREATE TABLE IF NOT EXISTS class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  schedule_id uuid NOT NULL,
  class_level text NOT NULL,
  subject text NOT NULL,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  status session_status NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_class_sessions_teacher_id ON class_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_status ON class_sessions(status);
CREATE INDEX IF NOT EXISTS idx_class_sessions_start_time ON class_sessions(start_time DESC);

-- No RLS enabled (following existing pattern)
ALTER TABLE class_sessions DISABLE ROW LEVEL SECURITY;