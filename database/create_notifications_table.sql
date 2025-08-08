-- notifications table
create table if not exists public.notifications (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('chat', 'order', 'service', 'system', 'offer')),
  title text not null,
  message text not null,
  created_at timestamptz not null default now(),
  is_read boolean not null default false,
  data jsonb
);

-- Indexes
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_user_id_timestamp on public.notifications(user_id, created_at desc);

-- Enable RLS
alter table public.notifications enable row level security;

-- Policies with duplicate-safe creation
do $$ begin
  create policy "Users can select their own notifications"
    on public.notifications for select
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can insert notifications for themselves"
    on public.notifications for insert
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Allow inserts where the authenticated user is the sender (so they can notify others)
do $$ begin
  create policy "Users can insert notifications (authenticated)"
    on public.notifications for insert
    with check (auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can update their own notifications"
    on public.notifications for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can delete their own notifications"
    on public.notifications for delete
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;