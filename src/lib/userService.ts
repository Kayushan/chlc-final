import { supabase } from './supabase';

export interface TeacherWithAttendanceStatus {
  id: string;
  name: string;
  email: string;
  currentStatus: 'present' | 'break' | 'absent' | 'no-checkin';
  remarks?: string | null;
  lastUpdate?: string | null; // timestamp of last attendance log update
}

export const getPaginatedTeachersWithAttendance = async (
  page: number = 1,
  pageSize: number = 10,
  // Add filters if needed in future, e.g., by name
): Promise<{ teachers: TeacherWithAttendanceStatus[], count: number | null }> => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format

  // 1. Fetch paginated teachers
  const { data: teachersData, error: teachersError, count: teachersCount } = await supabase
    .from('users')
    .select('id, name, email', { count: 'exact' })
    .eq('role', 'teacher')
    .order('name', { ascending: true })
    .range(from, to);

  if (teachersError) {
    console.error('Error fetching paginated teachers:', teachersError);
    throw teachersError;
  }
  if (!teachersData) {
    return { teachers: [], count: 0 };
  }

  // 2. Get teacher IDs for the current page
  const teacherIds = teachersData.map(t => t.id);

  // 3. Fetch attendance logs for these specific teachers for today
  let attendanceRecords: any[] = [];
  if (teacherIds.length > 0) {
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance_logs')
      .select('teacher_id, status, remarks, created_at')
      .eq('date', today)
      .in('teacher_id', teacherIds);

    if (attendanceError) {
      console.error('Error fetching attendance for paged teachers:', attendanceError);
      // Continue without attendance data for this page, or throw, depending on desired strictness
      // For now, continue and they'll appear as 'no-checkin'
    } else {
      attendanceRecords = attendanceData || [];
    }
  }

  // 4. Merge teacher data with their attendance status
  const result = teachersData.map(teacher => {
    const attendance = attendanceRecords.find(att => att.teacher_id === teacher.id);
    return {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      currentStatus: attendance?.status || 'no-checkin',
      remarks: attendance?.remarks,
      lastUpdate: attendance?.created_at,
    };
  });

  return { teachers: result, count: teachersCount };
};
