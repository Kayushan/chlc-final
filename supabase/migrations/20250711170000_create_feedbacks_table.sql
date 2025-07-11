-- Migration: Create feedbacks table for user feedback submissions
CREATE TABLE IF NOT EXISTS feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  reporter_name text,
  reporter_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast ordering
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at DESC);
