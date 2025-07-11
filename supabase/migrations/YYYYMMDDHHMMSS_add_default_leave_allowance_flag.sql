-- Add the 'default_annual_leaves' flag to the system_flags table
INSERT INTO public.system_flags (flag_name, flag_value, description, is_active)
VALUES (
    'default_annual_leaves',
    '14', -- Default value for annual leave days, stored as text
    'Default number of annual leave days allocated to new teachers or those without a specific balance entry.',
    true  -- This flag/setting is active by default
)
ON CONFLICT (flag_name) DO UPDATE
SET
    flag_value = EXCLUDED.flag_value,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- Comment on the usage of this flag
COMMENT ON TABLE public.system_flags IS 'Stores global system flags and settings. For default_annual_leaves, flag_value stores the number of days as text.';

SELECT 'Added default_annual_leaves flag to system_flags table.';
