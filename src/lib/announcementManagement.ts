import { supabase } from './supabase';
import { getCurrentStaffUser } from './auth';

export interface Announcement {
  id?: string;
  title: string;
  body: string;
  audience: string[];
  urgency: string;
  expires_at?: string | null;
  created_at?: string;
  creator_id?: string;
}

export interface CreateAnnouncementResult {
  success: boolean;
  message?: string;
  announcement?: Announcement;
}

export async function createAnnouncement(
  title: string,
  body: string,
  audience: string[],
  urgency: string,
  expires_at?: string | null
): Promise<CreateAnnouncementResult> {
  const user = getCurrentStaffUser();
  if (!user || !user.id) {
    return { success: false, message: 'User not authenticated.' };
  }
  const announcement: Omit<Announcement, 'id'> = {
    title,
    body,
    audience,
    urgency,
    expires_at: expires_at || null,
    created_at: new Date().toISOString(),
    creator_id: user.id,
  };
  const { data, error } = await supabase
    .from('announcements')
    .insert([announcement])
    .select()
    .single();
  if (error) {
    console.error('Error creating announcement:', error);
    return { success: false, message: error.message };
  }
  return { success: true, announcement: data };
}

export async function updateAnnouncement(
  id: string,
  fields: Partial<Omit<Announcement, 'id' | 'creator_id' | 'created_at'>>
): Promise<CreateAnnouncementResult> {
  const user = getCurrentStaffUser();
  if (!user || !user.id) {
    return { success: false, message: 'User not authenticated.' };
  }
  const { data, error } = await supabase
    .from('announcements')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('Error updating announcement:', error);
    return { success: false, message: error.message };
  }
  return { success: true, announcement: data };
}

export async function deleteAnnouncement(id: string): Promise<{ success: boolean; message?: string }> {
  const user = getCurrentStaffUser();
  if (!user || !user.id) {
    return { success: false, message: 'User not authenticated.' };
  }
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Error deleting announcement:', error);
    return { success: false, message: error.message };
  }
  return { success: true };
}
