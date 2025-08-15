-- 1) Enum and tables
create type if not exists public.app_role as enum ('admin', 'moderator', 'user');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- 2) Utility functions
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- 3) Triggers
create trigger profiles_update_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

-- Insert profile on new auth user + bootstrap first admin
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, approved)
  values (new.id, new.email, split_part(new.email, '@', 1), false)
  on conflict (id) do nothing;

  -- if there is no admin yet, make this user admin and approve
  if not exists (
    select 1 from public.user_roles where role = 'admin'
  ) then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
    on conflict do nothing;

    update public.profiles set approved = true where id = new.id;
  end if;

  return new;
end;
$$;

-- Drop and recreate trigger to avoid duplicates
do $$
begin
  if exists (
    select 1 from pg_trigger where tgname = 'on_auth_user_created'
  ) then
    drop trigger on_auth_user_created on auth.users;
  end if;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4) RLS Policies
-- profiles policies
create policy if not exists "Users can view their own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy if not exists "Admins can view all profiles"
  on public.profiles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy if not exists "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create policy if not exists "Admins can update all profiles"
  on public.profiles for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy if not exists "Users can insert their own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create policy if not exists "Admins can delete profiles"
  on public.profiles for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- user_roles policies
create policy if not exists "Users can view their own roles or admins view all"
  on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy if not exists "Only admins can insert roles"
  on public.user_roles for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy if not exists "Only admins can update roles"
  on public.user_roles for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy if not exists "Only admins can delete roles"
  on public.user_roles for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));
