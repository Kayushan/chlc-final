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
      {/* Responsive tab buttons */}
      <div className="flex flex-wrap gap-2 mb-4 px-2 sm:px-0">
        <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded text-sm sm:text-base ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'} transition-colors w-full sm:w-auto`}>Dashboard</button>
        <button onClick={() => setActiveTab('announcement')} className={`px-4 py-2 rounded text-sm sm:text-base ${activeTab === 'announcement' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'} transition-colors w-full sm:w-auto`}>Announcement</button>
      </div>
      {activeTab === 'announcement' ? (
        <div className="px-1 sm:px-0"><AnnouncementFeed /></div>
      ) : null}
      <div className="space-y-6 px-1 sm:px-0">
        {/* Welcome Section */}
        <div className="bg-orange-50 rounded-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-orange-900 mb-2">
            {getGreeting(user?.name)}
          </h3>
          <p className="text-orange-700">
            Today is {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Attendance Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CheckSquare className="h-5 w-5 mr-2 text-orange-600" />
            Daily Attendance
          </h3>
          
          <div className="space-y-4">
            {attendanceStatus ? (
              <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-md text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-green-900">
                      Status: <span className="capitalize">{attendanceStatus.status}</span>
                    </p>
                    {attendanceStatus.remarks && (
                      <p className="text-sm text-green-700 mt-1">
                        Remarks: {attendanceStatus.remarks}
                      </p>
                    )}
                  </div>
                  <div className="text-sm text-green-600">
                    {new Date(attendanceStatus.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-md text-sm">
                <p className="text-yellow-800 mb-3">Please confirm your attendance for today</p>
                <button
                  onClick={handleConfirmAttendance}
                  disabled={submitting}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Confirming...' : 'Confirm Attendance'}
                </button>
              </div>
            )}

            {/* Sign Out Options */}
            {attendanceStatus && attendanceStatus.status === 'present' && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <button
                    onClick={() => setShowSignOutForm(true)}
                    className="flex items-center px-3 sm:px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm"
                  >
                    <Coffee className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Take Break</span>
                    <span className="sm:hidden">Break</span>
                  </button>
                  <button
                    onClick={() => handleSignOut('absent')}
                    disabled={submitting}
                    className="flex items-center px-3 sm:px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors text-sm"
                  >
                    <SignOut className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Sign Out</span>
                    <span className="sm:hidden">Out</span>
                  </button>
                </div>

                {showSignOutForm && (
                  <div className="p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-md">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Remarks (optional)
                    </label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                      rows={3}
                      placeholder="Add any remarks..."
                    />
                    <div className="flex flex-wrap gap-2 sm:gap-3 mt-3">
                      <button
                        onClick={() => handleSignOut('break')}
                        disabled={submitting}
                        className="px-3 sm:px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 transition-colors text-sm"
                      >
                        {submitting ? 'Updating...' : 'Confirm Break'}
                      </button>
                      <button
                        onClick={() => setShowSignOutForm(false)}
                        className="px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-orange-600" />
            Today's Schedule ({currentDay})
          </h3>
          
          {todaySchedule.length > 0 ? (
            <div className="space-y-3">
              {todaySchedule.map((schedule) => {
                const activeSession = getActiveSession(schedule)
                const canStart = canStartClass(schedule)
                
                return (
                  <div key={schedule.id} className="p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-md text-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {schedule.level} - {schedule.subject}
                        </p>
                        <p className="text-sm text-gray-600">
                          Time: {schedule.time}
                        </p>
                        {activeSession && (
                          <p className="text-sm text-green-600 font-medium">
                            ✅ Class in session (started {new Date(activeSession.start_time).toLocaleTimeString()})
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                          {schedule.time}
                        </span>
                        
                        {/* Class Control Buttons */}
                        {canStart && !activeSession && (
                          <button
                            onClick={() => handleStartClass(schedule)}
                            disabled={submitting}
                            className="flex items-center px-2 sm:px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors text-xs sm:text-sm"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">Start Class</span>
                            <span className="sm:hidden">Start</span>
                          </button>
                        )}
                        
                        {activeSession && (
                          <button
                            onClick={() => handleEndClass(activeSession)}
                            disabled={submitting}
                            className="flex items-center px-2 sm:px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors text-xs sm:text-sm"
                          >
                            <Square className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">End Class</span>
                            <span className="sm:hidden">End</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              No classes scheduled for today
            </p>
          )}
        </div>

        {/* Behavior Reports Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-orange-600" />
              Behavior Reports
            </h3>
            <button
              onClick={() => setShowBehaviorForm(true)}
              className="flex items-center px-2 sm:px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-xs sm:text-sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">New Report</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>

          {/* Behavior Report Form */}
          {showBehaviorForm && (
            <div className="mb-6 p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-md">
              <h4 className="text-sm sm:text-base font-medium text-gray-900 mb-3">Submit Behavior Report</h4>
              
              <form onSubmit={handleBehaviorSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Student Name</label>
                    <input
                      type="text"
                      value={behaviorForm.student_name}
                      onChange={(e) => setBehaviorForm(prev => ({ ...prev, student_name: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Class Level</label>
                    <select
                      value={behaviorForm.class_level}
                      onChange={(e) => setBehaviorForm(prev => ({ ...prev, class_level: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    >
                      <option value="">Select Level</option>
                      <option value="Pre-K">Pre-K</option>
                      <option value="K1">K1</option>
                      <option value="K2">K2</option>
                      <option value="P1">P1</option>
                      <option value="P2">P2</option>
                      <option value="P3">P3</option>
                      <option value="P4">P4</option>
                      <option value="P5">P5</option>
                      <option value="P6">P6</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Incident Description</label>
                  <textarea
                    value={behaviorForm.incident}
                    onChange={(e) => setBehaviorForm(prev => ({ ...prev, incident: e.target.value }))}
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    placeholder="Describe what happened..."
                  />
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Action Taken</label>
                  <textarea
                    value={behaviorForm.action_taken}
                    onChange={(e) => setBehaviorForm(prev => ({ ...prev, action_taken: e.target.value }))}
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    placeholder="Describe what action was taken..."
                  />
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-3 sm:px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 transition-colors text-sm"
                  >
                    {submitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBehaviorForm(false)}
                    className="px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Recent Reports */}
          {behaviorReports.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-xs sm:text-sm font-medium text-gray-700">Your Recent Reports</h4>
              {behaviorReports.map((report) => (
                <div key={report.id} className="p-2 sm:p-3 bg-gray-50 border border-gray-200 rounded-md text-xs sm:text-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {report.student_name} ({report.class_level})
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(report.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700 mb-2">
                    <strong>Incident:</strong> {report.incident}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-700">
                    <strong>Action:</strong> {report.action_taken}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4 text-sm">
              No behavior reports submitted yet.
            </p>
          )}
        </div>

        {/* Class Summary Modal */}
        {completedSession && (
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border text-sm">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CheckSquare className="h-5 w-5 mr-2 text-green-600" />
              ✅ Class Summary
            </h3>
            
            <div className="space-y-2 text-xs sm:text-sm">
              <p><strong>Subject:</strong> {completedSession.subject}</p>
              <p><strong>Level:</strong> {completedSession.class_level}</p>
              <p><strong>Duration:</strong> {completedSession.duration} minutes</p>
              <p><strong>Started at:</strong> {new Date(completedSession.start_time).toLocaleTimeString()}</p>
              <p><strong>Ended at:</strong> {new Date(completedSession.end_time).toLocaleTimeString()}</p>
            </div>
            
            <button
              onClick={() => setCompletedSession(null)}
              className="mt-4 px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
            >
              Close Summary
            </button>
          </div>
        )}

        {/* Annual Leave Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
              <Briefcase className="h-5 w-5 mr-2 text-orange-600" />
              Annual Leave Management
            </h3>
            <button
              onClick={() => setShowLeaveForm(true)}
              disabled={loadingLeaveData || (leaveBalance !== null && leaveBalance.remaining_leaves <= 0)}
              className="flex items-center px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm disabled:opacity-50"
            >
              <Plus className="h-4 w-4 mr-1" /> Apply for Leave
            </button>
          </div>

          {loadingLeaveData && <p className="text-sm text-gray-500 py-4 text-center">Loading leave information...</p>}

          {!loadingLeaveData && leaveBalance && (
            <div className="mb-4 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
              <p className="text-sm text-blue-800">
                You have <span className="font-bold">{leaveBalance.remaining_leaves}</span> out of {leaveBalance.total_leaves} annual leave days remaining.
              </p>
              {leaveBalance.remaining_leaves <= 0 && !loadingLeaveData && ( // Ensure not to show if still loading
                 <p className="text-xs text-red-600 mt-1">You have no leave days left to apply.</p>
              )}
            </div>
          )}
          {!loadingLeaveData && !leaveBalance && (
            <p className="text-sm text-red-500 py-4 text-center">Could not load your leave balance. Please contact admin.</p>
          )}


          {/* Leave Application Form Modal */}
          {showLeaveForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 transition-opacity duration-300 ease-in-out">
              <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md transform transition-all duration-300 ease-in-out scale-100">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-800">Apply for Leave</h4>
                  <button onClick={() => setShowLeaveForm(false)} className="text-gray-400 hover:text-gray-600">
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
                <form onSubmit={handleSubmitLeave} className="space-y-3">
                  <div>
                    <label htmlFor="leave_type" className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                    <select
                      id="leave_type"
                      name="leave_type"
                      value={leaveFormData.leave_type}
                      onChange={handleLeaveFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    >
                      <option value="Annual">Annual</option>
                      <option value="Medical">Medical</option>
                      <option value="Emergency">Emergency</option>
                      <option value="Sick">Sick</option>
                      <option value="Maternity">Maternity</option>
                      <option value="Paternity">Paternity</option>
                      <option value="Unpaid">Unpaid</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="leave_date" className="block text-sm font-medium text-gray-700 mb-1">Leave Date</label>
                    <input
                      type="date"
                      id="leave_date"
                      name="leave_date"
                      value={leaveFormData.leave_date}
                      onChange={handleLeaveFormChange}
                      required
                      min={new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
                    <textarea
                      id="reason"
                      name="reason"
                      value={leaveFormData.reason}
                      onChange={handleLeaveFormChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                      placeholder="Enter reason for leave (optional)"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setShowLeaveForm(false)} className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={isSubmittingLeave || (leaveBalance !== null && leaveBalance.remaining_leaves <= 0)} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 transition-colors">
                      {isSubmittingLeave ? 'Submitting...' : 'Submit Application'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* My Leave Applications Table */}
          <h4 className="text-md font-semibold text-gray-800 mt-6 mb-3">My Leave Applications</h4>
          {!loadingLeaveData && leaveApplications.length > 0 ? (
            <div className="overflow-x-auto border rounded-md shadow-sm">
              <table className="w-full text-xs sm:text-sm min-w-[600px]">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 sm:p-3 text-left font-semibold text-gray-600">Leave Date</th>
                    <th className="p-2 sm:p-3 text-left font-semibold text-gray-600">Reason</th>
                    <th className="p-2 sm:p-3 text-left font-semibold text-gray-600">Status</th>
                    <th className="p-2 sm:p-3 text-left font-semibold text-gray-600">Applied On</th>
                    <th className="p-2 sm:p-3 text-left font-semibold text-gray-600">Reviewer Notes</th>
                    <th className="p-2 sm:p-3 text-left font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaveApplications.map(app => (
                    <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-2 sm:p-3 whitespace-nowrap">{new Date(app.leave_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="p-2 sm:p-3 whitespace-pre-wrap max-w-xs text-gray-700">{app.reason || '-'}</td>
                      <td className="p-2 sm:p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                          app.status === 'Approved' ? 'bg-green-100 text-green-800' :
                          app.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                          app.status === 'Cancelled' ? 'bg-gray-200 text-gray-700' :
                          'bg-yellow-100 text-yellow-800' // Pending
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="p-2 sm:p-3 whitespace-nowrap text-gray-600">{new Date(app.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="p-2 sm:p-3 whitespace-pre-wrap max-w-xs text-gray-700">{app.reviewer_notes || '-'}</td>
                      <td className="p-2 sm:p-3 whitespace-nowrap">
                        {app.status === 'Pending' && (
                          <button
                            onClick={() => handleCancelLeave(app.id)}
                            disabled={isSubmittingLeave}
                            className="text-xs text-red-500 hover:text-red-700 underline disabled:opacity-60 disabled:no-underline transition-colors"
                            title="Cancel this leave application"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !loadingLeaveData && <p className="text-gray-500 text-center py-6">No leave applications submitted yet.</p>
          )}
           {loadingLeaveData && <p className="text-gray-500 text-center py-6">Loading applications...</p>}
        </div>


        {/* Existing Attendance Section (ensure this is correctly placed or merged if needed) */}
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CheckSquare className="h-5 w-5 mr-2 text-orange-600" /> Daily Attendance
          </h3>
          {/* ... existing attendance JSX ... */}
        </div>

        {/* Existing Today's Schedule Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-orange-600" /> Today's Schedule ({currentDay})
          </h3>
          {/* ... existing schedule JSX ... */}
        </div>

        {/* Existing Behavior Reports Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border">
            {/* ... existing behavior reports UI ... */}
        </div>

        {/* Existing Class Summary Modal */}
        {completedSession && (  <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border">
            {/* ... existing summary modal JSX ... */}
          </div>)}

        {/* Existing Summary Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Today's Summary</h3>
            {/* ... existing summary UI ... */}
        </div>
      </div>

      <AIButton userRole="teacher" />
    </Layout>
  )
}

// Minimal ScheduleMatrix type if not already globally available or needed by other parts
// Ensure this type is defined if it's used by the parts of the code I've marked as "... existing ... JSX ..."
// (Removed unused type ScheduleCell)