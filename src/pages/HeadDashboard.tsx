import React from 'react'
import './HeadDashboardMobile.css';
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { AnnouncementFeed } from '../components/AnnouncementFeed'
import { AnnouncementCreateModal } from '../components/AnnouncementCreateModal'
import { AIButton } from '../components/AIButton'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { getCurrentStaffUser } from '../lib/auth'
import { BarChart3, CheckCircle, RefreshCw, FileText, Monitor, Brain, ChevronDown, ChevronUp, Plus } from 'lucide-react'
import {
  getAllTeacherLeaveBalancesWithDetails,
  updateTeacherTotalLeaves,
  getPendingLeaveApplicationsForAdmin
} from '../lib/leaveManagement'
import { getTeachersOnLeaveForDate } from '../lib/leaveHelpers'


export function HeadDashboard() {
  // For mobile bottom nav
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  // Dynamic greeting function
  function getGreeting(name?: string | null) {
    const hour = new Date().getHours();
    let greeting = 'Hello';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 18) greeting = 'Good afternoon';
    else greeting = 'Good evening';
    return `${greeting}, ${name || 'Head of School'}`;
  }
  const [showAnnouncementModal, setShowAnnouncementModal] = React.useState(false);
  const navigate = useNavigate()
  const { showToast } = useToast()
  const user = getCurrentStaffUser()
  const [teacherStatus, setTeacherStatus] = React.useState<any[]>([])
  const [behaviorReports, setBehaviorReports] = React.useState<any[]>([])
  const [activeSessions, setActiveSessions] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true) // General loading
  const [activeTab, setActiveTab] = React.useState<'overview' | 'classes' | 'leaves' | 'leaveSettings' | 'announcement'>('overview')

  // Remove duplicate isMobile declaration
  const [lastRefresh, setLastRefresh] = React.useState(new Date())
  const [expandedReports, setExpandedReports] = React.useState<Set<string>>(new Set())

  // Leave Settings State
  const [leaveBalances, setLeaveBalances] = React.useState<any[]>([])
  const [leaveBalancesLoading, setLeaveBalancesLoading] = React.useState(false)
  const [editLeaveId, setEditLeaveId] = React.useState<string | null>(null)
  const [editLeaveValue, setEditLeaveValue] = React.useState<string>("")
  const [leaveBalancesError, setLeaveBalancesError] = React.useState<string | null>(null)



  // --- DATA LOADERS: must be hoisted above useCallback/useEffect usage ---
  // Loader: Teacher Status (single, correct declaration)
  const loadTeacherStatus = React.useCallback(async () => {
    try {
      const { data: teachers, error: teachersError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('role', 'teacher')
        .order('name')
      if (teachersError) {
        console.error('Teachers query error:', teachersError)
        throw new Error('Please contact creator - Shan')
      }
      const today = new Date().toLocaleDateString('en-CA')
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance_logs')
        .select('teacher_id, status, remarks, created_at')
        .eq('date', today)
      if (attendanceError) {
        console.error('Attendance query error:', attendanceError)
      }
      const processedData = teachers.map(teacher => {
        const todayAttendance = attendanceRecords?.find(
          record => record.teacher_id === teacher.id
        )
        return {
          ...teacher,
          currentStatus: todayAttendance?.status || 'no-checkin',
          remarks: todayAttendance?.remarks,
          lastUpdate: todayAttendance?.created_at,
          attendance_logs: undefined
        }
      })
      setTeacherStatus(processedData)
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Error loading teacher status:', error)
      const errorMessage = error instanceof Error ? error.message : 'Please contact creator - Shan'
      showToast(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  // Loader: Behavior Reports
  const loadBehaviorReports = React.useCallback(async () => {
    try {
      const { data: reports, error: reportsError } = await supabase
        .from('behavior_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      if (reportsError) {
        console.error('Behavior reports query error:', reportsError)
        return
      }
      const { data: teachers, error: teachersError } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'teacher')
      if (teachersError) {
        console.error('Teachers query error:', teachersError)
        return
      }
      const reportsWithTeachers = (reports || []).map(report => ({
        ...report,
        teacher_name: teachers?.find(teacher => teacher.id === report.teacher_id)?.name || 'Unknown Teacher'
      }))
      setBehaviorReports(reportsWithTeachers)
    } catch (error) {
      console.error('Error loading behavior reports:', error)
    }
  }, [])

  // Loader: Active Sessions
  const loadActiveSessions = React.useCallback(async () => {
    try {
      const { data: sessions, error: sessionsError } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('status', 'active')
        .order('start_time', { ascending: false })
      if (sessionsError) {
        console.error('Active sessions query error:', sessionsError)
        return
      }
      const { data: teachers, error: teachersError } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'teacher')
      if (teachersError) {
        console.error('Teachers query error:', teachersError)
        return
      }
      const sessionsWithTeachers = (sessions || []).map(session => ({
        ...session,
        teacher_name: teachers?.find(teacher => teacher.id === session.teacher_id)?.name || 'Unknown Teacher'
      }))
      setActiveSessions(sessionsWithTeachers)
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Error loading active sessions:', error)
    }
  }, [])

  // Load all teacher leave balances for leave settings tab
  const loadLeaveBalances = React.useCallback(async () => {
    setLeaveBalancesLoading(true)
    setLeaveBalancesError(null)
    try {
      const { balances } = await getAllTeacherLeaveBalancesWithDetails(1, 100)
      setLeaveBalances(balances)
    } catch (err: any) {
      setLeaveBalancesError(err.message || 'Failed to load leave balances')
    } finally {
      setLeaveBalancesLoading(false)
    }
  }, [])

  // Save new total leaves for a teacher
  const handleSaveLeave = async (teacherId: string) => {
    const newVal = parseInt(editLeaveValue, 10)
    if (isNaN(newVal) || newVal < 0) {
      showToast('Please enter a valid non-negative number', 'error')
      return
    }
    try {
      await updateTeacherTotalLeaves(teacherId, newVal)
      showToast('Leave allowance updated', 'success')
      setEditLeaveId(null)
      setEditLeaveValue("")
      loadLeaveBalances()
    } catch (err: any) {
      showToast(err.message || 'Failed to update leave allowance', 'error')
    }
  }

  // When switching to leaveSettings tab, load balances
  React.useEffect(() => {
    if (activeTab === 'leaveSettings') {
      loadLeaveBalances()
    }
  }, [activeTab, loadLeaveBalances])

  // --- LEAVE APPLICATIONS: loader for pending leave applications ---
  const [pendingLeaves, setPendingLeaves] = React.useState<any[]>([])
  const [pendingLeavesLoading, setPendingLeavesLoading] = React.useState(false)
  const [pendingLeavesError, setPendingLeavesError] = React.useState<string | null>(null)

  const loadPendingLeaves = React.useCallback(async () => {
    setPendingLeavesLoading(true)
    setPendingLeavesError(null)
    try {
      const { applications } = await getPendingLeaveApplicationsForAdmin(1, 100)
      setPendingLeaves(applications)
    } catch (err: any) {
      setPendingLeavesError(err.message || 'Failed to load pending leave applications')
    } finally {
      setPendingLeavesLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (activeTab === 'leaves') {
      loadPendingLeaves()
    }
  }, [activeTab, loadPendingLeaves])

  const handleApproveLeave = async (leaveId: string) => {
    try {
      await import('../lib/leaveManagement').then(m => m.processLeaveApplicationByAdmin(leaveId, 'approve'))
      showToast('Leave approved', 'success')
      loadPendingLeaves()
    } catch (err: any) {
      showToast(err.message || 'Failed to approve leave', 'error')
    }
  }

  // Reviewer note modal state
  const [rejectModal, setRejectModal] = React.useState<{ open: boolean; leaveId?: string } | null>(null);
  const [reviewerNote, setReviewerNote] = React.useState('');

  const handleRejectLeave = async (leaveId: string, note: string) => {
    try {
      await import('../lib/leaveManagement').then(m => m.processLeaveApplicationByAdmin(leaveId, 'reject', note))
      showToast('Leave rejected', 'success')
      loadPendingLeaves()
    } catch (err: any) {
      showToast(err.message || 'Failed to reject leave', 'error')
    }
  }

  // --- MAIN DASHBOARD DATA LOADER ---
  const loadAllHeadData = React.useCallback(async (isInitialLoad = true) => {
    if (isInitialLoad) {
      setLoading(true); // For general sections
    }

    const criticalPromises = [
      loadTeacherStatus()
    ];

    try {
      await Promise.all(criticalPromises);
    } catch (error) {
      console.error("Error loading critical head dashboard data:", error);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
      setLastRefresh(new Date());
    }

    // Stagger non-critical data if it's an initial load
    if (isInitialLoad) {
      setTimeout(() => {
        loadBehaviorReports();
        loadActiveSessions();
      }, 700);
    }
  }, [loadTeacherStatus, loadBehaviorReports, loadActiveSessions])


  React.useEffect(() => {
    loadAllHeadData(true); // Initial full load with staggering
    const interval = setInterval(() => {
      loadTeacherStatus();
      if (activeTab === 'classes') loadActiveSessions();
      // Behavior reports might not need to auto-refresh as often, or could be manual.
    }, 60000);
    return () => clearInterval(interval);
  }, [activeTab, loadAllHeadData, loadTeacherStatus, loadActiveSessions]);

  const handleViewReport = async () => {
    // Collect all current data and format as before
    const currentDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    // Get teachers on leave today
    const today = new Date().toISOString().split('T')[0];
    const teachersOnLeave = await getTeachersOnLeaveForDate(today);
    const leaveSection = `TEACHERS ON LEAVE TODAY: ${teachersOnLeave.length}\n` +
      (teachersOnLeave.length > 0
        ? teachersOnLeave.map(t => `• ${t.teacherName} (${t.leaveType})${t.reason ? ': ' + t.reason : ''}`).join('\n')
        : '• None');

    const dataForReport = `
SCHOOL STATUS REPORT FOR ${currentDate}

TEACHER ATTENDANCE OVERVIEW:
- Total Teachers: ${teacherStatus.length}
- Present: ${statusCounts.present} teachers
- On Break: ${statusCounts.break} teachers  
- Absent: ${statusCounts.absent} teachers
- No Check-in: ${statusCounts.noCheckin} teachers

${leaveSection}

DETAILED TEACHER STATUS:
${teacherStatus.map(teacher => 
  `• ${teacher.name} (${teacher.email}): ${getStatusText(teacher.currentStatus)}${teacher.remarks ? ` - ${teacher.remarks}` : ''}${teacher.lastUpdate ? ` (Last update: ${new Date(teacher.lastUpdate).toLocaleTimeString()})` : ''}`
).join('\n')}

ACTIVE CLASSES IN SESSION:
- Total Active Classes: ${activeSessions.length}
${activeSessions.length > 0 ? activeSessions.map(session => {
  const startTime = new Date(session.start_time)
  const now = new Date()
  const duration = Math.round((now.getTime() - startTime.getTime()) / (1000 * 60))
  return `• ${session.class_level} ${session.subject} - Teacher: ${session.teacher_name} (${duration} minutes active)`
}).join('\n') : '• No classes currently in session'}

RECENT BEHAVIOR REPORTS:
- Total Recent Reports: ${behaviorReports.length}
${behaviorReports.length > 0 ? behaviorReports.slice(0, 5).map(report => 
  `• ${report.student_name} (${report.class_level}): ${report.incident.substring(0, 100)}${report.incident.length > 100 ? '...' : ''} - Action: ${report.action_taken.substring(0, 50)}${report.action_taken.length > 50 ? '...' : ''} [${report.teacher_name}, ${new Date(report.created_at).toLocaleDateString()}]`
).join('\n') : '• No recent behavior reports'}
`
    navigate('/school-report-viewer', { state: { reportContent: dataForReport } })
  }

  const toggleReportExpansion = (reportId: string) => {
    setExpandedReports(prev => {
      const newSet = new Set(prev)
      if (newSet.has(reportId)) {
        newSet.delete(reportId)
      } else {
        newSet.add(reportId)
      }
      return newSet
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-600 bg-green-100'
      case 'break': return 'text-yellow-600 bg-yellow-100'
      case 'absent': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present': return 'Present'
      case 'break': return 'On Break'
      case 'absent': return 'Absent'
      default: return 'No Check-in'
    }
  }

  const statusCounts = React.useMemo(() => {
    const counts = {
      present: 0,
      break: 0,
      absent: 0,
      noCheckin: 0
    }

    teacherStatus.forEach(teacher => {
      switch (teacher.currentStatus) {
        case 'present': counts.present++; break
        case 'break': counts.break++; break
        case 'absent': counts.absent++; break
        default: counts.noCheckin++; break
      }
    })

    return counts
  }, [teacherStatus])

  if (loading) {
    return (
      <Layout title="Head of School Dashboard">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Head of School Dashboard">
      <AnnouncementFeed />
      <AnnouncementCreateModal open={showAnnouncementModal} onClose={() => setShowAnnouncementModal(false)} />
      <div className="flex flex-col gap-4 sm:gap-6 px-2 sm:px-0 pb-20 bg-white dark:bg-gray-900 min-h-screen transition-colors">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-purple-100 to-purple-50 rounded-xl p-4 sm:p-6 shadow-md flex flex-col gap-2">
          <h3 className="text-lg sm:text-xl font-bold text-purple-900 mb-1">
      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t flex justify-around py-2 shadow-lg sm:hidden">
          <button onClick={() => setActiveTab('overview')} className={`flex flex-col items-center text-xs ${activeTab === 'overview' ? 'text-purple-700' : 'text-gray-400'}`}><span role="img" aria-label="Overview">📊</span><span>Overview</span></button>
          <button onClick={() => setActiveTab('classes')} className={`flex flex-col items-center text-xs ${activeTab === 'classes' ? 'text-purple-700' : 'text-gray-400'}`}><span role="img" aria-label="Classes">📚</span><span>Classes</span></button>
          <button onClick={() => setActiveTab('leaves')} className={`flex flex-col items-center text-xs ${activeTab === 'leaves' ? 'text-purple-700' : 'text-gray-400'}`}><span role="img" aria-label="Leaves">📝</span><span>Leaves</span></button>
          <button onClick={() => setActiveTab('leaveSettings')} className={`flex flex-col items-center text-xs ${activeTab === 'leaveSettings' ? 'text-purple-700' : 'text-gray-400'}`}><span role="img" aria-label="Settings">⚙️</span><span>Settings</span></button>
          <button onClick={() => setActiveTab('announcement')} className={`flex flex-col items-center text-xs ${activeTab === 'announcement' ? 'text-blue-700' : 'text-gray-400'}`}><span role="img" aria-label="Announce">📢</span><span>Announce</span></button>
        </nav>
      )}
            {getGreeting(user?.name)}
          </h3>
          <p className="text-xs sm:text-sm text-purple-700">
            Monitor teacher performance, resolve issues, and oversee daily operations at Charis Hope Learning Centre.
          </p>
        </div>
          <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <p className="text-xs sm:text-sm text-purple-600">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button
                onClick={handleViewReport}
                disabled={loading}
                className="flex-1 flex items-center justify-center px-3 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm"
              >
                <Brain className="h-5 w-5 mr-2" />
                <span>Report</span>
              </button>
              <button
                onClick={loadTeacherStatus}
                disabled={loading}
                className="flex-1 flex items-center justify-center px-3 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm"
              >
                <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              {(user?.role === 'admin' || user?.role === 'head' || user?.role === 'creator') && (
                <button onClick={() => setShowAnnouncementModal(true)} className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors text-sm">
                  <Plus className="h-5 w-5 mr-2" /> Announce
                </button>
              )}
            </div>
          </div>
      {/* Tab Navigation (hide on mobile when on 'leaves' tab) */}
      {!(isMobile && activeTab === 'leaves') && (
        <div className="bg-white rounded-lg shadow-sm border sticky top-0 z-20 px-0 sm:px-0">
          <div className="border-b">
            <nav className="flex space-x-2 sm:space-x-8 px-0 sm:px-6 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-2 border-b-2 font-semibold text-xs sm:text-sm flex-1 ${
                  activeTab === 'overview'
                    ? 'border-purple-500 text-purple-700 bg-purple-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                }`}
              >
                <span className="sm:hidden">📊</span>
                <span className="hidden sm:inline">📊 Teacher Overview</span>
              </button>
              <button
                onClick={() => setActiveTab('classes')}
                className={`py-3 px-2 border-b-2 font-semibold text-xs sm:text-sm flex-1 ${
                  activeTab === 'classes'
                    ? 'border-purple-500 text-purple-700 bg-purple-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                }`}
              >
                <span className="sm:hidden">📚</span>
                <span className="hidden sm:inline">📚 Active Classes</span>
              </button>
              <button
                onClick={() => setActiveTab('leaves')}
                className={`py-3 px-2 border-b-2 font-semibold text-xs sm:text-sm flex-1 ${
                  activeTab === 'leaves'
                    ? 'border-purple-500 text-purple-700 bg-purple-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                }`}
              >
                <span className="sm:hidden">📝</span>
                <span className="hidden sm:inline">📝 Pending Leaves</span>
              </button>
              <button
                onClick={() => setActiveTab('leaveSettings')}
                className={`py-3 px-2 border-b-2 font-semibold text-xs sm:text-sm flex-1 ${
                  activeTab === 'leaveSettings'
                    ? 'border-purple-500 text-purple-700 bg-purple-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                }`}
              >
                <span className="sm:hidden">⚙️</span>
                <span className="hidden sm:inline">⚙️ Set Annual Days</span>
              </button>
              <button
                onClick={() => setActiveTab('announcement')}
                className={`py-3 px-2 border-b-2 font-semibold text-xs sm:text-sm flex-1 ${
                  activeTab === 'announcement'
                    ? 'border-blue-500 text-blue-700 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                }`}
              >
                <span className="sm:hidden">📢</span>
                <span className="hidden sm:inline">📢 Announcement</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Announcement Tab */}
      {activeTab === 'announcement' && (
        <div className="w-full max-w-3xl mx-auto mt-8">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 xl:p-8 flex flex-col min-w-0 min-h-[600px] xl:min-h-[700px] transition-colors">
            <AnnouncementFeed />
            {(user?.role === 'admin' || user?.role === 'head' || user?.role === 'creator') && (
              <>
                <AnnouncementCreateModal
                  open={showAnnouncementModal}
                  onClose={() => setShowAnnouncementModal(false)}
                  modalClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                  inputClassName="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                  labelClassName="text-gray-700 dark:text-gray-200"
                  buttonClassName="bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800"
                />
                <button onClick={() => setShowAnnouncementModal(true)} className="mt-4 flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors text-lg">
                  <Plus className="h-5 w-5 mr-2" /> New Announcement
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Pending Leave Applications - Separated Card UI for Mobile */}
      {/* Place the Pending Leave Applications section below the tab navigation, not inside the tab content */}
      <div className="w-full flex flex-col items-center">
        {activeTab === 'leaves' && (
          <section className="max-w-lg mx-auto w-full mt-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-4 sm:p-6 mb-4 transition-colors">
              <h3 className="text-lg sm:text-xl font-bold text-purple-900 dark:text-purple-200 mb-1 flex items-center gap-2">
                <span className="inline-block bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-100 rounded-full px-2 py-1 text-xs font-semibold">Pending</span>
                Leave Applications
              </h3>
              <p className="text-xs sm:text-sm text-purple-700 dark:text-purple-300 mb-3">Approve or reject pending leave requests from teachers.</p>
              {pendingLeavesLoading ? (
                <div className="py-8 text-center text-gray-500 dark:text-gray-300">Loading pending leave applications...</div>
              ) : pendingLeavesError ? (
                <div className="py-8 text-center text-red-500 dark:text-red-400">{pendingLeavesError}</div>
              ) : pendingLeaves.length === 0 ? (
                <div className="py-8 text-center text-gray-400 dark:text-gray-500">No pending leave applications.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {pendingLeaves.map((leave) => (
                    <div key={leave.id} className="bg-white dark:bg-gray-800 rounded-xl shadow p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-purple-800 dark:text-purple-100 text-sm">{leave.users?.name || leave.teacher_id}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-300">{leave.leave_date}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs mb-1">
                          <span className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 rounded px-2 py-0.5">{leave.leave_type}</span>
                          <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded px-2 py-0.5">{leave.reason || '-'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2 sm:mt-0">
                        <button
                          className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow hover:bg-green-700 transition-colors"
                          onClick={() => handleApproveLeave(leave.id)}
                        >Approve</button>
                        <button
                          className="bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow hover:bg-red-700 transition-colors"
                          onClick={() => setRejectModal({ open: true, leaveId: leave.id })}
                        >Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Reviewer Note Modal */}
              {rejectModal?.open && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                  <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 w-full max-w-md transition-colors">
                    <h4 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">Reject Leave Application</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Please provide a reason for rejection (visible to the teacher):</p>
                    <textarea
                      className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-red-400"
                      rows={3}
                      value={reviewerNote}
                      onChange={e => setReviewerNote(e.target.value)}
                      placeholder="Enter reviewer note (required)"
                      required
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                        onClick={() => { setRejectModal(null); setReviewerNote(''); }}
                      >Cancel</button>
                      <button
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                        disabled={!reviewerNote.trim()}
                        onClick={async () => {
                          if (rejectModal?.leaveId) {
                            await handleRejectLeave(rejectModal.leaveId, reviewerNote);
                            setRejectModal(null);
                            setReviewerNote('');
                          }
                        }}
                      >Reject Leave</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      
      
      {/* Leave Settings Tab - Only show the Set Annual Leave Days card, auto-expand height as teachers/requests increase */}
      {activeTab === 'leaveSettings' && (
        <div className="w-full max-w-4xl mx-auto mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 flex flex-col min-w-0 min-h-[400px] max-h-[80vh] overflow-y-auto transition-all">
            <div className="p-4 sm:p-6 border-b">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Set Annual Leave Days for Teachers</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">View and update the annual leave allowance for each teacher.</p>
            </div>
            {leaveBalancesLoading ? (
              <div className="p-4 text-center text-gray-500">Loading leave balances...</div>
            ) : leaveBalancesError ? (
              <div className="p-4 text-center text-red-500">{leaveBalancesError}</div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Days</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Used</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leaveBalances.map((row) => (
                      <tr key={row.teacher_id}>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">{row.teacher_name}</td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          {editLeaveId === row.teacher_id ? (
                            <input
                              type="number"
                              min="0"
                              className="border rounded px-2 py-1 w-20 text-xs"
                              value={editLeaveValue}
                              onChange={e => setEditLeaveValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveLeave(row.teacher_id)
                                if (e.key === 'Escape') { setEditLeaveId(null); setEditLeaveValue("") }
                              }}
                              autoFocus
                            />
                          ) : (
                            row.total_leaves
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">{row.used_leaves}</td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">{row.remaining_leaves}</td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap flex gap-2 items-center">
                          {editLeaveId === row.teacher_id ? (
                            <>
                              <button
                                className="bg-green-600 text-white px-2 py-1 rounded text-xs mr-2"
                                onClick={() => handleSaveLeave(row.teacher_id)}
                              >Save</button>
                              <button
                                className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs mr-2"
                                onClick={() => { setEditLeaveId(null); setEditLeaveValue("") }}
                              >Cancel</button>
                              <button
                                className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                                onClick={() => showToast('Feature coming soon: View leave history for ' + row.teacher_name, 'info')}
                              >History</button>
                            </>
                          ) : (
                            <>
                              <button
                                className="bg-purple-600 text-white px-2 py-1 rounded text-xs mr-2"
                                onClick={() => { setEditLeaveId(row.teacher_id); setEditLeaveValue(row.total_leaves.toString()) }}
                              >Edit</button>
                              <button
                                className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                                onClick={() => showToast('Feature coming soon: View leave history for ' + row.teacher_name, 'info')}
                              >History</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Status Summary & Live Teacher Status - Unified Card Layout, wider cards */}
            <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 xl:gap-8">
              {/* Today's Overview */}
              <div className="bg-white rounded-lg shadow-sm border p-6 xl:p-8 flex flex-col h-full min-w-0">
                <h3 className="text-lg xl:text-xl font-semibold text-gray-900 mb-4">Today's Overview</h3>
                <div className="grid grid-cols-2 gap-6 flex-1">
                  <div className="text-center">
                    <div className="text-2xl xl:text-3xl font-bold text-green-600">{statusCounts.present}</div>
                    <div className="text-sm xl:text-base text-gray-600">Teachers Present</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl xl:text-3xl font-bold text-yellow-600">{statusCounts.break}</div>
                    <div className="text-sm xl:text-base text-gray-600">On Break</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl xl:text-3xl font-bold text-red-600">{statusCounts.absent}</div>
                    <div className="text-sm xl:text-base text-gray-600">Absent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl xl:text-3xl font-bold text-gray-600">{statusCounts.noCheckin}</div>
                    <div className="text-sm xl:text-base text-gray-600">No Check-in</div>
                  </div>
                </div>
              </div>
              {/* Live Teacher Status */}
              <div className="bg-white rounded-lg shadow-sm border p-6 xl:p-8 flex flex-col h-full min-w-0">
                <div className="border-b pb-4 mb-4">
                  <h3 className="text-lg xl:text-xl font-semibold text-gray-900">Live Teacher Status</h3>
                  <p className="text-sm xl:text-base text-gray-600 mt-1">
                    Real-time attendance status for {new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                {teacherStatus.length > 0 ? (
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                          <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Last Update</th>
                          <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {teacherStatus.map((teacher) => (
                          <tr key={teacher.id} className="hover:bg-gray-50">
                            <td className="px-4 xl:px-6 py-3 whitespace-nowrap">
                              <div>
                                <div className="text-sm xl:text-base font-medium text-gray-900">{teacher.name}</div>
                                <div className="text-xs text-gray-500 hidden sm:block">{teacher.email}</div>
                              </div>
                            </td>
                            <td className="px-4 xl:px-6 py-3 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(teacher.currentStatus)}`}>
                                {getStatusText(teacher.currentStatus)}
                              </span>
                            </td>
                            <td className="px-4 xl:px-6 py-3 whitespace-nowrap text-xs xl:text-sm text-gray-500 hidden sm:table-cell">
                              {teacher.lastUpdate ? new Date(teacher.lastUpdate).toLocaleTimeString() : '-'}
                            </td>
                            <td className="px-4 xl:px-6 py-3 text-xs xl:text-sm text-gray-500 hidden md:table-cell">
                              {teacher.remarks || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 xl:p-8 text-center text-gray-500 text-sm flex-1">
                    No teachers found in the system.
                  </div>
                )}
              </div>
            </div>

            {/* Behavior Reports Card */}
            <div className="w-full max-w-7xl mx-auto mt-8">
              <div className="bg-white rounded-lg shadow-sm border p-6 xl:p-8 flex flex-col min-w-0">
                <h3 className="text-lg xl:text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-orange-600" />
                  Recent Behavior Reports
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-700">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2">Student</th>
                        <th className="px-3 py-2">Class</th>
                        <th className="px-3 py-2">Incident</th>
                        <th className="px-3 py-2">Action Taken</th>
                        <th className="px-3 py-2">Teacher</th>
                        <th className="px-3 py-2">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {behaviorReports.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-4 text-gray-400">No behavior reports found.</td>
                        </tr>
                      ) : (
                        behaviorReports.map(report => (
                          <tr key={report.id}>
                            <td className="px-3 py-2">{report.student_name}</td>
                            <td className="px-3 py-2">{report.class_level}</td>
                            <td className="px-3 py-2 max-w-xs truncate" title={report.incident}>{report.incident}</td>
                            <td className="px-3 py-2 max-w-xs truncate" title={report.action_taken}>{report.action_taken}</td>
                            <td className="px-3 py-2">{report.teacher_name}</td>
                            <td className="px-3 py-2">{new Date(report.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'classes' && (
          <div className="w-full max-w-7xl mx-auto mt-8">
            <div className="bg-white rounded-lg shadow-sm border p-6 xl:p-8 flex flex-col min-w-0">
              <div className="border-b pb-4 mb-4 flex items-center justify-between">
                <h3 className="text-lg xl:text-xl font-semibold text-gray-900 flex items-center">
                  <Monitor className="h-5 w-5 mr-2 text-purple-600" />
                  📚 Active Classes
                </h3>
                <button
                  onClick={loadActiveSessions}
                  disabled={loading}
                  className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors text-base xl:text-lg"
                >
                  <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
              {activeSessions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Level</th>
                        <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                        <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Teacher</th>
                        <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Start Time</th>
                        <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {activeSessions.map((session) => {
                        const startTime = new Date(session.start_time)
                        const now = new Date()
                        const duration = Math.round((now.getTime() - startTime.getTime()) / (1000 * 60))
                        return (
                          <tr key={session.id} className="hover:bg-gray-50">
                            <td className="px-4 xl:px-6 py-3 whitespace-nowrap text-base xl:text-lg font-medium text-gray-900">
                              {session.class_level}
                            </td>
                            <td className="px-4 xl:px-6 py-3 whitespace-nowrap text-base xl:text-lg text-gray-500">
                              {session.subject}
                            </td>
                            <td className="px-4 xl:px-6 py-3 whitespace-nowrap text-base xl:text-lg text-gray-500 hidden sm:table-cell">
                              {session.teacher_name}
                            </td>
                            <td className="px-4 xl:px-6 py-3 whitespace-nowrap text-base xl:text-lg text-gray-500 hidden md:table-cell">
                              {startTime.toLocaleTimeString()}
                            </td>
                            <td className="px-4 xl:px-6 py-3 whitespace-nowrap text-base xl:text-lg text-gray-500">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                {duration} min
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 xl:p-8 text-center text-gray-500 text-base">
                  No classes currently in session.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Behavior Reports - Unified Card Layout (REMOVED from settings tab) */}

        <AIButton userRole="head" />
      </div>
      </div>
    </Layout>
  )
}