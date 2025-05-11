-- Create a table for storing connected Google Calendar accounts
create table connected_accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  access_token text,
  refresh_token text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create an index on user_id for faster lookups
create index connected_accounts_user_id_idx on connected_accounts(user_id);

-- Enable Row Level Security
alter table connected_accounts enable row level security;

-- Create a policy that allows users to only see their own connected accounts
create policy "Users can only see their own connected accounts"
  on connected_accounts for select
  using (auth.uid() = user_id);

-- Create a policy that allows users to only insert their own connected accounts
create policy "Users can only insert their own connected accounts"
  on connected_accounts for insert
  with check (auth.uid() = user_id);

-- Create a policy that allows users to only update their own connected accounts
create policy "Users can only update their own connected accounts"
  on connected_accounts for update
  using (auth.uid() = user_id);

-- Create a policy that allows users to only delete their own connected accounts
create policy "Users can only delete their own connected accounts"
  on connected_accounts for delete
  using (auth.uid() = user_id); 