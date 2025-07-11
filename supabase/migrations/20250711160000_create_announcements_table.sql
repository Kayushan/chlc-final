-- Migration: Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  audience text[] NOT NULL,
  urgency text NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  creator_id uuid REFERENCES users(id) ON DELETE SET NULL
);

-- Index for quick lookup by expiry
CREATE INDEX IF NOT EXISTS idx_announcements_expires_at ON public.announcements (expires_at);
-- Index for audience search (if needed)
CREATE INDEX IF NOT EXISTS idx_announcements_audience ON public.announcements USING GIN (audience);
