-- Migration: Remove user_id from tasks table
-- Run this if you have an existing database with the old schema

-- 1. Drop old RLS policy
drop policy if exists "Users can manage their tasks" on public.tasks;

-- 2. Remove user_id column from tasks
alter table public.tasks drop column if exists user_id;

-- 3. Make category_id NOT NULL (if not already)
alter table public.tasks alter column category_id set not null;

-- 4. Create new RLS policy with JOIN
create policy "Users can manage their tasks" on public.tasks
  for all using (
    exists (
      select 1 from public.categories
      where categories.id = tasks.category_id
      and categories.user_id = auth.uid()::text
    )
  )
  with check (
    exists (
      select 1 from public.categories
      where categories.id = tasks.category_id
      and categories.user_id = auth.uid()::text
    )
  );
