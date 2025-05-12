-- Create scheduling_links table
create table public.scheduling_links (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.user_profiles(id) on delete cascade not null,
  calendar_id uuid references public.calendars(id) on delete cascade not null,
  slug text not null unique,
  meeting_duration_minutes integer not null check (meeting_duration_minutes > 0),
  max_days_in_advance integer not null check (max_days_in_advance > 0),
  max_uses integer,
  expires_at timestamp with time zone,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create scheduling_questions table
create table public.scheduling_questions (
  id uuid default gen_random_uuid() primary key,
  link_id uuid references public.scheduling_links(id) on delete cascade not null,
  question_text text not null,
  is_required boolean default false,
  question_type text not null check (question_type in ('text', 'email', 'phone', 'number', 'textarea')),
  display_order integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.scheduling_links enable row level security;
alter table public.scheduling_questions enable row level security;

-- Create policies for scheduling_links
create policy "Users can manage their own scheduling links"
  on public.scheduling_links
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

-- Create policies for scheduling_questions
create policy "Users can manage questions for their own links"
  on public.scheduling_questions
  for all
  using (
    exists (
      select 1 from public.scheduling_links
      join public.user_profiles on user_profiles.id = scheduling_links.profile_id
      where scheduling_links.id = link_id
      and user_profiles.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.scheduling_links
      join public.user_profiles on user_profiles.id = scheduling_links.profile_id
      where scheduling_links.id = link_id
      and user_profiles.user_id = auth.uid()
    )
  );

-- Create indexes
create index scheduling_links_profile_id_idx on public.scheduling_links(profile_id);
create index scheduling_links_calendar_id_idx on public.scheduling_links(calendar_id);
create index scheduling_links_slug_idx on public.scheduling_links(slug);
create index scheduling_questions_link_id_idx on public.scheduling_questions(link_id); 