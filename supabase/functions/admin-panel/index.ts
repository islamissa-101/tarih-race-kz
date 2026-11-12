// =====================================================================
// admin-panel · құпиясөзбен кіретін админ панелі
// Supabase → Edge Functions → Deploy a new function → Via Editor → аты: admin-panel
// Құпиясөз: Edge Functions → Secrets → ADMIN_PASSWORD (кодта да, GitHub-та да ЖОҚ)
// Әрекеттер: login · data · clear_results · clear_participants
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

// ---- ортақ бөлік (әр функцияда бірдей) ----
const ALLOWED_ORIGINS = [
  'https://islamissa-101.github.io',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];
function cors(req: Request): Record<string, string> {
  const o = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(o) ? o : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}
function secretKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
    if (keys.default) return keys.default;
    const first = Object.values(keys)[0];
    if (typeof first === 'string') return first;
  } catch (_) { /* legacy */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}
const admin = createClient(Deno.env.get('SUPABASE_URL')!, secretKey(), {
  auth: { persistSession: false, autoRefreshToken: false },
});
async function getUser(req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error || !data?.user ? null : data.user;
}
function json(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });
}
async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  const text = await req.text();
  if (text.length > 4096) return null;
  try { const b = JSON.parse(text); return b && typeof b === 'object' && !Array.isArray(b) ? b : null; } catch { return null; }
}
// ---- /ортақ бөлік ----

const TOKEN_TTL_MS = 4 * 60 * 60 * 1000;   // админ сессиясы 4 сағат
const FAIL_WINDOW_MS = 15 * 60 * 1000;     // brute-force қорғанысы:
const FAIL_LIMIT = 5;                      // 15 минутта 5 қате құпиясөз → бұғат
const CONFIRM_WORD = 'ТАЗАЛАУ';            // тазалау алдында қолмен теру керек

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Тұрақты уақытта салыстыру (timing attack жоқ): екеуінің де SHA-256 хешін салыстырамыз
async function sameSecret(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const u = new Uint8Array(x), v = new Uint8Array(y);
  let d = 0; for (let i = 0; i < u.length; i++) d |= u[i] ^ v[i];
  return d === 0;
}

