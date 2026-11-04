// =====================================================================
// start-race · жаңа жарыс бастау
// Клиентке сұрақтар ДҰРЫС ЖАУАПСЫЗ беріледі.
// Supabase → Edge Functions → Deploy a new function → Via Editor → аты: start-race
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
  } catch (_) { /* legacy жобалар үшін төмендегі кілт */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}
const admin = createClient(Deno.env.get('SUPABASE_URL')!, secretKey(), {
  auth: { persistSession: false, autoRefreshToken: false },
});
async function getUser(req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token); // JWT-ті Supabase Auth серверінде тексеру
  return error || !data?.user ? null : data.user;
}
function json(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });
}
async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  const text = await req.text();
  if (text.length > 4096) return null; // тым үлкен сұраныс
  try { const b = JSON.parse(text); return b && typeof b === 'object' && !Array.isArray(b) ? b : null; } catch { return null; }
}
// ---- /ортақ бөлік ----

type Q = { id: string; type: string; prompt: string; data: unknown };
const GATE_TYPES = ['single', 'fill', 'order', 'match', 'single', 'match'];
const AVAILABLE_TRACKS = [6];
const START_COOLDOWN_MS = 15_000;

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, 405, { error: 'method_not_allowed' });

  const user = await getUser(req);
  if (!user) return json(req, 401, { error: 'unauthorized' });

  const body = await readBody(req);
  if (!body) return json(req, 400, { error: 'bad_request' });
  const charIdx = body.char_idx;
  const track = body.track ?? 6;
  if (!Number.isInteger(charIdx) || (charIdx as number) < 0 || (charIdx as number) > 9) return json(req, 400, { error: 'bad_char' });
  if (!AVAILABLE_TRACKS.includes(track as number)) return json(req, 400, { error: 'bad_track' });

  // Профиль жоқ болса (триггерге дейін тіркелген қолданушы) — жасау
  const meta = user.user_metadata ?? {};
  await admin.from('profiles').upsert({
    id: user.id, email: user.email,
    full_name: String(meta.full_name ?? meta.name ?? (user.email ?? 'Студент').split('@')[0]).slice(0, 60),
    avatar_url: meta.avatar_url ?? null,
  }, { onConflict: 'id', ignoreDuplicates: true });

  // Rate limiting: 15 секундта бір жарыстан артық емес
  const since = new Date(Date.now() - START_COOLDOWN_MS).toISOString();
  const { count: recent } = await admin.from('races').select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).gte('started_at', since);
  if ((recent ?? 0) > 0) return json(req, 429, { error: 'rate_limit', retry_after_s: 15 });

  // Бұрынғы аяқталмаған жарыстарды жабу
  await admin.from('races').update({ status: 'abandoned', finished_at: new Date().toISOString() })
    .eq('user_id', user.id).eq('status', 'active');

  const { data: qs, error: qErr } = await admin.from('questions')
    .select('id,type,prompt,data').eq('track', track).eq('active', true);
  if (qErr || !qs || qs.length < 9) return json(req, 500, { error: 'not_enough_questions' });

  const pool = shuffle((qs as Q[]).slice());
  const used = new Set<string>();
  const take = (pred: (q: Q) => boolean): Q => {
    const q = pool.find((x) => !used.has(x.id) && pred(x)) ?? pool.find((x) => !used.has(x.id));
    if (q) used.add(q.id);
    return q as Q;
  };
  const gates = GATE_TYPES.map((t) => take((q) => q.type === t));
  const med = [0, 1, 2].map(() => take((q) => q.type === 'single' || q.type === 'fill'));

  const { data: race, error: rErr } = await admin.from('races').insert({
    user_id: user.id, track, char_idx: charIdx,
    question_ids: [...gates, ...med].map((q) => q.id),
  }).select('id, started_at').single();
  if (rErr || !race) return json(req, 500, { error: 'race_create_failed' });

  // Тек қажетті өрістер: дұрыс жауап (answer) ешқашан клиентке кетпейді
  const pub = (q: Q) => ({ id: q.id, type: q.type, prompt: q.prompt, data: q.data });
  return json(req, 200, { race_id: race.id, started_at: race.started_at, gates: gates.map(pub), med: med.map(pub) });
});
