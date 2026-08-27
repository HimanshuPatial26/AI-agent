-- AI Med-pedia: conversations + feedback schema
-- Run this against the Supabase project used by SUPABASE_URL/SUPABASE_KEY.
-- Safe to run multiple times (guards with IF NOT EXISTS).

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null default 'New enquiry',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_id_idx
  on conversations (user_id, updated_at desc);

alter table messages
  add column if not exists conversation_id uuid references conversations(id) on delete cascade;

create index if not exists messages_conversation_id_idx
  on messages (conversation_id, created_at);

-- NOTE: message_id is assumed bigint (Supabase's default identity type for a
-- table created via the dashboard). If your `messages.id` column is uuid
-- instead, change the type below to `uuid` before running this migration.
create table if not exists message_feedback (
  id uuid primary key default gen_random_uuid(),
  message_id bigint references messages(id) on delete cascade,
  user_id text not null,
  vote text not null check (vote in ('up', 'down')),
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);

create index if not exists message_feedback_message_id_idx
  on message_feedback (message_id);
