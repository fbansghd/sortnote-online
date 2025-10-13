-- Schema for categories and tasks
create table if not exists public.categories (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  title text not null,
  sort_index integer default 0,
  created_at timestamp with time zone default now()
);

create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  category_id uuid references public.categories(id) on delete cascade,
  text text not null,
  done boolean default false,
  created_at timestamp with time zone default now()
);

alter table public.categories enable row level security;
alter table public.tasks enable row level security;

create policy "Users can manage their categories" on public.categories
  for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

create policy "Users can manage their tasks" on public.tasks
  for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);
