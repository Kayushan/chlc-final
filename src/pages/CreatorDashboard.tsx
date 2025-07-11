import React, { useState } from 'react';

// Feedback type for dashboard
type Feedback = {
  id: string;
  user_id?: string | null;
  user_name?: string | null;
  feedback: string;
  created_at: string;
};

// Feedback modal props
import { Layout } from '../components/Layout'
import { AnnouncementFeed } from '../components/AnnouncementFeed'
import { AnnouncementCreateModal } from '../components/AnnouncementCreateModal'
import { AIButton } from '../components/AIButton'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { hashPassword } from '../lib/auth'
import { getCurrentStaffUser } from '../lib/auth'
import { Plus, Edit, Trash2, Bot } from 'lucide-react' // Removed Palette
import { DiagnosticPanel } from '../components/DiagnosticPanel'
// Removed useTheme and ThemeName imports

export function CreatorDashboard() {
  // Dynamic greeting function
  function getGreeting(name?: string | null) {
    const hour = new Date().getHours();
    let greeting = 'Hello';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 18) greeting = 'Good afternoon';
    else greeting = 'Good evening';
    return `${greeting}, ${name || 'Creator'}`;
  }
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'announcement'>('dashboard');
  const { showToast } = useToast();
  const user = getCurrentStaffUser();
  const [users, setUsers] = useState<any[]>([]);
  const [aiSettings, setAiSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showAIForm, setShowAIForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({
    id: null as string | null,
    name: '',
    email: '',
    password: '',
    role: 'teacher' as 'admin' | 'head' | 'teacher',
  });
  const [aiForm, setAiForm] = useState({
    api_keys: [] as string[],
    model: '',
    access_level: {
      creator: true,
      admin: true,
      head: true,
      teacher: false,
    },
  });
  const [newApiKey, setNewApiKey] = useState('');
  const [maintenanceModeActive, setMaintenanceModeActive] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showSystemSettings, setShowSystemSettings] = useState(false);
  const [aiAssistantEnabled, setAIAssistantEnabled] = useState(() => {
    const v = localStorage.getItem('aiAssistantEnabled');
    return v ? v === 'true' : true;
  });
  const [testMode, setTestMode] = useState(() => {
    const v = localStorage.getItem('testMode');
    return v ? v === 'true' : false;
  });
  const [verbosity, setVerbosity] = useState(() => {
    const v = localStorage.getItem('verbosity');
    return v ? Number(v) : 5;
  });

  // Feedback state for dashboard
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

  React.useEffect(() => {
    loadCreatorData();
  }, []);

  const loadCreatorData = async () => {
    setLoading(true); // Combined loading state
    setMaintenanceLoading(true);
    try {
      // Load users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .neq('role', 'creator')
        .order('name');

      if (userError) {
        console.error('Users query error:', userError);
        throw new Error('Failed to load users. Please contact Creator - Shan');
      }
      setUsers(userData || []);

      // Load AI settings
      const { data: aiData, error: aiError } = await supabase
        .from('ai_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (aiError) {
        console.error('AI settings query error:', aiError);
        showToast('Could not load AI settings, they might need to be configured.', 'warning');
      } else {
        setAiSettings(aiData);
        if (aiData) {
          setAiForm({
            api_keys: aiData.api_keys || [],
            model: aiData.model || '',
            access_level: aiData.access_level || { creator: true, admin: true, head: true, teacher: false },
          });
        }
      }

      // Load Maintenance Mode status
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('system_flags')
        .select('is_active')
        .eq('flag_name', 'maintenance_mode')
        .single();

      if (maintenanceError) {
        console.error('Maintenance mode fetch error:', maintenanceError);
        showToast('Could not fetch maintenance mode status. Defaulting to OFF. Please check Supabase table `system_flags`.', 'error');
        setMaintenanceModeActive(false);
      } else if (maintenanceData) {
        setMaintenanceModeActive(maintenanceData.is_active);
      } else {
        showToast('Maintenance mode flag not found in `system_flags`. Defaulting to OFF. Please ensure it is set up.', 'error');
        setMaintenanceModeActive(false);
      }

      // Load feedbacks for dashboard
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false });
      if (feedbackError) {
        console.error('Feedbacks query error:', feedbackError);
      } else {
        setFeedbacks((feedbackData as Feedback[]) || []);
      }

    } catch (error) {
      console.error('Error loading creator dashboard data:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while loading data.';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
      setMaintenanceLoading(false);
    }
  };

  const resetUserForm = () => {
    setUserForm({ 
      id: null,
      name: '', 
      email: '', 
      password: '', 
      role: 'teacher' 
    })
    setEditingUser(null)
    setShowUserForm(false)
  }

  const handleEditUser = (user: any) => {
    setEditingUser(user)
    setUserForm({
      id: user.id,
      name: user.name,
      email: user.email,
      password: '', // Leave password blank for security
      role: user.role
    })
    setShowUserForm(true)
  }

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingUser) {
        // Update existing user
        const updateData: any = {
          name: userForm.name,
          email: userForm.email,
          role: userForm.role
        };
        // Only update password if a new one is provided
        if (userForm.password.trim()) {
          updateData.password_hash = await hashPassword(userForm.password);
        }
        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', userForm.id);
        if (error) {
          console.error('User update error:', error);
          throw new Error('Please contact creator - Shan');
        }
        showToast('User updated successfully', 'success');
      } else {
        // Create new user
        if (!userForm.password.trim()) {
          showToast('Password is required for new users', 'error');
          setLoading(false);
          return;
        }
        const hashedPassword = await hashPassword(userForm.password);
        const { error } = await supabase
          .from('users')
          .insert({
            name: userForm.name,
            email: userForm.email,
            password_hash: hashedPassword,
            role: userForm.role
          });
        if (error) {
          console.error('User creation error:', error);
          throw new Error('Please contact creator - Shan');
        }
        showToast('User created successfully', 'success');
      }
      resetUserForm();
      await loadCreatorData(); // Refresh user list after add/edit
    } catch (error) {
      console.error('Error submitting user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please contact creator - Shan';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete user "${name}"? This action cannot be undone.`)) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
      if (error) {
        console.error('User deletion error:', error);
        throw new Error('Please contact creator - Shan');
      }
      showToast('User deleted', 'success');
      await loadCreatorData(); // Refresh user list after delete
    } catch (error) {
      console.error('Error deleting user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please contact creator - Shan';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateAISettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (!aiForm.model.trim()) {
      showToast('AI model name is required', 'error');
      setLoading(false);
      return;
    }
    if (!confirm('Are you sure you want to save these AI settings?')) {
      setLoading(false);
      return;
    }
    try {
      if (aiSettings) {
        // Update existing settings
        const { error } = await supabase
          .from('ai_settings')
          .update({
            api_keys: aiForm.api_keys,
            model: aiForm.model,
            access_level: aiForm.access_level
          })
          .eq('id', aiSettings.id);
        if (error) {
          console.error('AI settings update error:', error);
          throw new Error('Please contact creator - Shan');
        }
      } else {
        // Create new settings
        const { error } = await supabase
          .from('ai_settings')
          .insert({
            api_keys: aiForm.api_keys,
            model: aiForm.model,
            access_level: aiForm.access_level
          });
        if (error) {
          console.error('AI settings creation error:', error);
          throw new Error('Please contact creator - Shan');
        }
      }
      showToast('AI settings updated successfully', 'success');
      setShowAIForm(false);
      await loadCreatorData(); // Refresh AI settings after update
    } catch (error) {
      console.error('Error updating AI settings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please contact creator - Shan';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleAddApiKey = () => {
    if (!newApiKey.trim()) {
      showToast('Please enter an API key', 'warning');
      return;
    }
    // Basic format validation (starts with sk- or sk-or-)
    if (!/^sk(-or)?-/.test(newApiKey.trim())) {
      showToast('API key format invalid', 'error');
      return;
    }
    if (aiForm.api_keys.length >= 10) {
      showToast('Maximum 10 API keys allowed', 'warning');
      return;
    }
    setAiForm(prev => ({
      ...prev,
      api_keys: [...prev.api_keys, newApiKey.trim()]
    }));
    setNewApiKey('');
    showToast('API key added', 'success');
  }

  const handleRemoveApiKey = (index: number) => {
    setAiForm(prev => ({
      ...prev,
      api_keys: prev.api_keys.filter((_, i) => i !== index)
    }))
    showToast('API key removed', 'success')
  }

  // Maintenance toggle handler
  const handleToggleMaintenance = async () => {
    const newValue = !maintenanceModeActive;
    setMaintenanceLoading(true);
    try {
      const { error } = await supabase
        .from('system_flags')
        .update({ is_active: newValue, updated_at: new Date().toISOString() }) // Explicitly set updated_at if trigger isn't immediate/reliable for UI
        .eq('flag_name', 'maintenance_mode');

      if (error) {
        console.error('Maintenance mode update error:', error);
        showToast(`Failed to update maintenance mode: ${error.message}`, 'error');
        // Revert UI state if Supabase update fails
        setMaintenanceModeActive(!newValue);
      } else {
        setMaintenanceModeActive(newValue);
        showToast(newValue ? 'Maintenance mode ENABLED globally.' : 'Maintenance mode DISABLED globally.', newValue ? 'warning' : 'success');
      }
    } catch (error) {
      console.error('Error in handleToggleMaintenance:', error);
      showToast('An unexpected error occurred while toggling maintenance mode.', 'error');
      setMaintenanceModeActive(!newValue); // Revert on catch
    } finally {
      setMaintenanceLoading(false);
    }
  };

  if (loading) { // General loading for user data, AI settings
    return (
      <Layout title="Creator Dashboard" isCreatorLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Creator Dashboard" isCreatorLayout>
      <>
        <div className="flex flex-wrap gap-2 mb-4 px-2 sm:px-0">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full sm:w-auto mb-2 sm:mb-0 px-3 py-2 rounded text-sm ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Dashboard</button>
          <button onClick={() => setActiveTab('announcement')} className={`w-full sm:w-auto mb-2 sm:mb-0 px-3 py-2 rounded text-sm ${activeTab === 'announcement' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Announcement</button>
        </div>
        {activeTab === 'announcement' ? (
          <div>
            <AnnouncementFeed />
            {(user?.role === 'admin' || user?.role === 'head' || user?.role === 'creator') && (
              <>
                <AnnouncementCreateModal open={showAnnouncementModal} onClose={() => setShowAnnouncementModal(false)} />
                <button onClick={() => setShowAnnouncementModal(true)} className="mt-2 flex items-center px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-base sm:text-sm">
                  <Plus className="h-4 w-4 mr-2" /> New Announcement
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <div>
              <AnnouncementFeed />
              <AnnouncementCreateModal open={showAnnouncementModal} onClose={() => setShowAnnouncementModal(false)} />
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 px-2 sm:px-0">
              {/* ...existing dashboard content... */}
            </div>

            {/* Responsive: Wrap all dashboard panels in a single-column flex for mobile */}
            <div className="flex flex-col gap-4 mt-4">
              {/* Maintenance Mode Toggle */}
              <div className={`rounded-lg p-3 sm:p-4 flex flex-col gap-2 shadow-sm border ${maintenanceModeActive ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} w-full max-w-full`}> 
                <h3 className={`font-semibold text-base mb-1 ${maintenanceModeActive ? 'text-red-800' : 'text-green-800'}`}>
                  Global Maintenance Mode
                </h3>
                <button
                  onClick={handleToggleMaintenance}
                  disabled={maintenanceLoading}
                  className={`w-full px-4 py-2.5 rounded-md font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
                    ${maintenanceLoading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : maintenanceModeActive
                        ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                        : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
                    }`}
                >
                  {maintenanceLoading
                    ? 'Updating...'
                    : maintenanceModeActive
                      ? 'DEACTIVATE Maintenance Mode'
                      : 'ACTIVATE Maintenance Mode'}
                </button>
                <p className={`text-xs ${maintenanceModeActive ? 'text-red-700' : 'text-gray-600'}`}>
                  {maintenanceModeActive
                    ? 'Site is currently INACCESSIBLE to non-creator users.'
                    : 'Site is currently LIVE for all users.'}
                </p>
                <span className="text-xs text-gray-500 mt-1">When activated, all non-creator users will see a maintenance page. You will retain full access.</span>
              </div>

              {/* System Settings Panel */}
              <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 flex flex-col gap-3 border w-full max-w-full">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 text-base">System Settings</h3>
                  <button onClick={() => setShowSystemSettings(v => !v)} className="text-xs text-blue-600 underline">{showSystemSettings ? 'Hide' : 'Show'}</button>
                </div>
                {showSystemSettings && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={aiAssistantEnabled} onChange={e => {
                          setAIAssistantEnabled(e.target.checked);
                          localStorage.setItem('aiAssistantEnabled', String(e.target.checked));
                        }} />
                        <span className="text-sm">AI Assistant</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={testMode} onChange={e => {
                          setTestMode(e.target.checked);
                          localStorage.setItem('testMode', String(e.target.checked));
                        }} />
                        <span className="text-sm">Test Mode</span>
                      </label>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Verbosity: {verbosity}</label>
                        <input type="range" min={1} max={10} value={verbosity} onChange={e => {
                          setVerbosity(Number(e.target.value));
                          localStorage.setItem('verbosity', String(e.target.value));
                        }} className="w-full" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Data Management Panel */}
              <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 flex flex-col gap-3 border w-full max-w-full">
                <h3 className="font-semibold text-gray-900 text-base mb-2">Data Management</h3>
                <button className="w-full px-4 py-2 bg-blue-100 text-blue-800 rounded-md font-semibold text-sm mb-1">Export Users</button>
                <button className="w-full px-4 py-2 bg-blue-100 text-blue-800 rounded-md font-semibold text-sm mb-1">Export Schedules</button>
                <button className="w-full px-4 py-2 bg-blue-100 text-blue-800 rounded-md font-semibold text-sm">Export Behavior Reports</button>
                <span className="text-xs text-gray-400">(Export actions are placeholders)</span>
              </div>

              {/* Security Panel */}
              <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 flex flex-col gap-2 border w-full max-w-full">
                <h3 className="font-semibold text-gray-900 text-base mb-2">Security</h3>
                <div className="text-sm text-gray-500">Security policies coming soon…</div>
              </div>

              {/* Diagnostic Panel Trigger */}
              <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 flex flex-col gap-2 border w-full max-w-full">
                <h3 className="font-semibold text-gray-900 text-base mb-2">Diagnostics</h3>
                <button onClick={() => setShowDiagnostics(true)} className="w-full px-4 py-2 bg-purple-600 text-white rounded-md font-semibold text-sm">Open Diagnostic Panel</button>
              </div>
            </div>
            </div>

            {/* Maintenance Mode Toggle */}
            <div className={`rounded-lg p-3 sm:p-4 flex flex-col gap-2 shadow-sm border ${maintenanceModeActive ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}> 
              <h3 className={`font-semibold text-base mb-1 ${maintenanceModeActive ? 'text-red-800' : 'text-green-800'}`}>
                Global Maintenance Mode
              </h3>
              <button
                onClick={handleToggleMaintenance}
                disabled={maintenanceLoading}
                className={`w-full px-4 py-2.5 rounded-md font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${maintenanceLoading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : maintenanceModeActive
                      ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                      : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
                  }`}
              >
                {maintenanceLoading
                  ? 'Updating...'
                  : maintenanceModeActive
                    ? 'DEACTIVATE Maintenance Mode'
                    : 'ACTIVATE Maintenance Mode'}
              </button>
              <p className={`text-xs ${maintenanceModeActive ? 'text-red-700' : 'text-gray-600'}`}>
                {maintenanceModeActive
                  ? 'Site is currently INACCESSIBLE to non-creator users.'
                  : 'Site is currently LIVE for all users.'}
              </p>
              <span className="text-xs text-gray-500 mt-1">When activated, all non-creator users will see a maintenance page. You will retain full access.</span>
            </div>

            {/* System Settings Panel */}
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 flex flex-col gap-3 border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900 text-base">System Settings</h3>
                <button onClick={() => setShowSystemSettings(v => !v)} className="text-xs text-blue-600 underline">{showSystemSettings ? 'Hide' : 'Show'}</button>
              </div>
              {showSystemSettings && (
                <div className="space-y-4">
                  {/* Theme Selector Removed */}
                  {/* <div className="border-t pt-4 space-y-3"> Other system settings below theme */}
                  <div className="space-y-3"> {/* If theme was the first item, no border-t needed here now */}
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={aiAssistantEnabled} onChange={e => {
                        setAIAssistantEnabled(e.target.checked);
                        localStorage.setItem('aiAssistantEnabled', String(e.target.checked));
                      }} />
                      <span className="text-sm">AI Assistant</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={testMode} onChange={e => {
                        setTestMode(e.target.checked);
                        localStorage.setItem('testMode', String(e.target.checked));
                      }} />
                      <span className="text-sm">Test Mode</span>
                    </label>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Verbosity: {verbosity}</label>
                      <input type="range" min={1} max={10} value={verbosity} onChange={e => {
                        setVerbosity(Number(e.target.value));
                        localStorage.setItem('verbosity', String(e.target.value));
                      }} className="w-full" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Data Management Panel */}
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 flex flex-col gap-3 border">
              <h3 className="font-semibold text-gray-900 text-base mb-2">Data Management</h3>
              <button className="w-full px-4 py-2 bg-blue-100 text-blue-800 rounded-md font-semibold text-sm mb-1">Export Users</button>
              <button className="w-full px-4 py-2 bg-blue-100 text-blue-800 rounded-md font-semibold text-sm mb-1">Export Schedules</button>
              <button className="w-full px-4 py-2 bg-blue-100 text-blue-800 rounded-md font-semibold text-sm">Export Behavior Reports</button>
              <span className="text-xs text-gray-400">(Export actions are placeholders)</span>
            </div>

            {/* Security Panel */}
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 flex flex-col gap-2 border">
              <h3 className="font-semibold text-gray-900 text-base mb-2">Security</h3>
              <div className="text-sm text-gray-500">Security policies coming soon…</div>
            </div>

            {/* Diagnostic Panel Trigger */}
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 flex flex-col gap-2 border">
              <h3 className="font-semibold text-gray-900 text-base mb-2">Diagnostics</h3>
              <button onClick={() => setShowDiagnostics(true)} className="w-full px-4 py-2 bg-purple-600 text-white rounded-md font-semibold text-sm">Open Diagnostic Panel</button>
            </div>

            <div className="md:col-span-2 lg:col-span-3 bg-blue-50 rounded-lg p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                {getGreeting(user?.name)}
              </h3>

// Dynamic greeting function (moved to top of component)
              <p className="text-blue-700">
                You have full system access to manage Charis Hope Learning Centre's platform.
                Phase 3 includes AI assistant, user management, and behavior reports.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                <button
                  onClick={() => setShowUserForm(true)}
                  className="flex items-center px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </button>
                <button
                  onClick={() => setShowAIForm(true)}
                  className="flex items-center px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Configure AI
                </button>
              </div>
            </div>

            {/* User Creation Form */}
            {showUserForm && (
              <div className="md:col-span-2 lg:col-span-3 bg-white rounded-lg shadow-sm p-3 sm:p-6 border">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h3>
                
                <form onSubmit={handleSubmitUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={userForm.name}
                      onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Password {editingUser ? '(leave blank to keep current)' : ''}
                    </label>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                      required={!editingUser}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder={editingUser ? 'Enter new password to change' : 'Enter password'}
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value as any }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="teacher">Teacher</option>
                      <option value="head">Head</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 flex flex-wrap gap-2 sm:gap-3">
                    <button
                      type="submit"
                      className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      {editingUser ? 'Update User' : 'Create User'}
                    </button>
                    <button
                      type="button"
                      onClick={resetUserForm}
                      className="px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* AI Configuration Form */}
            {showAIForm && (
              <div className="md:col-span-2 lg:col-span-3 bg-white rounded-lg shadow-sm p-3 sm:p-6 border">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Configure AI Assistant</h3>
                
                <form onSubmit={handleUpdateAISettings} className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      OpenRouter API Keys ({aiForm.api_keys.length}/10)
                    </label>
                    
                    {/* Add new API key */}
                    <div className="flex flex-col sm:flex-row gap-2 mb-3">
                      <input
                        type="password"
                        value={newApiKey}
                        onChange={(e) => setNewApiKey(e.target.value)}
                        placeholder="sk-or-v1-..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleAddApiKey}
                        disabled={aiForm.api_keys.length >= 10}
                        className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
                      >
                        Add Key
                      </button>
                    </div>
                    
                    {/* List existing API keys */}
                    <div className="space-y-2">
                      {aiForm.api_keys.map((key, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md flex-wrap gap-2">
                          <span className="text-xs sm:text-sm font-mono text-gray-600 break-all">
                            Key #{index + 1}: {key.substring(0, 12)}...{key.substring(key.length - 4)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveApiKey(index)}
                            className="text-red-600 hover:text-red-800 text-xs sm:text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      {aiForm.api_keys.length === 0 && (
                        <p className="text-xs sm:text-sm text-gray-500 italic">No API keys configured</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Model</label>
                    <input
                      type="text"
                      value={aiForm.model}
                      onChange={(e) => setAiForm(prev => ({ ...prev, model: e.target.value }))}
                      required
                      placeholder="e.g., mistral-7b-instruct, gpt-4, claude-3-opus"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter any valid OpenRouter model name. AI will be blocked if this field is empty.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Role Access</label>
                    <div className="space-y-2">
                      {Object.entries(aiForm.access_level).map(([role, enabled]) => (
                        <label key={role} className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={enabled as boolean}
                            onChange={e => setAiForm(prev => ({
                              ...prev,
                              access_level: {
                                ...prev.access_level,
                                [role]: e.target.checked
                              }
                            }))}
                            className="mr-2"
                          />
                          <span className="capitalize">{role}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    <button
                      type="submit"
                      className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                    >
                      Save AI Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAIForm(false)}
                      className="px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Users Management */}
            <div className="md:col-span-2 lg:col-span-3 bg-white rounded-lg shadow-sm border overflow-x-auto">
              <div className="p-4 sm:p-6 border-b">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">System Users</h3>
              </div>
              
              {users.length > 0 ? (
                <div className="overflow-x-auto w-full">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Email</th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Created</th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                            {user.name}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden sm:table-cell">
                            {user.email}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditUser(user)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit user"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id, user.name)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete user"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 sm:p-6 text-center text-gray-500 text-sm">
                  No users found. Click "Add User" to create the first user.
                </div>
              )}
            </div>



            {/* Feedbacks Panel */}
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Feedbacks</h3>
                <button
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const { data, error } = await supabase.from('feedbacks').select('*').order('created_at', { ascending: false });
                      if (error) throw error;
                      setFeedbacks(data || []);
                    } catch (err) {
                      showToast('Failed to load feedbacks', 'error');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="px-3 py-1 rounded bg-blue-100 text-blue-800 text-xs font-semibold hover:bg-blue-200"
                >
                  Refresh
                </button>
              </div>
              <div className="overflow-x-auto max-h-64 w-full">
                {feedbacks && feedbacks.length > 0 ? (
                  <table className="w-full min-w-[400px] text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-left font-medium text-gray-500">Name</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-500">Feedback</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-500">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {feedbacks.map((fb, i) => (
                        <tr key={i}>
                          <td className="px-2 py-2 whitespace-nowrap">{fb.user_name || 'Anonymous'}</td>
                          <td className="px-2 py-2 whitespace-pre-line max-w-xs break-words">{fb.feedback}</td>
                          <td className="px-2 py-2 whitespace-nowrap">{fb.created_at ? new Date(fb.created_at).toLocaleString() : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-gray-500 text-xs italic">No feedbacks yet.</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">System Status</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-green-600">Active</div>
                  <div className="text-xs sm:text-sm text-gray-600">Database</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-green-600">{users.length + 1}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Total Users</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">Phase 3</div>
                  <div className="text-xs sm:text-sm text-gray-600">Current Version</div>
                </div>
              </div>
            </div>

            {/* Feedbacks Section */}
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6 mt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Feedbacks</h3>
                <button
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const { data, error } = await supabase
                        .from('feedbacks')
                        .select('id, message, reporter_name, reporter_email, created_at')
                        .order('created_at', { ascending: false });
                      if (error) throw error;
                      setFeedbacks(
                        (data || []).map((fb: any) => ({
                          id: fb.id,
                          user_id: undefined, // Not available in this query
                          user_name: fb.reporter_name || null,
                          feedback: fb.message,
                          created_at: fb.created_at,
                        }))
                      );
                    } catch (e) {
                      showToast('Failed to load feedbacks', 'error');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  Refresh Feedbacks
                </button>
              </div>
              <div>
                {feedbacks && feedbacks.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {feedbacks.map((fb: any) => (
                      <li key={fb.id} className="py-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-gray-800 text-sm mb-1">{fb.message}</div>
                            <div className="text-xs text-gray-500">Reported by: {fb.reporter_name || 'Anonymous'} ({fb.reporter_email || 'N/A'})</div>
                          </div>
                          <div className="text-xs text-gray-400 mt-2 sm:mt-0">{fb.created_at ? new Date(fb.created_at).toLocaleString() : ''}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-500 text-sm italic">No feedbacks yet.</div>
                )}
              </div>
            </div>



            <AIButton userRole="creator" />



            <DiagnosticPanel isOpen={showDiagnostics} onClose={() => setShowDiagnostics(false)} />

            {loading && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
              </div>
            )}
          </>
        )}
      </>
    </Layout>
  );
}