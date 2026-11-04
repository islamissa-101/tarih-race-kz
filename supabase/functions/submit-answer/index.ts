// =====================================================================
// submit-answer · жауапты СЕРВЕРДЕ тексеру
// Supabase → Edge Functions → Deploy a new function → Via Editor → аты: submit-answer
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

type Ans = { question_id: string; kind: string; gate: number | null; correct: boolean };
const MAX_ANSWERS_PER_MIN = 30;
const MIN_RACE_MS = 35_000; // g-қақпаға ең ерте: g / (кедергі саны + 1) × 35 с × 0,8 (шынайы жылдамдық)
const MAX_MED = 2;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function norm(s: unknown): string {
  return String(s ?? '').toLowerCase()
    .replace(/[«»"'“”]/g, '').replace(/[–—]/g, '-')
    .replace(/\s*(жж|ж|жыл|жылы)\.?\s*$/u, '').replace(/\s+/g, '').trim();
}
function isStrArr(a: unknown, max: number): a is string[] {
  return Array.isArray(a) && a.length <= max && a.every((x) => typeof x === 'string' && x.length <= 120);
}

// deno-lint-ignore no-explicit-any
function check(type: string, answer: any, correct: any): boolean {
  switch (type) {
    case 'single':
    case 'map':
    case 'image':
      return Number.isInteger(answer?.index) && answer.index === correct.index;
    case 'fill':
      return typeof answer?.text === 'string' && answer.text.length <= 40 &&
        (correct.accept as string[]).map(norm).includes(norm(answer.text));
    case 'order':
      return isStrArr(answer?.items, 10) && answer.items.length === correct.items.length &&
        answer.items.every((v: string, i: number) => v === correct.items[i]);
    case 'match': {
      if (!Array.isArray(answer?.pairs) || answer.pairs.length !== correct.pairs.length) return false;
      const want = new Map((correct.pairs as string[][]).map(([l, r]) => [l, r]));
      const seen = new Set<string>();
      for (const p of answer.pairs) {
        if (!isStrArr(p, 2) || p.length !== 2 || seen.has(p[0])) return false;
        seen.add(p[0]);
        if (want.get(p[0]) !== p[1]) return false;
      }
      return seen.size === want.size;
    }
    default:
      return false;
  }
}
// deno-lint-ignore no-explicit-any
function showAnswer(type: string, data: any, correct: any): string {
  if (type === 'single' || type === 'image') return data.options?.[correct.index] ?? '';
  if (type === 'map') return (data.options?.[correct.index] ?? '') + ' — ' + (correct.show ?? '');
  if (type === 'fill') return correct.show ?? correct.accept?.[0] ?? '';
  if (type === 'order') return correct.items.join(' → ');
  if (type === 'match') return correct.pairs.map((p: string[]) => `${p[0]} — ${p[1]}`).join('; ');
  return '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, 405, { error: 'method_not_allowed' });

  const user = await getUser(req);
  if (!user) return json(req, 401, { error: 'unauthorized' });

  const body = await readBody(req);
  if (!body) return json(req, 400, { error: 'bad_request' });
  const { race_id, question_id, kind, gate, answer, action } = body as Record<string, unknown>;
  if (typeof race_id !== 'string' || !UUID_RE.test(race_id)) return json(req, 400, { error: 'bad_race' });
  if (typeof question_id !== 'string' || question_id.length > 20) return json(req, 400, { error: 'bad_question' });

  // «Хан жарлығы» (6-кейіпкер): 50/50 — екі қате нұсқаны СЕРВЕР көрсетеді, бір жарыста 1 рет
  if (action === 'fifty') {
    const { data: r } = await admin.from('races').select('*').eq('id', race_id).single();
    if (!r || r.user_id !== user.id) return json(req, 404, { error: 'race_not_found' });
    if (r.status !== 'active' || r.char_idx !== 5 || r.fifty_used) return json(req, 409, { error: 'fifty_unavailable' });
    if (!(r.question_ids as string[]).includes(question_id)) return json(req, 400, { error: 'question_not_in_race' });
    const { data: fq } = await admin.from('questions').select('type, data, answer').eq('id', question_id).single();
    if (!fq || !['single', 'map', 'image'].includes(fq.type)) return json(req, 400, { error: 'fifty_single_only' });
    const n = (fq.data?.options ?? []).length;
    const wrongIdx = [...Array(n).keys()].filter((i) => i !== fq.answer.index).sort(() => Math.random() - 0.5).slice(0, 2);
    await admin.from('races').update({ fifty_used: true }).eq('id', race_id);
    return json(req, 200, { remove: wrongIdx });
  }
  if (kind !== 'gate' && kind !== 'med') return json(req, 400, { error: 'bad_kind' });
  if (kind === 'gate' && (!Number.isInteger(gate) || (gate as number) < 1 || (gate as number) > 10)) return json(req, 400, { error: 'bad_gate' });

  // Rate limiting: минутына 30 жауаптан артық емес
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count: perMin } = await admin.from('race_answers').select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).gte('created_at', since);
  if ((perMin ?? 0) >= MAX_ANSWERS_PER_MIN) return json(req, 429, { error: 'rate_limit' });

  const { data: race } = await admin.from('races').select('*').eq('id', race_id).single();
  if (!race || race.user_id !== user.id) return json(req, 404, { error: 'race_not_found' });
  if (race.status !== 'active') return json(req, 409, { error: 'race_closed' });
  if (!(race.question_ids as string[]).includes(question_id)) return json(req, 400, { error: 'question_not_in_race' });

  const { data: prev } = await admin.from('race_answers').select('question_id, kind, gate, correct').eq('race_id', race_id);
  const answers = (prev ?? []) as Ans[];

  if (kind === 'gate') {
    if (answers.some((a) => a.kind === 'gate' && a.gate === gate)) return json(req, 409, { error: 'gate_already_answered' });
    const elapsed = Date.now() - new Date(race.started_at).getTime();
    if ((gate as number) > race.gates) return json(req, 400, { error: 'bad_gate' });
    if (elapsed < ((gate as number) / (race.gates + 1)) * MIN_RACE_MS * 0.8) return json(req, 400, { error: 'too_fast' });
  } else {
    if (answers.filter((a) => a.kind === 'med').length >= MAX_MED) return json(req, 409, { error: 'med_limit' });
  }
  // Бір сұраққа ең көбі 2 рет, екіншісі тек алдыңғы жауап қате болса (Лейтнер қайталауы)
  const sameQ = answers.filter((a) => a.question_id === question_id);
  if (sameQ.length >= 2 || sameQ.some((a) => a.correct)) return json(req, 409, { error: 'question_used' });

  const { data: q } = await admin.from('questions').select('type, data, answer').eq('id', question_id).single();
  if (!q) return json(req, 404, { error: 'question_not_found' });

  const ok = check(q.type, answer, q.answer);

  await admin.from('race_answers').insert({
    race_id, user_id: user.id, question_id, kind, gate: kind === 'gate' ? gate : null, correct: ok,
  });
  await admin.from('races').update({
    correct: race.correct + (ok ? 1 : 0),
    wrong: race.wrong + (ok ? 0 : 1),
    med_used: race.med_used + (kind === 'med' ? 1 : 0),
  }).eq('id', race_id);

  return json(req, 200, { correct: ok, correct_answer: showAnswer(q.type, q.data, q.answer) });
});
