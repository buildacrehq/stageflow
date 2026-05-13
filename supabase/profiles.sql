-- ============================================================
-- PROFILES TABLE — Run after schema.sql
-- Extends Supabase auth.users with name + role
-- ============================================================

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  role        text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Auto-create a profile row when a new user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Auto-update updated_at
create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

-- Row Level Security
alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);
