-- Drop all existing objects
do $$ 
declare
    r record;
begin
    -- Drop all triggers
    for r in (select trigger_name, event_object_table 
              from information_schema.triggers 
              where trigger_schema = 'public') 
    loop
        execute format('drop trigger if exists %I on public.%I cascade', 
                      r.trigger_name, r.event_object_table);
    end loop;

    -- Drop all tables
    for r in (select tablename 
              from pg_tables 
              where schemaname = 'public' 
              and tablename in ('calendar_events', 'calendars', 'user_profiles')) 
    loop
        execute format('drop table if exists public.%I cascade', r.tablename);
    end loop;

    -- Drop the function
    drop function if exists public.handle_updated_at();
end $$;

-- Create function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create user_profiles table
create table public.user_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  profile_name text not null,
  email text not null,
  color text default '#4f46e5',
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint user_profiles_user_id_email_key unique (user_id, email)
);

-- Create calendars table
create table public.calendars (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.user_profiles(id) on delete cascade not null,
  name text not null,
  color text default '#4f46e5',
  is_visible boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create calendar_events table
create table public.calendar_events (
  id uuid default gen_random_uuid() primary key,
  calendar_id uuid references public.calendars(id) on delete cascade not null,
  title text not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.user_profiles enable row level security;
alter table public.calendars enable row level security;
alter table public.calendar_events enable row level security;

-- Create policies for user_profiles
create policy "Users can manage their own profiles"
  on public.user_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create policies for calendars
create policy "Users can manage their own calendars"
  on public.calendars
  for all
  using (
    exists (
      select 1 from public.user_profiles
      where id = profile_id
      and user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles
      where id = profile_id
      and user_id = auth.uid()
    )
  );

-- Create policies for calendar_events
create policy "Users can manage their own calendar events"
  on public.calendar_events
  for all
  using (
    exists (
      select 1 from public.calendars c
      join public.user_profiles p on p.id = c.profile_id
      where c.id = calendar_id
      and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.calendars c
      join public.user_profiles p on p.id = c.profile_id
      where c.id = calendar_id
      and p.user_id = auth.uid()
    )
  );

-- Create triggers for updated_at
create trigger handle_updated_at
  before update on public.user_profiles
  for each row
  execute function public.handle_updated_at();

create trigger handle_updated_at
  before update on public.calendars
  for each row
  execute function public.handle_updated_at();

create trigger handle_updated_at
  before update on public.calendar_events
  for each row
  execute function public.handle_updated_at();

-- Force schema cache refresh
notify pgrst, 'reload schema'; 