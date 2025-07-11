-- Enable pgcrypto for gen_random_uuid if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. teacher_leave_balances table
CREATE TABLE IF NOT EXISTS public.teacher_leave_balances (
    teacher_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    total_leaves integer NOT NULL DEFAULT 14,
    used_leaves integer NOT NULL DEFAULT 0,
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT teacher_leave_balances_check CHECK (used_leaves >= 0 AND total_leaves >= 0 AND used_leaves <= total_leaves)
);

COMMENT ON TABLE public.teacher_leave_balances IS 'Stores annual leave balance for each teacher.';
COMMENT ON COLUMN public.teacher_leave_balances.teacher_id IS 'Foreign key to the users table, identifying the teacher.';
COMMENT ON COLUMN public.teacher_leave_balances.total_leaves IS 'Total annual leave days allocated to the teacher per year.';
COMMENT ON COLUMN public.teacher_leave_balances.used_leaves IS 'Number of annual leave days already used by the teacher.';

-- Trigger function to update 'updated_at' on balance changes
CREATE OR REPLACE FUNCTION public.update_leave_balance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists, then recreate it to make the script idempotent
DROP TRIGGER IF EXISTS teacher_leave_balance_updated_at_trigger ON public.teacher_leave_balances;
CREATE TRIGGER teacher_leave_balance_updated_at_trigger
BEFORE UPDATE ON public.teacher_leave_balances
FOR EACH ROW
EXECUTE FUNCTION public.update_leave_balance_timestamp();

-- 2. annual_leaves table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_status') THEN
        CREATE TYPE leave_status AS ENUM ('Pending', 'Approved', 'Rejected', 'Cancelled');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.annual_leaves (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    leave_date date NOT NULL,
    reason text,
    status leave_status NOT NULL DEFAULT 'Pending',
    created_at timestamptz DEFAULT now(),
    reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL, -- Admin/Head who reviewed
    decision_time timestamptz,
    reviewer_notes text,
    CONSTRAINT unique_leave_per_teacher_per_day UNIQUE (teacher_id, leave_date) -- Max 1 application per day per teacher
);

COMMENT ON TABLE public.annual_leaves IS 'Stores annual leave applications from teachers.';
COMMENT ON COLUMN public.annual_leaves.leave_date IS 'The specific date requested for leave.';
COMMENT ON COLUMN public.annual_leaves.reason IS 'Optional reason provided by the teacher for the leave.';
COMMENT ON COLUMN public.annual_leaves.status IS 'Status of the leave application: Pending, Approved, Rejected, Cancelled.';
COMMENT ON COLUMN public.annual_leaves.reviewed_by IS 'Admin/Head user who made the decision on the leave request.';
COMMENT ON COLUMN public.annual_leaves.reviewer_notes IS 'Optional notes from the reviewer regarding the decision.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_annual_leaves_teacher_id ON public.annual_leaves(teacher_id);
CREATE INDEX IF NOT EXISTS idx_annual_leaves_status ON public.annual_leaves(status);
CREATE INDEX IF NOT EXISTS idx_annual_leaves_leave_date ON public.annual_leaves(leave_date);


-- 3. RLS Policies (Modified to be OFF by default as per user request)

-- teacher_leave_balances: RLS Disabled
ALTER TABLE public.teacher_leave_balances DISABLE ROW LEVEL SECURITY;
-- Ensure any pre-existing policies are removed if RLS is being turned off globally for this table by this migration
DROP POLICY IF EXISTS "Teachers can view their own leave balance" ON public.teacher_leave_balances;
DROP POLICY IF EXISTS "Head of School can manage all leave balances" ON public.teacher_leave_balances;


-- annual_leaves: RLS Disabled
ALTER TABLE public.annual_leaves DISABLE ROW LEVEL SECURITY;
-- Ensure any pre-existing policies are removed
DROP POLICY IF EXISTS "Teachers can view their own leave applications" ON public.annual_leaves;
DROP POLICY IF EXISTS "Teachers can insert their own leave applications" ON public.annual_leaves;
DROP POLICY IF EXISTS "Teachers can update reason of pending leave applications" ON public.annual_leaves;
DROP POLICY IF EXISTS "Head of School can manage all leave applications" ON public.annual_leaves;


-- 4. Database Functions for processing leave requests (Security definer for controlled updates)
-- These functions will handle authorization internally based on the calling user's role or ID.

