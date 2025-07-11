// Helper to log AI command errors to Supabase
async function logAICommandError(payload: { command_json: any; error_message: string; user_role: string }) {
  try {
    const { error } = await supabase.from('ai_command_errors').insert(payload);
    if (error) throw error;
  } catch (dbError: any) {
    console.error('Failed to log AI command error to Supabase:', dbError);
  }
}
import React from 'react'
import { Layout } from '../components/Layout'
import { AnnouncementFeed } from '../components/AnnouncementFeed'
import { AIButton } from '../components/AIButton'
import { AnnouncementCreateModal } from '../components/AnnouncementCreateModal'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { getCurrentStaffUser } from '../lib/auth'
import { Plus, Edit, Trash2, RotateCcw } from 'lucide-react'

import { AIAssistant } from '../components/AIAssistant'
import { validateCommand, CommandValidationResult } from '../lib/validators'

// Types for AI Planned Commands
interface PlannedCommandEntry {
  id: string; // Unique ID for React key
  command: any;
  validation: CommandValidationResult;
  isEditing: boolean;
  editedJson: string; // Store the string being edited
}

export function AdminDashboard() {
  // Dynamic greeting function
  function getGreeting(name?: string | null) {
    const hour = new Date().getHours();
    let greeting = 'Hello';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 18) greeting = 'Good afternoon';
    else greeting = 'Good evening';
    return `${greeting}, ${name || 'Admin'}`;
  }
  const [showAnnouncementModal, setShowAnnouncementModal] = React.useState(false);
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const levels = ['Pre-K', 'K1', 'K2', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6']
  const subjects = ['English', 'Mathematics', 'Science', 'Social Studies', 'Art', 'Music', 'Physical Education']

  const { showToast } = useToast()
  const user = getCurrentStaffUser()
  const [schedules, setSchedules] = React.useState<any[]>([])
  const [teachers, setTeachers] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showForm, setShowForm] = React.useState(false)
  const [editingSchedule, setEditingSchedule] = React.useState<any>(null)
  const [formData, setFormData] = React.useState({
    day: '',
    time: '',
    level: '',
    subject: '',
    teacher_id: ''
  })

  const [aiSchedulerMode, setAiSchedulerMode] = React.useState(false)
  const [aiScheduleMatrix, setAiScheduleMatrix] = React.useState<ScheduleMatrix>(() => {
    const matrix: ScheduleMatrix = {};
    levels.forEach(level => {
      matrix[level] = {};
      days.forEach(day => {
        matrix[level][day] = { subject: '', teacher_id: '', time: '' };
      });
    });
    return matrix;
  })
  const [showAISchedulerChat, setShowAISchedulerChat] = React.useState(false)

  // Updated state for planned AI schedule commands
  const [aiPlannedCommands, setAiPlannedCommands] = React.useState<PlannedCommandEntry[]>([])
  const [showAICommandReview, setShowAICommandReview] = React.useState(false)

  React.useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select('*')
        .order('day')
        .order('time')
      if (scheduleError) throw scheduleError

      const { data: teacherData, error: teacherError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('role', 'teacher')
        .order('name')
      if (teacherError) throw teacherError
      setTeachers(teacherData || [])

      const schedulesWithTeachers = (scheduleData || []).map(schedule => ({
        ...schedule,
        users: {
          name: teacherData?.find(teacher => teacher.id === schedule.teacher_id)?.name || 'Unknown Teacher'
        }
      }))
      setSchedules(schedulesWithTeachers)
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Error loading data. Please contact Creator - Shan', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanedFormData = {
      day: formData.day.trim(),
      time: formData.time.trim(),
      level: formData.level.trim(),
      subject: formData.subject.trim(),
      teacher_id: formData.teacher_id.trim()
    }
    try {
      if (editingSchedule) {
        const { error } = await supabase.from('schedules').update(cleanedFormData).eq('id', editingSchedule.id)
        if (error) throw new Error('Failed to update schedule. Please contact Creator - Shan')
        showToast('Schedule updated successfully', 'success')
      } else {
        const { error } = await supabase.from('schedules').insert(cleanedFormData)
        if (error) throw new Error('Failed to create schedule. Please contact Creator - Shan')
        showToast('Schedule created successfully', 'success')
      }
      resetForm()
      loadData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred.'
      showToast(message, 'error')
    }
  }

  const handleEdit = (schedule: any) => {
    setEditingSchedule(schedule)
    setFormData({
      day: schedule.day,
      time: schedule.time,
      level: schedule.level,
      subject: schedule.subject,
      teacher_id: schedule.teacher_id
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return
    try {
      const { error } = await supabase.from('schedules').delete().eq('id', id)
      if (error) throw new Error('Failed to delete schedule. Please contact Creator - Shan')
      showToast('Schedule deleted successfully', 'success')
      loadData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred.'
      showToast(message, 'error')
    }
  }

  const handleResetWeeklyData = async () => {
    if (!confirm('Are you sure you want to reset all weekly data? This will delete ALL schedules and attendance logs.')) return;
    try {
      const { error: attendanceError } = await supabase.from('attendance_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (attendanceError) throw new Error('Failed to delete attendance logs. Please contact Creator - Shan');
      const { error: scheduleError } = await supabase.from('schedules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (scheduleError) throw new Error('Failed to delete schedules. Please contact Creator - Shan');
      showToast('Weekly data reset successfully', 'success');
      loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred during reset.';
      showToast(message, 'error');
    }
  };

  const resetForm = () => {
    setFormData({ day: '', time: '', level: '', subject: '', teacher_id: '' })
    setEditingSchedule(null)
    setShowForm(false)
  }

  const handleAISubmit = async () => {
    setLoading(true);
    try {
      const updates: any[] = [];
      levels.forEach(level => {
        days.forEach(day => {
          const cell = aiScheduleMatrix[level][day];
          if (cell.subject && cell.teacher_id && cell.time) {
            updates.push({ day, time: cell.time, level, subject: cell.subject, teacher_id: cell.teacher_id });
          }
        });
      });
      const { error } = await supabase.from('schedules').upsert(updates, { onConflict: 'day,time,level' });
      if (error) throw error;
      showToast('AI schedule submitted successfully!', 'success');
      setAiSchedulerMode(false);
      loadData();
    } catch (error) {
      showToast('Failed to submit AI-generated schedule. Please contact Creator - Shan', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Updated handler for AI Command Response
  const handleAICommandResponse = (response: string) => {
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
    }
    try {
      const rawCommands = JSON.parse(jsonStr);
      if (Array.isArray(rawCommands) && rawCommands.every(cmd => cmd && typeof cmd.command === 'string')) {
        const plannedEntries: PlannedCommandEntry[] = rawCommands.map((cmd, index) => {
          const validationResult = validateCommand(cmd);
          return {
            id: `cmd-${Date.now()}-${index}`,
            command: cmd,
            validation: validationResult,
            isEditing: false,
            editedJson: JSON.stringify(cmd, null, 2),
          };
        });
        setAiPlannedCommands(plannedEntries);
        setShowAICommandReview(true);
        showToast('AI has proposed schedule changes. Please review them.', 'info');
      } else {
        const errorMsg = 'AI response did not contain a valid array of commands or commands lacked a .command property.';
        showToast(errorMsg, 'error');
        logAICommandError({
          command_json: { rawResponse: jsonStr },
          error_message: errorMsg,
          user_role: user?.role || 'unknown',
        });
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      showToast(`Failed to parse AI commands: ${errorMsg}`, 'error');
      logAICommandError({
        command_json: { rawResponse: jsonStr, parseError: errorMsg },
        error_message: 'Failed to parse AI JSON response.',
        user_role: user?.role || 'unknown',
      });
    }
  };

  // Handlers for editing commands in the review modal
  const handleEditCommandToggle = (commandId: string) => {
    setAiPlannedCommands(prev =>
      prev.map(pCmd =>
        pCmd.id === commandId ? { ...pCmd, isEditing: !pCmd.isEditing, editedJson: JSON.stringify(pCmd.command, null, 2) } : { ...pCmd, isEditing: false }
      )
    );
  };

  const handleCommandJsonChange = (commandId: string, newJson: string) => {
    setAiPlannedCommands(prev =>
      prev.map(pCmd =>
        pCmd.id === commandId ? { ...pCmd, editedJson: newJson } : pCmd
      )
    );
  };

  const handleSaveEditedCommand = (commandId: string) => {
    setAiPlannedCommands(prev =>
      prev.map(pCmd => {
        if (pCmd.id === commandId) {
          try {
            const newCommandObject = JSON.parse(pCmd.editedJson);
            const newValidationResult = validateCommand(newCommandObject);
            if (!newValidationResult.isValid) {
              showToast(newValidationResult.message || 'Edited command is invalid.', 'error');
            } else {
              showToast('Command updated and re-validated.', 'success');
            }
            return {
              ...pCmd,
              command: newCommandObject,
              validation: newValidationResult,
              isEditing: false,
            };
          } catch (e) {
            const jsonErrorMsg = e instanceof Error ? e.message : 'Unknown JSON error';
            showToast(`Invalid JSON format: ${jsonErrorMsg}. Please correct.`, 'error');
            return { ...pCmd, validation: { isValid: false, message: `Invalid JSON: ${jsonErrorMsg}` } };
          }
        }
        return pCmd;
      })
    );
  };

  const applyAICommandsFromReview = async () => {
    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const plannedEntry of aiPlannedCommands) {
      const cmdToExecute = plannedEntry.command;

      if (!plannedEntry.validation.isValid) {
        // const errorMessage = plannedEntry.validation.message || `Skipping invalid command: ${cmdToExecute.command}`;
        // No toast here as it's already visually indicated and potentially logged during edit/save.
        // User is consciously proceeding with some invalid commands skipped.
        console.warn("Skipping pre-invalidated command:", { command: cmdToExecute, reason: plannedEntry.validation.message });
        failCount++;
        continue;
      }

      // Final validation, though ideally command in plannedEntry is already validated
      const finalDbCheckValidation = validateCommand(cmdToExecute);
      if(!finalDbCheckValidation.isValid){
        const errorMessage = finalDbCheckValidation.message || `Command ${cmdToExecute.command} became invalid before DB call.`
        showToast(errorMessage, 'error');
        console.warn('Invalid AI Schedule Command (Final DB Check Fail):', { command: cmdToExecute, reason: errorMessage });
        logAICommandError({
          command_json: cmdToExecute,
          error_message: `Final DB Check Validation Error: ${errorMessage}`,
          user_role: user?.role || 'unknown',
        });
        failCount++;
        continue;
      }

      try {
        if (cmdToExecute.command === 'AddSchedule') {
          const payload = {
            day: String(cmdToExecute.day).trim(), time: String(cmdToExecute.time).trim(),
            level: String(cmdToExecute.level).trim(), subject: String(cmdToExecute.subject).trim(),
            teacher_id: String(cmdToExecute.teacher_id).trim(),
          };
          const { error } = await supabase.from('schedules').insert(payload);
          if (error) throw error;
          showToast(`AddSchedule for ${payload.level} ${payload.day} succeeded.`, 'success');
          successCount++;
        } else if (cmdToExecute.command === 'UpdateSchedule') {
          const { id, ...fieldsToUpdate } = cmdToExecute;
          delete fieldsToUpdate.command;
          const trimmedFieldsToUpdate: { [key: string]: any } = {};
          for (const key in fieldsToUpdate) {
            trimmedFieldsToUpdate[key] = typeof fieldsToUpdate[key] === 'string' ? fieldsToUpdate[key].trim() : fieldsToUpdate[key];
          }
          const { error } = await supabase.from('schedules').update(trimmedFieldsToUpdate).eq('id', String(id).trim());
          if (error) throw error;
          showToast(`UpdateSchedule for ID ${id} succeeded.`, 'success');
          successCount++;
        } else if (cmdToExecute.command === 'DeleteSchedule') {
          const { error } = await supabase.from('schedules').delete().eq('id', String(cmdToExecute.id).trim());
          if (error) throw error;
          showToast(`DeleteSchedule for ID ${cmdToExecute.id} succeeded.`, 'success');
          successCount++;
        }
      } catch (e) {
        const supabaseErrorMessage = e instanceof Error ? e.message : 'An unknown Supabase error occurred.';
        showToast(`Command failed: ${cmdToExecute.command}${cmdToExecute.id ? ` (ID: ${cmdToExecute.id})` : ''}. Error: ${supabaseErrorMessage}`, 'error');
        console.error('Supabase Command Execution Error:', { command: cmdToExecute, error: e });
        logAICommandError({
          command_json: cmdToExecute,
          error_message: `Supabase Execution Error: ${supabaseErrorMessage} (Command: ${cmdToExecute.command})`,
          user_role: user?.role || 'unknown',
        });
        failCount++;
      }
    }
    setShowAICommandReview(false);
    setAiPlannedCommands([]);
    setLoading(false);
    if (successCount > 0 || (successCount === 0 && failCount === 0 && aiPlannedCommands.length > 0) ) {
      loadData();
    } else if (failCount > 0 && successCount === 0 && aiPlannedCommands.length > 0) { // only show if there were commands to process
      showToast('All AI commands failed processing or were invalid. No changes applied.', 'warning');
    } else if (aiPlannedCommands.length === 0 && successCount === 0 && failCount === 0) {
      // No commands processed, no need for a toast unless it's a specific "cleared" message
    }
  };

  const getTeacherNames = () => teachers.map(t => t.name)

  const handleAISingleScheduleResponse = (response: string) => {
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
    }
    try {
      const schedule = JSON.parse(jsonStr);
      if (schedule && typeof schedule === 'object' && schedule.day && schedule.time && schedule.level && schedule.subject && schedule.teacher_id) {
        const teacherList = teachers;
        let teacher = teacherList.find(t => t.id === schedule.teacher_id);
        if (!teacher) {
          teacher = teacherList.find(t => schedule.teacher_id && t.name.toLowerCase().includes(String(schedule.teacher_id).toLowerCase()));
          if (teacher) schedule.teacher_id = teacher.id;
          else if (schedule.teacher_name) {
            teacher = teacherList.find(t => String(t.name).toLowerCase().includes(String(schedule.teacher_name).toLowerCase()));
            if (teacher) schedule.teacher_id = teacher.id;
          }
        }
        if (!teacher) {
          showToast('AI selected an invalid teacher. Please choose a real teacher or ensure teacher_id is a valid UUID.', 'error');
          return;
        }
        schedule.teacher_id = teacher.id;
        setFormData(schedule);
        setShowForm(true);
        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
        handleSubmit(fakeEvent); // This will show its own toasts
      } else {
        showToast('AI response did not contain a valid single schedule object.', 'error');
      }
    } catch (e) {
      showToast('Failed to parse AI single schedule. Please try again.', 'error');
    }
  };

  if (!user) {
    return (
      <Layout title="Admin Dashboard">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-xl font-semibold mb-2">You are not logged in</h2>
          <p className="mb-4">Please log in to access the Admin Dashboard.</p>
          <a href="/StaffLogin" className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">Go to Login</a>
        </div>
      </Layout>
    );
  }

  if (loading && !showAICommandReview) { // Don't show main loading if review modal is active
    return (
      <Layout title="Admin Dashboard">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Admin Dashboard">
      <AnnouncementFeed />
      <AnnouncementCreateModal open={showAnnouncementModal} onClose={() => setShowAnnouncementModal(false)} />
      <div className="space-y-6 px-1 sm:px-0">
        <div className="bg-emerald-50 rounded-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-emerald-900 mb-2">{getGreeting(user?.name)}</h3>
          
          <p className="text-emerald-700 text-sm sm:text-base">Manage weekly schedules, class assignments, and academic planning for Pre-K to P6 classes.</p>
          <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
            <button onClick={() => setShowForm(true)} className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm sm:text-base w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" /> Add Schedule
            </button>
            <button onClick={handleResetWeeklyData} className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm sm:text-base w-full sm:w-auto">
              <RotateCcw className="h-4 w-4 mr-2" /> Reset Weekly Data
            </button>
            {(user?.role === 'admin' || user?.role === 'head' || user?.role === 'creator') && (
              <button onClick={() => setShowAnnouncementModal(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" /> New Announcement
              </button>
            )}
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6 border">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Day</label>
                <select value={formData.day} onChange={(e) => setFormData(prev => ({ ...prev, day: e.target.value }))} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm">
                  <option value="">Select Day</option>
                  {days.map(day => (<option key={day} value={day}>{day}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Time</label>
                <input type="time" value={formData.time} onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Level</label>
                <select value={formData.level} onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm">
                  <option value="">Select Level</option>
                  {levels.map(level => (<option key={level} value={level}>{level}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select value={formData.subject} onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm">
                  <option value="">Select Subject</option>
                  {subjects.map(subject => (<option key={subject} value={subject}>{subject}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Teacher</label>
                <select value={formData.teacher_id} onChange={(e) => setFormData(prev => ({ ...prev, teacher_id: e.target.value }))} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm">
                  <option value="">Select Teacher</option>
                  {teachers.map(teacher => (<option key={teacher.id} value={teacher.id}>{teacher.name}</option>))}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-5 flex flex-wrap gap-2 sm:gap-3">
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm sm:text-base w-full sm:w-auto">
                  {editingSchedule ? 'Update Schedule' : 'Add Schedule'}
                </button>
                <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm sm:text-base w-full sm:w-auto">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-4 px-1 sm:px-0">
          <label className="flex items-center cursor-pointer text-sm sm:text-base">
            <input type="checkbox" checked={aiSchedulerMode} onChange={e => setAiSchedulerMode(e.target.checked)} className="form-checkbox h-5 w-5 text-emerald-600" />
            <span className="ml-2 font-medium text-emerald-700">🧠 Enable AI Scheduling</span>
          </label>
          {aiSchedulerMode && (
            <button type="button" className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs sm:text-base" onClick={() => setShowAISchedulerChat(true)}>
              Open AI Scheduler Chat
            </button>
          )}
        </div>

        {showAISchedulerChat && (
          <AIAssistant
            isOpen={showAISchedulerChat} onClose={() => setShowAISchedulerChat(false)} userRole="admin"
            triggerMessage={null} onTriggerMessageProcessed={undefined}
            onAICommandResponse={handleAICommandResponse}
            onAISingleScheduleResponse={handleAISingleScheduleResponse}
            teacherNames={getTeacherNames()}
          />
        )}

        {showAICommandReview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-lg shadow-2xl p-4 sm:p-6 w-full max-w-3xl max-h-[90vh] flex flex-col">
              <h3 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800">Review AI Proposed Changes</h3>
              <p className="text-xs text-gray-600 mb-3">
                Review each command. Invalid commands are highlighted in red. You can edit the JSON for any command and re-validate it.
              </p>
              <div className="flex-grow overflow-y-auto mb-4 border rounded-md">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-100 z-10">
                    <tr className="text-left">
                      <th className="p-2 border-b font-semibold text-gray-700">Status</th>
                      <th className="p-2 border-b font-semibold text-gray-700">Command</th>
                      <th className="p-2 border-b font-semibold text-gray-700">Day</th>
                      <th className="p-2 border-b font-semibold text-gray-700">Time</th>
                      <th className="p-2 border-b font-semibold text-gray-700">Level</th>
                      <th className="p-2 border-b font-semibold text-gray-700">Subject</th>
                      <th className="p-2 border-b font-semibold text-gray-700">Teacher / ID</th>
                      <th className="p-2 border-b font-semibold text-gray-700">Sch. ID</th>
                      <th className="p-2 border-b font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiPlannedCommands.map((plannedEntry) => (
                      <React.Fragment key={plannedEntry.id}>
                        <tr className={`${!plannedEntry.validation.isValid ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'} transition-colors`}>
                          <td className="p-2 border-b border-r align-top">
                            {!plannedEntry.validation.isValid && (
                              <div className="group relative flex justify-center">
                                <span className="text-red-500 text-lg">⚠️</span>
                                {plannedEntry.validation.message && (
                                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 w-max max-w-xs bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 break-words whitespace-normal shadow-lg">
                                    {plannedEntry.validation.message}
                                  </div>
                                )}
                              </div>
                            )}
                             {plannedEntry.validation.isValid && (
                                <div className="flex justify-center text-green-500 text-lg">✓</div>
                             )}
                          </td>
                          <td className="p-2 border-b border-r align-top font-medium text-gray-700">{plannedEntry.command.command}</td>
                          <td className="p-2 border-b border-r align-top">{plannedEntry.command.day || '-'}</td>
                          <td className="p-2 border-b border-r align-top">{plannedEntry.command.time || '-'}</td>
                          <td className="p-2 border-b border-r align-top">{plannedEntry.command.level || '-'}</td>
                          <td className="p-2 border-b border-r align-top">{plannedEntry.command.subject || '-'}</td>
                          <td className="p-2 border-b border-r align-top break-all">
                            {plannedEntry.command.teacher_id
                              ? (teachers.find(t => t.id === plannedEntry.command.teacher_id)?.name || plannedEntry.command.teacher_id)
                              : '-'}
                          </td>
                          <td className="p-2 border-b border-r align-top break-all">{plannedEntry.command.id || '-'}</td>
                          <td className="p-2 border-b align-top text-center">
                            <button
                              onClick={() => handleEditCommandToggle(plannedEntry.id)}
                              className={`text-xs px-2 py-1 rounded transition-colors ${plannedEntry.isEditing ? 'bg-gray-300 hover:bg-gray-400 text-gray-800' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                            >
                              {plannedEntry.isEditing ? 'Cancel' : 'Edit'}
                            </button>
                          </td>
                        </tr>
                        {plannedEntry.isEditing && (
                          <tr>
                            <td colSpan={9} className="p-3 border-b bg-gray-50 shadow-inner">
                              <h4 className="text-xs font-semibold mb-1 text-gray-600">Edit Command JSON:</h4>
                              <textarea
                                value={plannedEntry.editedJson}
                                onChange={(e) => handleCommandJsonChange(plannedEntry.id, e.target.value)}
                                className="w-full h-36 p-2 border border-gray-300 rounded font-mono text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                spellCheck="false"
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                <button
                                  onClick={() => handleSaveEditedCommand(plannedEntry.id)}
                                  className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                                >
                                  Save & Re-validate
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                     {aiPlannedCommands.length === 0 && (
                        <tr>
                            <td colSpan={9} className="p-4 text-center text-gray-500">No commands proposed by AI yet.</td>
                        </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t">
                <button
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-sm order-2 sm:order-1"
                  onClick={() => { setShowAICommandReview(false); setAiPlannedCommands([]); }}
                >
                  Cancel & Clear All
                </button>
                <button
                  className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors text-sm order-1 sm:order-2"
                  onClick={applyAICommandsFromReview}
                  disabled={aiPlannedCommands.some(p => p.isEditing) || aiPlannedCommands.length === 0 || loading}
                >
                  {loading ? 'Processing...' : 'Confirm & Apply All Valid Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {aiSchedulerMode && (
          <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">AI Scheduler Matrix</h3>
              <div className="flex gap-2">
                <button onClick={handleAISubmit} className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-xs">
                  Submit Matrix
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[700px]">
                <thead>
                  <tr>
                    <th className="p-2 border-b bg-gray-50">Level</th>
                    {days.map(day => (<th key={day} className="p-2 border-b bg-gray-50">{day}</th>))}
                  </tr>
                </thead>
                <tbody>
                  {levels.map(level => (
                    <tr key={level}>
                      <td className="p-2 font-semibold border-b bg-gray-50">{level}</td>
                      {days.map(day => (
                        <td key={day} className="p-2 border-b">
                          <div className="flex flex-col gap-1">
                            <input type="time" value={aiScheduleMatrix[level][day].time} onChange={e => setAiScheduleMatrix(m => ({ ...m, [level]: { ...m[level], [day]: { ...m[level][day], time: e.target.value } } }))} className="w-full px-1 py-1 border border-gray-200 rounded text-xs mb-1" />
                            <select value={aiScheduleMatrix[level][day].subject} onChange={e => setAiScheduleMatrix(m => ({ ...m, [level]: { ...m[level], [day]: { ...m[level][day], subject: e.target.value } } }))} className="w-full px-1 py-1 border border-gray-200 rounded text-xs mb-1">
                              <option value="">Subject</option>
                              {subjects.map(subject => (<option key={subject} value={subject}>{subject}</option>))}
                            </select>
                            <select value={aiScheduleMatrix[level][day].teacher_id} onChange={e => setAiScheduleMatrix(m => ({ ...m, [level]: { ...m[level], [day]: { ...m[level][day], teacher_id: e.target.value } } }))} className="w-full px-1 py-1 border border-gray-200 rounded text-xs">
                              <option value="">Teacher</option>
                              {teachers.map(teacher => (<option key={teacher.id} value={teacher.id}>{teacher.name}</option>))}
                            </select>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-3 sm:p-6 border-b"><h3 className="text-base sm:text-lg font-semibold text-gray-900">Weekly Schedule</h3></div>
          {schedules.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-xs sm:text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Teacher</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {schedules.map((schedule) => (
                    <tr key={schedule.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">{schedule.day}</td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">{schedule.time}</td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">{schedule.level}</td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">{schedule.subject}</td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden sm:table-cell">{schedule.users?.name}</td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button onClick={() => handleEdit(schedule)} className="text-emerald-600 hover:text-emerald-900"><Edit className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(schedule.id)} className="text-red-600 hover:text-red-900"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-3 sm:p-6 text-center text-gray-500 text-xs sm:text-sm">No schedules created yet. Click "Add Schedule" to get started.</div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="text-center"><div className="text-xl sm:text-2xl font-bold text-emerald-600">{levels.length}</div><div className="text-xs sm:text-sm text-gray-600">Grade Levels</div></div>
            <div className="text-center"><div className="text-xl sm:text-2xl font-bold text-emerald-600">{schedules.length}</div><div className="text-xs sm:text-sm text-gray-600">Active Schedules</div></div>
            <div className="text-center"><div className="text-xl sm:text-2xl font-bold text-emerald-600">{teachers.length}</div><div className="text-xs sm:text-sm text-gray-600">Teachers</div></div>
            <div className="text-center"><div className="text-xl sm:text-2xl font-bold text-emerald-600">{subjects.length}</div><div className="text-xs sm:text-sm text-gray-600">Subjects</div></div>
          </div>
        </div>
      </div>
      <AIButton userRole="admin" />
    </Layout>
  )
}

// Types for matrix and updates
type ScheduleCell = { subject: string; teacher_id: string; time: string }
type ScheduleMatrix = { [level: string]: { [day: string]: ScheduleCell } }