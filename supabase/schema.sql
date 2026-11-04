-- =====================================================================
-- Тарих Race KZ · GAME HUB CYB26-01 · Supabase схемасы
-- Supabase → SQL Editor → New query → осы файлды толық қойып → Run
-- Қайта іске қосуға болады (idempotent).
-- =====================================================================

-- ---------- 1. Профильдер ----------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  full_name     text not null default 'Студент',
  display_name  text,
  avatar_url    text,
  is_admin      boolean not null default false,
  games_played  integer not null default 0,
  total_score   integer not null default 0,
  correct_total integer not null default 0,
  wrong_total   integer not null default 0,
  play_seconds  integer not null default 0,
  created_at    timestamptz not null default now(),
  -- input validation дерекқор деңгейінде
  constraint display_name_ok check (
    display_name is null or display_name ~ '^[[:alnum:][:space:].-]{2,30}$'
  )
);

-- Жаңа Google қолданушысы кірген кезде профиль автоматты жасалады
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 60),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Админ екенін тексеретін көмекші функция (RLS ішінде қолданылады)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ---------- 2. Сұрақтар (дұрыс жауаптар осында, клиент көрмейді) ----------
create table if not exists public.questions (
  id         text primary key,
  track      integer not null default 6,
  type       text not null check (type in ('single','fill','order','match','map','image')),
  prompt     text not null,
  data       jsonb not null default '{}'::jsonb,   -- клиентке жіберілетін бөлік (нұсқалар, элементтер)
  answer     jsonb not null,                       -- ТЕК серверде: дұрыс жауап
  difficulty integer not null default 1,
  active     boolean not null default true
);

-- ---------- 3. Жарыстар ----------
create table if not exists public.races (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  game          text not null default 'tarih-race',
  track         integer not null default 6,
  char_idx      integer not null check (char_idx between 0 and 9),
  status        text not null default 'active' check (status in ('active','finished','lost','abandoned')),
  question_ids  text[] not null,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  correct       integer not null default 0,
  wrong         integer not null default 0,
  med_used      integer not null default 0,
  fifty_used    boolean not null default false,
  coins         integer not null default 0,
  lives_left    integer not null default 0,
  client_time_ms integer,
  score         integer not null default 0
);
alter table public.races add column if not exists fifty_used boolean not null default false;
create index if not exists races_user_started on public.races(user_id, started_at desc);

-- ---------- 4. Жауаптар журналы ----------
create table if not exists public.race_answers (
  id          bigint generated always as identity primary key,
  race_id     uuid not null references public.races(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  question_id text not null references public.questions(id),
  kind        text not null check (kind in ('gate','med')),
  gate        integer,
  correct     boolean not null,
  created_at  timestamptz not null default now()
);
create index if not exists race_answers_user_time on public.race_answers(user_id, created_at desc);
create index if not exists race_answers_race on public.race_answers(race_id);

-- ---------- 5. Рейтинг ----------
create table if not exists public.leaderboard (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  game        text not null default 'tarih-race',
  full_name   text not null,
  best_score  integer not null default 0,
  best_level  integer not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, game)
);

-- =====================================================================
-- ROW LEVEL SECURITY — әр кестеде қосулы
-- Edge Functions secret key арқылы жазады (RLS-ті тек сервер айналып өтеді)
-- =====================================================================
alter table public.profiles     enable row level security;
alter table public.questions    enable row level security;
alter table public.races        enable row level security;
alter table public.race_answers enable row level security;
alter table public.leaderboard  enable row level security;

-- Профиль: өзін көреді; админ бәрін көреді
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Профиль: тек өз display_name өрісін өзгерте алады (бағандық құқық төменде)
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

revoke update on public.profiles from authenticated, anon;
grant  update (display_name) on public.profiles to authenticated;

-- Сұрақтар: клиентке мүлдем жабық (саясат жоқ = қолжетімсіз).
-- Админ сұрақтар санын көре алуы үшін:
drop policy if exists questions_admin on public.questions;
create policy questions_admin on public.questions
  for select to authenticated using (public.is_admin());

-- Жарыстар: өз нәтижелерін көреді; админ бәрін
drop policy if exists races_select on public.races;
create policy races_select on public.races
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Жауаптар: өзінікін көреді; админ бәрін
drop policy if exists answers_select on public.race_answers;
create policy answers_select on public.race_answers
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Рейтинг: кірген әр студент оқи алады; insert/update саясаты ЖОҚ
drop policy if exists leaderboard_read on public.leaderboard;
create policy leaderboard_read on public.leaderboard
  for select to authenticated using (true);

-- Клиент рөлдеріне жазу құқығын толық алып тастау (қосымша қорғаныс қабаты)
revoke insert, update, delete on public.questions, public.races, public.race_answers, public.leaderboard from authenticated, anon;
revoke all on public.questions from anon;

