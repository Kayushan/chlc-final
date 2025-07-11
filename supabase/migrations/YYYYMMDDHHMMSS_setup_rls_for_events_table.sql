-- Enable Row Level Security for the events table
-- Disable Row Level Security for the events table as per user request
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;

-- Drop any RLS policies that might have been created for the events table
-- This ensures a clean state with RLS confirmed off for this table.
DROP POLICY IF EXISTS "Admins can manage all events" ON public.events;
DROP POLICY IF EXISTS "Heads can view all events" ON public.events;
DROP POLICY IF EXISTS "Teachers can view all events" ON public.events;
DROP POLICY IF EXISTS "Creators can manage all events" ON public.events; -- If this was ever added
-- Drop any other potential old policies if their names are known
DROP POLICY IF EXISTS "Public access to events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can read events" ON public.events;


SELECT 'RLS disabled and policies removed for events table.';
