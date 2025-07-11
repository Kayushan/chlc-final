import { supabase } from './supabase';
import { LeaveType } from './leaveManagement';

/**
 * Get all teachers who are on leave for a given date (default: today).
 * Returns array of { teacherName, leaveType, reason, leave_date }
 */
export async function getTeachersOnLeaveForDate(date: string): Promise<Array<{ teacherName: string, leaveType: LeaveType, reason: string, leave_date: string }>> {
  const { data, error } = await supabase
    .from('annual_leaves')
    .select('leave_date, leave_type, reason, users:users!annual_leaves_teacher_id_fkey(name)')
    .eq('leave_date', date)
    .eq('status', 'Approved');
  if (error) {
    console.error('Error fetching teachers on leave:', error);
    return [];
  }
  return (data || []).map((row: any) => ({
    teacherName: row.users?.name || 'Unknown',
    leaveType: row.leave_type,
    reason: row.reason || '',
    leave_date: row.leave_date
  }));
}
