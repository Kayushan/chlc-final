/*
  # Fix RLS Policies for Teacher Authentication

  This migration fixes the RLS policies to work with both Supabase Auth and custom authentication.
  
  1. Updates attendance_logs policies to handle both auth.uid() and custom teacher_id matching
  2. Ensures teachers can only access their own records
  3. Maintains proper access control for all roles
*/

-- =============================================
-- SAFELY DROP EXISTING POLICIES
-- =============================================

-- Drop attendance_logs policies if they exist
DROP POLICY IF EXISTS "Teachers can manage own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Head can read all attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Creator has full access to attendance" ON attendance_logs;

-- Drop schedules policies if they exist
DROP POLICY IF EXISTS "Admin can manage schedules" ON schedules;
DROP POLICY IF EXISTS "Teachers can read schedules" ON schedules;
DROP POLICY IF EXISTS "Creator full access to schedules" ON schedules;

-- =============================================
-- ATTENDANCE_LOGS POLICIES (FIXED)
-- =============================================

-- Teachers can manage their own attendance using auth.uid()
CREATE POLICY "Teachers can manage own attendance"
  ON attendance_logs
  FOR ALL
  TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Head of School can read all attendance logs
CREATE POLICY "Head can read all attendance"
  ON attendance_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = ANY(ARRAY['head'::user_role, 'creator'::user_role])
    )
  );

-- Creator has full access to attendance logs
CREATE POLICY "Creator has full access to attendance"
  ON attendance_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'creator'
    )
  );

-- =============================================
-- SCHEDULES POLICIES (FIXED)
-- =============================================

-- Admin can fully manage schedules
CREATE POLICY "Admin can manage schedules"
  ON schedules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = ANY(ARRAY['admin'::user_role, 'creator'::user_role])
    )
  );

-- Teachers can read all schedules for coordination
CREATE POLICY "Teachers can read schedules"
  ON schedules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = ANY(ARRAY['teacher'::user_role, 'head'::user_role, 'admin'::user_role, 'creator'::user_role])
    )
  );

-- Ensure RLS is enabled on both tables
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;