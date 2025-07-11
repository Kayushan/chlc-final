-- Alter system_flags table to be more generic for different types of flag values
-- Add a new 'value' column to store text-based flag values
ALTER TABLE public.system_flags
ADD COLUMN IF NOT EXISTS flag_value text;

-- Update existing 'maintenance_mode' flag to use the new 'flag_value' column
-- This assumes 'maintenance_mode' exists and its boolean status was stored in 'is_active'.
-- We will store 'true' or 'false' as text in 'flag_value'.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.system_flags WHERE flag_name = 'maintenance_mode') THEN
        UPDATE public.system_flags
        SET flag_value = is_active::text -- Cast boolean to text
        WHERE flag_name = 'maintenance_mode';
    END IF;
END $$;

-- Insert the new 'active_theme' flag, defaulting to 'classic'
INSERT INTO public.system_flags (flag_name, flag_value, description, is_active)
VALUES ('active_theme', 'classic', 'Currently active UI theme for the application (e.g., classic, animated).', true)
ON CONFLICT (flag_name) DO UPDATE
SET flag_value = EXCLUDED.flag_value,
    description = EXCLUDED.description,
    updated_at = now();

-- Note: The 'is_active' column for the 'active_theme' flag can be considered redundant
-- if 'flag_value' directly holds the theme name. Setting it to 'true' here just indicates
-- the theme system itself is active/configured.
-- For flags like 'maintenance_mode', 'is_active' might still be used if desired,
-- but the primary source of truth for its status should now be 'flag_value' = 'true'/'false'.

-- Update RLS policies if necessary to grant SELECT on the new 'flag_value' column
-- Assuming existing SELECT grants on the table cover new columns. If not, they would be:
-- GRANT SELECT ON public.system_flags TO authenticated; (already in previous migration)
-- GRANT SELECT ON public.system_flags TO anon; (already in previous migration)

-- Ensure real-time is still enabled for the table (should persist, but good to be aware)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.system_flags; (already done)
-- ALTER TABLE public.system_flags REPLICA IDENTITY FULL; (already done)

COMMENT ON COLUMN public.system_flags.flag_value IS 'Stores the value of the flag, can be boolean (as text ''true''/''false'') or other text values like theme names.';

-- Optional: Consider making 'is_active' nullable if 'flag_value' becomes the primary data holder for all flags
-- ALTER TABLE public.system_flags ALTER COLUMN is_active DROP NOT NULL;
-- For now, we keep 'is_active' as NOT NULL DEFAULT false, new flags should primarily use 'flag_value'.
-- The 'active_theme' row sets 'is_active' to true to signify the theme feature itself is 'on'.
-- The actual theme ('classic'/'animated') is in 'flag_value'.
-- For 'maintenance_mode', 'flag_value' will now be 'true' or 'false'.
