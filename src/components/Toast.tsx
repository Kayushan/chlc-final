import React, { createContext, useContext, useState, useCallback } from 'react'
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { id, message, type }
    
    setToasts(prev => [...prev, newToast])
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 5000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5" />
      case 'error': return <AlertCircle className="h-5 w-5" />
      case 'warning': return <AlertTriangle className="h-5 w-5" />
      case 'info': return <Info className="h-5 w-5" />
    }
  }

  const getStyles = (type: ToastType) => {
    switch (type) {
      case 'success': return 'bg-green-50 text-green-800 border-green-200'
      case 'error': return 'bg-red-50 text-red-800 border-red-200'
      case 'warning': return 'bg-yellow-50 text-yellow-800 border-yellow-200'
      case 'info': return 'bg-blue-50 text-blue-800 border-blue-200'
    }
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 left-4 right-4 z-50 space-y-2 max-w-sm mx-auto sm:left-auto sm:max-w-none sm:mx-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              flex items-center p-3 sm:p-4 rounded-lg border shadow-lg
              transform transition-all duration-300 ease-in-out
              ${getStyles(toast.type)}
            `}
          >
            <div className="flex-shrink-0 mr-3">
              {getIcon(toast.type)}
            </div>
            <div className="flex-1 text-xs sm:text-sm font-medium">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 ml-2 sm:ml-3 hover:opacity-70 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}