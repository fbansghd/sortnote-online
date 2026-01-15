-- Add sort_index column to tasks table
alter table public.tasks add column if not exists sort_index integer default 0;

-- Create index for better query performance
create index if not exists tasks_sort_index_idx on public.tasks(sort_index);
