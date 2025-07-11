import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticateStaff } from '../lib/auth'
import { GraduationCap, Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase';

export function StaffLogin() {
  const navigate = useNavigate()
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [maintenanceModeActive, setMaintenanceModeActive] = useState<boolean | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    // Check maintenance mode status from Supabase
    const checkMaintenanceMode = async () => {
      try {
        const { data, error } = await supabase
          .from('system_flags')
          .select('is_active')
          .eq('flag_name', 'maintenance_mode')
          .single();
        if (error) throw error;
        setMaintenanceModeActive(!!data?.is_active);
      } catch (err) {
        setMaintenanceModeActive(false);
      }
    };
    checkMaintenanceMode();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (maintenanceModeActive) {
      setError('404 Not Found: Staff login is disabled during maintenance mode.')
      setLoading(false)
      return
    }
    try {
      const user = await authenticateStaff(credentials.email, credentials.password)
      let redirectPath = '/teacher'
      if (user && typeof user.role === 'string') {
        if (user.role === 'admin') redirectPath = '/admin'
        else if (user.role === 'head') redirectPath = '/head'
        else if (user.role === 'teacher') redirectPath = '/teacher'
      }
      setTimeout(() => {
        navigate(redirectPath)
      }, 100)
    } catch (err) {
      console.error('Login error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Invalid login credentials. Please contact creator - Shan'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Dark mode: check localStorage and default to dark
  const [darkMode] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'light') return false;
      return true;
    }
    return true;
  });
  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  if (maintenanceModeActive === null) {
    return (
      <div className={darkMode ? "min-h-screen flex items-center justify-center bg-gray-900 px-2" : "min-h-screen flex items-center justify-center bg-gray-50 px-2"}>
        <div className={darkMode ? "text-gray-400 text-lg" : "text-gray-500 text-lg"}>Checking system status…</div>
      </div>
    );
  }
  if (maintenanceModeActive) {
    return (
      <div className={darkMode ? "min-h-screen flex items-center justify-center bg-gray-900 px-2" : "min-h-screen flex items-center justify-center bg-gray-50 px-2"}>
        <div className="text-red-600 text-xl font-bold">404 Not Found</div>
      </div>
    );
  }

  return (
    <div className={darkMode ? "min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center px-2 sm:px-4" : "min-h-screen bg-gradient-to-br from-emerald-50 to-blue-100 flex items-center justify-center px-2 sm:px-4"}>
      <div className="max-w-md w-full">
        <div className={darkMode ? "bg-gray-900 rounded-xl shadow-xl p-4 sm:p-8 border border-gray-800" : "bg-white rounded-xl shadow-xl p-4 sm:p-8"}>
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <GraduationCap className={darkMode ? "h-10 w-10 sm:h-12 sm:w-12 text-emerald-400" : "h-10 w-10 sm:h-12 sm:w-12 text-emerald-600"} />
            </div>
            <h1 className={darkMode ? "text-xl sm:text-2xl font-bold text-gray-100" : "text-xl sm:text-2xl font-bold text-gray-900"}>EduSync Staff</h1>
            <p className={darkMode ? "text-gray-400 mt-2 text-sm" : "text-gray-600 mt-2 text-sm"}>Charis Hope Learning Centre</p>
            <p className={darkMode ? "text-xs sm:text-sm text-gray-500 mt-1" : "text-xs sm:text-sm text-gray-500 mt-1"}>Staff Portal Login</p>
          </div>

          {error && (
            <div className={darkMode ? "mb-4 p-2 sm:p-3 bg-red-900/20 border border-red-800 rounded-md" : "mb-4 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-md"}>
              <p className={darkMode ? "text-xs sm:text-sm text-red-400" : "text-xs sm:text-sm text-red-600"}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="email" className={darkMode ? "block text-xs sm:text-sm font-medium text-gray-300 mb-2" : "block text-xs sm:text-sm font-medium text-gray-700 mb-2"}>
                Email Address
              </label>
              <div className="relative">
                <Mail className={darkMode ? "absolute left-3 top-2.5 sm:top-3 h-4 w-4 text-gray-500" : "absolute left-3 top-2.5 sm:top-3 h-4 w-4 text-gray-400"} />
                <input
                  id="email"
                  type="email"
                  required
                  value={credentials.email}
                  onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                  className={darkMode ? "pl-10 w-full px-3 py-2 border border-gray-700 bg-gray-950 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-xs sm:text-sm" : "pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-xs sm:text-sm"}
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className={darkMode ? "block text-xs sm:text-sm font-medium text-gray-300 mb-2" : "block text-xs sm:text-sm font-medium text-gray-700 mb-2"}>
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className={darkMode ? "absolute left-3 top-2.5 sm:top-3 h-4 w-4 text-gray-500" : "absolute left-3 top-2.5 sm:top-3 h-4 w-4 text-gray-400"} />
                <input
                  id="password"
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={credentials.password}
                  onChange={e => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  className={darkMode ? "pl-10 pr-12 w-full px-3 py-2 border border-gray-700 bg-gray-950 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-xs sm:text-sm" : "pl-10 pr-12 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-xs sm:text-sm"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  aria-label="Password"
                />
                {/* Show/Hide password toggle button */}
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(v => !v)}
                  className={darkMode ? "absolute right-2 top-1.5 sm:top-2 p-1 rounded focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-900 hover:bg-gray-800 transition" : "absolute right-2 top-1.5 sm:top-2 p-1 rounded focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white hover:bg-emerald-50 transition"}
                  tabIndex={0}
                >
                  {showPassword ? <EyeOff className={darkMode ? "h-5 w-5 text-emerald-400" : "h-5 w-5 text-emerald-600"} /> : <Eye className={darkMode ? "h-5 w-5 text-gray-500" : "h-5 w-5 text-gray-400"} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={darkMode ? "w-full flex items-center justify-center px-4 py-2 bg-emerald-700 text-white rounded-md hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm" : "w-full flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm"}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className={darkMode ? "text-xs text-gray-400" : "text-xs text-gray-500"}>
              System creator?{' '}
              <button
                onClick={() => navigate('/creator-login')}
                className={darkMode ? "text-emerald-400 hover:text-emerald-200 underline text-xs" : "text-emerald-600 hover:text-emerald-800 underline text-xs"}
              >
                Creator login
              </button>
            </p>
          </div>

          <div className={darkMode ? "mt-4 p-2 sm:p-3 bg-gray-800 rounded-md" : "mt-4 p-2 sm:p-3 bg-gray-50 rounded-md"}>
            <p className={darkMode ? "text-xs text-gray-400 text-center" : "text-xs text-gray-600 text-center"}>
              <strong>Demo Credentials:</strong><br />
              Admin: admin@charishope.edu<br />
              Head: head@charishope.edu<br />
              Teacher: teacher@charishope.edu<br />
              Password: password
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}