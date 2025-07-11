-- Add leave_type column to annual_leaves table
ALTER TABLE public.annual_leaves
ADD COLUMN IF NOT EXISTS leave_type text NOT NULL DEFAULT 'Annual';

-- Add a comment to the new column for clarity
COMMENT ON COLUMN public.annual_leaves.leave_type IS 'Type of leave, e.g., Annual, Sick, Unpaid. Defaults to Annual.';

-- Backfill existing rows if any (though this table might be new from a recent migration)
-- If there are existing rows, they will get the 'Annual' default.
-- If specific logic was needed to determine leave_type for old records, it would go here.
-- For now, the default is sufficient.

-- No changes needed to RLS policies or DB functions specifically for adding this column,
-- as it's primarily a data field. Future logic might utilize it more actively.

-- Ensure real-time is still enabled for the table (should persist, but good to be aware)
-- This command should already have been run if real-time was previously enabled for the table.
-- If not, or to be certain:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.annual_leaves;
-- ALTER TABLE public.annual_leaves REPLICA IDENTITY FULL;
-- These are idempotent in effect if already set.
-- For this specific migration, we assume these are in place from the table's creation.
DO $$
BEGIN
    -- Check if publication exists and then try to add table
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        -- This might fail if table is already part of publication, which is fine.
        -- Using a DO block to catch potential errors if it's already added.
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.annual_leaves;
        EXCEPTION
            WHEN duplicate_object THEN
                RAISE NOTICE 'Table public.annual_leaves is already part of supabase_realtime publication.';
            WHEN OTHERS THEN
                RAISE; -- Re-raise other errors
        END;
    ELSE
        RAISE WARNING 'Publication supabase_realtime does not exist. Real-time may not be configured for public.annual_leaves.';
    END IF;

    -- Ensure replica identity is full for real-time on updates/deletes
    -- This is safe to run even if already set.
    ALTER TABLE public.annual_leaves REPLICA IDENTITY FULL;
END $$;
