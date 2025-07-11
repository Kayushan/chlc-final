import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'
import { AIAssistant } from './AIAssistant'
import { useState, useEffect } from 'react'

interface AIButtonProps {
  userRole: 'creator' | 'admin' | 'head' | 'teacher'
  triggerMessage?: string | null
  onTriggerMessageProcessed?: () => void
}

export function AIButton({ userRole, triggerMessage, onTriggerMessageProcessed }: AIButtonProps) {
  const { showToast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    checkAIAccess()
  }, [userRole])

  useEffect(() => {
    // Auto-open AI when trigger message is provided
    if (triggerMessage && !isOpen) {
      setIsOpen(true)
    }
  }, [triggerMessage, isOpen])

  const checkAIAccess = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_settings')
        .select('access_level, api_keys, model')
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('AI access check error:', error)
        return
      }

      const hasRoleAccess = data?.access_level?.[userRole] || false
      const hasApiKeys = data?.api_keys && data.api_keys.length > 0
      const hasModel = data?.model && data.model.trim() !== ''
      
      setHasAccess(hasRoleAccess && hasApiKeys && hasModel)
    } catch (error) {
      console.error('Error checking AI access:', error)
    }
  }

  const handleClick = () => {
    if (!hasAccess) {
      showToast('AI not available or not configured. Please contact Creator - Shan', 'error')
      return
    }
    setIsOpen(true)
  }

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={handleClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-blue-600 text-white p-3 sm:p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-40 focus:outline-none"
            title="Ask EduSync AI"
            aria-label="Ask EduSync AI"
          >
            <span className="relative flex items-center justify-center">
              <motion.span
                animate={{ scale: hovered ? 1.15 : 1, rotate: hovered ? 10 : 0 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="inline-block"
              >
                <Bot className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse text-white" />
                <Sparkles className="absolute -top-2 -right-2 h-4 w-4 text-yellow-300 animate-bounce" />
              </motion.span>
              {hovered && (
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 shadow-lg whitespace-nowrap pointer-events-none"
                >
                  Ask EduSync AI
                </motion.span>
              )}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
      <AIAssistant
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        userRole={userRole}
        triggerMessage={triggerMessage}
        onTriggerMessageProcessed={onTriggerMessageProcessed}
      />
    </>
  )
}