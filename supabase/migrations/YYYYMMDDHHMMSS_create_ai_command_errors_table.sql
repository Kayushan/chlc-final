-- Create ai_command_errors table
CREATE TABLE IF NOT EXISTS public.ai_command_errors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    command_json jsonb NOT NULL,
    error_message text,
    user_role text,
    created_at timestamptz DEFAULT now()
);

-- Optional: Add a comment to the table for clarity
COMMENT ON TABLE public.ai_command_errors IS 'Stores AI-generated commands that failed validation or execution, for debugging and improving AI prompts.';

-- Optional: Indexes can be added later if needed, e.g., on user_role or created_at
-- CREATE INDEX IF NOT EXISTS idx_ai_command_errors_user_role ON public.ai_command_errors(user_role);
-- CREATE INDEX IF NOT EXISTS idx_ai_command_errors_created_at ON public.ai_command_errors(created_at DESC);

-- Ensure RLS is disabled unless specific policies are intended (following project pattern)
ALTER TABLE public.ai_command_errors DISABLE ROW LEVEL SECURITY;
