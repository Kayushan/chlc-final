// AI System Diagnostics and Testing Utilities
import { supabase } from './supabase'
import React from 'react'

export interface DiagnosticResult {
  component: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: any
  timestamp: Date
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical'
  results: DiagnosticResult[]
  summary: {
    passed: number
    failed: number
    warnings: number
  }
}

export class AISystemDiagnostics {
  private results: DiagnosticResult[] = []

  private addResult(component: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any) {
    this.results.push({
      component,
      status,
      message,
      details,
      timestamp: new Date()
    })
  }

  async runFullDiagnostic(): Promise<SystemHealth> {
    // console.log('🔍 Starting comprehensive AI system diagnostic...')
    this.results = []

    // 1. Database Connectivity
    await this.testDatabaseConnection()
    
    // 2. AI Settings Configuration
    await this.testAISettings()
    
    // 3. User Authentication
    await this.testAuthentication()
    
    // 4. API Key Validation
    await this.testAPIKeys()
    
    // 5. Model Configuration
    await this.testModelConfiguration()
    
    // 6. Role-based Access
    await this.testRoleBasedAccess()
    
    // 7. Frontend Components
    await this.testFrontendComponents()
    
    // 8. Memory and Performance
    await this.testPerformance()

    return this.generateHealthReport()
  }

  private async testDatabaseConnection() {
    try {
      const { error } = await supabase
        .from('ai_settings')
        .select('id')
        .limit(1)

      if (error) {
        this.addResult('Database', 'fail', `Connection failed: ${error.message}`, error)
      } else {
        this.addResult('Database', 'pass', 'Connection successful')
      }
    } catch (error) {
      this.addResult('Database', 'fail', `Connection error: ${error}`, error)
    }
  }

  private async testAISettings() {
    try {
      const { data, error } = await supabase
        .from('ai_settings')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (error) {
        this.addResult('AI Settings', 'fail', `Query failed: ${error.message}`, error)
        return
      }

      if (!data) {
        this.addResult('AI Settings', 'warning', 'No AI settings found - creating default')
        await this.createDefaultAISettings()
        return
      }

      // Validate settings structure
      const issues = []
      
      if (!data.api_keys || !Array.isArray(data.api_keys)) {
        issues.push('api_keys is not an array')
      }
      
      if (data.api_keys && data.api_keys.length === 0) {
        issues.push('No API keys configured')
      }
      
      if (!data.model || data.model.trim() === '') {
        issues.push('Model not configured')
      }
      
      if (!data.access_level || typeof data.access_level !== 'object') {
        issues.push('Access level not properly configured')
      }

      if (issues.length > 0) {
        this.addResult('AI Settings', 'warning', `Configuration issues: ${issues.join(', ')}`, { issues, data })
      } else {
        this.addResult('AI Settings', 'pass', `Settings valid - ${data.api_keys.length} keys, model: ${data.model}`)
      }
    } catch (error) {
      this.addResult('AI Settings', 'fail', `Settings test failed: ${error}`, error)
    }
  }

  private async createDefaultAISettings() {
    try {
      const { error } = await supabase
        .from('ai_settings')
        .insert({
          api_keys: [],
          model: '',
          access_level: {
            creator: true,
            admin: true,
            head: true,
            teacher: false
          },
          current_index: 0
        })

      if (error) {
        this.addResult('AI Settings', 'fail', `Failed to create default settings: ${error.message}`, error)
      } else {
        this.addResult('AI Settings', 'pass', 'Default AI settings created successfully')
      }
    } catch (error) {
      this.addResult('AI Settings', 'fail', `Error creating default settings: ${error}`, error)
    }
  }

