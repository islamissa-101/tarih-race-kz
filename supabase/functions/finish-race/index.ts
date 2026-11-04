// =====================================================================
// finish-race · жарысты аяқтау, ҰПАЙДЫ СЕРВЕР ЕСЕПТЕЙДІ, рейтингті жаңарту
// Supabase → Edge Functions → Deploy a new function → Via Editor → аты: finish-race
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

type Ans = { kind: string; gate: number | null; correct: boolean };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIN_RACE_MS = 35_000;   // трассаны бұдан жылдам өту физикалық мүмкін емес
// Әр трассадағы монета саны × 2 («Сауда» қабілеті). Сандар трасса генераторынан алынған.
const MAX_COINS_BY_TRACK = [0, 430, 440, 430, 420, 460, 410, 390, 400, 400, 420];
const PAR_MS = 180_000;       // уақыт бонусы: 3 минуттан жылдам әр секунд үшін +5
const clampInt = (v: unknown, lo: number, hi: number, dflt: number) =>
  Number.isInteger(v) ? Math.max(lo, Math.min(hi, v as number)) : dflt;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, 405, { error: 'method_not_allowed' });

  const user = await getUser(req);
  if (!user) return json(req, 401, { error: 'unauthorized' });

  const body = await readBody(req);
  if (!body) return json(req, 400, { error: 'bad_request' });
  const { race_id } = body;
  const finished = body.finished === true;
  if (typeof race_id !== 'string' || !UUID_RE.test(race_id)) return json(req, 400, { error: 'bad_race' });

  const { data: race } = await admin.from('races').select('*').eq('id', race_id).single();
  if (!race || race.user_id !== user.id) return json(req, 404, { error: 'race_not_found' });
  if (race.status !== 'active') return json(req, 409, { error: 'race_closed' });

  const now = Date.now();
  const elapsed = now - new Date(race.started_at).getTime();

  // Дұрыс/қате санын клиенттен ЕМЕС, сервердегі жазбалардан аламыз
  const { data: ans } = await admin.from('race_answers').select('kind, gate, correct').eq('race_id', race_id);
  const answers = (ans ?? []) as Ans[];
  const correct = answers.filter((a) => a.correct).length;
  const wrong = answers.length - correct;
  const gatesDone = new Set(answers.filter((a) => a.kind === 'gate').map((a) => a.gate)).size;

  if (finished) {
    if (gatesDone < race.gates) return json(req, 400, { error: 'gates_missing' });
    if (elapsed < MIN_RACE_MS) return json(req, 400, { error: 'too_fast' });
  }

  const maxLives = race.char_idx === 6 ? 4 : 3; // Абылай хан сарбазы: +1 өмір
  const coins = clampInt(body.coins, 0, MAX_COINS_BY_TRACK[race.track] ?? 0, 0);
  const lives = finished ? clampInt(body.lives, 1, maxLives, 1) : 0;
  const timeMs = finished
    ? clampInt(body.time_ms, MIN_RACE_MS, elapsed + 2_000, elapsed)
    : clampInt(body.time_ms, 0, elapsed + 2_000, elapsed);

  const timeBonus = finished ? Math.max(0, Math.round((PAR_MS - timeMs) / 1000) * 5) : 0;
  const score = correct * 100 + coins * 5 + (finished ? lives * 100 : 0) + timeBonus;

  await admin.from('races').update({
    status: finished ? 'finished' : 'lost', finished_at: new Date(now).toISOString(),
    correct, wrong, coins, lives_left: lives, client_time_ms: timeMs, score,
  }).eq('id', race_id);

  const { data: prof } = await admin.from('profiles').select('*').eq('id', user.id).single();
  if (prof) {
    await admin.from('profiles').update({
      games_played: prof.games_played + 1,
      total_score: prof.total_score + score,
      correct_total: prof.correct_total + correct,
      wrong_total: prof.wrong_total + wrong,
      play_seconds: prof.play_seconds + Math.round(elapsed / 1000),
    }).eq('id', user.id);
  }

  const name = prof?.display_name || prof?.full_name || 'Студент';
  const level = finished ? race.track : 0;
  const { data: lb } = await admin.from('leaderboard').select('best_score, best_level')
    .eq('user_id', user.id).eq('game', race.game).maybeSingle();
  let best = false;
  if (!lb) {
    await admin.from('leaderboard').insert({ user_id: user.id, game: race.game, full_name: name, best_score: score, best_level: level });
    best = true;
  } else if (score > lb.best_score || level > lb.best_level) {
    best = score > lb.best_score;
    await admin.from('leaderboard').update({
      full_name: name, best_score: Math.max(score, lb.best_score), best_level: Math.max(level, lb.best_level),
      updated_at: new Date(now).toISOString(),
    }).eq('user_id', user.id).eq('game', race.game);
  }
  const myBest = Math.max(score, lb?.best_score ?? 0);
  const { count: above } = await admin.from('leaderboard').select('user_id', { count: 'exact', head: true })
    .eq('game', race.game).gt('best_score', myBest);

  return json(req, 200, {
    score, correct, wrong, coins, lives, time_ms: timeMs, time_bonus: timeBonus,
    new_best: best, rank: (above ?? 0) + 1,
  });
});
