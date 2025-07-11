import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: string[];
  urgency: string;
  expires_at?: string | null;
  created_at: string;
  creator_id?: string;
}

interface AnnouncementContextType {
  announcements: Announcement[];
  loading: boolean;
  error: string | null;
  refreshAnnouncements: () => Promise<void>;
}
const AnnouncementContext = createContext<AnnouncementContextType>({
  announcements: [],
  loading: false,
  error: null,
  refreshAnnouncements: async () => {},
});

export function AnnouncementProvider({ children }: { children: React.ReactNode }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('urgency', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  return (
    <AnnouncementContext.Provider value={{ announcements, loading, error, refreshAnnouncements: fetchAnnouncements }}>
      {children}
    </AnnouncementContext.Provider>
  );
}
export const useAnnouncementContext = () => useContext(AnnouncementContext);
