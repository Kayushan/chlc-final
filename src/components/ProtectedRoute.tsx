import React from 'react'
import { Navigate } from 'react-router-dom'
import { getCurrentStaffUser } from '../lib/auth'
import { supabase } from '../lib/supabase'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole: 'creator' | 'admin' | 'head' | 'teacher'
  isCreatorRoute?: boolean
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  isCreatorRoute = false 
}: ProtectedRouteProps) {
  const [loading, setLoading] = React.useState(true)
  const [isAuthenticated, setIsAuthenticated] = React.useState(false)

  React.useEffect(() => {
    const checkAuth = async () => {
      if (isCreatorRoute) {
        // Check Supabase session for Creator
        const { data: { session } } = await supabase.auth.getSession()
        setIsAuthenticated(!!session)
      } else {
        // Check localStorage for staff
        const user = getCurrentStaffUser()
        setIsAuthenticated(!!user && user.role === requiredRole)
      }
      setLoading(false)
    }

    checkAuth()
  }, [requiredRole, isCreatorRoute])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={isCreatorRoute ? '/creator-login' : '/login'} replace />
  }

  return <>{children}</>
}