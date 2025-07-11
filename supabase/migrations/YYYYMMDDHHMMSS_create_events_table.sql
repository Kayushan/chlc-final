-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    start_time timestamptz NOT NULL,
    end_time timestamptz NOT NULL,
    created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL, -- If creator is deleted, event remains, created_by is nulled.
    level_tags text[], -- e.g., ARRAY['P1', 'P2', 'All School']
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT check_end_time_after_start_time CHECK (end_time > start_time)
);

COMMENT ON TABLE public.events IS 'Stores school-wide events like holidays, exams, meetings, field trips.';
COMMENT ON COLUMN public.events.level_tags IS 'Array of level tags (e.g., P1, P4-P6, Staff) to target specific groups. NULL or empty means all/general.';

-- Trigger function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.update_event_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_updated_at_trigger
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_event_timestamp();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_start_time ON public.events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_end_time ON public.events(end_time);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_level_tags ON public.events USING GIN (level_tags); -- GIN index for array operations

-- RLS Policies for events table (RLS is now disabled by default as per user request)
-- ALTER TABLE public.events ENABLE ROW LEVEL SECURITY; -- RLS Originally Enabled
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY; -- RLS Disabled

-- Commented out RLS policies for events table
-- Ensure any pre-existing policies are removed if RLS is being turned off globally for this table
DROP POLICY IF EXISTS "Admins and Heads can manage all events" ON public.events;
DROP POLICY IF EXISTS "Teachers can view all events" ON public.events;
/*
CREATE POLICY "Admins and Heads can manage all events"
ON public.events FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'head')))
WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'head')));

CREATE POLICY "Teachers can view all events"
ON public.events FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'teacher'));
*/

-- Enable real-time for the events table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
        EXCEPTION
            WHEN duplicate_object THEN
                RAISE NOTICE 'Table public.events is already part of supabase_realtime publication.';
            WHEN OTHERS THEN
                RAISE;
        END;
    ELSE
        RAISE WARNING 'Publication supabase_realtime does not exist. Real-time may not be configured for public.events.';
    END IF;
    ALTER TABLE public.events REPLICA IDENTITY FULL;
END $$;
