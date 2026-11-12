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
    route();
  }

  const VIEWS = ['games', 'rating', 'profile', 'results', 'admin', 'system'];
  function route() {
    let v = location.hash.slice(1);
    if (!VIEWS.includes(v)) v = 'games';
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

  // ---------- АДМИН ПАНЕЛІ (құпиясөзбен, тексеру серверде) ----------
  const AKEY = 'tr_admin';
  let AD = null; // соңғы жүктелген деректер
  function aTok() {
    try {
      const t = JSON.parse(sessionStorage.getItem(AKEY) || 'null');
      if (t && t.uid === S.user.id && t.exp > Date.now()) return t.token;
    } catch (_) { /* бос */ }
    sessionStorage.removeItem(AKEY); return null;
  }
  function aShow(logged) {
    $('#aLogin').classList.toggle('hidden', logged);
    $('#aPanel').classList.toggle('hidden', !logged);
    if (!logged) { $('#aPass').value = ''; setTimeout(() => $('#aPass').focus(), 0); }
  }
  async function aCall(action, extra = {}) {
    try { return await TR.fn('admin-panel', { action, token: aTok(), ...extra }); }
    catch (e) {
      if (e.code === 'admin_expired') { sessionStorage.removeItem(AKEY); aShow(false); $('#aErr').textContent = e.message; }
      throw e;
    }
  }

  async function admin() {
    if (!aTok()) return aShow(false);
    aShow(true);
    const sbox = $('#aStats'); clear(sbox); sbox.appendChild(el('p', 'note', 'Жүктелуде…'));
    try { AD = await aCall('data'); } catch (e) { clear(sbox); if (e.code !== 'admin_expired') toast(e.message); return; }
    const names = {}, emails = {};
    AD.profiles.forEach((p) => { names[p.id] = p.display_name || p.full_name; emails[p.id] = p.email || ''; });
    AD.names = names; AD.emails = emails;
    const best = {}; AD.board.forEach((b) => { best[b.user_id] = b; });
    AD.best = best;
    clear(sbox);
    const fin = AD.races.filter((r) => r.status === 'finished').length;
    [['Қатысушылар', AD.profiles.length], ['Жарыстар', AD.races.length], ['Мәреге жеткен', fin], ['Сұрақтар', AD.questions]]
      .forEach(([x, y]) => { const d = el('div', 'st'); d.appendChild(el('small', null, x)); d.appendChild(el('b', null, y)); sbox.appendChild(d); });

    const ub = $('#aUsers'); clear(ub);
    const users = [...AD.profiles].sort((a, b) => b.total_score - a.total_score);
    if (!users.length) ub.appendChild(el('p', 'note', 'Қатысушылар жоқ.'));
    else ub.appendChild(table(['Аты', 'Email', 'Ойын', 'Жалпы ұпай', 'Ең жақсы', 'Дұрыс', 'Қате', 'Рөл'],
      users.map((p) => ({ cells: [names[p.id], p.email || '', p.games_played, p.total_score, best[p.id]?.best_score ?? '—', p.correct_total, p.wrong_total, p.is_admin ? 'админ' : 'студент'] })), { num: [2, 3, 4, 5, 6] }));

    const rb = $('#aRaces'); clear(rb);
    if (!AD.races.length) rb.appendChild(el('p', 'note', 'Нәтижелер жоқ.'));
    else rb.appendChild(table(['Күні', 'Студент', 'Трасса', 'Кейіпкер', 'Нәтиже', 'Ұпай', 'Дұрыс', 'Қате', 'Уақыт'],
      AD.races.slice(0, 50).map((x) => ({ cells: [fmtDate(x.started_at), names[x.user_id] || '—', x.track, CHARS[x.char_idx]?.name || '—', STATUS[x.status] || x.status, x.score, x.correct, x.wrong, x.client_time_ms ? fmtTime(x.client_time_ms) : '—'] })), { num: [5, 6, 7] }));

    const LOGT = { login_ok: 'Кірді', login_fail: 'Қате құпиясөз', clear_results: 'Нәтижелерді тазалады' };
    const lb = $('#aLog'); clear(lb);
    if (!AD.log.length) lb.appendChild(el('p', 'note', 'Журнал бос.'));
    else lb.appendChild(table(['Уақыт', 'Кім', 'Әрекет'], AD.log.map((l) => ({ cells: [fmtDate(l.created_at), names[l.user_id] || emails[l.user_id] || (l.user_id ? l.user_id.slice(0, 8) : 'өшірілген'),
      l.action.startsWith('clear_participants') ? 'Қатысушыларды тазалады (' + (l.action.split(':')[1] || 0) + ')' : (LOGT[l.action] || l.action)] }))));
  }

  $('#aForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = $('#aPass').value, err = $('#aErr'), btn = e.submitter || $('#aForm button');
    err.textContent = '';
    if (!pw) { err.textContent = 'Құпиясөзді енгізіңіз.'; return; }
    btn.disabled = true;
    try {
      const r = await TR.fn('admin-panel', { action: 'login', password: pw });
      sessionStorage.setItem(AKEY, JSON.stringify({ token: r.token, exp: r.exp, uid: S.user.id }));
      $('#aPass').value = '';
      toast('Админ панеліне кірдіңіз');
      admin();
    } catch (x) {
      err.textContent = x.message + (x.code === 'bad_password' && Number.isInteger(x.extra?.left) ? ' Қалған әрекет: ' + x.extra.left + '.' : '');
    } finally { btn.disabled = false; }
  });
  $('#aOut').addEventListener('click', () => { sessionStorage.removeItem(AKEY); AD = null; aShow(false); });

  // ---- Excel ----
  const dt = (iso) => { if (!iso) return ''; const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };
  const stamp = () => dt(new Date().toISOString()).slice(0, 10);
  function usersSheet() {
    const rows = [...AD.profiles].sort((a, b) => b.total_score - a.total_score).map((p, i) => {
      const tot = p.correct_total + p.wrong_total;
      return [i + 1, AD.names[p.id], p.full_name, p.email || '', p.is_admin ? 'админ' : 'студент', dt(p.created_at), p.games_played, p.total_score,
        AD.best[p.id]?.best_score ?? 0, AD.best[p.id]?.best_level ?? 0, p.correct_total, p.wrong_total, tot ? Math.round(p.correct_total / tot * 100) : 0, Math.round(p.play_seconds / 60)];
    });
    return { name: 'Қатысушылар', head: ['№', 'Аты (рейтингте)', 'Толық аты', 'Email', 'Рөл', 'Тіркелген', 'Ойын саны', 'Жалпы ұпай', 'Ең жақсы ұпай', 'Өткен трасса', 'Дұрыс', 'Қате', 'Дәлдік %', 'Ойнаған уақыт (мин)'], rows };
  }
  function racesSheet() {
    const rows = AD.races.map((r, i) => [i + 1, dt(r.started_at), AD.names[r.user_id] || '—', AD.emails[r.user_id] || '', r.track, CHARS[r.char_idx]?.name || '—', STATUS[r.status] || r.status,
      r.score, r.correct, r.wrong, r.med_used, r.coins, r.lives_left, r.client_time_ms ? fmtTime(r.client_time_ms) : '', dt(r.finished_at)]);
    return { name: 'Нәтижелер', head: ['№', 'Басталды', 'Студент', 'Email', 'Трасса', 'Кейіпкер', 'Нәтиже', 'Ұпай', 'Дұрыс', 'Қате', 'Мед. көмек', 'Монета', 'Қалған өмір', 'Уақыт', 'Аяқталды'], rows };
  }
  function exportX(kind) {
    if (!AD) return toast('Деректер әлі жүктелмеді');
    const sheets = kind === 'users' ? [usersSheet()] : kind === 'races' ? [racesSheet()] : [usersSheet(), racesSheet()];
    const fname = { users: 'qatysushylar', races: 'natizheler', all: 'tarih-race' }[kind];
    window.XLSX_LITE.download(`${fname}_${stamp()}.xlsx`, sheets);
  }
  $('#xUsers').addEventListener('click', () => exportX('users'));
  $('#xRaces').addEventListener('click', () => exportX('races'));
  $('#xAll').addEventListener('click', () => exportX('all'));

  // ---- Тазалау (қолмен «ТАЗАЛАУ» деп растау) ----
  const CLEAR = {
    clear_results: ['Нәтижелерді тазалау', 'Барлық жарыстар, жауаптар және рейтинг өшіріледі, студенттердің статистикасы нөлге түседі. Қатысушылар тізімі қалады. Бұл әрекетті қайтару мүмкін емес — алдымен Excel-ге сақтап алыңыз.'],
    clear_participants: ['Қатысушыларды тазалау', 'Барлық студент аккаунттары өзінің нәтижелерімен бірге өшіріледі (сіз және is_admin аккаунттары қалады). Студент қайта кірсе, жаңа бос профиль жасалады. Бұл әрекетті қайтару мүмкін емес — алдымен Excel-ге сақтап алыңыз.'],
  };
  let pending = null;
  function askClear(action) {
    pending = action;
    $('#cTitle').textContent = CLEAR[action][0]; $('#cText').textContent = CLEAR[action][1];
    $('#cWord').value = ''; $('#cYes').disabled = true;
    $('#aConfirm').classList.remove('hidden'); $('#cWord').focus();
  }
  const closeClear = () => { pending = null; $('#aConfirm').classList.add('hidden'); };
  $('#cRaces').addEventListener('click', () => askClear('clear_results'));
  $('#cUsers').addEventListener('click', () => askClear('clear_participants'));
  $('#cNo').addEventListener('click', closeClear);
  $('#aConfirm').addEventListener('keydown', (e) => { if (e.key === 'Escape') closeClear(); });
  $('#cWord').addEventListener('input', () => { $('#cYes').disabled = $('#cWord').value.trim().toUpperCase() !== 'ТАЗАЛАУ'; });
  $('#cYes').addEventListener('click', async () => {
    const action = pending; if (!action) return;
    $('#cYes').disabled = true;
    try {
      const r = await aCall(action, { confirm: 'ТАЗАЛАУ' });
      closeClear();
      toast(action === 'clear_results' ? 'Нәтижелер тазаланды' : 'Өшірілген қатысушылар: ' + (r.removed ?? 0));
      admin();
    } catch (e) { closeClear(); if (e.code !== 'admin_expired') toast(e.message); }
  });

  $('#googleBtn').addEventListener('click', async () => {
    $('#loginErr').textContent = '';
    try { await TR.signIn(); } catch (e) { $('#loginErr').textContent = 'Кіру сәтсіз: ' + (e.message || e); }
  });
  $('#logoutBtn').addEventListener('click', () => TR.signOut());
  window.addEventListener('hashchange', () => { if (S) route(); });
  sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') location.reload(); });
  boot();
})();
