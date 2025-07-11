-- Remove the 'active_theme' flag from the system_flags table as the feature is being removed.
DELETE FROM public.system_flags
WHERE flag_name = 'active_theme';

-- The 'flag_value' column itself will be kept as 'maintenance_mode'
-- might be using it to store its boolean state as text ('true'/'false').
-- If 'flag_value' was exclusively for 'active_theme' and 'maintenance_mode' reverted to using 'is_active' boolean,
-- then the column 'flag_value' could also be dropped.
-- For now, only deleting the specific row.

-- Also, remove the 'default_annual_leaves' flag if it was added in this phase,
-- as per plan step P2.1, it should be part of this cleanup if the feature is being rolled back
-- or if it was added prematurely.
-- Assuming P2.1 was for adding it, and this step is about cleanup related to theme removal.
-- If 'default_annual_leaves' is a desired persistent setting independent of themes, this DELETE should be omitted.
-- Based on the current plan step "Database Cleanup for Theme Flag", I will only remove 'active_theme'.
-- The 'default_annual_leaves' flag from P2.1 is part of a *new* feature (Leave Allowance Settings)
-- and should not be removed by this theme cleanup step.
-- So, only deleting 'active_theme'.

-- If there were any specific RLS policies or other DB objects tied *only* to the 'active_theme'
-- functionality (which is unlikely for a simple flag), they would be cleaned up here too.
-- In this case, no such dependent objects were created for 'active_theme' itself.

SELECT 'Removed active_theme flag from system_flags table.';
