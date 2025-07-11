import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { ArrowLeft, FileText, Search, Filter } from 'lucide-react'

export function AllBehaviorReportsPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const levels = ['Pre-K', 'K1', 'K2', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6']

  useEffect(() => {
    loadAllBehaviorReports()
  }, [sortBy, sortOrder])

  const loadAllBehaviorReports = async () => {
    try {
      setLoading(true)
      
      // Get all behavior reports
      const { data: reports, error: reportsError } = await supabase
        .from('behavior_reports')
        .select('*')
        .order(sortBy, { ascending: sortOrder === 'asc' })

      if (reportsError) {
        console.error('Behavior reports query error:', reportsError)
        throw new Error('Failed to load behavior reports')
      }

      // Get teacher names separately
      const { data: teachers, error: teachersError } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'teacher')

      if (teachersError) {
        console.error('Teachers query error:', teachersError)
        throw new Error('Failed to load teacher information')
      }

      // Merge reports with teacher names
      const reportsWithTeachers = (reports || []).map(report => ({
        ...report,
        teacher_name: teachers?.find(teacher => teacher.id === report.teacher_id)?.name || 'Unknown Teacher'
      }))

      setReports(reportsWithTeachers)
    } catch (error) {
      console.error('Error loading behavior reports:', error)
      showToast('Failed to load behavior reports. Please contact creator - Shan', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filteredReports = reports.filter(report => {
    const matchesSearch = searchTerm === '' || 
      report.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.incident.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.action_taken.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.teacher_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesLevel = filterLevel === '' || report.class_level === filterLevel
    
    return matchesSearch && matchesLevel
  })

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return '↕️'
    return sortOrder === 'asc' ? '↑' : '↓'
  }

  if (loading) {
    return (
      <Layout title="All Behavior Reports">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="All Behavior Reports">
      <div className="space-y-6 px-1 sm:px-0">
        {/* Header */}
        <div className="bg-purple-50 rounded-lg p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <button
                onClick={() => navigate('/head')}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm w-full sm:w-auto mb-2 sm:mb-0"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </button>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-purple-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  All Behavior Reports
                </h3>
                <p className="text-xs sm:text-sm text-purple-700 mt-1">
                  Complete history of behavior incidents and actions taken
                </p>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-purple-700 mb-1">
                <Search className="h-4 w-4 inline mr-1" />
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search student, incident, action, or teacher..."
                className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium text-purple-700 mb-1">
                <Filter className="h-4 w-4 inline mr-1" />
                Filter by Level
              </label>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs sm:text-sm"
              >
                <option value="">All Levels</option>
                {levels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-purple-700 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs sm:text-sm"
              >
                <option value="created_at">Date</option>
                <option value="student_name">Student Name</option>
                <option value="class_level">Class Level</option>
              </select>
            </div>
          </div>

          <div className="mt-4 text-xs sm:text-sm text-purple-600">
            Showing {filteredReports.length} of {reports.length} reports
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-lg shadow-sm border">
          {filteredReports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-xs sm:text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('student_name')}
                    >
                      Student {getSortIcon('student_name')}
                    </th>
                    <th 
                      className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('class_level')}
                    >
                      Level {getSortIcon('class_level')}
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Incident
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action Taken
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Teacher
                    </th>
                    <th 
                      className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('created_at')}
                    >
                      Date {getSortIcon('created_at')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-4 text-sm font-medium text-gray-900">
                        {report.student_name}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {report.class_level}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-sm text-gray-700">
                        <div className="max-w-xs sm:max-w-md">
                          {report.incident}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-sm text-gray-700">
                        <div className="max-w-xs sm:max-w-md">
                          {report.action_taken}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                        {report.teacher_name}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <div>{new Date(report.created_at).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-400">
                            {new Date(report.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 sm:p-6 text-center text-gray-500 text-xs sm:text-sm">
              {searchTerm || filterLevel ? 
                'No behavior reports match your search criteria.' : 
                'No behavior reports found.'
              }
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6 border">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Report Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-purple-600">{reports.length}</div>
              <div className="text-xs sm:text-sm text-gray-600">Total Reports</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-purple-600">
                {new Set(reports.map(r => r.student_name)).size}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Unique Students</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-purple-600">
                {new Set(reports.map(r => r.class_level)).size}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Class Levels</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-purple-600">
                {reports.filter(r => {
                  const reportDate = new Date(r.created_at)
                  const today = new Date()
                  return reportDate.toDateString() === today.toDateString()
                }).length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Today's Reports</div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}