-- Function to approve a leave request
CREATE OR REPLACE FUNCTION public.approve_leave_request(
    leave_id_param uuid,
    reviewer_id_param uuid,
    p_reviewer_notes text DEFAULT NULL
)
RETURNS TABLE (
    success boolean,
    message text,
    remaining_balance integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_teacher_id uuid;
    v_leave_date date;
    v_current_status leave_status;
    v_total_leaves integer;
    v_used_leaves integer;
BEGIN
    -- Check if reviewer is Head of School (using users table directly)
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = reviewer_id_param AND role = 'head') THEN
        RETURN QUERY SELECT false, 'Unauthorized: Only Head of School can approve leaves.', NULL::integer;
        RETURN;
    END IF;

    SELECT al.teacher_id, al.leave_date, al.status INTO v_teacher_id, v_leave_date, v_current_status
    FROM public.annual_leaves al WHERE al.id = leave_id_param;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Leave request not found.', NULL::integer;
        RETURN;
    END IF;

    IF v_current_status <> 'Pending' THEN
        RETURN QUERY SELECT false, 'Leave request is not in Pending state. Current state: ' || v_current_status, NULL::integer;
        RETURN;
    END IF;

    SELECT tlb.total_leaves, tlb.used_leaves INTO v_total_leaves, v_used_leaves
    FROM public.teacher_leave_balances tlb WHERE tlb.teacher_id = v_teacher_id;

    IF NOT FOUND THEN
        INSERT INTO public.teacher_leave_balances (teacher_id) VALUES (v_teacher_id)
        RETURNING total_leaves, used_leaves INTO v_total_leaves, v_used_leaves;
    END IF;

    IF v_used_leaves >= v_total_leaves THEN
        UPDATE public.annual_leaves
        SET status = 'Rejected',
            reviewed_by = reviewer_id_param,
            decision_time = now(),
            reviewer_notes = COALESCE(p_reviewer_notes, 'Rejected due to insufficient leave balance during approval attempt.')
        WHERE id = leave_id_param;
        RETURN QUERY SELECT false, 'Cannot approve: Teacher has no remaining leave balance. Request auto-rejected.', 0;
        RETURN;
    END IF;

    UPDATE public.annual_leaves
    SET status = 'Approved',
        reviewed_by = reviewer_id_param,
        decision_time = now(),
        reviewer_notes = p_reviewer_notes
    WHERE id = leave_id_param;

    UPDATE public.teacher_leave_balances
    SET used_leaves = used_leaves + 1
    WHERE teacher_id = v_teacher_id;

    RETURN QUERY SELECT true, 'Leave request approved successfully.', (v_total_leaves - (v_used_leaves + 1));
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in approve_leave_request: %', SQLERRM;
        RETURN QUERY SELECT false, 'An internal error occurred: ' || SQLERRM, NULL::integer;
END;
$$;

-- Function to reject a leave request
CREATE OR REPLACE FUNCTION public.reject_leave_request(
    leave_id_param uuid,
    reviewer_id_param uuid,
    p_reviewer_notes text DEFAULT NULL
)
RETURNS TABLE (
    success boolean,
    message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_status leave_status;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = reviewer_id_param AND role = 'head') THEN
        RETURN QUERY SELECT false, 'Unauthorized: Only Head of School can reject leaves.';
        RETURN;
    END IF;

    SELECT status INTO v_current_status FROM public.annual_leaves WHERE id = leave_id_param;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Leave request not found.';
        RETURN;
    END IF;

    IF v_current_status <> 'Pending' THEN
        RETURN QUERY SELECT false, 'Leave request is not in Pending state. Current state: ' || v_current_status;
        RETURN;
    END IF;

    UPDATE public.annual_leaves
    SET status = 'Rejected',
        reviewed_by = reviewer_id_param,
        decision_time = now(),
        reviewer_notes = p_reviewer_notes
    WHERE id = leave_id_param;

    RETURN QUERY SELECT true, 'Leave request rejected successfully.';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in reject_leave_request: %', SQLERRM;
        RETURN QUERY SELECT false, 'An internal error occurred: ' || SQLERRM;
END;
$$;

-- Function to cancel a leave request (by teacher)
CREATE OR REPLACE FUNCTION public.cancel_leave_request_by_teacher(
    leave_id_param uuid,
    requesting_teacher_id uuid -- This ID comes from auth.uid() in application layer
)
RETURNS TABLE (
    success boolean,
    message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_status leave_status;
    v_leave_teacher_id uuid;
BEGIN
    -- Ownership check using the passed requesting_teacher_id
    SELECT al.teacher_id, al.status INTO v_leave_teacher_id, v_current_status
    FROM public.annual_leaves al WHERE al.id = leave_id_param;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Leave request not found.';
        RETURN;
    END IF;

    IF v_leave_teacher_id <> requesting_teacher_id THEN
        RETURN QUERY SELECT false, 'Unauthorized: You can only cancel your own leave requests.';
        RETURN;
    END IF;

    IF v_current_status <> 'Pending' THEN
        RETURN QUERY SELECT false, 'Only Pending leave requests can be cancelled. Current state: ' || v_current_status;
        RETURN;
    END IF;

    UPDATE public.annual_leaves
    SET status = 'Cancelled'
    WHERE id = leave_id_param;

    RETURN QUERY SELECT true, 'Leave request cancelled successfully.';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in cancel_leave_request_by_teacher: %', SQLERRM;
        RETURN QUERY SELECT false, 'An internal error occurred: ' || SQLERRM;
END;
$$;


-- Grant execute on functions to authenticated users.
-- The functions themselves handle authorization using the passed reviewer_id_param or requesting_teacher_id.
GRANT EXECUTE ON FUNCTION public.approve_leave_request(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_leave_request(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_leave_request_by_teacher(uuid, uuid) TO authenticated;

-- Enable real-time (if not already done, this is idempotent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.annual_leaves; EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Table public.annual_leaves already in publication.'; END;
        BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_leave_balances; EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Table public.teacher_leave_balances already in publication.'; END;
    ELSE
        RAISE WARNING 'Publication supabase_realtime does not exist. Real-time may not be configured.';
    END IF;
    ALTER TABLE public.annual_leaves REPLICA IDENTITY FULL;
    ALTER TABLE public.teacher_leave_balances REPLICA IDENTITY FULL;
END $$;

-- Note on new teacher balance creation:
-- The approve_leave_request function attempts to create a balance record if not found.
-- A trigger on the users table (as commented out previously) is a more proactive way.
-- For now, the function-based creation is the fallback.
-- Ensure public.users table allows read access for the function owner if SECURITY DEFINER functions need to check roles.
-- (Typically, SECURITY DEFINER functions run as the user who DEFINED the function, often a superuser or admin role)
-- The internal checks `FROM public.users WHERE id = reviewer_id_param AND role = 'head'` will work correctly.
-- The `requesting_teacher_id` in `cancel_leave_request_by_teacher` is passed from the application layer (auth.uid()).
