/*
  # Fix RLS Policies - Safe Migration

  1. Security Updates
    - Safely drop and recreate existing policies
    - Ensure proper role-based access control
    - Fix any policy conflicts

  2. Tables Updated
    - `attendance_logs` - Teacher attendance management
    - `schedules` - Class schedule management

  3. Policy Structure
    - Teachers: Manage own attendance, read assigned schedules
    - Head: Read all attendance and schedules
    - Admin: Full schedule management
    - Creator: Full system access
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
-- ATTENDANCE_LOGS POLICIES
-- =============================================

-- Teachers can manage their own attendance (insert, update, select)
CREATE POLICY "Teachers can manage own attendance"
  ON attendance_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'teacher' 
      AND id = attendance_logs.teacher_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'teacher' 
      AND id = attendance_logs.teacher_id
    )
  );

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
-- SCHEDULES POLICIES
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

-- Teachers can read schedules (all teachers can see all schedules for coordination)
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