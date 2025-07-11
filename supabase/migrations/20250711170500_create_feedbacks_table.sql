-- Migration: Create feedbacks table for user feedback system
create table if not exists feedbacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  user_name text,
  feedback text not null,
  created_at timestamptz not null default now()
);

-- Index for ordering by created_at
create index if not exists idx_feedbacks_created_at on feedbacks(created_at desc);
