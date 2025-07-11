import React, { useState } from 'react';
import { createAnnouncement } from '../lib/announcementManagement';
import { useAnnouncementContext } from '../contexts/AnnouncementContext';


interface Props {
  open: boolean;
  onClose: () => void;
  modalClassName?: string;
  inputClassName?: string;
  labelClassName?: string;
  buttonClassName?: string;
}

export function AnnouncementCreateModal({ open, onClose, modalClassName = '', inputClassName = '', labelClassName = '', buttonClassName = '' }: Props) {
  const { refreshAnnouncements } = useAnnouncementContext();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<string[]>(['all']);
  const [urgency, setUrgency] = useState('normal');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createAnnouncement(
      title,
      body,
      audience,
      urgency,
      expiresAt ? new Date(expiresAt).toISOString() : null
    );
    setLoading(false);
    if (result.success) {
      setTitle(''); setBody(''); setAudience(['all']); setUrgency('normal'); setExpiresAt('');
      await refreshAnnouncements();
      onClose();
    } else {
      setError(result.message || 'Failed to create announcement.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-700 transition-colors ${modalClassName}`}>
        <h2 className="text-lg font-bold mb-4 dark:text-gray-100">New Announcement</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={`block text-sm font-medium mb-1 dark:text-gray-200 ${labelClassName}`}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required className={`w-full border rounded px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 text-gray-900 ${inputClassName}`} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 dark:text-gray-200 ${labelClassName}`}>Body</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} required className={`w-full border rounded px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 text-gray-900 ${inputClassName}`} rows={3} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 dark:text-gray-200 ${labelClassName}`}>Audience</label>
            <select multiple value={audience} onChange={e => setAudience(Array.from(e.target.selectedOptions, o => o.value))} className={`w-full border rounded px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 text-gray-900 ${inputClassName}`}>
              <option value="all">All</option>
              <option value="admin">Admin</option>
              <option value="head">Head</option>
              <option value="creator">Creator</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 dark:text-gray-200 ${labelClassName}`}>Urgency</label>
            <select value={urgency} onChange={e => setUrgency(e.target.value)} className={`w-full border rounded px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 text-gray-900 ${inputClassName}`}>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 dark:text-gray-200 ${labelClassName}`}>Expires At (optional)</label>
            <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className={`w-full border rounded px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 text-gray-900 ${inputClassName}`} />
          </div>
          {error && <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>}
          <div className="flex gap-2 justify-end mt-2">
            <button type="button" onClick={onClose} className={`px-3 py-1 bg-gray-300 dark:bg-gray-700 dark:text-gray-100 rounded ${buttonClassName}`}>Cancel</button>
            <button type="submit" disabled={loading} className={`px-3 py-1 bg-emerald-600 dark:bg-emerald-700 text-white rounded ${buttonClassName}`}>{loading ? 'Posting...' : 'Post'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
