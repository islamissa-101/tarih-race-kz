// Ортақ көмекші функциялар. Барлық мәтін textContent арқылы шығады — innerHTML жоқ (XSS-тен қорғау).
(function () {
  'use strict';
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = String(text);
    return e;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function toast(t) {
    const box = document.getElementById('toast'); if (!box) return;
    const d = el('div', null, t); box.appendChild(d); setTimeout(() => d.remove(), 2600);
  }
  function fmtTime(ms) {
    const t = Math.max(0, ms / 1000), m = Math.floor(t / 60), s = t - m * 60;
    return String(m).padStart(2, '0') + ':' + s.toFixed(1).padStart(4, '0');
  }
  function fmtDate(iso) {
    try { return new Date(iso).toLocaleString('kk-KZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (_) { return iso; }
  }
  function table(headers, rows, opts = {}) {
    const t = el('table', 'board');
    const hr = el('tr');
    headers.forEach((h, i) => { const th = el('th', opts.num && opts.num.includes(i) ? 'num' : null, h); hr.appendChild(th); });
    t.appendChild(hr);
    rows.forEach((r) => {
      const tr = el('tr', r._cls || null);
      r.cells.forEach((v, i) => tr.appendChild(el('td', opts.num && opts.num.includes(i) ? 'num' : null, v)));
      t.appendChild(tr);
    });
    return t;
  }
  const CHARS = [
    { name: 'Сақ жауынгері', veh: 'Соғыс арбасы', spd: 4, nit: 3, def: 4, ab: 'Алтын қалқан: 3 сек зақымсыз', active: 'shield', color: '#E8B84A', dark: '#8A5A00' },
    { name: 'Ғұн жауынгері', veh: 'Жүйрік сәйгүлік', spd: 5, nit: 3, def: 2, ab: 'Садақ: алдағы тасты жояды', active: 'arrow', color: '#B23A48', dark: '#6E1F2B' },
    { name: 'Түркі жауынгері', veh: 'Түркі тұлпары', spd: 4, nit: 5, def: 3, ab: 'Бөрі екпіні: нитро 2 есе ұзақ', passive: 'nitro2', color: '#3FA9D6', dark: '#1F6F96' },
    { name: 'Қарахандық', veh: 'Жібек жолы керуені', spd: 3, nit: 3, def: 4, ab: 'Сауда: монета ×2', passive: 'coin2', color: '#2E8B57', dark: '#1A5535' },
    { name: 'Алтын Орда жауынгері', veh: 'Ауыр соғыс арбасы', spd: 3, nit: 3, def: 5, ab: 'Орда күші: 4 сек қарсыласты итереді', active: 'ram', color: '#C8643B', dark: '#7D3A1F' },
    { name: 'Қазақ хандығы жауынгері', veh: 'Хан арғымағы', spd: 4, nit: 4, def: 3, ab: 'Хан жарлығы: 50/50 көмек (1 рет)', passive: 'fifty', color: '#1F6F96', dark: '#123F57' },
    { name: 'Абылай хан сарбазы', veh: 'Тұлпар', spd: 5, nit: 4, def: 3, ab: 'Аңырақай рухы: +1 өмір', passive: 'life', color: '#7A4BB0', dark: '#472A6B' },
    { name: 'Кенесары сарбазы', veh: 'Жорық арбасы', spd: 4, nit: 4, def: 4, ab: 'Дала тактикасы: айыппұл 1,5 сек', passive: 'penalty', color: '#6B7D35', dark: '#3E4A1C' },
    { name: 'Алаш кезеңінің өкілі', veh: 'Алғашқы автомобиль', spd: 4, nit: 3, def: 3, ab: 'Білім жарығы: сұраққа +5 сек', passive: 'time', color: '#4A5364', dark: '#262C38' },
    { name: 'Тәуелсіз Қазақстан кейіпкері', veh: 'Электрокар «Бәйтерек»', spd: 5, nit: 5, def: 4, ab: 'Магнит: монеталар өзі тартылады', passive: 'magnet', color: '#00A3C4', dark: '#E8B84A' },
  ];
  const STATUS = { finished: 'Мәреге жетті', lost: 'Жеңілді', abandoned: 'Тасталды', active: 'Жүріп жатыр' };
  window.UI = { el, clear, toast, fmtTime, fmtDate, table, CHARS, STATUS };
})();
