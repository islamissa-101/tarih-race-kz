// GAME HUB: кіру, ойындар, рейтинг, профиль, нәтижелер, админ
(function () {
  'use strict';
  const { el, clear, toast, fmtTime, fmtDate, table, CHARS, STATUS } = window.UI;
  const TR = window.TR; if (!TR) return;
  const sb = TR.sb;
  const $ = (s) => document.querySelector(s);
  let S = null, P = null;
  const NAME_RE = /^[\p{L}\p{N} .-]{2,30}$/u;

  const GAMES = [
    { t: 'Тарих Race KZ', g: 'Racing + Quiz', d: '10 трасса — сақтардан Тәуелсіздікке дейін. Тарихи кедергіде сұраққа жауап бер: дұрыс — жалғастыр, қате — 3 сек айыппұл. Келесі трасса алдыңғысын өткенде ашылады.', href: 'race/', main: true },
    { t: 'Қазақ даласының қорғаны', g: 'Action + Arcade', d: 'Басқа минитоптың ойыны' },
    { t: 'Қазақ хандығы: Хан тақты', g: 'Strategy + Tower Defense', d: 'Басқа минитоптың ойыны' },
    { t: 'Тарих аренасы', g: 'Shooter + Quiz', d: 'Басқа минитоптың ойыны' },
    { t: 'Қазақстан тарихы: Match-3', g: 'Match-3 + Puzzle', d: 'Басқа минитоптың ойыны' },
    { t: 'Тарих ізімен', g: 'Adventure + Escape Room', d: 'Басқа минитоптың ойыны' },
  ];

  async function boot() {
    const qs = new URLSearchParams(location.search);
    const oauthErr = qs.get('error_description');
    S = await TR.session();
    if (qs.has('code') || oauthErr) history.replaceState(null, '', location.pathname + location.hash);
    if (!S) {
      $('#login').classList.remove('hidden'); $('#app').classList.add('hidden');
      if (oauthErr) $('#loginErr').textContent = 'Кіру сәтсіз: ' + oauthErr;
      return;
    }
    $('#login').classList.add('hidden'); $('#app').classList.remove('hidden');
    P = await TR.profile();
    $('#meName').textContent = TR.displayName(P, S);
    const ava = P?.avatar_url || S.user.user_metadata?.avatar_url;
    if (ava && /^https:\/\/[a-z0-9.-]+\.googleusercontent\.com\//i.test(ava)) { $('#meAva').src = ava; $('#meAva').classList.remove('hidden'); }
    $('#navAdmin').classList.toggle('hidden', !P?.is_admin);
    route();
  }

  const VIEWS = ['games', 'rating', 'profile', 'results', 'admin', 'system'];
  function route() {
    let v = location.hash.slice(1);
    if (!VIEWS.includes(v) || (v === 'admin' && !P?.is_admin)) v = 'games';
    VIEWS.forEach((x) => $('#v-' + x).classList.toggle('hidden', x !== v));
    document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.v === v));
    ({ games, rating, profile, results, admin, system: () => {} })[v]();
  }

  async function games() {
    const box = $('#games'); clear(box);
    let best = null;
    const { data } = await sb.from('leaderboard').select('best_score,best_level').eq('user_id', S.user.id).eq('game', TR.CFG.GAME).maybeSingle();
    best = data;
    GAMES.forEach((g) => {
      const c = el('div', 'game' + (g.main ? ' main' : ' off'));
      c.appendChild(el('div', 'gg', g.g)); c.appendChild(el('div', 'gt', g.t)); c.appendChild(el('p', 'note', g.d));
      if (g.main) {
        c.appendChild(el('p', 'sub', best ? 'Ең жақсы нәтижеңіз: ' + best.best_score + ' ұпай · өтілген трасса: ' + (best.best_level || 0) + ' / 10' : 'Әлі ойнаған жоқсыз — бірінші жарысты бастаңыз!'));
        const a = el('a', 'btn', 'Ойнау ▶'); a.href = g.href; a.style.alignSelf = 'flex-start'; c.appendChild(a);
      } else c.appendChild(el('span', 'demo-badge', 'ЖАҚЫНДА'));
      box.appendChild(c);
    });
  }

  async function rating() {
    const box = $('#ratingBox'); clear(box); box.appendChild(el('p', 'note', 'Жүктелуде…'));
    const { data, error } = await sb.from('leaderboard').select('user_id,full_name,best_score,best_level').eq('game', TR.CFG.GAME).order('best_score', { ascending: false }).limit(50);
    clear(box);
    if (error) return box.appendChild(el('p', 'err', 'Рейтингті жүктеу мүмкін болмады.'));
    if (!data.length) return box.appendChild(el('p', 'note', 'Әзірге нәтиже жоқ. Бірінші болыңыз!'));
    box.appendChild(table(['Орын', 'Студент', 'Ойын', 'Ұпай', 'Деңгей'],
      data.map((r, i) => ({ _cls: r.user_id === S.user.id ? 'me' : null, cells: [i + 1, r.full_name, 'Тарих Race KZ', r.best_score, r.best_level || '—'] })), { num: [3, 4] }));
  }

  async function profile() {
    P = await TR.profile();
    $('#pFull').textContent = P?.full_name || '';
    $('#pEmail').textContent = P?.email || S.user.email || '';
    $('#dispName').value = P?.display_name || '';
    const box = $('#pStats'); clear(box);
    const total = (P?.correct_total || 0) + (P?.wrong_total || 0);
    [['Ойын саны', P?.games_played || 0], ['Жалпы ұпай', P?.total_score || 0], ['Дұрыс жауап', P?.correct_total || 0], ['Қате жауап', P?.wrong_total || 0],
     ['Дәлдік', total ? Math.round((P.correct_total / total) * 100) + '%' : '—'], ['Ойнаған уақыт', Math.round((P?.play_seconds || 0) / 60) + ' мин']]
      .forEach(([a, b]) => { const d = el('div', 'st'); d.appendChild(el('small', null, a)); d.appendChild(el('b', null, b)); box.appendChild(d); });
  }
  $('#nameForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = $('#dispName').value.trim().replace(/\s+/g, ' ');
    const msg = $('#nameMsg');
    if (!NAME_RE.test(v)) { msg.textContent = 'Ат 2–30 таңба: әріп, сан, бос орын, нүкте немесе сызықша.'; return; }
    const { error } = await sb.from('profiles').update({ display_name: v }).eq('id', S.user.id);
    if (error) { msg.textContent = 'Сақтау мүмкін болмады.'; return; }
    msg.textContent = ''; toast('Сақталды. Рейтингте келесі жарыстан кейін жаңарады.');
    $('#meName').textContent = v;
  });

  async function results() {
    const box = $('#resultsBox'); clear(box); box.appendChild(el('p', 'note', 'Жүктелуде…'));
    const { data, error } = await sb.from('races').select('track,char_idx,status,score,correct,wrong,started_at,client_time_ms').eq('user_id', S.user.id).order('started_at', { ascending: false }).limit(30);
    clear(box);
    if (error) return box.appendChild(el('p', 'err', 'Нәтижелерді жүктеу мүмкін болмады.'));
    if (!data.length) return box.appendChild(el('p', 'note', 'Әзірге жарыс жоқ.'));
    box.appendChild(table(['Күні', 'Трасса', 'Кейіпкер', 'Нәтиже', 'Ұпай', 'Дұрыс', 'Қате', 'Уақыт'],
      data.map((r) => ({ cells: [fmtDate(r.started_at), r.track + '-трасса', CHARS[r.char_idx]?.name || '—', STATUS[r.status] || r.status, r.score, r.correct, r.wrong, r.client_time_ms ? fmtTime(r.client_time_ms) : '—'] })), { num: [4, 5, 6] }));
  }

  async function admin() {
    if (!P?.is_admin) return;
    const cnt = async (t) => (await sb.from(t).select('*', { count: 'exact', head: true })).count ?? 0;
    const [u, r, q, a] = await Promise.all([cnt('profiles'), cnt('races'), cnt('questions'), cnt('race_answers')]);
    const sbox = $('#aStats'); clear(sbox);
    [['Студенттер', u], ['Жарыстар', r], ['Сұрақтар', q], ['Жауаптар', a]].forEach(([x, y]) => { const d = el('div', 'st'); d.appendChild(el('small', null, x)); d.appendChild(el('b', null, y)); sbox.appendChild(d); });
    const { data: users } = await sb.from('profiles').select('id,full_name,display_name,email,games_played,total_score,correct_total,wrong_total,is_admin').order('total_score', { ascending: false }).limit(200);
    const names = {}; (users || []).forEach((p) => { names[p.id] = p.display_name || p.full_name; });
    const ub = $('#aUsers'); clear(ub);
    ub.appendChild(table(['Аты', 'Email', 'Ойын', 'Жалпы ұпай', 'Дұрыс', 'Қате', 'Рөл'],
      (users || []).map((p) => ({ cells: [p.display_name || p.full_name, p.email || '', p.games_played, p.total_score, p.correct_total, p.wrong_total, p.is_admin ? 'админ' : 'студент'] })), { num: [2, 3, 4, 5] }));
    const { data: races } = await sb.from('races').select('user_id,track,char_idx,status,score,correct,wrong,started_at').order('started_at', { ascending: false }).limit(30);
    const rb = $('#aRaces'); clear(rb);
    rb.appendChild(table(['Күні', 'Студент', 'Трасса', 'Кейіпкер', 'Нәтиже', 'Ұпай', 'Дұрыс', 'Қате'],
      (races || []).map((x) => ({ cells: [fmtDate(x.started_at), names[x.user_id] || '—', x.track, CHARS[x.char_idx]?.name || '—', STATUS[x.status] || x.status, x.score, x.correct, x.wrong] })), { num: [5, 6, 7] }));
  }

  $('#googleBtn').addEventListener('click', async () => {
    $('#loginErr').textContent = '';
    try { await TR.signIn(); } catch (e) { $('#loginErr').textContent = 'Кіру сәтсіз: ' + (e.message || e); }
  });
  $('#logoutBtn').addEventListener('click', () => TR.signOut());
  window.addEventListener('hashchange', () => { if (S) route(); });
  sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') location.reload(); });
  boot();
})();
