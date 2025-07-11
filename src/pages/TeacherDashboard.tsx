import React, { useRef } from 'react'
import { Layout } from '../components/Layout'
import { AnnouncementFeed } from '../components/AnnouncementFeed'
import { AIButton } from '../components/AIButton'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { getCurrentStaffUser } from '../lib/auth'
import { Calendar, CheckSquare, Coffee, LogOut as SignOut, FileText, Plus, Play, Square, XCircle, Briefcase } from 'lucide-react'
import {
  getLeaveBalance,
  getTeacherLeaveApplications,
  submitLeaveApplication,
  cancelLeaveApplicationByTeacher,
  LeaveBalance,
  AnnualLeaveApplication
} from '../lib/leaveManagement' // Assuming path

export function TeacherDashboard() {
  // Dynamic greeting function
  function getGreeting(name?: string | null) {
    const hour = new Date().getHours();
    let greeting = 'Hello';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 18) greeting = 'Good afternoon';
    else greeting = 'Good evening';
    return `${greeting}, ${name || 'Teacher'}`;
  }
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'announcement'>('dashboard');
  const { showToast } = useToast()
  const [todaySchedule, setTodaySchedule] = React.useState<any[]>([])
  const [activeSessions, setActiveSessions] = React.useState<any[]>([])
  const [attendanceStatus, setAttendanceStatus] = React.useState<any>(null)
  const [behaviorReports, setBehaviorReports] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true) // For general dashboard data
  const [submitting, setSubmitting] = React.useState(false) // General submitting state for attendance/behavior
  const [remarks, setRemarks] = React.useState('')
  const [showSignOutForm, setShowSignOutForm] = React.useState(false)
  const [showBehaviorForm, setShowBehaviorForm] = React.useState(false)
  const [completedSession, setCompletedSession] = React.useState<any>(null)
  const [behaviorForm, setBehaviorForm] = React.useState({
    student_name: '',
    class_level: '',
    incident: '',
    action_taken: ''
  })

  // Define LeaveType if not imported
  type LeaveType = 'Annual' | 'Medical' | 'Emergency' | 'Sick' | 'Maternity' | 'Paternity' | 'Unpaid' | 'Other';

  // Annual Leave States
  const [leaveBalance, setLeaveBalance] = React.useState<LeaveBalance | null>(null);
  const [leaveApplications, setLeaveApplications] = React.useState<AnnualLeaveApplication[]>([]);
  const [showLeaveForm, setShowLeaveForm] = React.useState(false);
  // Add leave_type to form data
  const [leaveFormData, setLeaveFormData] = React.useState({ leave_date: '', reason: '', leave_type: 'Annual' });
  const [isSubmittingLeave, setIsSubmittingLeave] = React.useState(false); // Specific for leave submission
  const [loadingLeaveData, setLoadingLeaveData] = React.useState(true); // Specific for leave data

  // Memoize user and date values
  const user = React.useMemo(() => getCurrentStaffUser(), [])
  const today = React.useMemo(() => new Date().toLocaleDateString('en-CA'), [])
  const currentDay = React.useMemo(() => new Date().toLocaleDateString('en-US', { weekday: 'long' }), [])

  // Prevent concurrent requests
  const isLoadingRef = useRef(false)

  const loadTeacherSpecificData = React.useCallback(async () => {
    if (!user || !user.id) {
      setLoadingLeaveData(false);
      return;
    }
    setLoadingLeaveData(true);
    try {
      const [balance, applicationsResult] = await Promise.all([
        getLeaveBalance(user.id),
        getTeacherLeaveApplications(user.id)
      ]);
      setLeaveBalance(balance);
      // If getTeacherLeaveApplications returns { applications, count }, use .applications
      if (Array.isArray(applicationsResult)) {
        setLeaveApplications(applicationsResult);
      } else if (applicationsResult && Array.isArray(applicationsResult.applications)) {
        setLeaveApplications(applicationsResult.applications);
      } else {
        setLeaveApplications([]);
      }
    } catch (error) {
      console.error("Error loading leave data:", error);
      showToast(error instanceof Error ? error.message : "Failed to load leave information.", "error");
    } finally {
      setLoadingLeaveData(false);
    }
  }, [user, showToast]);

  // Memoized data loaders
  const loadData = React.useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    try {
      if (!user || !user.id) {
        throw new Error('No user session. Please contact creator - Shan')
      }
      // Load today's schedule
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('day', currentDay)
        .order('time')

      if (scheduleError) throw scheduleError
      // Add teacher name to schedule data
      const schedulesWithTeacher = (scheduleData || []).map(schedule => ({
        ...schedule,
        users: { name: user.name }
      }))
      setTodaySchedule(schedulesWithTeacher)

      // Load today's attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('date', today)
        .maybeSingle()

      if (attendanceError) {
        console.error('Attendance query error:', attendanceError)
        throw attendanceError
      }
      setAttendanceStatus(attendanceData)
    } catch (error) {
      console.error('Error loading data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Please contact creator - Shan'
      showToast(errorMessage, 'error')
    } finally {
      setLoading(false)
      isLoadingRef.current = false;
    }
  }, [showToast, user, currentDay, today])

  const loadBehaviorReports = React.useCallback(async () => {
    if (!user || !user.id) return;
    try {
      const { data: reports, error } = await supabase
        .from('behavior_reports')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Behavior reports query error:', error)
        return
      }

      setBehaviorReports(reports || [])
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Please contact creator - Shan', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast, user])

  const loadActiveSessions = React.useCallback(async () => {
    if (!user || !user.id) return;
    try {
      const { data: sessions, error } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('status', 'active')
        .order('start_time', { ascending: false })

      if (error) {
        console.error('Active sessions query error:', error)
        return
      }

      setActiveSessions(sessions || [])
    } catch (error) {
      console.error('Error loading active sessions:', error)
    }
  }, [user])

  React.useEffect(() => {
    if (!user || !user.id) return;
    loadData();
    loadBehaviorReports();
    loadActiveSessions();
    loadTeacherSpecificData();
    // Only run when user or the memoized functions change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loadTeacherSpecificData, loadData, loadBehaviorReports, loadActiveSessions]);

  const handleConfirmAttendance = async () => {
    if (attendanceStatus) {
      showToast('Attendance already confirmed for today', 'warning')
      return
    }

    setSubmitting(true)
    try {
      const currentUser = getCurrentStaffUser()
      if (!currentUser) {
        throw new Error('No user session. Please contact creator - Shan')
      }

      const { error } = await supabase
        .from('attendance_logs')
        .insert({
          teacher_id: currentUser.id,
          date: today,
          status: 'present'
        })

      if (error) {
        console.error('Attendance insert error:', error)
        throw new Error('Please contact creator - Shan')
      }
      
      showToast('Attendance confirmed successfully', 'success')
      loadData()
    } catch (error) {
      console.error('Error confirming attendance:', error)
      const errorMessage = error instanceof Error ? error.message : 'Please contact creator - Shan'
      showToast(errorMessage, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSignOut = async (status: 'break' | 'absent') => {
    setSubmitting(true)
    try {
      const currentUser = getCurrentStaffUser()
      if (!currentUser) {
        throw new Error('No user session. Please contact creator - Shan')
      }

      if (attendanceStatus) {
        // Update existing record
        const { error } = await supabase
          .from('attendance_logs')
          .update({
            status,
            remarks: remarks || null
          })
          .eq('id', attendanceStatus.id)

        if (error) {
          console.error('Attendance update error:', error)
          throw new Error('Please contact creator - Shan')
        }
      } else {
        // Create new record
        const { error } = await supabase
          .from('attendance_logs')
          .insert({
            teacher_id: currentUser.id,
            date: today,
            status,
            remarks: remarks || null
          })

        if (error) {
          console.error('Attendance insert error:', error)
          throw new Error('Please contact creator - Shan')
        }
      }
      
      showToast(`Status updated to ${status}`, 'success')
      setShowSignOutForm(false)
      setRemarks('')
      loadData()
    } catch (error) {
      console.error('Error updating status:', error)
      const errorMessage = error instanceof Error ? error.message : 'Please contact creator - Shan'
      showToast(errorMessage, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const canStartClass = (schedule: any) => {
    const now = new Date()
    const [hours, minutes] = schedule.time.split(':').map(Number)
    const classTime = new Date()
    classTime.setHours(hours, minutes, 0, 0)
    
    // Can start 15 minutes before class time
    const startWindow = new Date(classTime.getTime() - 15 * 60 * 1000)
    
    // Check if already started
    const alreadyStarted = activeSessions.some(session => 
      session.schedule_id === schedule.id && session.status === 'active'
    )
    
    return now >= startWindow && !alreadyStarted
  }

  const getActiveSession = (schedule: any) => {
    return activeSessions.find(session => 
      session.schedule_id === schedule.id && session.status === 'active'
    )
  }

  const handleStartClass = async (schedule: any) => {
    const currentUser = getCurrentStaffUser()
    if (!currentUser) {
      showToast('No user session. Please contact creator - Shan', 'error')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('class_sessions')
        .insert({
          teacher_id: currentUser.id,
          schedule_id: schedule.id,
          class_level: schedule.level,
          subject: schedule.subject,
          status: 'active'
        })

      if (error) {
        console.error('Start class error:', error)
        throw new Error('Error managing class. Please contact Creator - Shan')
      }

      showToast('Class started successfully', 'success')
      loadActiveSessions()
    } catch (error) {
      console.error('Error starting class:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error managing class. Please contact Creator - Shan'
      showToast(errorMessage, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEndClass = async (session: any) => {
    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('class_sessions')
        .update({
          end_time: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', session.id)

      if (error) {
        console.error('End class error:', error)
        throw new Error('Error managing class. Please contact Creator - Shan')
      }

      // Calculate duration
      const startTime = new Date(session.start_time)
      const endTime = new Date()
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))

      setCompletedSession({
        ...session,
        end_time: endTime.toISOString(),
        duration
      })

      showToast('Class ended. Summary generated', 'success')
      loadActiveSessions()
    } catch (error) {
      console.error('Error ending class:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error managing class. Please contact Creator - Shan'
      showToast(errorMessage, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBehaviorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const currentUser = getCurrentStaffUser()
    if (!currentUser) {
      showToast('No user session. Please contact creator - Shan', 'error')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('behavior_reports')
        .insert({
          student_name: behaviorForm.student_name,
          class_level: behaviorForm.class_level,
          incident: behaviorForm.incident,
          action_taken: behaviorForm.action_taken,
          teacher_id: currentUser.id
        })

      if (error) {
        console.error('Behavior report insert error:', error)
        throw new Error('Please contact creator - Shan')
      }

      showToast('Behavior report submitted successfully', 'success')
      setShowBehaviorForm(false)
      setBehaviorForm({
        student_name: '',
        class_level: '',
        incident: '',
        action_taken: ''
      })
      loadBehaviorReports()
    } catch (error) {
      console.error('Error submitting behavior report:', error)
      const errorMessage = error instanceof Error ? error.message : 'Please contact creator - Shan'
      showToast(errorMessage, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // --- Annual Leave Logic ---
  // Support select for leave_type
  const handleLeaveFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setLeaveFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.id) {
      showToast("User not found. Please log in again.", "error");
      return;
    }

    if (!leaveFormData.leave_date) {
      showToast("Please select a leave date.", "error");
      return;
    }
    if (!leaveFormData.leave_type) {
      showToast("Please select a leave type.", "error");
      return;
    }
    const selectedDate = new Date(leaveFormData.leave_date);
    const todayDateOnly = new Date();
    todayDateOnly.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayDateOnly);
    tomorrow.setDate(todayDateOnly.getDate() + 1);
    if (selectedDate < tomorrow) {
      showToast("Leave date must be for a future date (tomorrow onwards).", "error");
      return;
    }
    if (leaveBalance && leaveBalance.remaining_leaves <= 0) {
      showToast("You have no remaining leave days to apply.", "error");
      return;
    }

    setIsSubmittingLeave(true);
    try {
      await submitLeaveApplication(user.id, leaveFormData.leave_date, leaveFormData.reason, leaveFormData.leave_type as LeaveType);
      showToast("Leave application submitted successfully! Status: Pending.", "success");
      setShowLeaveForm(false);
      setLeaveFormData({ leave_date: '', reason: '', leave_type: 'Annual' });
      loadTeacherSpecificData();
    } catch (error) {
      console.error("Error submitting leave:", error);
      showToast(error instanceof Error ? error.message : "Failed to submit leave application.", "error");
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const handleCancelLeave = async (leaveId: string) => {
    if (!user || !user.id) return;
    if (!confirm("Are you sure you want to cancel this leave application? This action cannot be undone.")) return;

    // Use a more specific loading state if multiple actions can happen
    // For now, re-using isSubmittingLeave, but ideally, it would be distinct.
    const originalSubmittingState = isSubmittingLeave;
    setIsSubmittingLeave(true);
    try {
      const result = await cancelLeaveApplicationByTeacher(leaveId);
      if (result.success) {
        showToast(result.message, "success");
        loadTeacherSpecificData();
      } else {
        showToast(result.message || "Failed to cancel leave application.", "error");
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "An error occurred while cancelling.", "error");
    } finally {
      setIsSubmittingLeave(originalSubmittingState); // Restore if it was true for another reason
    }
  };

  if (loading && !user) { // Show main loader only if user data isn't available yet for other sections
    return (
      <Layout title="Teacher Dashboard">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Teacher Dashboard">
      {/* Responsive tab navigation, styled like HeadDashboard */}
      <div className="flex flex-col gap-4 sm:gap-6 px-2 sm:px-0 pb-20 bg-white min-h-screen transition-colors">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-orange-100 to-orange-50 rounded-xl p-4 sm:p-6 shadow-md flex flex-col gap-2">
          <h3 className="text-lg sm:text-xl font-bold text-orange-900 mb-1">
            {getGreeting(user?.name)}
          </h3>
          <p className="text-xs sm:text-sm text-orange-700">
            Today is {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border sticky top-0 z-20 px-0 sm:px-0">
          <div className="border-b">
            <nav className="flex space-x-2 sm:space-x-8 px-0 sm:px-6 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-3 px-2 border-b-2 font-semibold text-xs sm:text-sm flex-1 ${activeTab === 'dashboard' ? 'border-orange-500 text-orange-700 bg-orange-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'}`}
              >
                <span className="sm:hidden">🏠</span>
                <span className="hidden sm:inline">🏠 Dashboard</span>
              </button>
              <button
                onClick={() => setActiveTab('announcement')}
                className={`py-3 px-2 border-b-2 font-semibold text-xs sm:text-sm flex-1 ${activeTab === 'announcement' ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'}`}
              >
                <span className="sm:hidden">📢</span>
                <span className="hidden sm:inline">📢 Announcement</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Announcement Tab */}
        {activeTab === 'announcement' && (
          <div className="w-full max-w-3xl mx-auto mt-8">
            <div className="bg-white rounded-lg shadow-sm border p-6 xl:p-8 flex flex-col min-w-0 min-h-[600px] xl:min-h-[700px]">
              <AnnouncementFeed />
            </div>
          </div>
        )}

        {/* Dashboard Tab Content */}
        {activeTab === 'dashboard' && (
          <>
            {/* Attendance Section */}
            <div className="w-full max-w-4xl mx-auto mt-8">
              <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 flex flex-col min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CheckSquare className="h-5 w-5 mr-2 text-orange-600" />
                  Daily Attendance
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-sm text-gray-700">
                      Status:{' '}
                      <span className={`font-semibold px-2 py-1 rounded-full 
                        ${attendanceStatus?.status === 'present' ? 'bg-green-100 text-green-700' : ''}
                        ${attendanceStatus?.status === 'break' ? 'bg-yellow-100 text-yellow-700' : ''}
                        ${attendanceStatus?.status === 'absent' ? 'bg-red-100 text-red-700' : ''}
                        ${!attendanceStatus ? 'bg-gray-100 text-gray-500' : ''}`}
                      >
                        {attendanceStatus ? attendanceStatus.status.charAt(0).toUpperCase() + attendanceStatus.status.slice(1) : 'Not Checked In'}
                      </span>
                    </span>
                    {attendanceStatus?.remarks && (
                      <span className="text-xs text-gray-500">Remarks: {attendanceStatus.remarks}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {!attendanceStatus && (
                      <button
                        onClick={handleConfirmAttendance}
                        disabled={submitting}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm disabled:opacity-50"
                      >
                        Check In
                      </button>
                    )}
                    {attendanceStatus && attendanceStatus.status === 'present' && (
                      <>
                        <button
                          onClick={() => setShowSignOutForm(true)}
                          className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors text-sm"
                        >
                          Break
                        </button>
                        <button
                          onClick={() => setShowSignOutForm(true)}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                        >
                          Sign Out
                        </button>
                      </>
                    )}
                    {attendanceStatus && attendanceStatus.status === 'break' && (
                      <button
                        onClick={handleConfirmAttendance}
                        disabled={submitting}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm disabled:opacity-50"
                      >
                        Return from Break
                      </button>
                    )}
                  </div>
                  {showSignOutForm && (
                    <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (optional)</label>
                      <input
                        type="text"
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                        className="w-full border rounded px-2 py-1 bg-white border-gray-300 text-gray-900 mb-2"
                        placeholder="Enter remarks (optional)"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setShowSignOutForm(false)}
                          className="px-3 py-1 bg-gray-300 text-gray-800 rounded"
                        >Cancel</button>
                        <button
                          onClick={() => handleSignOut('break')}
                          disabled={submitting}
                          className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                        >Break</button>
                        <button
                          onClick={() => handleSignOut('absent')}
                          disabled={submitting}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >Sign Out</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Today's Schedule */}
            <div className="w-full max-w-4xl mx-auto mt-8">
              <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 flex flex-col min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-orange-600" />
                  Today's Schedule ({currentDay})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-700 dark:text-gray-200">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-3 py-2">Time</th>
                        <th className="px-3 py-2">Class</th>
                        <th className="px-3 py-2">Subject</th>
                        <th className="px-3 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                      {todaySchedule.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-4 text-gray-400 dark:text-gray-500">No classes scheduled for today.</td>
                        </tr>
                      ) : (
                        todaySchedule.map(schedule => {
                          const activeSession = getActiveSession(schedule)
                          return (
                            <tr key={schedule.id}>
                              <td className="px-3 py-2">{schedule.time}</td>
                              <td className="px-3 py-2">{schedule.level}</td>
                              <td className="px-3 py-2">{schedule.subject}</td>
                              <td className="px-3 py-2">
                                {activeSession ? (
                                  <button
                                    onClick={() => handleEndClass(activeSession)}
                                    disabled={submitting}
                                    className="px-3 py-1 bg-red-600 dark:bg-red-700 text-white rounded hover:bg-red-700 dark:hover:bg-red-800 transition-colors text-xs"
                                  >End Class</button>
                                ) : (
                                  <button
                                    onClick={() => handleStartClass(schedule)}
                                    disabled={!canStartClass(schedule) || submitting}
                                    className="px-3 py-1 bg-emerald-600 dark:bg-emerald-700 text-white rounded hover:bg-emerald-700 dark:hover:bg-emerald-800 transition-colors text-xs disabled:opacity-50"
                                  >Start Class</button>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Behavior Reports Section */}
            <div className="w-full max-w-4xl mx-auto mt-8">
              <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 flex flex-col min-w-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-orange-600" />
                    Behavior Reports
                  </h3>
                  <button
                    onClick={() => setShowBehaviorForm(true)}
                    type="button"
                    className="flex items-center px-2 sm:px-3 py-2 bg-orange-600 dark:bg-orange-700 text-white rounded-md hover:bg-orange-700 dark:hover:bg-orange-800 transition-colors text-xs sm:text-sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">New Report</span>
                    <span className="sm:hidden">New</span>
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-700 dark:text-gray-200">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-3 py-2">Student</th>
                        <th className="px-3 py-2">Class</th>
                        <th className="px-3 py-2">Incident</th>
                        <th className="px-3 py-2">Action Taken</th>
                        <th className="px-3 py-2">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                      {behaviorReports.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4 text-gray-400 dark:text-gray-500">No behavior reports found.</td>
                        </tr>
                      ) : (
                        behaviorReports.map(report => (
                          <tr key={report.id}>
                            <td className="px-3 py-2">{report.student_name}</td>
                            <td className="px-3 py-2">{report.class_level}</td>
                            <td className="px-3 py-2 max-w-xs truncate" title={report.incident}>{report.incident}</td>
                            <td className="px-3 py-2 max-w-xs truncate" title={report.action_taken}>{report.action_taken}</td>
                            <td className="px-3 py-2">{new Date(report.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Annual Leave Section - auto-expand as applications grow */}
            <div className="w-full max-w-4xl mx-auto mt-8">
              <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 flex flex-col min-w-0 max-h-[80vh] overflow-y-auto transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                    <Briefcase className="h-5 w-5 mr-2 text-orange-600" />
                    Annual Leave Management
                  </h3>
                  <button
                    onClick={() => setShowLeaveForm(true)}
                    type="button"
                    disabled={loadingLeaveData || (leaveBalance !== null && leaveBalance.remaining_leaves <= 0)}
                    className="flex items-center px-3 py-2 bg-orange-600 dark:bg-orange-700 text-white rounded-md hover:bg-orange-700 dark:hover:bg-orange-800 transition-colors text-sm disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Apply for Leave
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-700 dark:text-gray-200">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-3 py-2">Leave Date</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Reason</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                      {leaveApplications.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4 text-gray-400 dark:text-gray-500">No leave applications found.</td>
                        </tr>
                      ) : (
                        leaveApplications.map(app => (
                          <tr key={app.id}>
                            <td className="px-3 py-2">{app.leave_date}</td>
                            <td className="px-3 py-2">{app.leave_type}</td>
                            <td className="px-3 py-2 max-w-xs truncate" title={app.reason || ''}>{app.reason || '-'}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                                ${app.status === 'Pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200' : ''}
                                ${app.status === 'Approved' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : ''}
                                ${app.status === 'Rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : ''}
                              `}>
                                {app.status}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {app.status === 'Pending' && (
                                <button
                                  onClick={() => handleCancelLeave(app.id)}
                                  disabled={isSubmittingLeave}
                                  className="px-3 py-1 bg-red-600 dark:bg-red-700 text-white rounded hover:bg-red-700 dark:hover:bg-red-800 transition-colors text-xs"
                                >Cancel</button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Class Summary Modal */}
            {completedSession && (
              <div className="w-full max-w-4xl mx-auto mt-8">
                <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 flex flex-col min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <CheckSquare className="h-5 w-5 mr-2 text-green-600" />
                    ✅ Class Summary
                  </h3>
                  {/* ...existing summary modal JSX... */}
                </div>
              </div>
            )}
          </>
        )}

        {/* Leave Modal */}
        {showLeaveForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
                onClick={() => setShowLeaveForm(false)}
                aria-label="Close"
              >✕</button>
              <h3 className="text-lg font-semibold mb-4 text-orange-700">Apply for Leave</h3>
              <form onSubmit={handleSubmitLeave} className="flex flex-col gap-3">
                <label className="text-sm font-medium text-gray-700">Leave Type*</label>
                <select
                  name="leave_type"
                  className="border rounded px-2 py-1"
                  value={leaveFormData.leave_type}
                  onChange={handleLeaveFormChange}
                  required
                >
                  <option value="">Select type</option>
                  <option value="Annual">Annual</option>
                  <option value="Medical">Medical</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Sick">Sick</option>
                  <option value="Maternity">Maternity</option>
                  <option value="Paternity">Paternity</option>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Other">Other</option>
                </select>
                <label className="text-sm font-medium text-gray-700">Leave Date*</label>
                <input
                  type="date"
                  name="leave_date"
                  className="border rounded px-2 py-1"
                  value={leaveFormData.leave_date}
                  onChange={handleLeaveFormChange}
                  required
                />
                <label className="text-sm font-medium text-gray-700">Reason</label>
                <textarea
                  name="reason"
                  className="border rounded px-2 py-1"
                  value={leaveFormData.reason}
                  onChange={handleLeaveFormChange}
                  rows={2}
                />
                <button
                  type="submit"
                  disabled={isSubmittingLeave}
                  className="mt-2 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {isSubmittingLeave ? 'Submitting...' : 'Submit'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Behavior Report Modal */}
        {showBehaviorForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
                onClick={() => setShowBehaviorForm(false)}
                aria-label="Close"
              >✕</button>
              <h3 className="text-lg font-semibold mb-4 text-orange-700">Create Behavior Report</h3>
              <form onSubmit={handleBehaviorSubmit} className="flex flex-col gap-3">
                <label className="text-sm font-medium text-gray-700">Student Name*</label>
                <input
                  type="text"
                  name="student_name"
                  className="border rounded px-2 py-1"
                  value={behaviorForm.student_name}
                  onChange={e => setBehaviorForm(f => ({ ...f, student_name: e.target.value }))}
                  required
                />
                <label className="text-sm font-medium text-gray-700">Class*</label>
                <input
                  type="text"
                  name="class_level"
                  className="border rounded px-2 py-1"
                  value={behaviorForm.class_level}
                  onChange={e => setBehaviorForm(f => ({ ...f, class_level: e.target.value }))}
                  required
                />
                <label className="text-sm font-medium text-gray-700">Incident*</label>
                <textarea
                  name="incident"
                  className="border rounded px-2 py-1"
                  value={behaviorForm.incident}
                  onChange={e => setBehaviorForm(f => ({ ...f, incident: e.target.value }))}
                  rows={2}
                  required
                />
                <label className="text-sm font-medium text-gray-700">Action Taken</label>
                <textarea
                  name="action_taken"
                  className="border rounded px-2 py-1"
                  value={behaviorForm.action_taken}
                  onChange={e => setBehaviorForm(f => ({ ...f, action_taken: e.target.value }))}
                  rows={2}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </form>
            </div>
          </div>
        )}

        <AIButton userRole="teacher" />
      </div>
    </Layout>
  )
}

// Minimal ScheduleMatrix type if not already globally available or needed by other parts
// Ensure this type is defined if it's used by the parts of the code I've marked as "... existing ... JSX ..."
// (Removed unused type ScheduleCell)