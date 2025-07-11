import React, { useState, useEffect, useRef } from 'react'
import { X, Send, Bot, Loader, Activity } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'
import { 
  getSystemPromptByRole, 
  getCreatorCreditMessage, 
  cleanAIResponse, 
  validateAISettings,
  handleAIError,
  validateAPIKey,
  createPerformanceMonitor,
  callOpenRouterAPI,
  addUserViaAI,
  getUsersCount,
  getActiveClassesCount,
  getTodayAttendanceStats,
  getScheduleStats
} from '../lib/aiHelpers'
import { DiagnosticPanel } from './DiagnosticPanel'
import { motion, AnimatePresence } from 'framer-motion'

interface AIAssistantProps {
  isOpen: boolean
  onClose: () => void
  userRole: 'creator' | 'admin' | 'head' | 'teacher'
  triggerMessage?: string | null
  onTriggerMessageProcessed?: () => void
  // Optional callback for when AI returns schedule commands
  onAICommandResponse?: (response: string) => void
  // Optional callback for when AI returns a single schedule object
  onAISingleScheduleResponse?: (response: string) => void
  // New: List of teacher names for context
  teacherNames?: string[]
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export function AIAssistant({ isOpen, onClose, userRole, triggerMessage, onTriggerMessageProcessed, onAICommandResponse, onAISingleScheduleResponse, teacherNames }: AIAssistantProps) {
  const { showToast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiSettings, setAiSettings] = useState<any>(null)
  const [currentKeyIndex, setCurrentKeyIndex] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [connectionStatus, setConnectionStatus] = useState<string>('')
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [typing, setTyping] = useState(false)
  const [inputRows, setInputRows] = useState(2)
  const [responseCache, setResponseCache] = useState<{ [q: string]: string }>({})
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Debounce for AI requests
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadAISettings()
      initializeChat()
    }
  }, [isOpen, userRole])

  useEffect(() => {
    // Handle automatic trigger message processing
    if (isOpen && triggerMessage && !loading) {
      const triggerUserMessage: Message = {
        id: `trigger-${Date.now()}`,
        role: 'user',
        content: triggerMessage,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, triggerUserMessage])
      setLoading(true)

      // Process the trigger message
      attemptAIRequest(triggerMessage)
        .then((success) => {
          if (!success) {
            throw new Error('All AI keys failed')
          }
        })
        .catch((error) => {
          console.error('AI trigger error:', error)
          showToast('❌ Failed to generate insights. Please try again.', 'error')
        })
        .finally(() => {
          setLoading(false)
          // Notify parent that trigger message has been processed
          if (onTriggerMessageProcessed) {
            onTriggerMessageProcessed()
          }
        })
    }
  }, [isOpen, triggerMessage, loading])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadAISettings = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_settings')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('AI settings error:', error)
        return
      }

      if (data) {
        setAiSettings(data)
        setCurrentKeyIndex(data.current_index || 0)
      }
    } catch (error) {
      console.error('Error loading AI settings:', error)
    }
  }

  // Helper to get the system prompt for the current role, with teacher names if provided
  const getSystemPrompt = () => {
    let basePrompt = getSystemPromptByRole(userRole)
    if (userRole === 'admin' && teacherNames && teacherNames.length > 0) {
      basePrompt += `\n\nTeacher names in the system (use only these, and auto-correct close matches): ${teacherNames.join(', ')}`
    }
    return basePrompt
  }

  const initializeChat = () => {
    // Only initialize with system messages if no trigger message is being processed
    if (!triggerMessage) {
      const systemPrompt: Message = {
        id: 'system-0',
        role: 'system',
        content: getSystemPrompt(),
        timestamp: new Date()
      }
      const creditMessage: Message = {
        id: 'system-1',
        role: 'assistant',
        content: getCreatorCreditMessage(),
        timestamp: new Date()
      }
      setMessages([systemPrompt, creditMessage])
    } else {
      // For triggered sessions, start with a minimal welcome
      const systemPrompt: Message = {
        id: 'system-0',
        role: 'system',
        content: getSystemPrompt(),
        timestamp: new Date()
      }
      const welcomeMessage: Message = {
        id: 'system-welcome',
        role: 'assistant',
        content: '🧠 Analyzing school data to generate comprehensive insights...',
        timestamp: new Date()
      }
      setMessages([systemPrompt, welcomeMessage])
    }
  }
  const handleSend = async () => {
    if (!input.trim() || loading) return
    // Debounce: prevent rapid double send
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setTyping(true)
    debounceRef.current = setTimeout(async () => {
      setTyping(false)
      // Check cache
      if (responseCache[input.trim()]) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'user',
          content: input,
          timestamp: new Date()
        }, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseCache[input.trim()],
          timestamp: new Date()
        }])
        setInput('')
        return
      }
      // Check AI access
      const validation = validateAISettings(aiSettings)
      if (!validation.isValid) {
        showToast(`❌ ${validation.error}. Please contact Creator - Shan`, 'error')
        return
      }

      if (!aiSettings?.access_level?.[userRole]) {
        showToast('AI not available for this role. Please contact Creator - Shan', 'error')
        return
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: input,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, userMessage])
      setInput('')
      setLoading(true)

      try {
        // Attempt AI request with key rotation
        const success = await attemptAIRequest(input)
        
        if (!success) {
          throw new Error('All AI keys failed')
        }
      } catch (error) {
        console.error('AI error:', error)
        showToast('❌ All AI keys failed. Please contact Creator - Shan', 'error')
        setConnectionStatus('')
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  const attemptAIRequest = async (userInput: string): Promise<boolean> => {
    const keys = aiSettings.api_keys
    const model = aiSettings.model
    let currentIndex = currentKeyIndex
    const monitor = createPerformanceMonitor()
    
    for (let i = 0; i < keys.length; i++) {
      const key = keys[currentIndex]
      
      // Validate key format before attempting request
      if (!validateAPIKey(key)) {
        setConnectionStatus(`⚠️ Key ${currentIndex + 1} invalid format. Trying next key...`)
        showToast(`⚠️ Key #${currentIndex + 1} has invalid format. Trying next key...`, 'warning')
        currentIndex = (currentIndex + 1) % keys.length
        continue
      }
      
      setConnectionStatus(`🔌 Connecting to AI using key ${currentIndex + 1} of ${keys.length}...`)
      showToast(`🔌 Connecting to AI using key #${currentIndex + 1}...`, 'info')
      
      try {
        monitor.checkpoint(`Starting request with key ${currentIndex + 1}`)
        
        // When preparing apiMessages for OpenRouter, always include the system prompt as the first message
        const apiMessages = [
          { role: 'system', content: getSystemPrompt() },
          ...messages.filter(msg => msg.role !== 'system').map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
          })),
          {
            role: 'user',
            content: userInput
          }
        ]
        
        // Call the actual OpenRouter API
        const aiResponse = await callOpenRouterAPI(key, model, apiMessages)
        
        monitor.checkpoint(`API response received from key ${currentIndex + 1}`)
        
        // Check if the response is a command
        let finalAiMessageContent = aiResponse
        
        try {
          const parsedResponse = JSON.parse(aiResponse.trim())
          
          if (parsedResponse.command) {
            // Handle commands based on user role
            if (userRole === 'creator') {
              finalAiMessageContent = await handleCreatorCommand(parsedResponse, key, model, apiMessages)
            } else {
              finalAiMessageContent = `❌ Permission denied: Only the Creator can execute system commands. Your role (${userRole}) does not have sufficient privileges.`
            }
          } else {
            finalAiMessageContent = cleanAIResponse(aiResponse)
          }
        } catch (e) {
          // Not a JSON command, treat as regular response
          finalAiMessageContent = cleanAIResponse(aiResponse)
        }
        
        // Update current index in database
        await updateCurrentKeyIndex(currentIndex)
        
        setConnectionStatus('')
        const totalTime = monitor.end()
        showToast(`✅ Response received from AI (${totalTime.toFixed(0)}ms)`, 'success')
        
        const responseMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: finalAiMessageContent,
          timestamp: new Date()
        }
        
        setMessages(prev => [...prev, responseMessage])
        setResponseCache(prev => ({ ...prev, [userInput.trim()]: finalAiMessageContent }))

        // If the response is a JSON array of commands, call the callback
        if (onAICommandResponse) {
          try {
            const parsed = JSON.parse(finalAiMessageContent)
            if (Array.isArray(parsed) && parsed.every(cmd => cmd.command)) {
              onAICommandResponse(finalAiMessageContent)
            }
          } catch {}
        }
        // If the response is a single schedule object, call the single schedule callback
        if (onAISingleScheduleResponse) {
          try {
            const parsed = JSON.parse(finalAiMessageContent)
            if (
              parsed &&
              typeof parsed === 'object' &&
              parsed.day &&
              parsed.time &&
              parsed.level &&
              parsed.subject &&
              parsed.teacher_id
            ) {
              onAISingleScheduleResponse(finalAiMessageContent)
            }
          } catch {}
        }

        return true
      } catch (error) {
        const errorMessage = handleAIError(error, currentIndex)
        console.error(errorMessage, error)
        
        const nextIndex = ((currentIndex + 1) % keys.length) + 1
        setConnectionStatus(`⚠️ ${errorMessage}. Trying key ${nextIndex}...`)
        showToast(`⚠️ ${errorMessage}. Trying next key...`, 'warning')
      }
      
      // Move to next key
      currentIndex = (currentIndex + 1) % keys.length
    }
    
    return false
  }

  const handleCreatorCommand = async (
    command: any, 
    apiKey: string, 
    model: string, 
    originalMessages: Array<{ role: string; content: string }>
  ): Promise<string> => {
    try {
      let toolResult = ''
      
      switch (command.command) {
        case 'addUser':
          const { name, email, password, role } = command
          toolResult = await addUserViaAI(name, email, password, role)
          return toolResult // Return immediately for user creation
          
        case 'getUsersCount':
          const usersCount = await getUsersCount()
          toolResult = `Tool output: Total users in system: ${usersCount}`
          break
          
        case 'getActiveClassesCount':
          const activeClasses = await getActiveClassesCount()
          toolResult = `Tool output: Active classes currently in session: ${activeClasses}`
          break
          
        case 'getTodayAttendanceStats':
          const attendanceStats = await getTodayAttendanceStats()
          toolResult = `Tool output: Today's attendance - Present: ${attendanceStats.present}, On Break: ${attendanceStats.break}, Absent: ${attendanceStats.absent}, No Check-in: ${attendanceStats.noCheckin}`
          break
          
        case 'getScheduleStats':
          const scheduleStats = await getScheduleStats()
          toolResult = `Tool output: Total schedules: ${scheduleStats.totalSchedules}, Today's schedules: ${scheduleStats.todaySchedules}`
          break
          
        default:
          return `❌ Unknown command: ${command.command}`
      }
      
      // For data commands, make a second API call with the tool result
      const enhancedMessages = [
        ...originalMessages,
        {
          role: 'assistant',
          content: JSON.stringify(command)
        },
        {
          role: 'user',
          content: toolResult
        }
      ]
      
      // Make second API call to get natural language response
      const naturalResponse = await callOpenRouterAPI(apiKey, model, enhancedMessages)
      return cleanAIResponse(naturalResponse)
      
    } catch (error) {
      console.error('Command execution error:', error)
      return `❌ Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  const updateCurrentKeyIndex = async (newIndex: number) => {
    try {
      await supabase
        .from('ai_settings')
        .update({ current_index: newIndex })
        .eq('id', aiSettings.id)
      
      setCurrentKeyIndex(newIndex)
    } catch (error) {
      console.error('Failed to update current key index:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Input auto-expand
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const lines = e.target.value.split('\n').length
    setInputRows(Math.min(6, Math.max(2, lines)))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] h-[600px] flex flex-col overflow-hidden relative"
        onClick={e => e.stopPropagation()}
        drag={window.innerWidth > 640 ? true : false}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b">
          <div className="flex items-center">
            <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mr-2 animate-pulse" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">AI Assistant</h3>
            <span className="ml-1 sm:ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full capitalize">
              {userRole}
            </span>
            {aiSettings?.api_keys && (
              <span className="ml-1 sm:ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full hidden sm:inline">
                Key {currentKeyIndex + 1} of {aiSettings.api_keys.length}
              </span>
            )}
            {userRole === 'creator' && (
              <button
                onClick={() => setShowDiagnostics(true)}
                className="ml-1 sm:ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full hover:bg-purple-200 transition-colors"
                title="System Diagnostics"
              >
                <Activity className="h-3 w-3" />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        {/* Connection Status */}
        {connectionStatus && (
          <div className="px-3 sm:px-4 py-2 bg-blue-50 border-b">
            <p className="text-xs sm:text-sm text-blue-700">{connectionStatus}</p>
          </div>
        )}
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
          <AnimatePresence>
            {messages.filter(message => message.role !== 'system').map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, x: message.role === 'user' ? 40 : -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: message.role === 'user' ? 40 : -40 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl shadow-md relative ${
                    message.role === 'user'
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-indigo-100 text-indigo-900'
                  }`}
                >
                  <span className={`absolute ${message.role === 'user' ? 'right-0 -bottom-2' : 'left-0 -bottom-2'} w-0 h-0 border-t-8 border-t-transparent ${message.role === 'user' ? 'border-r-8 border-r-emerald-100' : 'border-l-8 border-l-indigo-100'}`}></span>
                  <p className="text-xs sm:text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {typing && (
            <div className="flex justify-start">
              <div className="bg-indigo-100 text-indigo-900 p-3 rounded-2xl shadow-md flex items-center gap-2">
                <Loader className="h-4 w-4 animate-spin" />
                <span className="text-xs">EduSync AI is thinking<span className="animate-pulse">...</span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        {/* Input */}
        <div className="p-3 sm:p-4 border-t">
          <div className="flex space-x-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm transition-all"
              rows={inputRows}
              disabled={loading}
              style={{ minHeight: '2.5rem', maxHeight: '8rem' }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <DiagnosticPanel
          isOpen={showDiagnostics}
          onClose={() => setShowDiagnostics(false)}
        />
      </motion.div>
    </div>
  )
}