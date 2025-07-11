import { supabase } from './supabase';
import { getCurrentStaffUser } from './auth';

export interface EventData {
  id?: string;
  title: string;
  description?: string | null;
  start_time: string; // ISO string
  end_time: string;   // ISO string
  created_by?: string; // Should be set by the backend/function based on auth user
  level_tags?: string[] | null;
  created_at?: string;
  updated_at?: string;
  // For display, joined data might be useful
  users?: { name: string }; // User who created the event
}

export interface EventFilters {
  dateRangeStart?: string; // ISO string
  dateRangeEnd?: string;   // ISO string
  levelTags?: string[];    // Array of tags to filter by (match any)
}

/**
 * Creates a new event.
 * created_by will be automatically set to the currently authenticated user.
 */
export const createEvent = async (event: Omit<EventData, 'id' | 'created_by' | 'created_at' | 'updated_at'>): Promise<EventData> => {
  const user = getCurrentStaffUser();
  if (!user || !user.id) {
    throw new Error('User not authenticated. Cannot create event.');
  }

  if (new Date(event.start_time) >= new Date(event.end_time)) {
    throw new Error('Event end time must be after start time.');
  }

  const { data, error } = await supabase
    .from('events')
    .insert({
      ...event,
      created_by: user.id,
    })
    .select(`
        *,
        users (name)
    `)
    .single();

  if (error) {
    console.error('Error creating event:', error);
    throw error;
  }
  return data as EventData;
};

/**
 * Fetches events based on filters.
 */
export const getEvents = async (filters?: EventFilters): Promise<EventData[]> => {
  let query = supabase
    .from('events')
    .select(`
        id,
        title,
        description,
        start_time,
        end_time,
        level_tags,
        created_by,
        users!events_created_by_fkey (name)
    `) // Selected specific columns
    .order('start_time', { ascending: true });

  if (filters?.dateRangeStart) {
    query = query.gte('start_time', filters.dateRangeStart);
  }
  if (filters?.dateRangeEnd) {
    // For events, we typically want events that *overlap* with the range.
    // An event starts before range_end AND ends after range_start.
    // So, start_time < dateRangeEnd AND end_time > dateRangeStart
    // However, for simple calendar views fetching a month, often users expect events fully within or starting within.
    // Let's use: fetch events whose start_time is before dateRangeEnd and end_time is after dateRangeStart
    // This ensures overlapping events are caught. More precise:
    // An event (s, e) overlaps with range (S, E) if s < E and e > S.
    query = query.lte('start_time', filters.dateRangeEnd); // Event starts before or on the range end
     // And ensure it hasn't already ended before the range starts (for the above lte('start_time', filters.dateRangeEnd))
    query = query.gte('end_time', filters.dateRangeStart); // Event ends after or on the range start
  }

  if (filters?.levelTags && filters.levelTags.length > 0) {
    // Use 'cs' for "contains" if level_tags is jsonb array of strings, or 'ov' for overlap if text[]
    // Assuming level_tags is TEXT[] as per migration
    query = query.overlaps('level_tags', filters.levelTags);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
  return data as EventData[];
};

/**
 * Updates an existing event.
 */
export const updateEvent = async (eventId: string, updates: Partial<Omit<EventData, 'id' | 'created_by' | 'created_at' | 'updated_at'>>): Promise<EventData> => {
  if (updates.start_time && updates.end_time && new Date(updates.start_time) >= new Date(updates.end_time)) {
    throw new Error('Event end time must be after start time.');
  }
  // If only one time is provided, we'd need to fetch the other to validate, or let DB handle it.
  // For simplicity, if both are part of `updates`, we check. Otherwise, DB constraint handles it.

  const { data, error } = await supabase
    .from('events')
    .update({
        ...updates,
        updated_at: new Date().toISOString(), // Manually set updated_at if not using db trigger for this field from client
    })
    .eq('id', eventId)
    .select(`
        id, title, description, start_time, end_time, level_tags, created_by, created_at, updated_at,
        users (name)
    `) // Return more complete data on create/update
    .single();

  if (error) {
    console.error('Error updating event:', error);
    throw error;
  }
  return data as EventData;
};

/**
 * Deletes an event.
 */
export const deleteEvent = async (eventId: string): Promise<void> => {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};


/**
 * Placeholder/Simplified: Checks for event conflicts with other events.
 * A full conflict check with class schedules is more complex and might involve:
 * - Fetching schedules for the relevant date range and level_tags.
 * - Comparing time blocks.
 * This simplified version just checks against other events.
 */
export const checkEventConflict = async (
    startTime: string, // ISO string
    endTime: string,   // ISO string
    eventIdToExclude?: string | null, // To exclude the event itself when updating
    levelTags?: string[] | null
): Promise<{ conflictingEvents: EventData[], message: string | null }> => {

    let query = supabase
        .from('events')
        .select('id, title, start_time, end_time, level_tags')
        // An event (s, e) conflicts if its period (s, e) overlaps with (startTime, endTime)
        // Overlap condition: s < endTime AND e > startTime
        .lt('start_time', endTime)
        .gt('end_time', startTime);

    if (eventIdToExclude) {
        query = query.neq('id', eventIdToExclude);
    }

    if (levelTags && levelTags.length > 0) {
        // If event has no tags (all school), it conflicts if any tag matches or if other event is also all school
        // If event has tags, it conflicts if tags overlap or if other event is all school
        // This is a simplified check: if tags are involved, check for overlap or if one of them is for 'all' (null/empty tags)
        // A more precise logic might be needed based on how 'all levels' events interact with tagged events.
        query = query.or(`level_tags.is.null, level_tags.eq.{NULL}, level_tags.ov.{${levelTags.join(',')}}`);
    }
    // Else, if new event has no tags, it potentially conflicts with any event in the time range.

    const { data, error } = await query;

    if (error) {
        console.error('Error checking event conflicts:', error);
        // Don't throw, just report no conflicts or an error message
        return { conflictingEvents: [], message: "Could not check for conflicts due to an error." };
    }

    if (data && data.length > 0) {
        return {
            conflictingEvents: data as EventData[],
            message: `Warning: This event overlaps with ${data.length} other existing event(s).`
        };
    }

    return { conflictingEvents: [], message: null };
};
