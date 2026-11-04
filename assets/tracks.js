// 10 трасса = 10 тарихи кезең: палитра, декорациялар, артефактілер, қиындық.
// Сонымен қатар: кейіпкерлердің көліктері, артефакт суреттері (SVG), Қазақстан картасы.
(function () {
'use strict';
const P = (sky, mount, hills, grass, road, rumble, lane) => ({ sky, mount, hills, grass, road, rumble, lane: lane || '#F3EEE4' });
const TRACKS = [
 { n: 1, name: 'Сақ даласы', era: 'б.з.д. VII–III ғ.', qTime: 20, gates: 3, rivals: 5, rivalSpd: [0.28, 0.40], rockGap: [120, 170], curve: 0.6, hill: 0.6,
   pal: P(['#2C7FA6', '#8CCBE3', '#F2C98A'], ['#EEF2F8', '#9AA9CC', '#6E7FA0'], '#C9A35A', ['#D9BE72', '#CFB266'], ['#7A6E5E', '#726656'], ['#F3EEE4', '#C8643B']),
   sun: '#FFE7A8', decor: ['kurgan', 'balbal', 'stone', 'yurt'], rival: 'horse',
   artifacts: ['Алтын адам — Есік қорғанынан табылған сақ жауынгері', 'Сақтардың «аң стиліндегі» әшекейлері', 'Томирис — массагет патшайымы'] },
 { n: 2, name: 'Ғұн жорығы', era: 'б.з.д. III ғ. – б.з. V ғ.', qTime: 20, gates: 3, rivals: 6, rivalSpd: [0.30, 0.42], rockGap: [110, 160], curve: 0.7, hill: 0.6,
   pal: P(['#4A8DB0', '#B5D8E6', '#F0D29A'], ['#E9E3D6', '#B9A68A', '#8C7A62'], '#B99555', ['#CDB06A', '#C2A55E'], ['#77695A', '#6F6152'], ['#F3EEE4', '#8A5A00']),
   sun: '#FFE2A0', decor: ['yurt', 'stone', 'saxaul', 'kurgan'], rival: 'horse',
   artifacts: ['Ғұн қазаны — қола ыдыс', 'Үйсіндер — Жетісудың көне тайпалары', 'Ұлы Жібек жолы б.з.д. II ғасырда қалыптасты'] },
 { n: 3, name: 'Түркі қағанаты', era: 'VI–VIII ғ.', qTime: 18, gates: 4, rivals: 6, rivalSpd: [0.32, 0.45], rockGap: [100, 150], curve: 0.8, hill: 0.9,
   pal: P(['#2F86C0', '#9ED3F0', '#E8F3F7'], ['#FFFFFF', '#A9C0D8', '#5F7D9C'], '#6E9E4F', ['#86B35C', '#7AA852'], ['#6B6B6B', '#636363'], ['#F3EEE4', '#3FA9D6']),
   sun: '#FFF4C8', decor: ['balbal', 'rune', 'tree', 'yurt'], rival: 'horse',
   artifacts: ['Күлтегін ескерткіші (732 ж.)', 'Көне түркі руна жазуы', 'Бумын қаған — қағанат негізін қалаушы (552 ж.)'] },
 { n: 4, name: 'Қарахан жолы', era: 'X–XII ғ.', qTime: 16, gates: 4, rivals: 7, rivalSpd: [0.33, 0.47], rockGap: [90, 140], curve: 0.85, hill: 0.7,
   pal: P(['#3B88B5', '#BFE0EA', '#F7D9A0'], ['#F1DDB5', '#D8B57C', '#B48A4E'], '#E0B46A', ['#E9C784', '#DFBC77'], ['#8B7B63', '#82725A'], ['#F3EEE4', '#2E8B57']),
   sun: '#FFE9B0', decor: ['mausoleum', 'camel', 'saxaul', 'stone'], rival: 'camelr',
   artifacts: ['Айша бибі кесенесі (XI–XII ғ.)', '«Құтадғу білік» — Жүсіп Баласағұн', 'Махмұд Қашқари сөздігі'] },
 { n: 5, name: 'Алтын Орда', era: 'XIII–XV ғ.', qTime: 15, gates: 5, rivals: 7, rivalSpd: [0.35, 0.50], rockGap: [85, 130], curve: 0.9, hill: 0.8,
   pal: P(['#335C8C', '#A8C2DD', '#F3C9A0'], ['#E8E2EE', '#A79CB8', '#76698C'], '#B48F55', ['#C9AE6E', '#BFA363'], ['#706A62', '#68625A'], ['#E8B84A', '#B23A48']),
   sun: '#FFD9A0', decor: ['tentgold', 'banner', 'yurt', 'stone'], rival: 'horse',
   artifacts: ['Алтын Орда пайзасы — билік белгісі', 'Сарай-Бату — Алтын Орда астанасы', 'Сарайшық — Ноғай Ордасының орталығы'] },
 { n: 6, name: 'Қазақ хандығы', era: '1465 ж.', qTime: 14, gates: 6, rivals: 8, rivalSpd: [0.36, 0.52], rockGap: [70, 120], curve: 1.0, hill: 0.9,
   pal: P(['#2C7FA6', '#8CCBE3', '#F2C98A'], ['#EEF2F8', '#9AA9CC', '#6E7FA0'], '#B79B57', ['#CDB46C', '#C2A962'], ['#6E6A66', '#66625E'], ['#F3EEE4', '#C8643B']),
   sun: '#FFE7A8', decor: ['yurt', 'flag', 'stone', 'yurt'], rival: 'horse',
   artifacts: ['Керей мен Жәнібек — хандықтың негізін қалаушылар', '«Жеті жарғы» — Тәуке хан заңдары', 'Қасым ханның қасқа жолы'] },
 { n: 7, name: 'Аңырақай', era: 'XVIII ғ.', qTime: 12, gates: 6, rivals: 9, rivalSpd: [0.38, 0.55], rockGap: [60, 110], curve: 1.1, hill: 1.0,
   pal: P(['#5B2C4A', '#C8643B', '#F2B36A'], ['#E0C2A8', '#9A6B5A', '#5E3B3B'], '#9C7247', ['#B78E58', '#AD844F'], ['#5E5550', '#57504A'], ['#F3EEE4', '#B23A48']),
   sun: '#FFB870', decor: ['banner', 'spears', 'stone', 'yurt'], rival: 'horse',
   artifacts: ['Аңырақай шайқасы (1729–1730)', 'Абылай хан — үш жүздің ханы (1771)', '«Елім-ай» — Ақтабан шұбырынды жылдарының әні'] },
 { n: 8, name: 'Кенесары жорығы', era: '1837–1847 жж.', qTime: 11, gates: 7, rivals: 10, rivalSpd: [0.40, 0.57], rockGap: [55, 100], curve: 1.15, hill: 1.0,
   pal: P(['#3E7CA8', '#A9CFE3', '#E8EEF0'], ['#DDE6EA', '#8FA7B5', '#5C7484'], '#6F8F55', ['#8DAE62', '#82A458'], ['#6A665F', '#625E57'], ['#F3EEE4', '#6B7D35']),
   sun: '#FFF2C0', decor: ['birch', 'fortress', 'yurt', 'birch'], rival: 'horse',
   artifacts: ['Кенесары — Абылай ханның немересі', 'Исатай мен Махамбет көтерілісі (1836–1838)', 'Шоқан Уәлиханов — ғалым-саяхатшы'] },
 { n: 9, name: 'Алаш жолы', era: '1917–1920 жж.', qTime: 10, gates: 8, rivals: 11, rivalSpd: [0.42, 0.60], rockGap: [50, 90], curve: 1.2, hill: 1.1,
   pal: P(['#2B3E5C', '#7F95B5', '#E7C9A0'], ['#C9D0DA', '#7F8DA3', '#4F5D73'], '#7E8B5A', ['#98A36A', '#8E9960'], ['#55524F', '#4E4B48'], ['#F3EEE4', '#4A5364']),
   sun: '#FFD9A8', decor: ['telegraph', 'house', 'birch', 'telegraph'], rival: 'oldcar',
   artifacts: ['«Қазақ» газеті (1913)', 'Алаш автономиясы (1917)', '«Оян, қазақ!» — Міржақып Дулатұлы'] },
 { n: 10, name: 'Тәуелсіздік', era: '1991 жылдан', qTime: 8, gates: 10, rivals: 12, rivalSpd: [0.45, 0.62], rockGap: [45, 85], curve: 1.3, hill: 1.1, night: true, boss: true,
   pal: P(['#0B1526', '#1E3A5F', '#3F6A8F'], ['#3A4E6A', '#26364D', '#1A2638'], '#22324A', ['#2F3D31', '#29362B'], ['#33363D', '#2C2F36'], ['#3FA9D6', '#E8B84A'], '#E8B84A'),
   sun: '#F3EEE4', decor: ['tower', 'building', 'lamp', 'baiterek'], rival: 'car',
   artifacts: ['Тәуелсіздік — 1991 жылғы 16 желтоқсан', 'Теңге — ұлттық валюта (1993)', 'Бәйтерек — Астананың символы'] },
];

/* ---------- декорациялар (canvas) ---------- */
let ctx = null;
const setCtx = (c) => { ctx = c; };
const F = (c) => { ctx.fillStyle = c; };
const R = (x, y, w, h) => ctx.fillRect(x, y, w, h);
const E = (cx, cy, rx, ry, a0, a1) => { ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, a0 || 0, a1 == null ? Math.PI * 2 : a1); ctx.fill(); };
const PL = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const DECOR = {
 kurgan: { w: 1500, h: 420, solid: true, draw(x, y, w, h) { F('#A8884E'); E(x + w / 2, y + h, w / 2, h, Math.PI, Math.PI * 2); F('#BFA060'); E(x + w / 2, y + h * 0.98, w * 0.38, h * 0.7, Math.PI, Math.PI * 2); } },
 balbal: { w: 320, h: 760, solid: true, draw(x, y, w, h) { F('#8E877C'); R(x + w * 0.15, y + h * 0.3, w * 0.7, h * 0.7); E(x + w / 2, y + h * 0.2, w * 0.32, h * 0.15); F('#5E5A55'); R(x + w * 0.35, y + h * 0.2, w * 0.3, h * 0.02); R(x + w * 0.3, y + h * 0.45, w * 0.4, h * 0.03); } },
 rune: { w: 420, h: 950, solid: true, draw(x, y, w, h) { F('#9A948A'); PL([x, y + h, x + w * 0.05, y + h * 0.1, x + w / 2, y, x + w * 0.95, y + h * 0.1, x + w, y + h]); F('#55504A'); for (let i = 0; i < 6; i++) R(x + w * (0.2 + (i % 3) * 0.22), y + h * (0.25 + Math.floor(i / 3) * 0.2), w * 0.1, h * 0.1); } },
 tree: { w: 800, h: 1300, solid: true, draw(x, y, w, h) { F('#5A4630'); R(x + w * 0.45, y + h * 0.55, w * 0.1, h * 0.45); F('#4E7F3A'); E(x + w / 2, y + h * 0.38, w * 0.45, h * 0.32); F('#5F9446'); E(x + w * 0.42, y + h * 0.3, w * 0.25, h * 0.18); } },
 birch: { w: 560, h: 1500, solid: true, draw(x, y, w, h) { F('#F1EEE6'); R(x + w * 0.45, y + h * 0.3, w * 0.1, h * 0.7); F('#2B2B2B'); for (let i = 0; i < 6; i++) R(x + w * 0.45, y + h * (0.38 + i * 0.1), w * 0.1 * (i % 2 ? 0.6 : 1), h * 0.012); F('#6E9A45'); E(x + w / 2, y + h * 0.25, w * 0.42, h * 0.25); } },
 saxaul: { w: 650, h: 450, solid: false, draw(x, y, w, h) { F('#7A6A3E'); E(x + w / 2, y + h * 0.7, w * 0.45, h * 0.35); F('#8F8A4E'); E(x + w * 0.4, y + h * 0.55, w * 0.28, h * 0.3); } },
 mausoleum: { w: 1400, h: 1250, solid: true, draw(x, y, w, h) { F('#D9B77E'); R(x + w * 0.1, y + h * 0.4, w * 0.8, h * 0.6); F('#3F7FA0'); E(x + w / 2, y + h * 0.42, w * 0.3, h * 0.32, Math.PI, Math.PI * 2); F('#C49A5A'); R(x + w * 0.35, y + h * 0.5, w * 0.3, h * 0.5); F('#5A4630'); E(x + w / 2, y + h * 0.66, w * 0.08, h * 0.08, Math.PI, Math.PI * 2); R(x + w * 0.42, y + h * 0.66, w * 0.16, h * 0.34); } },
 camel: { w: 950, h: 720, solid: true, draw(x, y, w, h) { F('#A87F4A'); R(x + w * 0.2, y + h * 0.62, w * 0.06, h * 0.38); R(x + w * 0.7, y + h * 0.62, w * 0.06, h * 0.38); E(x + w * 0.48, y + h * 0.55, w * 0.32, h * 0.14); E(x + w * 0.38, y + h * 0.38, w * 0.1, h * 0.12); E(x + w * 0.56, y + h * 0.38, w * 0.1, h * 0.12); R(x + w * 0.78, y + h * 0.2, w * 0.06, h * 0.35); E(x + w * 0.86, y + h * 0.2, w * 0.08, h * 0.05); F('#B23A48'); R(x + w * 0.4, y + h * 0.42, w * 0.2, h * 0.08); } },
 tentgold: { w: 1400, h: 1050, solid: true, draw(x, y, w, h) { F('#E8B84A'); R(x + w * 0.08, y + h * 0.45, w * 0.84, h * 0.55); E(x + w / 2, y + h * 0.47, w * 0.46, h * 0.42, Math.PI, Math.PI * 2); F('#B23A48'); R(x + w * 0.08, y + h * 0.55, w * 0.84, h * 0.07); F('#7D3A1F'); R(x + w * 0.42, y + h * 0.66, w * 0.16, h * 0.34); F('#5A4630'); R(x + w * 0.49, y, w * 0.02, h * 0.1); } },
 banner: { w: 360, h: 1500, solid: true, draw(x, y, w, h, o, T) { F('#4A3828'); R(x + w * 0.1, y, w * 0.06, h); F(T && T.n === 5 ? '#E8B84A' : '#B23A48'); PL([x + w * 0.16, y + h * 0.03, x + w * 0.95, y + h * 0.08, x + w * 0.8, y + h * 0.2, x + w * 0.95, y + h * 0.32, x + w * 0.16, y + h * 0.34]); } },
 spears: { w: 520, h: 1300, solid: true, draw(x, y, w, h) { F('#5A4630'); for (let i = 0; i < 4; i++) { const sx = x + w * (0.15 + i * 0.22); R(sx, y + h * 0.1, w * 0.04, h * 0.9); F('#C9D3E0'); PL([sx - w * 0.03, y + h * 0.12, sx + w * 0.02, y, sx + w * 0.07, y + h * 0.12]); F('#5A4630'); } } },
 fortress: { w: 1900, h: 850, solid: true, draw(x, y, w, h) { F('#7A5434'); for (let i = 0; i < 14; i++) { R(x + w * i / 14, y + h * 0.3, w / 14 - 1, h * 0.7); PL([x + w * i / 14, y + h * 0.3, x + w * (i + 0.5) / 14, y + h * 0.22, x + w * (i + 1) / 14 - 1, y + h * 0.3]); } F('#5E3F26'); R(x + w * 0.7, y, w * 0.18, h); F('#3E2A1A'); R(x + w * 0.74, y + h * 0.15, w * 0.1, h * 0.12); } },
 telegraph: { w: 360, h: 1650, solid: true, draw(x, y, w, h) { F('#4A3828'); R(x + w * 0.46, y, w * 0.08, h); R(x + w * 0.1, y + h * 0.08, w * 0.8, h * 0.02); F('#D9D2C0'); R(x + w * 0.12, y + h * 0.06, w * 0.06, h * 0.02); R(x + w * 0.82, y + h * 0.06, w * 0.06, h * 0.02); } },
 house: { w: 1300, h: 950, solid: true, draw(x, y, w, h) { F('#8A6040'); R(x + w * 0.1, y + h * 0.4, w * 0.8, h * 0.6); F('#5E4430'); PL([x, y + h * 0.42, x + w / 2, y + h * 0.05, x + w, y + h * 0.42]); F('#F2C98A'); R(x + w * 0.25, y + h * 0.55, w * 0.15, h * 0.18); R(x + w * 0.6, y + h * 0.55, w * 0.15, h * 0.18); } },
 tower: { w: 1500, h: 3600, solid: true, draw(x, y, w, h, o) { F('#1E3550'); R(x, y, w, h); F('#F2C98A'); const cols = 5, rows = 18; for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) if (((i * 7 + j * 3 + (o.seed || 0)) % 5) < 2) R(x + w * (0.1 + i * 0.17), y + h * (0.04 + j * 0.052), w * 0.1, h * 0.025); } },
 building: { w: 1900, h: 2300, solid: true, draw(x, y, w, h, o) { F('#26405E'); R(x, y, w, h); F('#3FA9D6'); R(x, y, w, h * 0.02); F('#F3EEE4'); for (let i = 0; i < 7; i++) for (let j = 0; j < 10; j++) if (((i * 5 + j * 2 + (o.seed || 0)) % 4) === 0) R(x + w * (0.06 + i * 0.13), y + h * (0.06 + j * 0.09), w * 0.07, h * 0.04); } },
 baiterek: { w: 900, h: 4200, solid: true, draw(x, y, w, h) { F('#F3EEE4'); PL([x + w * 0.4, y + h, x + w * 0.45, y + h * 0.2, x + w * 0.55, y + h * 0.2, x + w * 0.6, y + h]); F('#D9D2C0'); PL([x + w * 0.2, y + h * 0.22, x + w * 0.5, y + h * 0.08, x + w * 0.8, y + h * 0.22, x + w * 0.5, y + h * 0.3]); F('#E8B84A'); E(x + w / 2, y + h * 0.15, w * 0.2, h * 0.045); } },
 lamp: { w: 240, h: 1450, solid: true, draw(x, y, w, h) { F('#55606E'); R(x + w * 0.45, y + h * 0.05, w * 0.1, h * 0.95); ctx.fillStyle = 'rgba(255,230,160,.35)'; E(x + w / 2, y + h * 0.06, w * 1.3, h * 0.08); F('#FFE7A8'); E(x + w / 2, y + h * 0.05, w * 0.35, h * 0.025); } },
};

