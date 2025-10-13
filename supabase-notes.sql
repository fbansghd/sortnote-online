-- Create notes table for app data
create table if not exists public.notes (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  content text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS and allow inserts from server (service role will bypass RLS)
alter table public.notes enable row level security;

create policy "Users can manage their notes" on public.notes
  for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

-- For debugging, you can allow inserts via anon (not recommended for production)
-- create policy "Allow anon insert" on public.notes
--  for insert with check (true);