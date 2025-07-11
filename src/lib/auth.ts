import { supabase } from './supabase'

// Hash password using SHA-256
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Custom authentication for staff
export async function authenticateStaff(email: string, password: string) {
  try {
    // First, try to sign in with Supabase Auth to get a session
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      // If Supabase auth fails, fall back to custom auth
      console.log('Supabase auth failed, trying custom auth...')
    } else if (authData.user) {
      // If Supabase auth succeeds, get user data from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      if (userError) {
        console.error('User data query error:', userError)
        throw new Error('Invalid login credentials. Please contact creator - Shan')
      }

      if (userData) {
        // Store in localStorage for session management
        localStorage.setItem('edusync_user', JSON.stringify({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role
        }))
        return userData
      }
    }

    // Fall back to custom authentication
    const hashedPassword = await hashPassword(password)
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password_hash', hashedPassword)
      .maybeSingle()

    if (error) {
      console.error('Authentication error:', error)
      throw new Error('Invalid login credentials. Please contact creator - Shan')
    }

    if (!data) {
      throw new Error('Invalid login credentials. Please contact creator - Shan')
    }

    // Store in localStorage for session management
    localStorage.setItem('edusync_user', JSON.stringify({
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role
    }))

    return data
  } catch (error) {
    console.error('Authentication failed:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Authentication failed. Please contact creator - Shan')
  }
}

// Get current staff user from localStorage
export function getCurrentStaffUser() {
  try {
    const user = localStorage.getItem('edusync_user')
    if (!user) return null
    
    const parsedUser = JSON.parse(user)
    
    // Validate required fields
    if (!parsedUser.id || !parsedUser.role || !parsedUser.email) {
      console.warn('Invalid user data in localStorage, clearing...')
      localStorage.removeItem('edusync_user')
      return null
    }
    
    return parsedUser
  } catch (error) {
    console.error('Error parsing user data from localStorage:', error)
    localStorage.removeItem('edusync_user')
    return null
  }
}

// Logout staff user
export function logoutStaff() {
  localStorage.removeItem('edusync_user')
}

// Check if user has required role
export function hasRole(requiredRole: string, userRole: string): boolean {
  const roleHierarchy = {
    creator: 4,
    admin: 3,
    head: 2,
    teacher: 1
  }
  
  return roleHierarchy[userRole as keyof typeof roleHierarchy] >= 
         roleHierarchy[requiredRole as keyof typeof roleHierarchy]
}