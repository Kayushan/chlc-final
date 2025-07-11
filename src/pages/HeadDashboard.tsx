import React from 'react'
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
  updateTeacherTotalLeaves
} from '../lib/leaveManagement'
import { getTeachersOnLeaveForDate } from '../lib/leaveHelpers'


export function HeadDashboard() {
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
      const { applications } = await import('../lib/leaveManagement').then(m => m.getPendingLeaveApplicationsForAdmin(1, 100))
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
      <div className="space-y-6 px-1 sm:px-0">
        {/* Welcome Section */}
        <div className="bg-purple-50 rounded-lg p-3 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-purple-900 mb-2">
            {getGreeting(user?.name)}
          </h3>
          <p className="text-xs sm:text-sm text-purple-700">
            Monitor teacher performance, resolve issues, and oversee daily operations at Charis Hope Learning Centre.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <p className="text-xs sm:text-sm text-purple-600">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
            <div className="flex space-x-2">
              <button
                onClick={handleViewReport}
                disabled={loading}
                className="flex items-center px-2 sm:px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors text-xs sm:text-sm"
              >
                <Brain className={`h-4 w-4 mr-1`} />
                <span className="hidden sm:inline">View Report</span>
                <span className="sm:hidden">Report</span>
              </button>
              <button
                onClick={loadTeacherStatus}
                disabled={loading}
                className="flex items-center px-2 sm:px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors text-xs sm:text-sm"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              {(user?.role === 'admin' || user?.role === 'head' || user?.role === 'creator') && (
                <button onClick={() => setShowAnnouncementModal(true)} className="flex items-center px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-base sm:text-sm">
                  <Plus className="h-4 w-4 mr-2" /> New Announcement
                </button>
              )}
            </div>
          </div>
        </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b">
          <nav className="flex space-x-4 sm:space-x-8 px-4 sm:px-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="hidden sm:inline">📊 Teacher Overview</span>
              <span className="sm:hidden">📊 Teachers</span>
            </button>
            <button
              onClick={() => setActiveTab('classes')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'classes'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="hidden sm:inline">📚 Active Classes</span>
              <span className="sm:hidden">📚 Classes</span>
            </button>
            <button
              onClick={() => setActiveTab('leaves')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'leaves'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="hidden sm:inline">📝 Pending Leaves</span>
              <span className="sm:hidden">📝 Leaves</span>
            </button>
            <button
              onClick={() => setActiveTab('leaveSettings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'leaveSettings'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="hidden sm:inline">⚙️ Set Annual Days</span>
              <span className="sm:hidden">⚙️ Settings</span>
            </button>
            <button
              onClick={() => setActiveTab('announcement')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'announcement'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="hidden sm:inline">📢 Announcement</span>
              <span className="sm:hidden">📢 Announce</span>
            </button>
      {/* Announcement Tab */}
      {activeTab === 'announcement' && (
        <div className="bg-white rounded-lg shadow-sm border p-4 mt-4">
          <AnnouncementFeed />
          {(user?.role === 'admin' || user?.role === 'head' || user?.role === 'creator') && (
            <>
              <AnnouncementCreateModal open={showAnnouncementModal} onClose={() => setShowAnnouncementModal(false)} />
              <button onClick={() => setShowAnnouncementModal(true)} className="mt-2 flex items-center px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-base sm:text-sm">
                <Plus className="h-4 w-4 mr-2" /> New Announcement
              </button>
            </>
          )}
        </div>
      )}
      {/* Pending Leave Applications Tab */}
      {activeTab === 'leaves' && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 sm:p-6 border-b">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Pending Leave Applications</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Approve or reject pending leave requests from teachers.</p>
          </div>
          {pendingLeavesLoading ? (
            <div className="p-4 text-center text-gray-500">Loading pending leave applications...</div>
          ) : pendingLeavesError ? (
            <div className="p-4 text-center text-red-500">{pendingLeavesError}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingLeaves.map((leave) => (
                    <tr key={leave.id}>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">{leave.users?.name || leave.teacher_id}</td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm">{leave.leave_date}</td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                        {(() => {
                          switch (leave.leave_type) {
                            case 'Annual': return 'Annual';
                            case 'Medical': return 'Medical';
                            case 'Emergency': return 'Emergency';
                            case 'Sick': return 'Sick';
                            case 'Maternity': return 'Maternity';
                            case 'Paternity': return 'Paternity';
                            case 'Unpaid': return 'Unpaid';
                            case 'Other': return 'Other';
                            default: return leave.leave_type;
                          }
                        })()}
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm">{leave.reason || '-'}</td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                        <button
                          className="bg-green-600 text-white px-2 py-1 rounded text-xs mr-2"
                          onClick={() => handleApproveLeave(leave.id)}
                        >Approve</button>
                        <button
                          className="bg-red-600 text-white px-2 py-1 rounded text-xs"
                          onClick={() => setRejectModal({ open: true, leaveId: leave.id })}
                        >Reject</button>
      {/* Reviewer Note Modal */}
      {rejectModal?.open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h4 className="text-lg font-semibold mb-2 text-gray-800">Reject Leave Application</h4>
            <p className="text-sm text-gray-600 mb-3">Please provide a reason for rejection (visible to the teacher):</p>
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-red-400"
              rows={3}
              value={reviewerNote}
              onChange={e => setReviewerNote(e.target.value)}
              placeholder="Enter reviewer note (required)"
              required
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
          </nav>
        </div>
      </div>
      {/* Leave Settings Tab */}
      {activeTab === 'leaveSettings' && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 sm:p-6 border-b">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Set Annual Leave Days for Teachers</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">View and update the annual leave allowance for each teacher.</p>
          </div>
          {leaveBalancesLoading ? (
            <div className="p-4 text-center text-gray-500">Loading leave balances...</div>
          ) : leaveBalancesError ? (
            <div className="p-4 text-center text-red-500">{leaveBalancesError}</div>
          ) : (
            <div className="overflow-x-auto">
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
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                        {editLeaveId === row.teacher_id ? (
                          <>
                            <button
                              className="bg-green-600 text-white px-2 py-1 rounded text-xs mr-2"
                              onClick={() => handleSaveLeave(row.teacher_id)}
                            >Save</button>
                            <button
                              className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs"
                              onClick={() => { setEditLeaveId(null); setEditLeaveValue("") }}
                            >Cancel</button>
                          </>
                        ) : (
                          <button
                            className="bg-purple-600 text-white px-2 py-1 rounded text-xs"
                            onClick={() => { setEditLeaveId(row.teacher_id); setEditLeaveValue(row.total_leaves.toString()) }}
                          >Edit</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
        {/* Status Summary */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Today's Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{statusCounts.present}</div>
              <div className="text-xs sm:text-sm text-gray-600">Teachers Present</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-yellow-600">{statusCounts.break}</div>
              <div className="text-xs sm:text-sm text-gray-600">On Break</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-red-600">{statusCounts.absent}</div>
              <div className="text-xs sm:text-sm text-gray-600">Absent</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-gray-600">{statusCounts.noCheckin}</div>
              <div className="text-xs sm:text-sm text-gray-600">No Check-in</div>
            </div>
          </div>
        </div>

        {/* Teacher Status Table */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 sm:p-6 border-b">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Live Teacher Status</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Real-time attendance status for {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          
          {teacherStatus.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Last Update</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Remarks</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teacherStatus.map((teacher) => (
                    <tr key={teacher.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                        <div>
                          <div className="text-xs sm:text-sm font-medium text-gray-900">{teacher.name}</div>
                          <div className="text-xs text-gray-500 hidden sm:block">{teacher.email}</div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(teacher.currentStatus)}`}>
                          {getStatusText(teacher.currentStatus)}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden sm:table-cell">
                        {teacher.lastUpdate ? new Date(teacher.lastUpdate).toLocaleTimeString() : '-'}
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                        {teacher.remarks || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 sm:p-6 text-center text-gray-500 text-sm">
              No teachers found in the system.
            </div>
          )}
        </div>
          </>
        )}

        {activeTab === 'classes' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 sm:p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                    <Monitor className="h-5 w-5 mr-2 text-purple-600" />
                    📚 Active Classes
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Total Active Classes: {activeSessions.length}
                  </p>
                </div>
                <button
                  onClick={loadActiveSessions}
                  disabled={loading}
                  className="flex items-center px-2 sm:px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors text-xs sm:text-sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">🔄 Refresh Class List</span>
                  <span className="sm:hidden">🔄</span>
                </button>
              </div>
            </div>
            
            {activeSessions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Level</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Teacher</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Start Time</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activeSessions.map((session) => {
                      const startTime = new Date(session.start_time)
                      const now = new Date()
                      const duration = Math.round((now.getTime() - startTime.getTime()) / (1000 * 60))
                      
                      return (
                        <tr key={session.id} className="hover:bg-gray-50">
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                            {session.class_level}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                            {session.subject}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden sm:table-cell">
                            {session.teacher_name}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                            {startTime.toLocaleTimeString()}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
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
              <div className="p-4 sm:p-6 text-center text-gray-500 text-sm">
                No classes currently in session.
              </div>
            )}
          </div>
        )}

        {/* Additional Features (Placeholder) */}
        {/* Behavior Reports */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div 
            className="p-4 sm:p-6 border-b cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => navigate('/behavior-reports')}
          >
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-purple-600" />
              Recent Behavior Reports
              <span className="ml-2 text-sm text-purple-600 hover:text-purple-800">
                (Click to view all →)
              </span>
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Latest 10 behavior incidents reported by teachers</p>
          </div>
          
          {behaviorReports.length > 0 ? (
            <div className="space-y-3">
              {behaviorReports.map((report) => {
                const isExpanded = expandedReports.has(report.id)
                return (
                  <div key={report.id} className="bg-gray-50 border border-gray-200 rounded-lg">
                    {/* Main Report Card - Always Visible */}
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleReportExpansion(report.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-sm font-semibold text-gray-900 truncate">
                              {report.student_name}
                            </h4>
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 flex-shrink-0">
                              {report.class_level}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">
                              {new Date(report.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })} • {new Date(report.created_at).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                            <div className="flex items-center text-gray-400">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-200 bg-white">
                        <div className="pt-3 space-y-3">
                          <div>
                            <h5 className="text-xs font-medium text-gray-700 mb-1">Incident Description</h5>
                            <p className="text-sm text-gray-900 leading-relaxed">
                              {report.incident}
                            </p>
                          </div>
                          
                          <div>
                            <h5 className="text-xs font-medium text-gray-700 mb-1">Action Taken</h5>
                            <p className="text-sm text-gray-900 leading-relaxed">
                              {report.action_taken}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            <div>
                              <h5 className="text-xs font-medium text-gray-700">Reported by</h5>
                              <p className="text-sm text-gray-900">{report.teacher_name}</p>
                            </div>
                            <div className="text-right">
                              <h5 className="text-xs font-medium text-gray-700">Report ID</h5>
                              <p className="text-xs text-gray-500 font-mono">
                                {report.id.substring(0, 8)}...
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-4 sm:p-6 text-center text-gray-500 text-sm">
              No behavior reports submitted yet.
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 mr-2 sm:mr-3" />
                <div>
                  <h4 className="text-sm sm:text-base font-semibold text-gray-900">Reports</h4>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">Generate attendance and performance reports</p>
                </div>
              </div>
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                Coming Soon
              </span>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 mr-2 sm:mr-3" />
                <div>
                  <h4 className="text-sm sm:text-base font-semibold text-gray-900">Approvals</h4>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">Review and approve teacher requests</p>
                </div>
              </div>
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                Coming Soon
              </span>
            </div>
          </div>
        </div>

        <AIButton userRole="head" />
      </div>
    </Layout>
  )
}