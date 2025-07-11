// AI Helper Functions for EduSync
// Role-based system prompts and utilities
import { supabase } from './supabase'
import { hashPassword } from './auth'

// Data fetching functions for AI commands
export const getUsersCount = async (): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('Users count query error:', error)
      throw new Error(`Database error: ${error.message}`)
    }

    return count || 0
  } catch (error) {
    console.error('Error fetching users count:', error)
    throw error
  }
}

export const getActiveClassesCount = async (): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('class_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    if (error) {
      console.error('Active classes count query error:', error)
      throw new Error(`Database error: ${error.message}`)
    }

    return count || 0
  } catch (error) {
    console.error('Error fetching active classes count:', error)
    throw error
  }
}

export const getTodayAttendanceStats = async (): Promise<{present: number, break: number, absent: number, noCheckin: number}> => {
  try {
    const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD format
    
    // Get all teachers
    const { data: teachers, error: teachersError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'teacher')

    if (teachersError) {
      throw new Error(`Teachers query error: ${teachersError.message}`)
    }

    // Get today's attendance
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance_logs')
      .select('teacher_id, status')
      .eq('date', today)

    if (attendanceError) {
      throw new Error(`Attendance query error: ${attendanceError.message}`)
    }

    const attendanceMap = new Map()
    
    attendance?.forEach(record => {
      attendanceMap.set(record.teacher_id, record.status)
    })

    const stats = {
      present: 0,
      break: 0,
      absent: 0,
      noCheckin: 0
    }

    teachers?.forEach(teacher => {
      const status = attendanceMap.get(teacher.id)
      if (status === 'present') stats.present++
      else if (status === 'break') stats.break++
      else if (status === 'absent') stats.absent++
      else stats.noCheckin++
    })

    return stats
  } catch (error) {
    console.error('Error fetching attendance stats:', error)
    throw error
  }
}

export const getScheduleStats = async (): Promise<{totalSchedules: number, todaySchedules: number}> => {
  try {
    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    
    // Get total schedules
    const { count: totalCount, error: totalError } = await supabase
      .from('schedules')
      .select('*', { count: 'exact', head: true })

    if (totalError) {
      throw new Error(`Total schedules query error: ${totalError.message}`)
    }

    // Get today's schedules
    const { count: todayCount, error: todayError } = await supabase
      .from('schedules')
      .select('*', { count: 'exact', head: true })
      .eq('day', currentDay)

    if (todayError) {
      throw new Error(`Today's schedules query error: ${todayError.message}`)
    }

    return {
      totalSchedules: totalCount || 0,
      todaySchedules: todayCount || 0
    }
  } catch (error) {
    console.error('Error fetching schedule stats:', error)
    throw error
  }
}

