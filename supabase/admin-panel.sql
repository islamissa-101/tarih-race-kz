-- Админ панелі үшін қосымша кесте. SQL Editor → New query → осы файлды қойып → Run

-- ---------- 6. Админ журналы (кіру әрекеттері + тазалау) ----------
-- Тек admin-panel функциясы жазады/оқиды. Клиентке толық жабық (RLS қосулы, саясат жоқ).
create table if not exists public.admin_log (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users(id) on delete set null,
  action     text not null,
  created_at timestamptz not null default now()
);
create index if not exists admin_log_user_time on public.admin_log(user_id, action, created_at desc);
alter table public.admin_log enable row level security;
revoke all on public.admin_log from authenticated, anon;
