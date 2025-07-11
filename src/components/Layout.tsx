import React from 'react'
import { LogOut, GraduationCap } from 'lucide-react'
import { getCurrentStaffUser, logoutStaff } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

interface LayoutProps {
  children: React.ReactNode
  title: string
  isCreatorLayout?: boolean
}

export function Layout({ children, title, isCreatorLayout = false }: LayoutProps) {
  const navigate = useNavigate()
  const [user, setUser] = React.useState<any>(null)
  // Detect if this is the TeacherDashboard by checking the title or user role
  const isTeacherDashboard = title === 'Teacher Dashboard' || user?.role === 'teacher';

  React.useEffect(() => {
    if (isCreatorLayout) {
      const getUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      }
      getUser()
    } else {
      const staffUser = getCurrentStaffUser()
      setUser(staffUser)
    }
  }, [isCreatorLayout])

  const handleLogout = async () => {
    if (isCreatorLayout) {
      await supabase.auth.signOut()
      navigate('/creator-login')
    } else {
      logoutStaff()
      navigate('/login')
    }
  }

  // Dark mode state and toggle
  const [darkMode, setDarkMode] = React.useState(() => {
    if (typeof window !== 'undefined') {
      // If teacher dashboard, always light
      if (isTeacherDashboard) return false;
      const stored = localStorage.getItem('theme');
      if (stored === 'light') return false;
      return true;
    }
    return true;
  });

  React.useEffect(() => {
    if (isTeacherDashboard) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      return;
    }
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode, isTeacherDashboard]);

  return (
    <div className={darkMode ? 'min-h-screen bg-gray-900 text-gray-100' : 'min-h-screen bg-gray-50'}>
      {/* Header */}
      <header className={darkMode ? 'bg-gray-950 shadow-sm border-b border-gray-800' : 'bg-white shadow-sm border-b'}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <GraduationCap className={darkMode ? 'h-6 w-6 sm:h-8 sm:w-8 text-blue-400 mr-2 sm:mr-3' : 'h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mr-2 sm:mr-3'} />
              <div>
                <h1 className={darkMode ? 'text-lg sm:text-xl font-bold text-gray-100' : 'text-lg sm:text-xl font-bold text-gray-900'}>EduSync</h1>
                <p className={darkMode ? 'text-xs sm:text-sm text-gray-400 hidden sm:block' : 'text-xs sm:text-sm text-gray-500 hidden sm:block'}>Charis Hope Learning Centre</p>
              </div>
            </div>
            {/* Navigation Links */}
            <nav className="flex items-center space-x-2 sm:space-x-4">
              <a
                href="/upcoming-features"
                className={darkMode ? 'text-xs sm:text-sm text-blue-400 hover:underline font-medium px-2 py-1 rounded transition-colors hover:bg-blue-900/20' : 'text-xs sm:text-sm text-blue-600 hover:underline font-medium px-2 py-1 rounded transition-colors hover:bg-blue-50'}
              >
                Upcoming Features
              </a>
      {/* Hide dark mode toggle for Teacher Dashboard */}
      {!isTeacherDashboard && (
        <button
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={() => setDarkMode(dm => !dm)}
          className={darkMode ? 'text-xs sm:text-sm px-2 py-1 rounded bg-gray-800 text-gray-100 hover:bg-gray-700 transition-colors' : 'text-xs sm:text-sm px-2 py-1 rounded bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors'}
          style={{ minWidth: 32 }}
        >
          {darkMode ? '🌙' : '☀️'}
        </button>
      )}
              <div className="text-right hidden sm:block">
                <p className={darkMode ? 'text-xs sm:text-sm font-medium text-gray-100' : 'text-xs sm:text-sm font-medium text-gray-900'}>
                  {user?.name || user?.email || 'User'}
                </p>
                <p className={darkMode ? 'text-xs text-gray-400 capitalize' : 'text-xs text-gray-500 capitalize'}>
                  {user?.role || 'User'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className={darkMode ? 'flex items-center px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm text-gray-200 hover:text-white hover:bg-gray-800 rounded-md transition-colors' : 'flex items-center px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors'}
              >
                <LogOut className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="mb-4 sm:mb-8">
          <h2 className={darkMode ? 'text-xl sm:text-2xl font-bold text-gray-100' : 'text-xl sm:text-2xl font-bold text-gray-900'}>{title}</h2>
        </div>
        {children}
      </main>
    </div>
  )
}