/* ---------- көліктер (артынан көрініс) ---------- */
const SKIN = '#D9A877';
function rider(cx, y, w, h, robe, dark, hat, t) {
  const sway = Math.sin(t * 14) * w * 0.01;
  F(dark); R(cx - w * 0.2 + sway, y + h * 0.48, w * 0.06, h * 0.16); R(cx + w * 0.14 + sway, y + h * 0.48, w * 0.06, h * 0.16);
  F(robe); PL([cx - w * 0.18 + sway, y + h * 0.52, cx - w * 0.12 + sway, y + h * 0.2, cx + w * 0.12 + sway, y + h * 0.2, cx + w * 0.18 + sway, y + h * 0.52]);
  F(dark); R(cx - w * 0.17 + sway, y + h * 0.42, w * 0.34, h * 0.03);
  F(SKIN); E(cx + sway, y + h * 0.14, w * 0.065, h * 0.065);
  const hy = y + h * 0.1;
  if (hat === 'pointed') { F('#E8B84A'); PL([cx - w * 0.07 + sway, hy, cx + sway, y - h * 0.08, cx + w * 0.07 + sway, hy]); }
  else if (hat === 'helmet') { F('#8E99A8'); E(cx + sway, hy, w * 0.075, h * 0.06, Math.PI, Math.PI * 2); R(cx - w * 0.01 + sway, hy - h * 0.1, w * 0.02, h * 0.05); }
  else if (hat === 'turban') { F('#F3EEE4'); E(cx + sway, hy, w * 0.085, h * 0.055); }
  else if (hat === 'fur') { F('#5A4630'); E(cx + sway, hy, w * 0.09, h * 0.06); F(robe); R(cx - w * 0.06 + sway, hy - h * 0.06, w * 0.12, h * 0.03); }
  else if (hat === 'cap') { F('#262C38'); E(cx + sway, hy, w * 0.08, h * 0.04, Math.PI, Math.PI * 2); R(cx - w * 0.09 + sway, hy, w * 0.18, h * 0.012); }
}
function shadow(x, y, w, h) { ctx.fillStyle = 'rgba(0,0,0,.25)'; E(x + w / 2, y + h * 0.98, w * 0.5, h * 0.06); }
function horse(x, y, w, h, c, t, coat, hat) {
  shadow(x, y, w, h);
  const g = Math.sin(t * 22) * h * 0.04, cx = x + w / 2;
  F('#3B2616'); R(cx - w * 0.2, y + h * 0.66 + g, w * 0.08, h * 0.34 - g); R(cx + w * 0.12, y + h * 0.66 - g, w * 0.08, h * 0.34 + g);
  F(coat || '#6B4226'); E(cx, y + h * 0.62, w * 0.3, h * 0.17);
  F('#2B1B10'); PL([cx - w * 0.04, y + h * 0.65, cx + w * 0.04, y + h * 0.65, cx + w * 0.02 + g * 0.5, y + h * 0.92, cx - w * 0.02 + g * 0.5, y + h * 0.92]);
  F(c.color); R(cx - w * 0.26, y + h * 0.48, w * 0.52, h * 0.1); F(c.dark); R(cx - w * 0.26, y + h * 0.56, w * 0.52, h * 0.02);
  rider(cx, y, w, h, c.color, c.dark, hat, t);
}
function wheel(cx, cy, r, t) { F('#3B2616'); E(cx, cy, r * 0.25, r); ctx.strokeStyle = '#2B1B10'; ctx.lineWidth = Math.max(1, r * 0.08); ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke(); }
function chariot(x, y, w, h, c, t, heavy) {
  shadow(x, y, w, h); const cx = x + w / 2;
  wheel(x + w * 0.1, y + h * 0.72, h * 0.27, t); wheel(x + w * 0.9, y + h * 0.72, h * 0.27, t);
  F(c.dark); R(x + w * 0.12, y + h * 0.7, w * 0.76, h * 0.04);
  F(heavy ? '#7D3A1F' : '#8A5A00'); R(x + w * 0.2, y + h * 0.5, w * 0.6, h * 0.24);
  F('#E8B84A'); R(x + w * 0.2, y + h * 0.5, w * 0.6, h * 0.03); if (heavy) { E(cx, y + h * 0.62, w * 0.1, h * 0.08); }
  rider(cx, y + h * 0.12, w, h * 0.72, c.color, c.dark, heavy ? 'helmet' : 'pointed', t);
}
function camel(x, y, w, h, c, t) {
  shadow(x, y, w, h); const cx = x + w / 2, g = Math.sin(t * 12) * h * 0.03;
  F('#8A6438'); R(cx - w * 0.2, y + h * 0.68 + g, w * 0.07, h * 0.32 - g); R(cx + w * 0.13, y + h * 0.68 - g, w * 0.07, h * 0.32 + g);
  F('#B08850'); E(cx, y + h * 0.62, w * 0.32, h * 0.17); E(cx - w * 0.14, y + h * 0.45, w * 0.1, h * 0.1); E(cx + w * 0.14, y + h * 0.45, w * 0.1, h * 0.1);
  F(c.color); R(cx - w * 0.42, y + h * 0.5, w * 0.16, h * 0.2); R(cx + w * 0.26, y + h * 0.5, w * 0.16, h * 0.2);
  F('#E8B84A'); R(cx - w * 0.42, y + h * 0.58, w * 0.16, h * 0.02); R(cx + w * 0.26, y + h * 0.58, w * 0.16, h * 0.02);
  rider(cx, y, w, h, c.color, c.dark, 'turban', t);
}
function wagon(x, y, w, h, c, t) {
  shadow(x, y, w, h); const cx = x + w / 2;
  wheel(x + w * 0.12, y + h * 0.78, h * 0.2, t); wheel(x + w * 0.88, y + h * 0.78, h * 0.2, t);
  F('#7A5434'); R(x + w * 0.15, y + h * 0.55, w * 0.7, h * 0.25);
  F('#E6DCC6'); E(cx, y + h * 0.56, w * 0.36, h * 0.45, Math.PI, Math.PI * 2);
  F(c.color); R(x + w * 0.14, y + h * 0.36, w * 0.72, h * 0.04);
  F('#2B2015'); E(cx, y + h * 0.56, w * 0.16, h * 0.22, Math.PI, Math.PI * 2);
  F('#F3EEE4'); R(x + w * 0.4, y + h * 0.66, w * 0.2, h * 0.06);
}
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); ctx.fill(); }
function oldcar(x, y, w, h, c, braking) {
  shadow(x, y, w, h);
  F('#0B0F17'); R(x + w * 0.04, y + h * 0.68, w * 0.18, h * 0.32); R(x + w * 0.78, y + h * 0.68, w * 0.18, h * 0.32);
  F('#2B2F36'); rr(x + w * 0.02, y + h * 0.38, w * 0.96, h * 0.42, h * 0.06); rr(x + w * 0.16, y, w * 0.68, h * 0.46, h * 0.05);
  F('#9FB3C8'); R(x + w * 0.24, y + h * 0.08, w * 0.52, h * 0.22);
  F('#111'); E(x + w / 2, y + h * 0.6, w * 0.13, h * 0.2); F('#555'); E(x + w / 2, y + h * 0.6, w * 0.05, h * 0.08);
  F(braking ? '#FF2E2E' : '#E0463C'); E(x + w * 0.12, y + h * 0.5, w * 0.04, h * 0.06); E(x + w * 0.88, y + h * 0.5, w * 0.04, h * 0.06);
  F(c ? c.color : '#4A5364'); R(x + w * 0.02, y + h * 0.38, w * 0.96, h * 0.03);
}
function ev(x, y, w, h, c, braking) {
  shadow(x, y, w, h);
  F('#0B0F17'); R(x + w * 0.04, y + h * 0.72, w * 0.18, h * 0.28); R(x + w * 0.78, y + h * 0.72, w * 0.18, h * 0.28);
  F(c.color); rr(x, y + h * 0.34, w, h * 0.48, h * 0.14);
  F('#14202E'); rr(x + w * 0.14, y, w * 0.72, h * 0.42, h * 0.16);
  F(braking ? '#FF2E2E' : '#FF5A4E'); R(x + w * 0.06, y + h * 0.46, w * 0.88, h * 0.05);
  F('#E8B84A'); R(x + w * 0.06, y + h * 0.62, w * 0.88, h * 0.02);
  F('#F3EEE4'); R(x + w * 0.42, y + h * 0.66, w * 0.16, h * 0.08);
}
function car(x, y, w, h, col, dark, braking) {
  shadow(x, y, w, h);
  F('#0B0F17'); R(x + w * 0.03, y + h * 0.7, w * 0.2, h * 0.3); R(x + w * 0.77, y + h * 0.7, w * 0.2, h * 0.3);
  F(col); rr(x, y + h * 0.36, w, h * 0.46, h * 0.12); F(dark); rr(x + w * 0.15, y, w * 0.7, h * 0.46, h * 0.14);
  F('#1A2333'); rr(x + w * 0.22, y + h * 0.07, w * 0.56, h * 0.27, h * 0.06);
  F(braking ? '#FF2E2E' : '#E0463C'); R(x + w * 0.05, y + h * 0.47, w * 0.16, h * 0.1); R(x + w * 0.79, y + h * 0.47, w * 0.16, h * 0.1);
  F('#F3EEE4'); R(x + w * 0.4, y + h * 0.6, w * 0.2, h * 0.1);
}
// Кейіпкер → көлік түрі және пропорциясы (биіктік / ен)
const VEHICLE = [
  { kind: 'chariot', asp: 0.85 }, { kind: 'horse', asp: 1.2, coat: '#3B2616', hat: 'helmet' }, { kind: 'horse', asp: 1.2, coat: '#8C8C8C', hat: 'helmet' },
  { kind: 'camel', asp: 1.2 }, { kind: 'heavy', asp: 0.85 }, { kind: 'horse', asp: 1.2, coat: '#6B4226', hat: 'fur' },
  { kind: 'horse', asp: 1.2, coat: '#E8E0D0', hat: 'fur' }, { kind: 'wagon', asp: 0.9 }, { kind: 'oldcar', asp: 0.62 }, { kind: 'ev', asp: 0.5 },
];
function drawVehicle(idx, x, y, w, h, c, t, braking) {
  const v = VEHICLE[idx];
  if (v.kind === 'horse') horse(x, y, w, h, c, t, v.coat, v.hat);
  else if (v.kind === 'chariot') chariot(x, y, w, h, c, t, false);
  else if (v.kind === 'heavy') chariot(x, y, w, h, c, t, true);
  else if (v.kind === 'camel') camel(x, y, w, h, c, t);
  else if (v.kind === 'wagon') wagon(x, y, w, h, c, t);
  else if (v.kind === 'oldcar') oldcar(x, y, w, h, c, braking);
  else ev(x, y, w, h, c, braking);
}
// Қарсыластар
const RIVAL_COLORS = [['#B23A48', '#6E1F2B'], ['#2E8B57', '#1A5535'], ['#7A4BB0', '#472A6B'], ['#F3EEE4', '#9AA3B2'], ['#C8643B', '#7D3A1F'], ['#3A3F4A', '#1A1E26']];
function drawRival(kind, x, y, w, h, o, t) {
  const c = { color: o.color, dark: o.dark };
  if (kind === 'horse') horse(x, y - h * 0.6, w, h * 1.6, c, t + o.z * 0.001, '#5A3A22', 'helmet');
  else if (kind === 'camelr') camel(x, y - h * 0.6, w, h * 1.6, c, t + o.z * 0.001);
  else if (kind === 'oldcar') oldcar(x, y, w, h, c, false);
  else if (kind === 'boss') { car(x, y, w, h, '#101826', '#B23A48', false); const fs = h * 0.22; if (fs > 5) { F('#E8B84A'); ctx.font = '900 ' + fs + 'px Montserrat, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('BOSS', x + w / 2, y - fs * 0.8); } }
  else car(x, y, w, h, o.color, o.dark, false);
}
function drawArtifact(x, y, w, h, t) {
  const k = 0.75 + Math.sin(t * 5) * 0.08, cx = x + w / 2, cy = y + h / 2;
  ctx.fillStyle = 'rgba(232,184,74,.35)'; E(cx, cy, w * 0.7 * k, h * 0.7 * k);
  F('#E8B84A'); PL([cx, cy - h * 0.45 * k, cx + w * 0.35 * k, cy, cx, cy + h * 0.45 * k, cx - w * 0.35 * k, cy]);
  F('#FFF4C8'); PL([cx, cy - h * 0.3 * k, cx + w * 0.15 * k, cy, cx, cy + h * 0.1, cx - w * 0.15 * k, cy]);
}

/* ---------- артефакт суреттері (SVG, тек біздің тұрақты белгілеуіміз) ---------- */
const ART = {
 golden_man: '<rect width="200" height="200" fill="#22304A"/><polygon points="100,12 84,78 116,78" fill="#E8B84A"/><circle cx="100" cy="92" r="16" fill="#D9A877"/><path d="M70 110 L130 110 L142 190 L58 190 Z" fill="#B8862C"/><g fill="#F6D27A"><circle cx="82" cy="130" r="4"/><circle cx="100" cy="130" r="4"/><circle cx="118" cy="130" r="4"/><circle cx="88" cy="150" r="4"/><circle cx="112" cy="150" r="4"/></g><rect x="66" y="160" width="68" height="8" fill="#8A5A00"/>',
 cauldron: '<rect width="200" height="200" fill="#22304A"/><path d="M50 70 Q100 60 150 70 L140 125 Q100 145 60 125 Z" fill="#A0652E"/><path d="M50 70 Q100 60 150 70" stroke="#6E4520" stroke-width="6" fill="none"/><path d="M60 60 q-10 -25 15 -25 M140 60 q10 -25 -15 -25" stroke="#A0652E" stroke-width="8" fill="none"/><path d="M80 135 L70 180 L130 180 L120 135 Z" fill="#8A5528"/><path d="M60 95 Q100 105 140 95" stroke="#6E4520" stroke-width="4" fill="none"/>',
 rune_stone: '<rect width="200" height="200" fill="#22304A"/><path d="M55 190 L60 35 Q100 10 140 35 L145 190 Z" fill="#9A948A"/><g stroke="#3E3A35" stroke-width="5" fill="none"><path d="M80 55 v30 M80 70 l12 -12"/><path d="M110 55 l10 15 l-10 15"/><path d="M80 105 l10 25 l10 -25"/><path d="M115 100 v35 M108 112 h14"/><path d="M80 150 h22 M91 150 v25"/><path d="M115 150 l10 12 l-10 12"/></g>',
 mausoleum: '<rect width="200" height="200" fill="#22304A"/><rect x="30" y="95" width="140" height="95" fill="#D9B77E"/><path d="M60 100 Q100 20 140 100 Z" fill="#C49A5A"/><rect x="75" y="110" width="50" height="80" fill="#B8864A"/><path d="M85 190 V140 Q100 120 115 140 V190 Z" fill="#5A4630"/><g fill="#A8783E"><rect x="40" y="110" width="20" height="8"/><rect x="140" y="110" width="20" height="8"/><rect x="40" y="130" width="20" height="8"/><rect x="140" y="130" width="20" height="8"/></g>',
 paiza: '<rect width="200" height="200" fill="#22304A"/><rect x="60" y="25" width="80" height="160" rx="30" fill="#E8B84A"/><circle cx="100" cy="48" r="9" fill="#22304A"/><g stroke="#8A5A00" stroke-width="5"><path d="M80 80 h40 M80 100 h40 M80 120 h40 M80 140 h40 M100 75 v80"/></g>',
 scroll: '<rect width="200" height="200" fill="#22304A"/><rect x="45" y="40" width="110" height="130" fill="#F1E3C2"/><rect x="35" y="30" width="130" height="16" rx="8" fill="#C49A5A"/><rect x="35" y="164" width="130" height="16" rx="8" fill="#C49A5A"/><g stroke="#8A6A3A" stroke-width="4"><path d="M60 70 h80 M60 90 h80 M60 110 h80 M60 130 h60"/></g><circle cx="135" cy="140" r="12" fill="#B23A48"/>',
 shanyrak: '<rect width="200" height="200" fill="#22304A"/><circle cx="100" cy="100" r="72" fill="none" stroke="#C49A5A" stroke-width="14"/><g stroke="#A8783E" stroke-width="9"><path d="M100 30 V170 M30 100 H170"/><path d="M78 32 V168 M122 32 V168 M32 78 H168 M32 122 H168"/></g><g stroke="#8A5A00" stroke-width="4"><path d="M100 172 L100 198 M40 140 L18 160 M160 140 L182 160 M40 60 L18 40 M160 60 L182 40"/></g>',
 fortress: '<rect width="200" height="200" fill="#22304A"/><g fill="#7A5434"><path d="M20 190 V95 L30 85 L40 95 V190 Z M45 190 V95 L55 85 L65 95 V190 Z M70 190 V95 L80 85 L90 95 V190 Z M95 190 V95 L105 85 L115 95 V190 Z"/></g><rect x="120" y="45" width="55" height="145" fill="#5E3F26"/><path d="M115 50 L147 20 L180 50 Z" fill="#3E2A1A"/><rect x="138" y="70" width="18" height="22" fill="#22304A"/>',
 newspaper: '<rect width="200" height="200" fill="#22304A"/><rect x="35" y="25" width="130" height="155" fill="#F1EEE6"/><rect x="45" y="35" width="110" height="22" fill="#262C38"/><g fill="#8C97A8"><rect x="45" y="68" width="50" height="6"/><rect x="105" y="68" width="50" height="6"/><rect x="45" y="82" width="50" height="6"/><rect x="105" y="82" width="50" height="6"/><rect x="45" y="96" width="50" height="6"/><rect x="105" y="96" width="50" height="6"/><rect x="45" y="110" width="50" height="40"/><rect x="105" y="110" width="50" height="6"/><rect x="105" y="124" width="50" height="6"/><rect x="105" y="138" width="50" height="6"/><rect x="45" y="160" width="110" height="6"/></g>',
 baiterek: '<rect width="200" height="200" fill="#0F1B2D"/><path d="M92 195 L95 75 L105 75 L108 195 Z" fill="#F3EEE4"/><path d="M60 78 L100 40 L140 78 L100 92 Z" fill="#D9D2C0"/><circle cx="100" cy="58" r="20" fill="#E8B84A"/><circle cx="94" cy="52" r="6" fill="#FFF4C8"/><g fill="#F3EEE4"><circle cx="30" cy="30" r="1.5"/><circle cx="170" cy="45" r="1.5"/><circle cx="150" cy="20" r="1"/></g>',
};

/* ---------- Қазақстан картасы ---------- */
const KZ = [[46.5,48.9],[47.6,50.4],[48.7,50.6],[50.3,51.4],[51.4,51.6],[52.8,51.5],[54.6,50.9],[55.7,50.6],[57.3,51.1],[58.6,51.0],[59.9,50.6],[61.4,50.8],[61.0,52.0],[61.6,53.8],[62.8,54.1],[65.2,54.6],[67.5,54.9],[69.2,55.4],[70.8,55.3],[71.3,54.2],[73.2,54.0],[74.0,53.6],[76.5,54.3],[77.9,53.3],[79.0,52.6],[80.1,51.5],[81.0,51.0],[82.6,50.8],[83.4,51.1],[84.3,50.3],[85.2,49.8],[86.0,49.4],[87.3,49.1],[86.8,48.6],[85.6,48.0],[85.5,47.2],[83.0,47.2],[82.3,45.6],[80.0,45.0],[80.5,43.9],[80.2,42.9],[78.6,42.9],[77.0,42.9],[75.6,42.8],[74.2,43.2],[73.5,42.5],[71.8,42.8],[70.9,42.2],[70.0,41.5],[68.7,40.6],[68.3,41.2],[66.6,41.2],[66.0,42.0],[66.0,43.0],[64.5,43.6],[62.0,43.5],[61.0,44.3],[58.6,45.5],[56.0,45.0],[56.0,41.3],[55.4,41.3],[54.2,42.3],[53.0,42.1],[52.5,41.8],[52.8,42.7],[51.3,43.2],[51.0,44.0],[50.3,44.6],[51.3,45.0],[52.9,45.3],[53.2,46.2],[52.0,46.8],[51.0,47.0],[49.2,46.3],[48.6,46.6],[48.0,47.3],[47.2,47.7],[46.5,48.4]];
const CASPIAN = [[45.5,47.2],[46.5,46.0],[47.5,45.2],[49.2,46.3],[51.0,47.0],[52.0,46.8],[53.2,46.2],[52.9,45.3],[51.3,45.0],[50.3,44.6],[51.0,44.0],[51.3,43.2],[52.8,42.7],[52.5,41.8],[52.0,40.6],[50.0,40.2],[49.0,41.4],[47.5,42.8],[46.2,43.9],[45.5,45.5]];
const BALKHASH = [[73.6,46.4],[75.5,46.6],[77.5,46.9],[79.0,46.8],[79.1,46.4],[77.5,46.35],[75.5,45.95],[73.8,45.85]];
const proj = ([lon, lat]) => [10 + (lon - 45.5) * (460 / 42), 8 + (55.8 - lat) * (244 / 15.5)];
const pts = (arr) => arr.map((p) => proj(p).map((v) => v.toFixed(1)).join(',')).join(' ');
function mapSVG(points) {
  let s = '<svg viewBox="0 0 480 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Қазақстан картасы">';
  s += '<rect width="480" height="260" fill="#18243A"/>';
  s += '<polygon points="' + pts(CASPIAN) + '" fill="#2C6E91"/>';
  s += '<polygon points="' + pts(KZ) + '" fill="#C9A35A" stroke="#8A5A00" stroke-width="2"/>';
  const [ax, ay] = proj([60.0, 45.3]); s += '<ellipse cx="' + ax.toFixed(1) + '" cy="' + ay.toFixed(1) + '" rx="12" ry="12" fill="#2C6E91"/>';
  s += '<polygon points="' + pts(BALKHASH) + '" fill="#2C6E91"/>';
  ['A', 'B', 'C', 'D'].forEach((L, i) => { const p = points[i]; if (!p) return; const [x, y] = proj(p);
    s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="11" fill="#101826" stroke="#E8B84A" stroke-width="3"/>';
    s += '<text x="' + x.toFixed(1) + '" y="' + (y + 5).toFixed(1) + '" text-anchor="middle" font-size="14" font-weight="700" fill="#F3EEE4" font-family="Arial">' + L + '</text>'; });
  return s + '</svg>';
}
function artSVG(id) { return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Артефакт">' + (ART[id] || ART.golden_man) + '</svg>'; }

window.TR_TRACKS = { TRACKS, DECOR, VEHICLE, RIVAL_COLORS, setCtx, drawVehicle, drawRival, drawArtifact, mapSVG, artSVG };
})();
