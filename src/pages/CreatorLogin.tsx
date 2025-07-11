import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { GraduationCap, Mail, Lock, LogIn } from 'lucide-react'

export function CreatorLogin() {
  const navigate = useNavigate()
  const [credentials, setCredentials] = React.useState({ email: '', password: '' })
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [maintenanceModeActive, setMaintenanceModeActive] = React.useState(false) // New state for maintenance mode

  useEffect(() => {
    // Listen for Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/creator')
      }
    })

    // Check maintenance mode status from your API or config
    const checkMaintenanceMode = async () => {
      try {
        const response = await fetch('/api/maintenance-mode')
        const data = await response.json()
        console.log('Maintenance mode:', data.active)
        setMaintenanceModeActive(!!data.active)
      } catch (err) {
        console.error('Failed to fetch maintenance mode status:', err)
        setMaintenanceModeActive(false)
      }
    }

    checkMaintenanceMode()

    return () => subscription.unsubscribe()
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (error) {
        console.error('Creator login error:', error)
        setError('Invalid email or password. Please contact creator - Shan')
      }
    } catch (err) {
      console.error('Creator login error:', err)
      setError('Login failed. Please contact creator - Shan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-2 sm:px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-xl p-4 sm:p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <GraduationCap className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">EduSync Creator</h1>
            <p className="text-gray-600 mt-2 text-sm">Charis Hope Learning Centre</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">System Administrator Access</p>
          </div>

          {error && (
            <div className="mb-4 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-xs sm:text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 sm:top-3 h-4 w-4 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={credentials.email}
                  onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 sm:top-3 h-4 w-4 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  required
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm"
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
            {maintenanceModeActive ? (
              <p className="text-xs text-gray-500">
                Maintenance mode is active. Please check back later.
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                Creator access only. Staff should use{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  staff login
                </button>
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}