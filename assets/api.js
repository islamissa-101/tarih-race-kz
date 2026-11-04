// Supabase клиенті және сервермен жұмыс (GAME HUB пен ойынға ортақ)
(function () {
  'use strict';
  const CFG = window.TR_CONFIG;
  if (!window.supabase || !window.supabase.createClient) {
    document.body.textContent = 'Supabase кітапханасы жүктелмеді. Интернетті тексеріп, бетті жаңартыңыз.';
    return;
  }
  const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_PUBLISHABLE_KEY, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  // Сайттың түбірі: .../tarih-race-kz/ (race/ ішінен де дұрыс анықталады)
  function hubUrl() {
    const p = location.pathname.replace(/race\/(index\.html)?$/, '').replace(/index\.html$/, '');
    return location.origin + p;
  }

  const ERRORS = {
    unauthorized: 'Қайта кіру қажет.',
    rate_limit: 'Тым жиі сұраныс. Біраз күтіп, қайталаңыз.',
    too_fast: 'Тым жылдам: сервер бұл нәтижені шынайы емес деп есептеді.',
    gates_missing: 'Барлық 6 тарихи кедергіден өту керек.',
    race_closed: 'Бұл жарыс аяқталған.',
    med_limit: 'Медициналық көмек лимиті бітті.',
    not_enough_questions: 'Дерекқорда сұрақтар жеткіліксіз (schema.sql іске қосылды ма?).',
  };

  async function fn(name, body) {
    const { data, error } = await sb.functions.invoke(name, { body });
    if (error) {
      let code = 'network', status = 0;
      try { status = error.context?.status || 0; const j = await error.context.json(); code = j.error || code; } catch (_) { /* желі қатесі */ }
      const e = new Error(ERRORS[code] || 'Сервермен байланыс қатесі (' + code + ').');
      e.code = code; e.status = status;
      throw e;
    }
    return data;
  }

  window.TR = {
    sb, CFG, hubUrl, fn,
    async session() { const { data } = await sb.auth.getSession(); return data.session; },
    async signIn() {
      const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: hubUrl() } });
      if (error) throw error;
    },
    async signOut() { await sb.auth.signOut(); location.href = hubUrl(); },
    async profile() {
      const s = await this.session(); if (!s) return null;
      const { data } = await sb.from('profiles').select('*').eq('id', s.user.id).maybeSingle();
      return data;
    },
    displayName(p, s) {
      return (p && (p.display_name || p.full_name)) || (s && (s.user.user_metadata?.full_name || s.user.email)) || 'Студент';
    },
  };
})();
