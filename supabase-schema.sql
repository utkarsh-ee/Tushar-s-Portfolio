-- Tushar Mishra portfolio CMS
-- Run this in Supabase SQL Editor after creating your project.

create extension if not exists pgcrypto;

create table if not exists public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  organization text not null,
  location text,
  start_year text not null,
  end_year text,
  description text,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists experiences_sort_idx on public.experiences (sort_order, start_year);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists experiences_set_updated_at on public.experiences;
create trigger experiences_set_updated_at
before update on public.experiences
for each row execute function public.set_updated_at();

create or replace function public.is_site_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.site_admins
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to authenticated;

grant select on public.experiences to anon, authenticated;
grant insert, update, delete on public.experiences to authenticated;
grant select on public.site_admins to authenticated;

alter table public.experiences enable row level security;
alter table public.site_admins enable row level security;

drop policy if exists "Published experiences are public" on public.experiences;
create policy "Published experiences are public"
on public.experiences
for select
to anon, authenticated
using (published = true or public.is_site_admin());

drop policy if exists "Admins can insert experiences" on public.experiences;
create policy "Admins can insert experiences"
on public.experiences
for insert
to authenticated
with check (public.is_site_admin());

drop policy if exists "Admins can update experiences" on public.experiences;
create policy "Admins can update experiences"
on public.experiences
for update
to authenticated
using (public.is_site_admin())
with check (public.is_site_admin());

drop policy if exists "Admins can delete experiences" on public.experiences;
create policy "Admins can delete experiences"
on public.experiences
for delete
to authenticated
using (public.is_site_admin());

drop policy if exists "Admins can view admin membership" on public.site_admins;
create policy "Admins can view admin membership"
on public.site_admins
for select
to authenticated
using (user_id = auth.uid());

-- After creating the owner's account in Supabase Auth, replace the UUID below
-- and run the insert. Do NOT put a password here.
-- insert into public.site_admins (user_id) values ('OWNER_AUTH_USER_UUID');

-- Optional initial content. Remove these inserts if the site already has content.
insert into public.experiences (role, organization, location, start_year, end_year, description, sort_order, published)
select * from (values
  ('Advocate', 'District Court', 'Delhi', '2023', '2024', 'Client advisory, case preparation, legal research, witness interviews, evidence review, defence strategy, legal drafting and filing.', 10, true),
  ('Research Intern', 'RRU Centre for Indian Ocean Legal Studies', null, '2024', null, 'Maritime-law research spanning Arctic jurisdiction, shipping decarbonization, autonomous ships and underwater radiated noise.', 20, true),
  ('Legal Intern', 'District Court', 'Basti', '2023', null, 'Civil-case research, court proceedings, drafting of notices under Section 138 of the Negotiable Instruments Act and general litigation support.', 30, true)
) as seed(role, organization, location, start_year, end_year, description, sort_order, published)
where not exists (select 1 from public.experiences);
