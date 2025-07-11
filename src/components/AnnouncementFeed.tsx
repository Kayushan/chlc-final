import { useState } from 'react';
// Feedback modal for all users (copied from dashboard, but local state)

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (feedback: string) => Promise<void>;
}

function FeedbackModal({ open, onClose, onSubmit }: FeedbackModalProps) {
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setSubmitting(true);
    await onSubmit(feedback);
    setSubmitting(false);
    setFeedback('');
    onClose();
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-2 text-blue-900">We value your feedback!</h2>
        <p className="text-sm text-gray-700 mb-4">Please share your experience, report any issues, or suggest improvements for EduSync. Your feedback helps us improve the platform for everyone.</p>
        <form onSubmit={handleSubmit}>
          <textarea
            className="w-full border rounded-md p-2 text-sm mb-3 min-h-[80px]"
            value={feedback}
            onChange={e => setFeedback((e.target as HTMLTextAreaElement).value)}
            placeholder="Type your feedback here..."
            required
            disabled={submitting}
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-3 py-1 rounded bg-gray-200 text-gray-700 text-sm">Cancel</button>
            <button type="submit" disabled={submitting || !feedback.trim()} className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">{submitting ? 'Submitting...' : 'Submit'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
import { useAnnouncementContext } from '../contexts/AnnouncementContext';
import { getCurrentStaffUser } from '../lib/auth';
import { deleteAnnouncement } from '../lib/announcementManagement';
import { Trash2 } from 'lucide-react';
import { useToast } from './Toast';
import { supabase } from '../lib/supabase';


export function AnnouncementFeed() {
  const { announcements, loading, error, refreshAnnouncements } = useAnnouncementContext();
  const user = getCurrentStaffUser();
  const { showToast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Feedback modal state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Feedback submit handler (for all users)
  const handleSubmitFeedback = async (feedbackText: string) => {
    try {
      const { error } = await supabase.from('feedbacks').insert({
        reporter_name: user?.name || 'Anonymous',
        message: feedbackText,
      });
      if (error) {
        console.error('Supabase feedback insert error:', error);
        throw error;
      }
      showToast('Thank you for your feedback!', 'success');
    } catch (err) {
      console.error('Feedback submit error:', err);
      showToast('Failed to submit feedback', 'error');
    }
  };

  const canEditOrDelete = (a: any) => {
    return user && (user.role === 'creator' || user.role === 'admin' || user.id === a.creator_id);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this announcement?')) return;
    setDeletingId(id);
    const result = await deleteAnnouncement(id);
    setDeletingId(null);
    if (result.success) {
      showToast('Announcement deleted', 'success');
      await refreshAnnouncements();
    } else {
      showToast(result.message || 'Failed to delete announcement', 'error');
    }
  };


  // Feedback button always visible (bottom right)
  // Use window.supabase for feedback submission to avoid import issues

  if (loading) return <div className="text-center text-gray-500 py-4">Loading announcements…</div>;
  if (error) return <div className="text-center text-red-600 py-4">{error}</div>;
  if (!announcements.length) return (
    <>
      <div className="text-center text-gray-400 py-4">No announcements yet.</div>
      <button
        onClick={() => setShowFeedbackModal(true)}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)', marginBottom: '56px' }} // 56px = 3.5rem, to avoid overlap with AI button
      >
        Feedback
      </button>
      <FeedbackModal open={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} onSubmit={handleSubmitFeedback} />
    </>
  );

  return (
    <>
      <div className="space-y-2 mb-4">
        {announcements.map(a => (
          <div key={a.id} className={`border-l-4 p-3 ${a.urgency === 'high' ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50'}`}>
            <div className="flex justify-between items-center gap-2">
              <span className="font-bold">{a.title}</span>
              <span className="text-xs uppercase">{a.urgency}</span>
              {canEditOrDelete(a) && (
                <div className="flex gap-1 ml-2">
                  {/* Edit button can be implemented here */}
                  {/* <button className="text-blue-600 hover:text-blue-900"><Edit className="h-4 w-4" /></button> */}
                  <button
                    className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    disabled={deletingId === a.id}
                    onClick={() => handleDelete(a.id)}
                    title="Delete announcement"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="text-sm mt-1">{a.body}</div>
            <div className="text-xs text-gray-500 mt-1">Audience: {a.audience.join(', ')} | Expires: {a.expires_at ? new Date(a.expires_at).toLocaleString() : 'Never'}</div>
          </div>
        ))}
      </div>
      {/* Feedback button for all users, fixed bottom right */}
      {user?.role !== 'creator' && (
        <>
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)', marginBottom: '56px' }}
          >
            Feedback
          </button>
          <FeedbackModal open={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} onSubmit={handleSubmitFeedback} />
        </>
      )}
    </>
  );
}
