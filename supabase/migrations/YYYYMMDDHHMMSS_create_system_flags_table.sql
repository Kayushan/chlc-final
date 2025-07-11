-- Create system_flags table to manage global flags like maintenance mode
CREATE TABLE IF NOT EXISTS public.system_flags (
    flag_name text PRIMARY KEY,
    is_active boolean NOT NULL DEFAULT false,
    description text, -- Optional field for describing what the flag does
    updated_at timestamptz DEFAULT now()
);

-- Optional: Add a comment to the table for clarity
COMMENT ON TABLE public.system_flags IS 'Stores global system flags, such as maintenance mode status.';

-- Insert the initial maintenance_mode flag, default to false (not active)
-- Use INSERT ... ON CONFLICT DO NOTHING to avoid error if it already exists (e.g., from a manual setup or previous migration attempt)
INSERT INTO public.system_flags (flag_name, is_active, description)
VALUES ('maintenance_mode', false, 'Controls global maintenance mode for the application. If true, non-creator users see a maintenance page.')
ON CONFLICT (flag_name) DO NOTHING;

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_timestamp_on_system_flags()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on row update
CREATE TRIGGER on_system_flags_update
    BEFORE UPDATE ON public.system_flags
    FOR EACH ROW
    EXECUTE FUNCTION public.update_timestamp_on_system_flags();

-- Ensure RLS is disabled unless specific policies are intended
ALTER TABLE public.system_flags DISABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users to read flags. Specific write access will be handled by service roles or direct admin actions.
-- For simplicity in client-side fetching of maintenance mode, allow authenticated read.
-- More secure setup might involve a dedicated function callable by users.
GRANT SELECT ON public.system_flags TO authenticated;
-- For real-time, anon and authenticated might need select depending on how App.tsx handles it before login.
GRANT SELECT ON public.system_flags TO anon;
-- Creator role (or a service role) would handle updates. For now, updates will be via Supabase client with appropriate user rights.

-- Enable real-time for the system_flags table
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_flags;
-- This statement might need to be run by a superuser or through Supabase dashboard if restricted.
-- Alternatively, ensure real-time is enabled for the table via the Supabase dashboard.
-- For the purpose of migration, this is the standard SQL.
-- Supabase docs suggest: `alter table public.system_flags replica identity full;` might be needed as well for realtime on updates/deletes.
ALTER TABLE public.system_flags REPLICA IDENTITY FULL;

-- Note: If this is a fresh setup, the above GRANT might be too permissive.
-- A better approach for client-side might be to use a dedicated read-only function
-- or rely on the creator's elevated privileges to fetch this and then distribute via context.
-- However, for a simple global flag like maintenance mode, direct read by clients is often acceptable.
-- The real security is in blocking access based on this flag, not hiding the flag itself.
