-- UI preferences table for storing user interface state
create table if not exists public.ui_prefs (
  user_id text primary key,
  collapsed_titles jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.ui_prefs enable row level security;

create policy "Users can manage their ui prefs" on public.ui_prefs
  for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);