// Админ токені: «user_id.мерзімі.HMAC». Кілт = құпиясөз + сервер кілті,
// сондықтан құпиясөзді ауыстырсаңыз, барлық ескі токендер бірден жарамсыз болады.
async function hmac(msg: string, pass: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(pass + '|' + secretKey()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}
async function makeToken(uid: string, pass: string) {
  const exp = Date.now() + TOKEN_TTL_MS;
  return { token: `${uid}.${exp}.${await hmac(`${uid}.${exp}`, pass)}`, exp };
}
async function checkToken(tok: unknown, uid: string, pass: string): Promise<boolean> {
  if (typeof tok !== 'string' || tok.length > 200) return false;
  const [u, e, sig] = tok.split('.');
  if (u !== uid || !/^\d{13}$/.test(e ?? '') || Number(e) < Date.now() || !sig) return false;
  return sameSecret(sig, await hmac(`${u}.${e}`, pass));
}

async function log(uid: string, action: string) {
  await admin.from('admin_log').insert({ user_id: uid, action });
}

// Supabase бір сұраныста ең көбі 1000 жол қайтарады — беттеп оқимыз
// deno-lint-ignore no-explicit-any
async function fetchAll(table: string, cols: string, order: string): Promise<any[]> {
  // deno-lint-ignore no-explicit-any
  const out: any[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await admin.from(table).select(cols).order(order, { ascending: false }).range(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function clearResults() {
  // Тәртіп маңызды: алдымен тәуелді кестелер
  const steps = [
    admin.from('race_answers').delete().gt('id', 0),
    admin.from('races').delete().not('id', 'is', null),
    admin.from('leaderboard').delete().not('user_id', 'is', null),
  ];
  for (const s of steps) { const { error } = await s; if (error) throw error; }
  const { error } = await admin.from('profiles')
    .update({ games_played: 0, total_score: 0, correct_total: 0, wrong_total: 0, play_seconds: 0 })
    .not('id', 'is', null);
  if (error) throw error;
}

// Қатысушыларды өшіру = Auth қолданушыларын өшіру (профиль, жарыстар, рейтинг каскадпен өшеді).
// Өзіңізді және is_admin = true аккаунттарды қалдырамыз. Өшірілген студент
// қайта Google арқылы кірсе, жаңа бос профиль автоматты жасалады.
async function clearParticipants(callerId: string): Promise<number> {
  const { data: admins, error: e1 } = await admin.from('profiles').select('id').eq('is_admin', true);
  if (e1) throw e1;
  const keep = new Set<string>([callerId, ...(admins ?? []).map((a: { id: string }) => a.id)]);
  const ids: string[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) if (!keep.has(u.id)) ids.push(u.id);
    if (data.users.length < 1000) break;
  }
  let n = 0;
  for (const id of ids) { const { error } = await admin.auth.admin.deleteUser(id); if (!error) n++; }
  return n;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, 405, { error: 'method' });

  const user = await getUser(req);
  if (!user) return json(req, 401, { error: 'unauthorized' });
  const body = await readBody(req);
  if (!body) return json(req, 400, { error: 'bad_request' });

  const PASS = Deno.env.get('ADMIN_PASSWORD') ?? '';
  if (PASS.length < 8) return json(req, 503, { error: 'admin_not_configured' });

  const action = body.action;
  try {
    // ---------- 1. Кіру ----------
    if (action === 'login') {
      const since = new Date(Date.now() - FAIL_WINDOW_MS).toISOString();
      const { count } = await admin.from('admin_log').select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('action', 'login_fail').gte('created_at', since);
      if ((count ?? 0) >= FAIL_LIMIT) return json(req, 429, { error: 'rate_limit' });

      const pw = typeof body.password === 'string' ? body.password.slice(0, 200) : '';
      if (!(await sameSecret(pw, PASS))) {
        await log(user.id, 'login_fail');
        return json(req, 403, { error: 'bad_password', left: Math.max(0, FAIL_LIMIT - (count ?? 0) - 1) });
      }
      await log(user.id, 'login_ok');
      return json(req, 200, await makeToken(user.id, PASS));
    }

    // ---------- Қалған әрекеттер тек жарамды админ токенімен ----------
    if (!(await checkToken(body.token, user.id, PASS))) return json(req, 403, { error: 'admin_expired' });

    if (action === 'data') {
      const [profiles, races, board, logRows, qCount] = await Promise.all([
        fetchAll('profiles', 'id,email,full_name,display_name,is_admin,games_played,total_score,correct_total,wrong_total,play_seconds,created_at', 'created_at'),
        fetchAll('races', 'id,user_id,track,char_idx,status,started_at,finished_at,correct,wrong,med_used,coins,lives_left,client_time_ms,score', 'started_at'),
        fetchAll('leaderboard', 'user_id,best_score,best_level', 'best_score'),
        admin.from('admin_log').select('user_id,action,created_at').order('created_at', { ascending: false }).limit(20),
        admin.from('questions').select('id', { count: 'exact', head: true }),
      ]);
      return json(req, 200, { profiles, races, board, log: logRows.data ?? [], questions: qCount.count ?? 0 });
    }

    if (action === 'clear_results' || action === 'clear_participants') {
      if (body.confirm !== CONFIRM_WORD) return json(req, 400, { error: 'confirm_required' });
      if (action === 'clear_results') {
        await clearResults();
        await log(user.id, 'clear_results');
        return json(req, 200, { ok: true });
      }
      const removed = await clearParticipants(user.id);
      await log(user.id, 'clear_participants:' + removed);
      return json(req, 200, { ok: true, removed });
    }

    return json(req, 400, { error: 'bad_request' });
  } catch (e) {
    console.error('admin-panel', action, e);
    return json(req, 500, { error: 'server' });
  }
});