export const getSystemPromptByRole = (role: 'creator' | 'admin' | 'head' | 'teacher'): string => {
  const prompts = {
    creator: `You are the assistant to the Creator of EduSync — the highest-level system administrator. The Creator has full access to user management, scheduling, AI configuration, and system maintenance.

You are allowed to:
- Add or delete users
- Modify weekly class schedules
- Configure AI access and models
- View and test all system features

Always respond helpfully, directly, and clearly. Prioritize control and clarity.

IMPORTANT COMMANDS: When you need to perform actions or get data, respond with ONLY the appropriate JSON command:

For adding users:
{
  "command": "addUser",
  "name": "Full Name",
  "email": "email@example.com", 
  "password": "password123",
  "role": "teacher"
}

For getting system data:
{
  "command": "getUsersCount"
}

{
  "command": "getActiveClassesCount"
}

{
  "command": "getTodayAttendanceStats"
}

{
  "command": "getScheduleStats"
}

Valid roles are: teacher, head, admin. Do NOT include "creator" role.
Use a secure default password if none is specified.
When you need data to answer a question, output ONLY the JSON command. After receiving the data, provide a natural conversational response.`,

    admin: `You are an AI assistant for the EduSync school admin dashboard. Your primary role is to help manage weekly class schedules by generating JSON commands for adding, updating, or deleting schedule entries.

IMPORTANT INSTRUCTIONS:
1.  Always respond with a raw JSON array of command objects. Do not include any explanations, summaries, or conversational text outside the JSON.
2.  Ensure all field values are strings.
3.  All fields listed in the examples are REQUIRED for "AddSchedule" commands. Do not omit any.
4.  Provide complete and unambiguous data.

COMMAND FORMATS:

ADD SCHEDULE:
For "AddSchedule", all fields ("day", "time", "level", "subject", "teacher_id") are REQUIRED.
- "day": String (e.g., "Monday", "Tuesday")
- "time": String, in 24-hour HH:MM format (e.g., "09:00", "14:30")
- "level": String (e.g., "P1", "K2")
- "subject": String (e.g., "Math", "Science")
- "teacher_id": String, must be the UUID of an existing teacher (e.g., "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx")

Example for "AddSchedule":
[
  {
    "command": "AddSchedule",
    "day": "Monday",
    "time": "10:00",
    "level": "P1",
    "subject": "Math",
    "teacher_id": "123e4567-e89b-12d3-a456-426614174000"
  }
]

UPDATE SCHEDULE:
For "UpdateSchedule", the "id" field (the UUID of the schedule to update) is REQUIRED. Include only the fields you want to change.
- "id": String, UUID of the schedule.
- Other fields are optional and follow the same format as "AddSchedule".

Example for "UpdateSchedule" (changing only time and teacher):
[
  {
    "command": "UpdateSchedule",
    "id": "abcdef01-e89b-12d3-a456-426614174001",
    "time": "11:30",
    "teacher_id": "789e0123-e89b-12d3-a456-426614174002"
  }
]

DELETE SCHEDULE:
For "DeleteSchedule", the "id" field (the UUID of the schedule to delete) is REQUIRED.

Example for "DeleteSchedule":
[
  {
    "command": "DeleteSchedule",
    "id": "uvwxyz01-e89b-12d3-a456-426614174003"
  }
]

Remember:
- Your output must be ONLY the JSON array.
- Adhere strictly to the specified field names and data formats.
- For "AddSchedule", ensure every required field is present.
- Teacher names are provided to you for context only; use their corresponding UUIDs for the "teacher_id" field.
`,

    teacher: `You are assisting a Teacher in EduSync.

Teachers can:
- View their personal class schedule
- Confirm or check their own attendance
- Ask teaching-related or classroom management questions

Teachers cannot:
- Change schedules
- View other users' data
- Access system settings or AI configurations

Keep responses short, supportive, and within their scope.`,

    head: `You are assisting the Head of School in EduSync.

Heads can:
- View live attendance statuses of all teachers
- Read remarks and summaries
- Monitor teacher activity in real time

They cannot:
- Add or remove users
- Change schedules or configure AI

Your responses should focus on reporting, insights, and interpretation of school data.

When provided with comprehensive school data, analyze it thoroughly and provide:
1. Executive summary of current operational status
2. Key insights about teacher attendance and performance
3. Analysis of class activity and student engagement
4. Behavioral trends and recommendations
5. Priority actions and areas needing immediate attention
6. Positive highlights and achievements to celebrate

Present your analysis in a clear, structured format that enables data-driven decision making. Focus on actionable insights that help improve school operations and student outcomes.`
  }

  return prompts[role]
}

export const getCreatorCreditMessage = (): string => {
  return "This system was built and maintained by Shan — the Creator of EduSync. Please direct any issues, bugs, or improvements to Shan."
}