  private async testAuthentication() {
    try {
      // Test Supabase auth session
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        this.addResult('Authentication', 'warning', `Supabase auth error: ${error.message}`, error)
      } else if (session) {
        this.addResult('Authentication', 'pass', 'Supabase session active')
      } else {
        this.addResult('Authentication', 'pass', 'No active Supabase session (normal for staff)')
      }

      // Test localStorage staff auth
      const staffUser = localStorage.getItem('edusync_user')
      if (staffUser) {
        try {
          const parsed = JSON.parse(staffUser)
          if (parsed.id && parsed.role) {
            this.addResult('Authentication', 'pass', `Staff user authenticated: ${parsed.role}`)
          } else {
            this.addResult('Authentication', 'warning', 'Invalid staff user data in localStorage')
          }
        } catch (e) {
          this.addResult('Authentication', 'warning', 'Corrupted staff user data in localStorage')
        }
      } else {
        this.addResult('Authentication', 'pass', 'No staff user in localStorage (normal if not logged in)')
      }
    } catch (error) {
      this.addResult('Authentication', 'fail', `Authentication test failed: ${error}`, error)
    }
  }

  private async testAPIKeys() {
    try {
      const { data, error } = await supabase
        .from('ai_settings')
        .select('api_keys, current_index')
        .limit(1)
        .maybeSingle()

      if (error || !data) {
        this.addResult('API Keys', 'fail', 'Cannot retrieve API keys for testing')
        return
      }

      const { api_keys, current_index } = data

      if (!api_keys || api_keys.length === 0) {
        this.addResult('API Keys', 'warning', 'No API keys configured')
        return
      }

      // Validate key format (basic check)
      const invalidKeys = api_keys.filter((key: string) => 
        !key || key.length < 10 || !key.startsWith('sk-')
      )

      if (invalidKeys.length > 0) {
        this.addResult('API Keys', 'warning', `${invalidKeys.length} keys appear invalid`, { invalidKeys })
      }

      // Validate current_index
      if (current_index < 0 || current_index >= api_keys.length) {
        this.addResult('API Keys', 'warning', `Invalid current_index: ${current_index}`)
      }

      this.addResult('API Keys', 'pass', `${api_keys.length} keys configured, current index: ${current_index}`)
    } catch (error) {
      this.addResult('API Keys', 'fail', `API key test failed: ${error}`, error)
    }
  }

  private async testModelConfiguration() {
    try {
      const { data, error } = await supabase
        .from('ai_settings')
        .select('model')
        .limit(1)
        .maybeSingle()

      if (error || !data) {
        this.addResult('Model Config', 'fail', 'Cannot retrieve model configuration')
        return
      }

      if (!data.model || data.model.trim() === '') {
        this.addResult('Model Config', 'fail', 'No model configured - AI will be blocked')
        return
      }

      // Basic model name validation
      const model = data.model.trim()
      if (model.length < 3) {
        this.addResult('Model Config', 'warning', `Model name seems too short: "${model}"`)
      } else {
        this.addResult('Model Config', 'pass', `Model configured: "${model}"`)
      }
    } catch (error) {
      this.addResult('Model Config', 'fail', `Model test failed: ${error}`, error)
    }
  }

  private async testRoleBasedAccess() {
    try {
      const { data, error } = await supabase
        .from('ai_settings')
        .select('access_level')
        .limit(1)
        .maybeSingle()

      if (error || !data) {
        this.addResult('Role Access', 'fail', 'Cannot retrieve access level configuration')
        return
      }

      const accessLevel = data.access_level
      if (!accessLevel || typeof accessLevel !== 'object') {
        this.addResult('Role Access', 'fail', 'Access level not properly configured')
        return
      }

      const requiredRoles = ['creator', 'admin', 'head', 'teacher']
      const missingRoles = requiredRoles.filter(role => !(role in accessLevel))

      if (missingRoles.length > 0) {
        this.addResult('Role Access', 'warning', `Missing role configurations: ${missingRoles.join(', ')}`)
      } else {
        const enabledRoles = requiredRoles.filter(role => accessLevel[role] === true)
        this.addResult('Role Access', 'pass', `Access configured for: ${enabledRoles.join(', ')}`)
      }
    } catch (error) {
      this.addResult('Role Access', 'fail', `Role access test failed: ${error}`, error)
    }
  }

  private async testFrontendComponents() {
    try {
      // Test if required DOM elements exist
      const root = document.getElementById('root')
      if (!root) {
        this.addResult('Frontend', 'fail', 'Root element not found')
        return
      }

      // Test if React is loaded
      if (typeof React === 'undefined') {
        this.addResult('Frontend', 'warning', 'React not detected in global scope')
      }

      // Test localStorage availability
      try {
        localStorage.setItem('test', 'test')
        localStorage.removeItem('test')
        this.addResult('Frontend', 'pass', 'LocalStorage functional')
      } catch (e) {
        this.addResult('Frontend', 'warning', 'LocalStorage not available')
      }

      this.addResult('Frontend', 'pass', 'Frontend components accessible')
    } catch (error) {
      this.addResult('Frontend', 'fail', `Frontend test failed: ${error}`, error)
    }
  }

  private async testPerformance() {
    try {
      const startTime = performance.now()
      
      // Test memory usage
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024)
        const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024)
        
        if (usedMB > 100) {
          this.addResult('Performance', 'warning', `High memory usage: ${usedMB}MB / ${totalMB}MB`)
        } else {
          this.addResult('Performance', 'pass', `Memory usage: ${usedMB}MB / ${totalMB}MB`)
        }
      }

      // Test database query performance
      const dbStartTime = performance.now()
      await supabase.from('users').select('id').limit(1)
      const dbEndTime = performance.now()
      const dbQueryTime = dbEndTime - dbStartTime

      if (dbQueryTime > 1000) {
        this.addResult('Performance', 'warning', `Slow database query: ${dbQueryTime.toFixed(2)}ms`)
      } else {
        this.addResult('Performance', 'pass', `Database query time: ${dbQueryTime.toFixed(2)}ms`)
      }

      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      this.addResult('Performance', 'pass', `Diagnostic completed in ${totalTime.toFixed(2)}ms`)
    } catch (error) {
      this.addResult('Performance', 'fail', `Performance test failed: ${error}`, error)
    }
  }

  private generateHealthReport(): SystemHealth {
    const summary = {
      passed: this.results.filter(r => r.status === 'pass').length,
      failed: this.results.filter(r => r.status === 'fail').length,
      warnings: this.results.filter(r => r.status === 'warning').length
    }

    let overall: 'healthy' | 'degraded' | 'critical'
    
    if (summary.failed > 0) {
      overall = 'critical'
    } else if (summary.warnings > 2) {
      overall = 'degraded'
    } else {
      overall = 'healthy'
    }

    return {
      overall,
      results: this.results,
      summary
    }
  }

  // Automated fix methods
  async runAutomatedFixes(): Promise<DiagnosticResult[]> {
    const fixes: DiagnosticResult[] = []
    
    try {
      // Fix 1: Ensure AI settings exist
      const { data: aiSettings } = await supabase
        .from('ai_settings')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (!aiSettings) {
        await this.createDefaultAISettings()
        fixes.push({
          component: 'Auto-Fix',
          status: 'pass',
          message: 'Created default AI settings',
          timestamp: new Date()
        })
      }

      // Fix 2: Clean up localStorage
      try {
        const staffUser = localStorage.getItem('edusync_user')
        if (staffUser) {
          JSON.parse(staffUser) // Validate JSON
        }
      } catch (e) {
        localStorage.removeItem('edusync_user')
        fixes.push({
          component: 'Auto-Fix',
          status: 'pass',
          message: 'Cleaned corrupted localStorage data',
          timestamp: new Date()
        })
      }

      // Fix 3: Validate and fix current_index
      if (aiSettings?.api_keys && aiSettings.current_index >= aiSettings.api_keys.length) {
        await supabase
          .from('ai_settings')
          .update({ current_index: 0 })
          .eq('id', aiSettings.id)
        
        fixes.push({
          component: 'Auto-Fix',
          status: 'pass',
          message: 'Reset invalid current_index to 0',
          timestamp: new Date()
        })
      }

    } catch (error) {
      fixes.push({
        component: 'Auto-Fix',
        status: 'fail',
        message: `Automated fix failed: ${error}`,
        timestamp: new Date()
      })
    }

    return fixes
  }
}

// Export singleton instance
export const aiDiagnostics = new AISystemDiagnostics()