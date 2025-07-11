import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          password_hash: string
          role: 'creator' | 'admin' | 'head' | 'teacher'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          password_hash: string
          role: 'creator' | 'admin' | 'head' | 'teacher'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          password_hash?: string
          role?: 'creator' | 'admin' | 'head' | 'teacher'
          created_at?: string
          updated_at?: string
        }
      }
      attendance_logs: {
        Row: {
          id: string
          teacher_id: string
          date: string
          status: 'present' | 'break' | 'absent'
          remarks: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          date?: string
          status: 'present' | 'break' | 'absent'
          remarks?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          date?: string
          status?: 'present' | 'break' | 'absent'
          remarks?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      schedules: {
        Row: {
          id: string
          day: string
          time: string
          level: string
          subject: string
          teacher_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          day: string
          time: string
          level: string
          subject: string
          teacher_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          day?: string
          time?: string
          level?: string
          subject?: string
          teacher_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      ai_settings: {
        Row: {
          id: string
          api_keys: string[]
          current_index: number
          model: string
          access_level: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          api_keys?: string[]
          current_index?: number
          model?: string
          access_level?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          api_keys?: string[]
          current_index?: number
          model?: string
          access_level?: any
          created_at?: string
          updated_at?: string
        }
      }
      behavior_reports: {
        Row: {
          id: string
          student_name: string
          class_level: string
          incident: string
          action_taken: string
          teacher_id: string
          created_at: string
        }
        Insert: {
          id?: string
          student_name: string
          class_level: string
          incident: string
          action_taken: string
          teacher_id: string
          created_at?: string
        }
        Update: {
          id?: string
          student_name?: string
          class_level?: string
          incident?: string
          action_taken?: string
          teacher_id?: string
          created_at?: string
        }
      }
      class_sessions: {
        Row: {
          id: string
          teacher_id: string
          schedule_id: string
          class_level: string
          subject: string
          start_time: string
          end_time: string | null
          status: 'active' | 'completed'
          created_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          schedule_id: string
          class_level: string
          subject: string
          start_time?: string
          end_time?: string | null
          status?: 'active' | 'completed'
          created_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          schedule_id?: string
          class_level?: string
          subject?: string
          start_time?: string
          end_time?: string | null
          status?: 'active' | 'completed'
          created_at?: string
        }
      }
    }
  }
}