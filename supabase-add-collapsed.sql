-- Add collapsed column to categories table
alter table public.categories add column if not exists collapsed boolean default false;
