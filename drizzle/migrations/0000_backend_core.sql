create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

create or replace function public.assign_admin_on_signup()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if lower(new.email) = 'austejaona@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;
revoke execute on function public.assign_admin_on_signup() from public, anon, authenticated;
create trigger on_auth_user_created_assign_admin after insert on auth.users
  for each row execute function public.assign_admin_on_signup();
insert into public.user_roles (user_id, role)
  select id, 'admin' from auth.users where lower(email) = 'austejaona@gmail.com' on conflict do nothing;

create table public.task_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text not null,
  mode text not null check (mode in ('topic','mock')),
  course text not null check (course in ('B','A')),
  exam_part text check (exam_part in ('I','II')),
  settings jsonb not null default '{}'::jsonb,
  total_points int not null default 0,
  created_at timestamptz not null default now()
);
create index task_sets_user_created_idx on public.task_sets (user_id, created_at desc);
grant select, insert, update, delete on public.task_sets to authenticated;
grant all on public.task_sets to service_role;
alter table public.task_sets enable row level security;
create policy "Owner select sets" on public.task_sets for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner insert sets" on public.task_sets for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner update sets" on public.task_sets for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner delete sets" on public.task_sets for delete to authenticated using ((select auth.uid()) = user_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.task_sets(id) on delete cascade,
  position int not null default 0,
  label text not null default '',
  format text not null check (format in ('mcq','short','full')),
  topic text not null default '',
  points int not null default 1,
  statement text not null default '',
  options jsonb,
  parts jsonb not null default '[]'::jsonb,
  answer jsonb not null default '[]'::jsonb,
  solution jsonb not null default '[]'::jsonb,
  verified boolean not null default false,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);
create index tasks_set_position_idx on public.tasks (set_id, position);
grant select, insert, update, delete on public.tasks to authenticated;
grant all on public.tasks to service_role;
alter table public.tasks enable row level security;
create policy "Owner select tasks" on public.tasks for select to authenticated using (set_id in (select id from public.task_sets where user_id = (select auth.uid())));
create policy "Owner insert tasks" on public.tasks for insert to authenticated with check (set_id in (select id from public.task_sets where user_id = (select auth.uid())));
create policy "Owner update tasks" on public.tasks for update to authenticated using (set_id in (select id from public.task_sets where user_id = (select auth.uid()))) with check (set_id in (select id from public.task_sets where user_id = (select auth.uid())));
create policy "Owner delete tasks" on public.tasks for delete to authenticated using (set_id in (select id from public.task_sets where user_id = (select auth.uid())));

create table public.example_tasks (
  id uuid primary key default gen_random_uuid(),
  ref text unique,
  course text not null check (course in ('B','A')),
  exam_part text not null check (exam_part in ('I','II')),
  topic text not null default '',
  format text not null check (format in ('mcq','short','full')),
  points int not null default 1,
  statement text not null default '',
  parts jsonb not null default '[]'::jsonb,
  answer jsonb not null default '[]'::jsonb,
  solution jsonb not null default '[]'::jsonb,
  source text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.example_tasks to authenticated;
grant all on public.example_tasks to service_role;
alter table public.example_tasks enable row level security;
create policy "Admins select examples" on public.example_tasks for select to authenticated using ((select public.has_role((select auth.uid()), 'admin')));
create policy "Admins insert examples" on public.example_tasks for insert to authenticated with check ((select public.has_role((select auth.uid()), 'admin')));
create policy "Admins update examples" on public.example_tasks for update to authenticated using ((select public.has_role((select auth.uid()), 'admin'))) with check ((select public.has_role((select auth.uid()), 'admin')));
create policy "Admins delete examples" on public.example_tasks for delete to authenticated using ((select public.has_role((select auth.uid()), 'admin')));