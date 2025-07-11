import React, { useState } from 'react'
import { Activity, AlertTriangle, CheckCircle, XCircle, RefreshCw, Wrench } from 'lucide-react'
import { aiDiagnostics, SystemHealth, DiagnosticResult } from '../lib/diagnostics'
import { useToast } from './Toast'

interface DiagnosticPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function DiagnosticPanel({ isOpen, onClose }: DiagnosticPanelProps) {
  const { showToast } = useToast()
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [fixes, setFixes] = useState<DiagnosticResult[]>([])

  const runDiagnostic = async () => {
    setLoading(true)
    try {
      const result = await aiDiagnostics.runFullDiagnostic()
      setHealth(result)
      showToast(`Diagnostic complete: ${result.overall}`, 
        result.overall === 'healthy' ? 'success' : 
        result.overall === 'degraded' ? 'warning' : 'error'
      )
    } catch (error) {
      console.error('Diagnostic failed:', error)
      showToast('Diagnostic failed. Check console for details.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const runAutomatedFixes = async () => {
    setFixing(true)
    try {
      const fixResults = await aiDiagnostics.runAutomatedFixes()
      setFixes(fixResults)
      
      const successCount = fixResults.filter(f => f.status === 'pass').length
      if (successCount > 0) {
        showToast(`Applied ${successCount} automated fixes`, 'success')
        // Re-run diagnostic after fixes
        setTimeout(runDiagnostic, 1000)
      } else {
        showToast('No fixes were needed or applied', 'info')
      }
    } catch (error) {
      console.error('Auto-fix failed:', error)
      showToast('Automated fixes failed. Check console for details.', 'error')
    } finally {
      setFixing(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'fail': return <XCircle className="h-4 w-4 text-red-600" />
      default: return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getHealthColor = (overall: string) => {
    switch (overall) {
      case 'healthy': return 'text-green-600 bg-green-100'
      case 'degraded': return 'text-yellow-600 bg-yellow-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <div className="flex items-center">
            <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mr-2" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">AI System Diagnostics</h3>
            {health && (
              <span className={`ml-2 sm:ml-3 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getHealthColor(health.overall)}`}>
                {health.overall.toUpperCase()}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 sm:p-6 border-b bg-gray-50">
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={runDiagnostic}
              disabled={loading}
              className="flex items-center px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Running...' : 'Run Diagnostic'}
            </button>
            
            {health && health.overall !== 'healthy' && (
              <button
                onClick={runAutomatedFixes}
                disabled={fixing}
                className="flex items-center px-3 sm:px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
              >
                <Wrench className={`h-4 w-4 mr-2 ${fixing ? 'animate-pulse' : ''}`} />
                {fixing ? 'Fixing...' : 'Auto-Fix Issues'}
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {health && (
            <>
              {/* Summary */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">Summary</h4>
                <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                  <div>
                    <div className="text-lg sm:text-2xl font-bold text-green-600">{health.summary.passed}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Passed</div>
                  </div>
                  <div>
                    <div className="text-lg sm:text-2xl font-bold text-yellow-600">{health.summary.warnings}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Warnings</div>
                  </div>
                  <div>
                    <div className="text-lg sm:text-2xl font-bold text-red-600">{health.summary.failed}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Failed</div>
                  </div>
                </div>
              </div>

              {/* Detailed Results */}
              <div className="space-y-3">
                <h4 className="text-sm sm:text-base font-semibold text-gray-900">Detailed Results</h4>
                {health.results.map((result, index) => (
                  <div key={index} className="p-3 sm:p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        {getStatusIcon(result.status)}
                        <div className="ml-2 sm:ml-3">
                          <div className="text-sm sm:text-base font-medium text-gray-900">{result.component}</div>
                          <div className="text-xs sm:text-sm text-gray-600">{result.message}</div>
                          {result.details && (
                            <details className="mt-2">
                              <summary className="text-xs text-gray-500 cursor-pointer">Show details</summary>
                              <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto max-w-full">
                                {JSON.stringify(result.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {result.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Applied Fixes */}
              {fixes.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="text-sm sm:text-base font-semibold text-gray-900">Applied Fixes</h4>
                  {fixes.map((fix, index) => (
                    <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center">
                        {getStatusIcon(fix.status)}
                        <div className="ml-2 sm:ml-3">
                          <div className="text-xs sm:text-sm font-medium text-green-900">{fix.message}</div>
                          <div className="text-xs text-green-600">
                            {fix.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {!health && !loading && (
            <div className="text-center py-12">
              <Activity className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm sm:text-base text-gray-600">Click "Run Diagnostic" to analyze the AI system</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}