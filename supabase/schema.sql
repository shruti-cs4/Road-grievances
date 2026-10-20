create extension if not exists pgcrypto;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reporter_name text not null default 'Civil-Complaint user',
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  address text not null default '',
  area text not null default '',
  city text not null default '',
  category text not null check (category in ('Pothole', 'Crack', 'Waterlogging', 'Broken Footpath', 'Damaged Divider', 'Open Manhole')),
  severity text not null check (severity in ('low', 'medium', 'high')),
  description text not null check (char_length(trim(description)) between 5 and 3000),
  status text not null default 'reported' check (status in ('reported', 'acknowledged', 'in-progress', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists reports_created_at_idx on public.reports (created_at desc);
create index if not exists reports_location_idx on public.reports (lat, lng);
create index if not exists reports_category_idx on public.reports (category);
create index if not exists reports_severity_idx on public.reports (severity);

alter table public.reports enable row level security;

-- Any signed-in user can read shared complaints; submission requires authentication.
drop policy if exists "Authenticated users can read reports" on public.reports;
create policy "Authenticated users can read reports"
  on public.reports for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can submit own reports" on public.reports;
create policy "Authenticated users can submit own reports"
  on public.reports for insert
  to authenticated
  with check (auth.uid() = user_id);

-- No client-side UPDATE or DELETE policies are intentionally created.
-- This keeps users from editing or deleting shared reports through the public client.
grant select, insert on public.reports to authenticated;
