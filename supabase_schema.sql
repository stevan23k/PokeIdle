-- Create gamesave user profiles table
create table public.user_profiles (
  id uuid references auth.users on delete cascade not null primary key,
  run_state jsonb default '{}'::jsonb not null,
  meta_state jsonb default '{}'::jsonb not null,
  training_state jsonb default '{}'::jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security (RLS)
alter table public.user_profiles enable row level security;

-- Create policy to allow users to ONLY see their own profile/gamesaves
create policy "Users can view own profile"
  on public.user_profiles for select
  using ( auth.uid() = id );

-- Create policy to allow users to ONLY update their own profile/gamesaves
create policy "Users can update own profile"
  on public.user_profiles for update
  using ( auth.uid() = id );

-- Create policy to allow users to ONLY insert their own profile/gamesaves
create policy "Users can insert own profile"
  on public.user_profiles for insert
  with check ( auth.uid() = id );
  
-- Create a trigger that will create a profile for every new user automatically upon signup
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (id)
  values (new.id);
  return new;
end;
$$;

-- Attach trigger to auth.users table
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
