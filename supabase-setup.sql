-- NextAuth.js tables for Supabase
-- These tables are used by @auth/supabase-adapter

-- Create the sessions table
create table if not exists public.sessions (
  id uuid default gen_random_uuid() primary key,
  session_token text not null unique,
  user_id text not null,
  expires timestamp with time zone not null
);

-- Create the accounts table
create table if not exists public.accounts (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  type text not null,
  provider text not null,
  provider_account_id text not null,
  refresh_token text,
  access_token text,
  expires_at integer,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  unique(provider, provider_account_id)
);

-- Create the verification_tokens table
create table if not exists public.verification_tokens (
  identifier text not null,
  token text not null unique,
  expires timestamp with time zone not null,
  primary key (identifier, token)
);

-- Create the users table (optional, for additional user data)
create table if not exists public.users (
  id text primary key,
  name text,
  email text unique,
  email_verified timestamp with time zone,
  image text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on the tables
alter table public.sessions enable row level security;
alter table public.accounts enable row level security;
alter table public.verification_tokens enable row level security;
alter table public.users enable row level security;

-- Create policies for RLS
create policy "Users can view own sessions" on public.sessions
  for select using (auth.uid()::text = user_id);

create policy "Users can insert own sessions" on public.sessions
  for insert with check (auth.uid()::text = user_id);

create policy "Users can update own sessions" on public.sessions
  for update using (auth.uid()::text = user_id);

create policy "Users can delete own sessions" on public.sessions
  for delete using (auth.uid()::text = user_id);

create policy "Users can view own accounts" on public.accounts
  for select using (auth.uid()::text = user_id);

create policy "Users can insert own accounts" on public.accounts
  for insert with check (auth.uid()::text = user_id);

create policy "Users can update own accounts" on public.accounts
  for update using (auth.uid()::text = user_id);

create policy "Users can delete own accounts" on public.accounts
  for delete using (auth.uid()::text = user_id);

create policy "Users can view own profile" on public.users
  for select using (auth.uid()::text = id);

create policy "Users can update own profile" on public.users
  for update using (auth.uid()::text = id);

create policy "Anyone can view verification tokens" on public.verification_tokens
  for select using (true);

create policy "Anyone can insert verification tokens" on public.verification_tokens
  for insert with check (true);

create policy "Anyone can update verification tokens" on public.verification_tokens
  for update using (true);

create policy "Anyone can delete verification tokens" on public.verification_tokens
  for delete using (true);