-- =====================================================================
-- СҰРАҚТАР БАЗАСЫ · 6-трасса «Қазақ хандығы» (тексерілуі керек: Саяжан)
-- =====================================================================
insert into public.questions (id, track, type, prompt, data, answer, difficulty) values
('s1',6,'single','Тәуке хан тұсында жасалған заңдар жинағы?','{"options":["Қасым ханның қасқа жолы","Есім ханның ескі жолы","Жеті жарғы","Конституция"]}','{"index":2}',2),
('s2',6,'single','Қазақ хандығының негізін қалаған хандар?','{"options":["Керей мен Жәнібек","Абылай мен Әбілқайыр","Тәуке мен Есім","Қасым мен Хақназар"]}','{"index":0}',1),
('s3',6,'single','Қазақ хандығының алғашқы астанасы?','{"options":["Сығанақ","Отырар","Тараз","Сарайшық"]}','{"index":0}',2),
('s4',6,'single','Қасым хан тұсында Қазақ хандығының халқы шамамен қанша болды?','{"options":["100 мың","500 мың","1 миллион","5 миллион"]}','{"index":2}',3),
('s5',6,'single','Аңырақай шайқасында қазақ жасақтары кімге қарсы соғысты?','{"options":["Жоңғарларға","Ресей әскеріне","Бұхара хандығына","Қытай әскеріне"]}','{"index":0}',1),
('s6',6,'single','Есік қорғанынан табылған атақты олжа?','{"options":["Күлтегін ескерткіші","Алтын адам","Ғұн қазаны","Алтын Орда пайзасы"]}','{"index":1}',1),
('s7',6,'single','Күлтегін ескерткіші қай жазумен жазылған?','{"options":["Араб жазуы","Латын жазуы","Көне түркі (руна) жазуы","Кирилл жазуы"]}','{"index":2}',2),
('s8',6,'single','Әбу Насыр әл-Фараби қай қаладан шыққан?','{"options":["Түркістан","Отырар (Фараб)","Тараз","Сауран"]}','{"index":1}',2),
('s9',6,'single','Алаш партиясының жетекшісі кім болды?','{"options":["Әлихан Бөкейхан","Абай Құнанбайұлы","Кенесары Қасымұлы","Шоқан Уәлиханов"]}','{"index":0}',2),
('s10',6,'single','«Ақтабан шұбырынды» оқиғасы қай жылы басталды?','{"options":["1465","1723","1837","1916"]}','{"index":1}',2),
('s11',6,'single','Кенесары хан бастаған ұлт-азаттық қозғалыс қай жылдары болды?','{"options":["1723–1727","1783–1797","1837–1847","1916–1917"]}','{"index":2}',3),
('s12',6,'single','Қазақстанның тәуелсіздігі қашан жарияланды?','{"options":["1990 ж. 25 қазан","1991 ж. 16 желтоқсан","1993 ж. 28 қаңтар","1995 ж. 30 тамыз"]}','{"index":1}',1),
('f1',6,'fill','Қазақ хандығы ___ жылы құрылды.','{}','{"accept":["1465","1466","1465-1466"],"show":"1465–1466 жж."}',1),
('f2',6,'fill','Тәуке ханның заңдар жинағы — «___ жарғы».','{}','{"accept":["жеті","7"],"show":"Жеті"}',1),
('f3',6,'fill','Қазақстан тәуелсіздігі 1991 жылғы 16 ___ жарияланды.','{}','{"accept":["желтоқсан","желтоқсанда"],"show":"желтоқсан"}',1),
('f4',6,'fill','Ахмет Байтұрсынұлы 1913 жылы шығарған газет — «___».','{}','{"accept":["қазақ","казак","казах"],"show":"Қазақ"}',2),
('o1',6,'order','Оқиғаларды хронологиялық ретпен орналастырыңыз.','{"items":["Қазақ хандығының құрылуы","Қасым хан билігі","Тәуке хан билігі","Абылай хан билігі"]}','{"items":["Қазақ хандығының құрылуы","Қасым хан билігі","Тәуке хан билігі","Абылай хан билігі"]}',2),
('o2',6,'order','Дәуірлерді ертеден бастап ретімен қойыңыз.','{"items":["Сақтар","Ғұндар","Түрік қағанаты","Алтын Орда"]}','{"items":["Сақтар","Ғұндар","Түрік қағанаты","Алтын Орда"]}',2),
('o3',6,'order','Оқиғаларды хронологиялық ретпен орналастырыңыз.','{"items":["Ақтабан шұбырынды","Аңырақай шайқасы","Кенесары қозғалысы","Қазақстан тәуелсіздігі"]}','{"items":["Ақтабан шұбырынды","Аңырақай шайқасы","Кенесары қозғалысы","Қазақстан тәуелсіздігі"]}',3),
('m1',6,'match','Тұлғаны оқиғамен сәйкестендіріңіз.','{"left":["Керей мен Жәнібек","Қасым хан","Тәуке хан","Әлихан Бөкейхан"],"right":["Қазақ хандығын құрды","«Қасым ханның қасқа жолы»","«Жеті жарғы»","Алаш партиясы"]}','{"pairs":[["Керей мен Жәнібек","Қазақ хандығын құрды"],["Қасым хан","«Қасым ханның қасқа жолы»"],["Тәуке хан","«Жеті жарғы»"],["Әлихан Бөкейхан","Алаш партиясы"]]}',2),
('m2',6,'match','Мемлекетті жылмен сәйкестендіріңіз.','{"left":["Түрік қағанаты","Қазақ хандығы","Алаш автономиясы","Тәуелсіз Қазақстан"],"right":["552 ж.","1465 ж.","1917 ж.","1991 ж."]}','{"pairs":[["Түрік қағанаты","552 ж."],["Қазақ хандығы","1465 ж."],["Алаш автономиясы","1917 ж."],["Тәуелсіз Қазақстан","1991 ж."]]}',3)
on conflict (id) do update set
  track = excluded.track, type = excluded.type, prompt = excluded.prompt,
  data = excluded.data, answer = excluded.answer, difficulty = excluded.difficulty;

-- =====================================================================
-- Өзіңізді админ ету (email-ді ауыстырып, бір рет іске қосыңыз — ойынға кіргеннен КЕЙІН):
-- update public.profiles set is_admin = true where email = 'сіздің@gmail.com';
-- =====================================================================