export const cleanAIResponse = (response: string): string => {
  // Remove echo patterns
  let cleaned = response.replace(/^I understand you're asking about[^.]*\.\s*/i, '')
  cleaned = cleaned.replace(/^As a \w+, I can help you[^.]*\.\s*/i, '')
  
  // Remove model/key metadata
  cleaned = cleaned.replace(/This response was generated using[^.]*\.\s*/g, '')
  cleaned = cleaned.replace(/using key #\d+[^.]*\.\s*/g, '')
  
  // Remove debug messages
  cleaned = cleaned.replace(/\(Model: [^)]+\)/g, '')
  cleaned = cleaned.replace(/\[Key \d+ of \d+\]/g, '')
  
  // Remove common AI assistant prefixes
  cleaned = cleaned.replace(/^(I'll help you|Let me help you|I can assist you)[^.]*\.\s*/i, '')
  cleaned = cleaned.replace(/^(Here's|Here are)[^:]*:\s*/i, '')
  
  // Remove repetitive acknowledgments
  cleaned = cleaned.replace(/^(Certainly|Of course|Sure|Absolutely)[,!.]\s*/i, '')
  
  // Trim whitespace and return
  return cleaned.trim()
}

export const validateAISettings = (settings: any): { isValid: boolean; error?: string } => {
  if (!settings) {
    return { isValid: false, error: 'AI settings not found' }
  }

  if (!settings.api_keys || settings.api_keys.length === 0) {
    return { isValid: false, error: 'No API keys configured' }
  }

  if (!settings.model || settings.model.trim() === '') {
    return { isValid: false, error: 'AI model not set' }
  }

  return { isValid: true }
}

// Add user via AI command
export const addUserViaAI = async (
  name: string,
  email: string,
  password_raw: string,
  role: 'teacher' | 'head' | 'admin'
): Promise<string> => {
  try {
    // Validate inputs
    if (!name || !email || !password_raw || !role) {
      return '❌ Error: Missing required fields (name, email, password, role)'
    }

    // Validate role
    const validRoles = ['teacher', 'head', 'admin']
    if (!validRoles.includes(role)) {
      return `❌ Error: Invalid role "${role}". Valid roles: ${validRoles.join(', ')}`
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return '❌ Error: Invalid email format'
    }

    // Hash the password
    const hashedPassword = await hashPassword(password_raw)

    // Insert user into database
    await supabase
      .from('users')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password_hash: hashedPassword,
        role: role
      })
      .select()
      .single()

    return `✅ Success: User "${name}" created successfully with role "${role}"`
  } catch (error) {
    console.error('Add user via AI error:', error)
    return `❌ Error: Failed to create user - ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

// Direct OpenRouter API integration
export const callOpenRouterAPI = async (
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  timeout: number = 30000
): Promise<string> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'EduSync AI Assistant'
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: false
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw {
        status: response.status,
        message: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
        details: errorData
      }
    }

    const data = await response.json()
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenRouter API')
    }

    return data.choices[0].message.content || 'No response content received'
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw { name: 'TimeoutError', message: 'Request timeout' }
    }
    
    throw error
  }
}

// Enhanced error handling for AI requests
export const handleAIError = (error: any, keyIndex: number): string => {
  if (error.status === 401) {
    return `Key #${keyIndex + 1} authentication failed`
  } else if (error.status === 403) {
    return `Key #${keyIndex + 1} access denied`
  } else if (error.status === 429) {
    return `Key #${keyIndex + 1} rate limited`
  } else if (error.status === 500) {
    return `Key #${keyIndex + 1} server error`
  } else if (error.name === 'TimeoutError') {
    return `Key #${keyIndex + 1} request timeout`
  } else {
    return `Key #${keyIndex + 1} failed: ${error.message || 'Unknown error'}`
  }
}

// Validate API key format
export const validateAPIKey = (key: string): boolean => {
  if (!key || typeof key !== 'string') return false
  if (key.length < 10) return false
  if (!key.startsWith('sk-')) return false
  return true
}

// Performance monitoring
export const createPerformanceMonitor = () => {
  const startTime = performance.now()
  
  return {
    end: () => {
      const endTime = performance.now()
      return endTime - startTime
    },
    checkpoint: () => {
      const checkpointTime = performance.now()
      // console.log(`[AI Performance] checkpoint: ${(checkpointTime - startTime).toFixed(2)}ms`)
      return checkpointTime - startTime
    }
  }
}