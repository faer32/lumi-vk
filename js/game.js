/* Игровая логика и отрисовка мира: герой, враги, волны, оружие, предметы, эффекты. */
(function () {
  'use strict';
  var G = window.G, A = G.art, TAU = Math.PI * 2, PI = Math.PI;
  var game = G.game = { cb: {} };

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------- Данные ---------- */
  var HEROES = G.HEROES = {
    lumi: { hp: 100, spd: 185, w: { bubble: 2 }, price: 0, glow: 'cyan' },
    bronya: { hp: 150, spd: 165, w: { bubble: 1, orbs: 1 }, price: 300, glow: 'orange' },
    iskra: { hp: 75, spd: 212, w: { bubble: 1, chain: 1 }, price: 800, glow: 'yellow' }
  };
  G.HERO_ORDER = ['lumi', 'bronya', 'iskra'];

  var UP = G.UPGRADES = [
    { id: 'bubble', k: 'w', max: 8 }, { id: 'orbs', k: 'w', max: 6 }, { id: 'nova', k: 'w', max: 6 },
    { id: 'chain', k: 'w', max: 6 }, { id: 'star', k: 'w', max: 6 }, { id: 'beam', k: 'w', max: 6 },
    { id: 'might', k: 'p', max: 5 }, { id: 'haste', k: 'p', max: 5 }, { id: 'swift', k: 'p', max: 5 },
    { id: 'vital', k: 'p', max: 5 }, { id: 'regen', k: 'p', max: 5 }, { id: 'magnet', k: 'p', max: 4 },
    { id: 'crit', k: 'p', max: 5 }, { id: 'armor', k: 'p', max: 5 }, { id: 'greed', k: 'p', max: 3 }
  ];
  G.META = [
    { id: 'hp', icon: 'vital' }, { id: 'dmg', icon: 'might' }, { id: 'spd', icon: 'swift' },
    { id: 'mag', icon: 'magnet' }, { id: 'greed', icon: 'greed' }, { id: 'xp', icon: 'xp' }
  ];
  G.META_COST = [30, 60, 110, 180, 270];

  var E = {
    blot: { hp: 18, spd: 86, dmg: 8, r: 15, xp: 2, cost: 1, ai: 'chase', from: 1, wt: 10, col: 'violet' },
    dart: { hp: 10, spd: 150, dmg: 6, r: 11, xp: 2, cost: 1.4, ai: 'zig', from: 2, wt: 6, rot: 1, col: 'pink' },
    swarm: { hp: 5, spd: 118, dmg: 4, r: 8, xp: 1, cost: 0.45, ai: 'chase', from: 3, wt: 4, rot: 1, group: 6, col: 'violet' },
    bulk: { hp: 95, spd: 58, dmg: 16, r: 27, xp: 8, cost: 4, ai: 'chase', from: 4, wt: 3, col: 'red' },
    spitter: { hp: 34, spd: 68, dmg: 8, r: 16, xp: 6, cost: 3, ai: 'spit', from: 6, wt: 3, col: 'green' },
    splitter: { hp: 46, spd: 78, dmg: 10, r: 20, xp: 5, cost: 3, ai: 'chase', from: 7, wt: 3, split: 1, col: 'lime' },
    mini: { hp: 12, spd: 112, dmg: 5, r: 10, xp: 1, cost: 0, ai: 'chase', col: 'lime' },
    puffer: { hp: 26, spd: 116, dmg: 6, r: 15, xp: 5, cost: 2.4, ai: 'puff', from: 8, wt: 3, col: 'orange' },
    phantom: { hp: 44, spd: 94, dmg: 12, r: 16, xp: 7, cost: 3.4, ai: 'phase', from: 11, wt: 3, col: 'blue' },
    boss0: { hp: 520, spd: 72, dmg: 18, r: 56, xp: 60, ai: 'boss', boss: 1, attacks: ['ring', 'charge'], cd: 3.0, col: 'violet' },
    boss1: { hp: 700, spd: 66, dmg: 18, r: 60, xp: 90, ai: 'boss', boss: 1, attacks: ['summon', 'spiral', 'ring'], cd: 2.8, col: 'pink' },
    boss2: { hp: 900, spd: 80, dmg: 20, r: 58, xp: 120, ai: 'boss', boss: 1, attacks: ['charge', 'burst', 'ring'], cd: 2.5, col: 'orange' },
    boss3: { hp: 1200, spd: 74, dmg: 22, r: 68, xp: 160, ai: 'boss', boss: 1, attacks: ['spiral', 'summon', 'burst', 'charge', 'ring'], cd: 2.3, col: 'red' }
  };
  var ARENA = 780;   // радиус арены: за её границей — тьма, откуда приходят кляксы
  var SPAWN_TYPES = ['blot', 'dart', 'swarm', 'bulk', 'spitter', 'splitter', 'puffer', 'phantom'];

  function hpMul(w) { return 1 + 0.15 * (w - 1) + 0.011 * (w - 1) * (w - 1); }
  function dmgMul(w) { return 1 + 0.06 * (w - 1); }
  function spdMul(w) { return Math.min(1.35, 1 + 0.014 * (w - 1)); }
  function xpNeed(l) { return Math.round(10 + 9 * l + 0.42 * l * l); }
  function zoneOf(n) { return Math.floor((n - 1) / 5) % 4; }
  game.zoneOf = zoneOf;

  /* ---------- Состояние ---------- */
  var canvas, c, W = 800, H = 600, dpr = 1, scale = 1, S = 1, OX = 0, OY = 0;
  var pxBudget = 2.6e6, low = false, slowT = 0, fpsEma = 1 / 60;
  var time = 0, cam = { x: 0, y: 0, shake: 0, ox: 0, oy: 0 }, hurtFlash = 0, fade = 0;
  var P = null, run = null, wave = null, biome = null, biomeIdx = -1;
  var enemies = [], shots = [], ebullets = [], pickups = [], parts = [], texts = [], rings = [], bolts = [];
  var eid = 0, pendingLv = 0, plankton = [];
  var floorPat = null, causticPat = null, shaftGrad = null;
  var vx0 = 0, vy0 = 0, vx1 = 0, vy1 = 0;

  /* ---------- Пространственная сетка ---------- */
  var CELL = 80, MAXR = 76, grid = new Map(), used = [];
  function key(cx, cy) { return (cx + 32768) * 65536 + (cy + 32768); }
  function buildGrid() {
    var i, e, k, cell;
    for (i = 0; i < used.length; i++) used[i].length = 0;
    used.length = 0;
    if (grid.size > 6000) grid.clear();
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i]; if (e.dead) continue;
      k = key(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
      cell = grid.get(k);
      if (!cell) { cell = []; grid.set(k, cell); }
      if (cell.length === 0) used.push(cell);
      cell.push(e);
    }
  }
  function query(x, y, r, fn) {
    var R = r + MAXR, cx0 = Math.floor((x - R) / CELL), cx1 = Math.floor((x + R) / CELL);
    var cy0 = Math.floor((y - R) / CELL), cy1 = Math.floor((y + R) / CELL), cx, cy, cell, j, e, dx, dy, rr;
    for (cy = cy0; cy <= cy1; cy++) for (cx = cx0; cx <= cx1; cx++) {
      cell = grid.get(key(cx, cy)); if (!cell) continue;
      for (j = 0; j < cell.length; j++) {
        e = cell[j]; if (e.dead) continue;
        dx = e.x - x; dy = e.y - y; rr = r + e.r;
        if (dx * dx + dy * dy < rr * rr) fn(e);
      }
    }
  }
  var sepX = 0, sepY = 0;
  function separate(e) {
    var cx0 = Math.floor((e.x - 44) / CELL), cx1 = Math.floor((e.x + 44) / CELL);
    var cy0 = Math.floor((e.y - 44) / CELL), cy1 = Math.floor((e.y + 44) / CELL), cx, cy, cell, j, o, ax, ay, dd, rr, ov;
    sepX = sepY = 0;
    for (cy = cy0; cy <= cy1; cy++) for (cx = cx0; cx <= cx1; cx++) {
      cell = grid.get(key(cx, cy)); if (!cell) continue;
      for (j = 0; j < cell.length; j++) {
        o = cell[j]; if (o === e || o.boss || o.dead) continue;
        ax = e.x - o.x; ay = e.y - o.y; dd = ax * ax + ay * ay; rr = (e.r + o.r) * 0.85;
        if (dd < rr * rr) { dd = Math.sqrt(dd) || 0.01; ov = rr - dd; sepX += ax / dd * ov * 6; sepY += ay / dd * ov * 6; }
      }
    }
  }
  function nearest(x, y, maxD, skip) {
    var best = null, bd = maxD * maxD, i, e, dx, dy, d2;
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i];
      if (e.dead || e.inv || (skip && skip.indexOf(e) >= 0)) continue;
      dx = e.x - x; dy = e.y - y; d2 = dx * dx + dy * dy;
      if (d2 < bd) { bd = d2; best = e; }
    }
    return best;
  }

  /* ---------- Инициализация и размер ---------- */
  game.init = function (cnv) {
    canvas = cnv; c = canvas.getContext('2d', { alpha: false });
    for (var i = 0; i < 40; i++) plankton.push({ x: Math.random(), y: Math.random(), z: rnd(0.35, 1), r: rnd(0.8, 2.2) });
    causticPat = c.createPattern(A.caustics, 'repeat');
    game.resize();
  };
  game.resize = function () {
    var w = window.innerWidth, h = window.innerHeight;
    if (!w || !h || !canvas) return;
    W = w; H = h;
    var d = Math.min(window.devicePixelRatio || 1, 2);
    d = Math.max(0.6, Math.min(d, Math.sqrt(pxBudget / (W * H))));
    dpr = d;
    canvas.width = Math.round(W * d); canvas.height = Math.round(H * d);
    scale = clamp(Math.sqrt(W * H) / 720, 0.55, 2.3);
    shaftGrad = c.createLinearGradient(0, 0, 0, H * 0.85);
    shaftGrad.addColorStop(0, 'rgba(200,245,255,1)'); shaftGrad.addColorStop(1, 'rgba(200,245,255,0)');
  };
  /* Адаптивное качество: если кадры идут медленно — снижаем разрешение и число эффектов. */
  game.perf = function (dt) {
    fpsEma += (dt - fpsEma) * 0.05;
    if (fpsEma > 1 / 40) slowT += dt; else slowT = Math.max(0, slowT - dt);
    if (slowT > 3 && pxBudget > 0.8e6) {
      slowT = 0; fpsEma = 1 / 60;
      pxBudget = pxBudget > 1.6e6 ? 1.5e6 : 0.75e6;
      low = true; game.resize();
    }
  };
  function setBiome(i) {
    biomeIdx = i; biome = A.biome(i);
    floorPat = c.createPattern(biome.tile, 'repeat');
    fade = 1;
  }

  /* ---------- Забег ---------- */
  function recalc() {
    var m = G.save.meta, p = P.p, h = HEROES[P.hero];
    P.dmgMul = (1 + 0.15 * p.might) * (1 + 0.06 * m.dmg);
    P.cdMul = 1 / (1 + 0.12 * p.haste);
    P.speed = h.spd * (1 + 0.08 * p.swift) * (1 + 0.04 * m.spd);
    P.maxHp = h.hp + 25 * p.vital + 10 * m.hp;
    P.regen = 0.6 * p.regen;
    P.magnet = 74 * (1 + 0.35 * p.magnet) * (1 + 0.12 * m.mag);
    P.crit = 0.08 * p.crit;
    P.armor = Math.pow(0.92, p.armor);
    P.greed = (1 + 0.2 * p.greed) * (1 + 0.1 * m.greed);
    P.xpMul = 1 + 0.06 * m.xp;
  }
  game.newRun = function (heroId) {
    var h = HEROES[heroId] ? heroId : 'lumi', i, k;
    enemies.length = shots.length = ebullets.length = pickups.length = parts.length = texts.length = rings.length = bolts.length = 0;
    pendingLv = 0; hurtFlash = 0; cam.x = cam.y = cam.shake = cam.ox = cam.oy = 0;
    P = {
      hero: h, x: 0, y: 0, r: 13, face: 1, mv: 0, tx: 0, ty: 1, inv: 1, dashT: 0, dashCd: 0, ddx: 1, ddy: 0,
      level: 1, xp: 0, need: xpNeed(1), w: {}, p: {}, t: { bubble: 0.5, nova: 2, chain: 1, star: 1.5, beam: 0 },
      orbA: 0, beamA: 0, hp: 1, maxHp: 1
    };
    for (i = 0; i < UP.length; i++) (UP[i].k === 'w' ? P.w : P.p)[UP[i].id] = 0;
    for (k in HEROES[h].w) P.w[k] = HEROES[h].w[k];
    recalc(); P.hp = P.maxHp;
    run = { time: 0, kills: 0, pearls: 0, revived: false, endless: false, over: false };
    wave = { n: 0, budget: 0, total: 1, credit: 0, rate: 0, t: 0, grace: 0, inter: 1.4, state: 'inter', boss: null, pool: [], sent: false };
    setBiome(0);
    game.P = P; game.run = run; game.wave = wave;
  };
  /* Фон главного меню: герой неспешно плавает по рифу. */
  game.menuScene = function (heroId) {
    game.newRun(heroId);
    wave.state = 'menu'; P.inv = 0; fade = 0;
  };
  game.menuUpdate = function (dt) {
    time += dt;
    var px = P.x, py = P.y;
    P.x = Math.sin(time * 0.33) * 130; P.y = Math.sin(time * 0.52) * 55;
    trail((P.x - px) / dt, (P.y - py) / dt, dt);
    var land = W > H;
    cam.ox = land ? -W * 0.23 / scale : 0; cam.oy = land ? 0 : -H * 0.3 / scale;
    cam.x = P.x * 0.5; cam.y = P.y * 0.5;
    ambient(dt); updateFx(dt);
  };
  function trail(vx, vy, dt) {
    var sp = Math.sqrt(vx * vx + vy * vy), k = Math.min(1, dt * 8), tx, ty;
    if (sp > 12) { tx = -vx / sp; ty = -vy / sp * 0.8 + 0.35; P.face = vx > 4 ? 1 : vx < -4 ? -1 : P.face; P.mv = 1; }
    else { tx = 0; ty = 1; P.mv = 0; }
    P.tx += (tx - P.tx) * k; P.ty += (ty - P.ty) * k;
  }

  /* ---------- Волны ---------- */
  function ringPos(extra) {
    var hw = W / 2 / scale + 60 + (extra || 0), hh = H / 2 / scale + 60 + (extra || 0);
    var a = Math.random() * TAU, ca = Math.cos(a), sa = Math.sin(a);
    var k = Math.min(hw / Math.abs(ca || 1e-6), hh / Math.abs(sa || 1e-6));
    return { x: P.x + ca * k, y: P.y + sa * k };
  }
  /* Точка появления врага: за краем экрана, но не дальше кромки тьмы вокруг арены. */
  function spawnPos(extra) {
    var p, d, lim = ARENA + 170, i, dx, dy;
    for (i = 0; i < 6; i++) {
      p = ringPos(extra); d = Math.sqrt(p.x * p.x + p.y * p.y);
      if (d <= lim) return p;
      p.x *= lim / d; p.y *= lim / d; dx = p.x - P.x; dy = p.y - P.y;
      if (dx * dx + dy * dy > 330 * 330) return p;
    }
    return p;
  }
  function spawnEnemy(type, x, y, elite) {
    var d = E[type], w = Math.max(1, wave.n);
    var e = {
      type: type, d: d, x: x, y: y, kx: 0, ky: 0, id: ++eid,
      r: d.r * (elite ? 1.35 : 1), hp: d.hp * hpMul(w) * (elite ? 4 : 1), maxHp: 0,
      spd: d.spd * spdMul(w) * rnd(0.92, 1.08), dmg: d.dmg * dmgMul(w) * (elite ? 1.4 : 1),
      hit: 0, ph: Math.random() * TAU, st: 0, tm: rnd(0.6, 2.2), elite: !!elite, boss: !!d.boss, dead: false,
      orbT: 0, alpha: 1, face: 1, ang: 0, inv: false,
      ai: 0, at: 0, atk: '', sub: 0, sa: 0, tele: 0, bvx: 0, bvy: 0, zone: zoneOf(w)
    };
    e.maxHp = e.hp;
    enemies.push(e);
    return e;
  }
  function spawnFromPool() {
    var total = 0, i, r, type = 'blot', d, pos, cost, elite, n;
    for (i = 0; i < wave.pool.length; i++) total += E[wave.pool[i]].wt;
    r = Math.random() * total;
    for (i = 0; i < wave.pool.length; i++) { r -= E[wave.pool[i]].wt; if (r <= 0) { type = wave.pool[i]; break; } }
    d = E[type]; pos = spawnPos(0);
    if (d.group) {
      n = d.group;
      for (i = 0; i < n; i++) spawnEnemy(type, pos.x + rnd(-45, 45), pos.y + rnd(-45, 45));
      return d.cost * n;
    }
    elite = wave.n >= 9 && Math.random() < Math.min(0.12, 0.04 + 0.006 * (wave.n - 9));
    spawnEnemy(type, pos.x, pos.y, elite);
    cost = d.cost * (elite ? 3 : 1);
    return cost;
  }
  function startWave(n) {
    var i, isBoss = n % 5 === 0, zi = zoneOf(n), first = false, bi = -1, pos;
    wave.n = n; wave.state = 'active'; wave.t = 0; wave.credit = 2; wave.sent = false; wave.grace = 0;
    if (zi !== biomeIdx) { setBiome(zi); first = true; }
    if (n === 1) first = true;
    wave.budget = (12 + n * 7 + Math.pow(n, 1.5) * 1.8) * (isBoss ? 0.55 : 1);
    wave.total = wave.budget;
    wave.rate = wave.budget / Math.min(46, 22 + n * 1.2);
    wave.pool = [];
    for (i = 0; i < SPAWN_TYPES.length; i++) if (E[SPAWN_TYPES[i]].from <= n) wave.pool.push(SPAWN_TYPES[i]);
    wave.boss = null;
    if (isBoss) {
      bi = (n / 5 - 1) % 4; pos = spawnPos(40);
      wave.boss = spawnEnemy('boss' + bi, pos.x, pos.y);
      wave.boss.tm = 2.5;
      G.audio.sfx('boss');
    }
    G.audio.intensity(isBoss ? 1 : 0);
    if (game.cb.waveStart) game.cb.waveStart(n, bi, first ? zi : -1);
  }
  /* Волна завершена. clean — все враги рассеяны (иначе следующая волна накладывается на остатки). */
  function waveClear(clean) {
    var i, n = wave.n, bonus = Math.round((3 + n * 1.5) * P.greed);
    run.pearls += bonus;
    if (clean) {
      P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.12);
      for (i = 0; i < pickups.length; i++) pickups[i].at = true;
      ebullets.length = 0;
    }
    G.audio.sfx('wave'); G.audio.intensity(0);
    if (n % 5 === 0) { wave.state = 'hold'; wave.inter = 2.4; }
    else { wave.state = 'inter'; wave.inter = clean ? 3 : 1.5; }
    if (game.cb.waveClear) game.cb.waveClear(n, bonus, clean);
  }
  function updateWave(dt) {
    if (wave.state === 'inter') { wave.inter -= dt; if (wave.inter <= 0) startWave(wave.n + 1); return; }
    if (wave.state === 'hold') {
      wave.inter -= dt;
      if (wave.inter <= 0 && !wave.sent) {
        wave.sent = true;
        if (wave.n === 20 && !run.endless) { if (game.cb.victory) game.cb.victory(); }
        else if (game.cb.zoneClear) game.cb.zoneClear(zoneOf(wave.n), zoneOf(wave.n + 1));
      }
      return;
    }
    if (wave.state !== 'active') return;
    wave.t += dt;
    if (wave.budget > 0) {
      var cap = low ? 150 : 230, guard = 0, cost;
      wave.credit += wave.rate * dt * (enemies.length < 5 && wave.t > 2 ? 3 : 1);
      while (wave.credit > 0 && wave.budget > 0 && enemies.length < cap && guard++ < 10) {
        cost = spawnFromPool(); wave.credit -= cost; wave.budget -= cost;
      }
    } else if (enemies.length === 0) waveClear(true);
    else if (!wave.boss) { wave.grace += dt; if (wave.grace > 12) waveClear(false); }
  }
  /* Продолжить после экрана «Зона пройдена» / победы. */
  game.nextWave = function (endless) {
    if (endless) run.endless = true;
    wave.state = 'inter'; wave.inter = 1.2;
  };
  game.waveProgress = function () { return wave.total > 0 ? 1 - Math.max(0, wave.budget) / wave.total : 1; };

  /* ---------- Урон, смерть, добыча ---------- */
  function addText(x, y, s, col, size) {
    if (texts.length < 46) texts.push({ x: x, y: y, s: String(s), col: col, size: size, life: 0.7 });
  }
  function part(x, y, vx, vy, life, size, spr, k) {
    if (parts.length >= (low ? 220 : 520)) return;
    parts.push({ x: x, y: y, vx: vx, vy: vy, life: life, max: life, size: size, spr: spr, k: k || 0 });
  }
  function ring(x, y, r0, r1, life, col, w) { rings.push({ x: x, y: y, r0: r0, r1: r1, life: life, max: life, col: col, w: w || 4 }); }
  function splash(x, y, r, col) {
    var n = Math.min(12, 4 + r / 3 | 0), i, a, sp;
    for (i = 0; i < n; i++) { a = Math.random() * TAU; sp = rnd(30, 150); part(x, y, Math.cos(a) * sp, Math.sin(a) * sp, rnd(0.35, 0.7), r * rnd(0.18, 0.4), null, 1); }
    for (i = 0; i < 4; i++) { a = Math.random() * TAU; sp = rnd(60, 190); part(x, y, Math.cos(a) * sp, Math.sin(a) * sp, rnd(0.25, 0.5), rnd(5, 9), A.glow[col], 0); }
  }
  function drop(k, x, y, val) {
    if (k === 'xp' && pickups.length > 340) {
      for (var i = 0; i < pickups.length; i++) if (pickups[i].k === 'xp') { pickups[i].val += val; return; }
    }
    var a = Math.random() * TAU, sp = rnd(20, 90), d = Math.sqrt(x * x + y * y);
    if (d > ARENA - 30) { x *= (ARENA - 30) / d; y *= (ARENA - 30) / d; }
    pickups.push({ k: k, x: x, y: y, val: val, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, at: false, sp: 140, ph: Math.random() * TAU });
  }
  function loot(e) {
    var d = e.d, i;
    drop('xp', e.x, e.y, d.xp * (e.elite ? 5 : 1));
    if (e.boss) { for (i = 0; i < 12; i++) drop('pearl', e.x + rnd(-30, 30), e.y + rnd(-30, 30), 2); drop('heart', e.x, e.y, 1); }
    else if (e.elite) { drop('pearl', e.x, e.y, 5); if (Math.random() < 0.3) drop('heart', e.x, e.y, 1); if (Math.random() < 0.12) drop('magnet', e.x, e.y, 1); }
    else {
      if (Math.random() < 0.06) drop('pearl', e.x, e.y, 1);
      if (Math.random() < 0.011) drop('heart', e.x, e.y, 1);
      else if (Math.random() < 0.004) drop('magnet', e.x, e.y, 1);
    }
  }
  function kill(e) {
    var i, o, a;
    if (e.dead) return;
    e.dead = true; run.kills++;
    splash(e.x, e.y, e.r, e.d.col);
    loot(e);
    if (e.d.split) for (i = 0; i < 3; i++) { a = i * TAU / 3 + Math.random(); o = spawnEnemy('mini', e.x + Math.cos(a) * 10, e.y + Math.sin(a) * 10); o.kx = Math.cos(a) * 220; o.ky = Math.sin(a) * 220; }
    if (e.boss) {
      G.audio.sfx('bigboom'); cam.shake = 16;
      ring(e.x, e.y, 20, 420, 0.8, '255,255,255', 10); ring(e.x, e.y, 10, 260, 0.6, '185,140,255', 8);
      for (i = 0; i < 26; i++) { a = Math.random() * TAU; part(e.x, e.y, Math.cos(a) * rnd(80, 320), Math.sin(a) * rnd(80, 320), rnd(0.5, 1.1), rnd(8, 18), null, 1); }
      wave.boss = null; wave.budget = 0;
      for (i = 0; i < enemies.length; i++) if (!enemies[i].dead && !enemies[i].boss) kill(enemies[i]);
    } else G.audio.sfx('pop');
  }
  function hurt(e, dmg, kx, ky, quiet) {
    if (e.dead || e.inv) return;
    var crit = Math.random() < P.crit, k;
    dmg *= P.dmgMul * (crit ? 2 : 1);
    e.hp -= dmg; e.hit = 0.12;
    if (kx || ky) { k = e.boss ? 0.06 : e.d.r > 22 ? 0.4 : 1; e.kx += kx * k; e.ky += ky * k; }
    if (!quiet || crit || Math.random() < 0.3) addText(e.x + rnd(-8, 8), e.y - e.r - 2, Math.round(dmg), crit ? '#ffe066' : '#ffffff', crit ? 17 : 12);
    if (e.hp <= 0) kill(e);
  }
  function hurtPlayer(d) {
    if (P.inv > 0 || P.dashT > 0 || run.over) return;
    d *= P.armor; P.hp -= d; P.inv = 0.7; hurtFlash = 0.35; cam.shake = Math.max(cam.shake, 7);
    G.audio.sfx('hurt');
    addText(P.x, P.y - 24, '-' + Math.round(d), '#ff6b7a', 16);
    if (P.hp <= 0) {
      P.hp = 0; run.over = true;
      splash(P.x, P.y, 20, HEROES[P.hero].glow);
      ring(P.x, P.y, 10, 160, 0.6, '160,235,255', 6);
      if (game.cb.death) game.cb.death();
    }
  }
  game.revive = function () {
    var i, e, dx, dy, d;
    run.over = false; run.revived = true;
    P.hp = P.maxHp * 0.6; P.inv = 3;
    ebullets.length = 0;
    ring(P.x, P.y, 20, 340, 0.6, '255,255,255', 10);
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i]; if (e.dead) continue;
      dx = e.x - P.x; dy = e.y - P.y; d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d > 340) continue;
      if (e.boss) { e.kx += dx / d * 5000; e.ky += dy / d * 5000; }
      else { e.inv = false; e.hp = 0; kill(e); }
    }
    G.audio.sfx('nova');
  };
  function shootE(x, y, a, spd, dmg, r) {
    if (ebullets.length < 260) ebullets.push({ x: x, y: y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: r, dmg: dmg, life: 5.5 });
  }
  function ringShot(e, n, off) { for (var i = 0; i < n; i++) shootE(e.x, e.y, off + i * TAU / n, 140, e.dmg * 0.6, 6); G.audio.sfx('zap'); }

  /* ---------- Улучшения ---------- */
  game.rollChoices = function () {
    var pool = [], out = [], i, u, lv, wc = 0, total, r, j;
    for (i = 0; i < UP.length; i++) if (UP[i].k === 'w' && P.w[UP[i].id] > 0) wc++;
    for (i = 0; i < UP.length; i++) {
      u = UP[i]; lv = u.k === 'w' ? P.w[u.id] : P.p[u.id];
      if (lv >= u.max || (u.k === 'w' && lv === 0 && wc >= 4)) continue;
      pool.push({ id: u.id, k: u.k, lv: lv, max: u.max, wt: u.k === 'w' ? (lv > 0 ? 3 : 2.2) : (lv > 0 ? 2 : 1.6) });
    }
    while (out.length < 3 && pool.length) {
      total = 0; for (j = 0; j < pool.length; j++) total += pool[j].wt;
      r = Math.random() * total;
      for (j = 0; j < pool.length; j++) { r -= pool[j].wt; if (r <= 0) break; }
      j = Math.min(j, pool.length - 1);
      out.push(pool[j]); pool.splice(j, 1);
    }
    return out;
  };
  game.applyUpgrade = function (id) {
    if (P.w[id] !== undefined) P.w[id]++; else if (P.p[id] !== undefined) P.p[id]++;
    recalc();
    if (id === 'vital') P.hp = Math.min(P.maxHp, P.hp + 25);
    ring(P.x, P.y, 10, 90, 0.4, '255,240,150', 5);
  };
  function gainXp(v) {
    P.xp += v * P.xpMul;
    while (P.xp >= P.need) { P.xp -= P.need; P.level++; P.need = xpNeed(P.level); pendingLv++; }
  }

  /* ---------- Обновление ---------- */
  function updatePlayer(dt) {
    var inp = G.input, mx = inp.mx, my = inp.my, l = Math.sqrt(mx * mx + my * my), vx, vy, a;
    if (l > 1) { mx /= l; my /= l; }
    if (inp.dash) {
      inp.dash = false;
      if (P.dashCd <= 0 && P.dashT <= 0) {
        if (l > 0.1) { P.ddx = mx / (l > 1 ? 1 : l); P.ddy = my / (l > 1 ? 1 : l); } else { P.ddx = P.face; P.ddy = 0; }
        P.dashT = 0.2; P.dashCd = 2.4; P.inv = Math.max(P.inv, 0.35);
        G.audio.sfx('dash');
      }
    }
    if (P.dashT > 0) {
      P.dashT -= dt; vx = P.ddx * P.speed * 3.8; vy = P.ddy * P.speed * 3.8;
      part(P.x + rnd(-6, 6), P.y + rnd(-6, 6), -vx * 0.1, -vy * 0.1, 0.35, rnd(10, 16), A.glow[HEROES[P.hero].glow], 0);
    } else { vx = mx * P.speed; vy = my * P.speed; }
    P.x += vx * dt; P.y += vy * dt;
    a = Math.sqrt(P.x * P.x + P.y * P.y);
    if (a > ARENA - P.r) { P.x *= (ARENA - P.r) / a; P.y *= (ARENA - P.r) / a; }
    trail(vx, vy, dt);
    if (P.dashCd > 0) P.dashCd -= dt;
    if (P.inv > 0) P.inv -= dt;
    if (P.regen > 0 && P.hp < P.maxHp) P.hp = Math.min(P.maxHp, P.hp + P.regen * dt);
    if (P.mv && Math.random() < dt * 5) { a = Math.random() * TAU; part(P.x + P.tx * 12, P.y + 8, Math.cos(a) * 10, -rnd(15, 35), rnd(0.5, 0.9), rnd(1.5, 3), null, 2); }
    cam.x += (P.x - cam.x) * Math.min(1, dt * 9); cam.y += (P.y - cam.y) * Math.min(1, dt * 9);
  }
  game.dashFrac = function () { return P ? clamp(1 - P.dashCd / 2.4, 0, 1) : 1; };

  function bossAI(e, dt, dist, nx, ny) {
    var d = e.d, t0, t1, rage = e.hp < e.maxHp * 0.5, dur = 1, k, j, n, a;
    e.bvx = e.bvy = 0;
    if (e.st === 0) {
      if (dist > 110) { e.bvx = nx * e.spd; e.bvy = ny * e.spd; }
      e.tm -= dt;
      if (e.tm <= 0) { e.atk = d.attacks[e.ai++ % d.attacks.length]; e.st = 1; e.at = 0; e.sub = 0; e.sa = Math.atan2(ny, nx); }
      return;
    }
    t0 = e.at; e.at += dt; t1 = e.at;
    switch (e.atk) {
      case 'ring':
        dur = rage ? 1.2 : 0.7; n = 14 + e.zone * 2;
        if (t0 === 0) ringShot(e, n, e.ph);
        if (rage && t0 < 0.5 && t1 >= 0.5) ringShot(e, n, e.ph + PI / n);
        break;
      case 'spiral':
        dur = 2.4; e.sub -= dt;
        while (e.sub <= 0) {
          e.sub += rage ? 0.075 : 0.105; e.sa += 0.42;
          shootE(e.x, e.y, e.sa, 150, e.dmg * 0.6, 6); shootE(e.x, e.y, e.sa + PI, 150, e.dmg * 0.6, 6);
        }
        break;
      case 'burst':
        dur = 1.5;
        for (k = 0; k < 3; k++) if (t0 <= k * 0.45 && t1 > k * 0.45) {
          a = Math.atan2(P.y - e.y, P.x - e.x); n = rage ? 7 : 5;
          for (j = 0; j < n; j++) shootE(e.x, e.y, a + (j - (n - 1) / 2) * 0.2, 210, e.dmg * 0.6, 6);
          G.audio.sfx('zap');
        }
        break;
      case 'charge':
        dur = 1.45;
        if (t1 < 0.7) { e.sa = Math.atan2(P.y - e.y, P.x - e.x); e.tele = 1; }
        else if (t1 < 1.3) {
          e.tele = 0; e.bvx = Math.cos(e.sa) * 540; e.bvy = Math.sin(e.sa) * 540;
          part(e.x + rnd(-30, 30), e.y + rnd(-30, 30), 0, 0, 0.5, rnd(8, 16), null, 1);
        }
        break;
      case 'summon':
        dur = 0.9;
        if (t0 === 0) {
          n = 5 + e.zone * 2;
          for (j = 0; j < n; j++) { a = j * TAU / n; spawnEnemy(e.zone >= 2 ? 'dart' : 'swarm', e.x + Math.cos(a) * (e.r + 24), e.y + Math.sin(a) * (e.r + 24)); }
          ring(e.x, e.y, e.r, e.r + 90, 0.5, '255,122,200', 5); G.audio.sfx('nova');
        }
        break;
    }
    if (e.at >= dur) { e.st = 0; e.tele = 0; e.tm = d.cd * (rage ? 0.6 : 1); }
  }

  function puffBoom(e) {
    var dx = P.x - e.x, dy = P.y - e.y, i, a;
    ring(e.x, e.y, 14, 105, 0.35, '255,166,77', 7);
    for (i = 0; i < 10; i++) { a = Math.random() * TAU; part(e.x, e.y, Math.cos(a) * rnd(80, 240), Math.sin(a) * rnd(80, 240), rnd(0.3, 0.6), rnd(6, 12), A.glow.orange, 0); }
    G.audio.sfx('boom'); cam.shake = Math.max(cam.shake, 5);
    if (dx * dx + dy * dy < 112 * 112) hurtPlayer(22 * dmgMul(wave.n));
    e.dead = true; run.kills++; loot(e);
  }

  function updateEnemies(dt) {
    var i, e, d, dx, dy, dist, nx, ny, vx, vy, sp, z, want, kd, pos;
    var far = Math.max(W, H) / scale * 0.5 + 520;
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i]; if (e.dead) continue;
      d = e.d; dx = P.x - e.x; dy = P.y - e.y; dist = Math.sqrt(dx * dx + dy * dy) || 1; nx = dx / dist; ny = dy / dist;
      if (e.hit > 0) e.hit -= dt;
      if (e.orbT > 0) e.orbT -= dt;
      if (dist > far) { pos = spawnPos(30); e.x = pos.x; e.y = pos.y; continue; }
      sp = e.spd; vx = nx * sp; vy = ny * sp;
      switch (d.ai) {
        case 'zig':
          z = Math.sin(time * 5 + e.ph) * 0.8; vx = (nx - ny * z) * sp; vy = (ny + nx * z) * sp; break;
        case 'spit':
          want = dist > 300 ? 1 : dist < 200 ? -1 : 0; z = e.ph > PI ? 0.55 : -0.55;
          vx = (nx * want - ny * z) * sp; vy = (ny * want + nx * z) * sp;
          e.tm -= dt;
          if (e.tm <= 0 && dist < 560) { e.tm = 2.6; shootE(e.x, e.y, Math.atan2(ny, nx), 170, e.dmg + 2, 6); }
          break;
        case 'puff':
          if (e.st === 0) { if (dist < 85) { e.st = 1; e.tm = 0.8; } }
          else { vx = vy = 0; e.tm -= dt; if (e.tm <= 0) { puffBoom(e); continue; } }
          break;
        case 'phase':
          e.tm -= dt;
          if (e.tm <= 0) { e.st = e.st ? 0 : 1; e.tm = e.st ? 1.3 : 2.6; }
          e.inv = e.st === 1; e.alpha += ((e.st ? 0.26 : 1) - e.alpha) * Math.min(1, dt * 8);
          if (e.st) { vx *= 2.1; vy *= 2.1; }
          break;
        case 'boss':
          bossAI(e, dt, dist, nx, ny); vx = e.bvx; vy = e.bvy; break;
      }
      if (e.boss) sepX = sepY = 0; else separate(e);
      kd = Math.max(0, 1 - dt * 7); e.kx *= kd; e.ky *= kd;
      e.x += (vx + sepX + e.kx) * dt; e.y += (vy + sepY + e.ky) * dt;
      if (d.rot) { if (vx || vy) e.ang = Math.atan2(vy, vx); } else if (Math.abs(vx) > 6) e.face = vx > 0 ? 1 : -1;
      if (!e.inv && dist < e.r + P.r - 3) hurtPlayer(e.dmg);
    }
  }

  function updateWeapons(dt) {
    var w = P.w, t = P.t, L, tg, n, i, a, a0, dmg, R, any, e, dx, dy, d2, jumps, cur, seen, pts, lx, ly, len, b, ca, sa, along, perp;
    // Пузырьки — основная атака
    t.bubble -= dt;
    if (t.bubble <= 0) {
      L = w.bubble; tg = nearest(P.x, P.y, 540);
      if (tg && L > 0) {
        t.bubble = 0.52 * Math.pow(0.94, L - 1) * P.cdMul;
        n = 1 + (L >= 3 ? 1 : 0) + (L >= 6 ? 1 : 0); a0 = Math.atan2(tg.y - P.y, tg.x - P.x); dmg = 10 * (1 + 0.18 * (L - 1));
        for (i = 0; i < n; i++) {
          a = a0 + (i - (n - 1) / 2) * 0.16;
          shots.push({ k: 'b', x: P.x + Math.cos(a) * 14, y: P.y + Math.sin(a) * 14, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, r: 7, dmg: dmg, pierce: (L >= 2 ? 1 : 0) + (L >= 5 ? 1 : 0) + (L >= 8 ? 1 : 0), life: 1.1, hits: null });
        }
        G.audio.sfx('shoot');
      } else t.bubble = 0.1;
    }
    // Жемчужный щит
    L = w.orbs;
    if (L > 0) {
      P.orbA += dt * 2.8; n = Math.min(6, L + 1); R = 60 + L * 5; dmg = 7 + 4 * L;
      for (i = 0; i < n; i++) {
        a = P.orbA + i * TAU / n;
        query(P.x + Math.cos(a) * R, P.y + Math.sin(a) * R, 9, orbHit);
      }
    }
    // Световая волна
    L = w.nova;
    if (L > 0) {
      t.nova -= dt;
      if (t.nova <= 0) {
        R = 120 + 22 * L; any = false;
        for (i = 0; i < enemies.length; i++) { e = enemies[i]; dx = e.x - P.x; dy = e.y - P.y; if (!e.dead && dx * dx + dy * dy < (R + 30) * (R + 30)) { any = true; break; } }
        if (any) {
          t.nova = (4.6 - 0.35 * L) * P.cdMul; dmg = 16 + 9 * L;
          ring(P.x, P.y, 12, R, 0.4, '130,230,255', 8);
          for (i = 0; i < enemies.length; i++) {
            e = enemies[i]; if (e.dead) continue;
            dx = e.x - P.x; dy = e.y - P.y; d2 = dx * dx + dy * dy;
            if (d2 < (R + e.r) * (R + e.r)) { d2 = Math.sqrt(d2) || 1; hurt(e, dmg, dx / d2 * 280, dy / d2 * 280); }
          }
          G.audio.sfx('nova');
        } else t.nova = 0.25;
      }
    }
    // Разряд
    L = w.chain;
    if (L > 0) {
      t.chain -= dt;
      if (t.chain <= 0) {
        cur = nearest(P.x, P.y, 430);
        if (cur) {
          t.chain = (2.3 - 0.2 * L) * P.cdMul; jumps = 2 + L; dmg = 13 + 6 * L; seen = []; pts = [P.x, P.y];
          while (cur && jumps-- > 0) {
            seen.push(cur); lx = cur.x; ly = cur.y; pts.push(lx, ly);
            part(lx, ly, 0, 0, 0.25, 16, A.glow.violet, 0);
            hurt(cur, dmg, 0, 0);
            cur = nearest(lx, ly, 190, seen);
          }
          bolts.push({ pts: pts, life: 0.2, seed: Math.random() * 100 });
          G.audio.sfx('zap');
        } else t.chain = 0.2;
      }
    }
    // Морские звёзды
    L = w.star;
    if (L > 0) {
      t.star -= dt;
      if (t.star <= 0) {
        if (nearest(P.x, P.y, 620)) {
          t.star = (2.7 - 0.22 * L) * P.cdMul; n = 1 + (L / 2 | 0);
          for (i = 0; i < n; i++) {
            a = Math.random() * TAU;
            shots.push({ k: 's', x: P.x, y: P.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, r: 9, dmg: 20 + 9 * L, life: 3, tg: null, tt: 0, aoe: 52 + 6 * L, rot: 0 });
          }
        } else t.star = 0.3;
      }
    }
    // Луч маяка
    L = w.beam;
    if (L > 0) {
      P.beamA += dt * (1.9 + 0.1 * L); t.beam -= dt;
      if (t.beam <= 0) {
        t.beam = 0.14; len = beamLen(L); dmg = 9 + 5 * L; n = L >= 4 ? 2 : 1;
        for (b = 0; b < n; b++) {
          ca = Math.cos(P.beamA + b * PI); sa = Math.sin(P.beamA + b * PI);
          for (i = 0; i < enemies.length; i++) {
            e = enemies[i]; if (e.dead || e.inv) continue;
            dx = e.x - P.x; dy = e.y - P.y; along = dx * ca + dy * sa;
            if (along < 0 || along > len + e.r) continue;
            perp = Math.abs(dx * sa - dy * ca);
            if (perp < 16 + e.r) hurt(e, dmg, 0, 0, true);
          }
        }
      }
    }
  }
  function beamLen(L) { return 210 + 28 * L; }
  function orbHit(e) {
    if (e.orbT > 0 || e.inv) return;
    e.orbT = 0.4;
    var dx = e.x - P.x, dy = e.y - P.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
    hurt(e, 7 + 4 * P.w.orbs, dx / d * 160, dy / d * 160, true);
  }

  var hitE = null, curShot = null;
  function shotTest(e) {
    if (hitE || e.inv) return;
    if (curShot.hits && curShot.hits.indexOf(e.id) >= 0) return;
    hitE = e;
  }
  var boomShot = null;
  function boomHit(e) {
    var dx = e.x - boomShot.x, dy = e.y - boomShot.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
    hurt(e, boomShot.dmg, dx / d * 140, dy / d * 140);
  }
  function explode(s) {
    var i, a;
    ring(s.x, s.y, 8, s.aoe, 0.3, '255,170,90', 6);
    for (i = 0; i < 6; i++) { a = Math.random() * TAU; part(s.x, s.y, Math.cos(a) * rnd(60, 180), Math.sin(a) * rnd(60, 180), rnd(0.25, 0.45), rnd(6, 11), A.glow.orange, 0); }
    boomShot = s; query(s.x, s.y, s.aoe, boomHit);
    G.audio.sfx('boom');
  }
  function updateShots(dt) {
    var i, s, dx, dy, d, k;
    for (i = shots.length - 1; i >= 0; i--) {
      s = shots[i]; s.life -= dt;
      if (s.k === 's') {
        s.tt -= dt; s.rot += dt * 9;
        if (s.tt <= 0 || !s.tg || s.tg.dead) { s.tg = nearest(s.x, s.y, 700); s.tt = 0.25; }
        if (s.tg) {
          dx = s.tg.x - s.x; dy = s.tg.y - s.y; d = Math.sqrt(dx * dx + dy * dy) || 1; k = Math.min(1, dt * 5.5);
          s.vx += (dx / d * 400 - s.vx) * k; s.vy += (dy / d * 400 - s.vy) * k;
        }
        if (Math.random() < 0.5) part(s.x, s.y, 0, 0, 0.3, 7, A.glow.orange, 0);
      }
      s.x += s.vx * dt; s.y += s.vy * dt;
      hitE = null; curShot = s; query(s.x, s.y, s.r, shotTest);
      if (hitE) {
        if (s.k === 'b') {
          hurt(hitE, s.dmg, s.vx * 0.14, s.vy * 0.14);
          part(s.x, s.y, 0, 0, 0.2, 12, A.glow.cyan, 0);
          if (s.pierce > 0) { s.pierce--; (s.hits || (s.hits = [])).push(hitE.id); } else s.life = 0;
        } else { explode(s); s.life = 0; }
      } else if (s.life <= 0 && s.k === 's') explode(s);
      if (s.life <= 0) { shots[i] = shots[shots.length - 1]; shots.pop(); }
    }
  }
  function updateBullets(dt) {
    var i, b, dx, dy, rr;
    for (i = ebullets.length - 1; i >= 0; i--) {
      b = ebullets[i]; b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt;
      dx = b.x - P.x; dy = b.y - P.y; rr = b.r + P.r - 3;
      if (dx * dx + dy * dy < rr * rr && P.inv <= 0 && P.dashT <= 0) { hurtPlayer(b.dmg); b.life = 0; }
      if (b.life <= 0) { ebullets[i] = ebullets[ebullets.length - 1]; ebullets.pop(); }
    }
  }
  function collect(p) {
    var i, v;
    if (p.k === 'xp') { gainXp(p.val); G.audio.sfx('xp'); }
    else if (p.k === 'pearl') { v = p.val * P.greed; run.pearls += v; G.audio.sfx('pearl'); }
    else if (p.k === 'heart') { P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.25); addText(P.x, P.y - 26, '+' + Math.round(P.maxHp * 0.25), '#7dffb0', 16); G.audio.sfx('heal'); }
    else if (p.k === 'magnet') { for (i = 0; i < pickups.length; i++) pickups[i].at = true; G.audio.sfx('pearl'); ring(P.x, P.y, 10, 300, 0.5, '130,230,255', 4); }
  }
  function updatePickups(dt) {
    var i, p, dx, dy, d2, d, m2 = P.magnet * P.magnet, kd = Math.max(0, 1 - dt * 5);
    for (i = pickups.length - 1; i >= 0; i--) {
      p = pickups[i]; dx = P.x - p.x; dy = P.y - p.y; d2 = dx * dx + dy * dy;
      if (p.at || d2 < m2) {
        p.at = true; d = Math.sqrt(d2) || 1; p.sp = Math.min(950, p.sp + dt * 1100);
        p.x += dx / d * p.sp * dt; p.y += dy / d * p.sp * dt;
        if (d < P.r + 14) { collect(p); pickups[i] = pickups[pickups.length - 1]; pickups.pop(); }
      } else { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= kd; p.vy *= kd; }
    }
  }
  function ambient(dt) {
    if (Math.random() < dt * (low ? 1 : 2.5)) {
      part(cam.x + cam.ox + rnd(-0.5, 0.5) * W / scale, cam.y + cam.oy + rnd(-0.3, 0.6) * H / scale, rnd(-6, 6), -rnd(18, 40), rnd(1.5, 3), rnd(1.5, 4), null, 2);
    }
  }
  function updateFx(dt) {
    var i, p, kd = Math.max(0, 1 - dt * 3);
    for (i = parts.length - 1; i >= 0; i--) {
      p = parts[i]; p.life -= dt;
      if (p.life <= 0) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.k !== 2) { p.vx *= kd; p.vy *= kd; }
    }
    for (i = texts.length - 1; i >= 0; i--) { p = texts[i]; p.life -= dt; p.y -= 36 * dt; if (p.life <= 0) texts.splice(i, 1); }
    for (i = rings.length - 1; i >= 0; i--) { rings[i].life -= dt; if (rings[i].life <= 0) rings.splice(i, 1); }
    for (i = bolts.length - 1; i >= 0; i--) { bolts[i].life -= dt; if (bolts[i].life <= 0) bolts.splice(i, 1); }
    if (cam.shake > 0) cam.shake = Math.max(0, cam.shake - dt * 30);
    if (hurtFlash > 0) hurtFlash -= dt;
    if (fade > 0) fade -= dt * 1.2;
  }
  function sweep() {
    var j = 0, i;
    for (i = 0; i < enemies.length; i++) if (!enemies[i].dead) enemies[j++] = enemies[i];
    enemies.length = j;
  }

  game.update = function (dt) {
    time += dt; run.time += dt;
    updatePlayer(dt);
    updateWave(dt);
    buildGrid();
    updateEnemies(dt);
    updateWeapons(dt);
    updateShots(dt);
    updateBullets(dt);
    updatePickups(dt);
    ambient(dt);
    updateFx(dt);
    sweep();
    if (pendingLv > 0 && !run.over) {
      pendingLv--;
      var ch = game.rollChoices();
      if (ch.length) { if (game.cb.levelUp) game.cb.levelUp(ch); }
      else { P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.2); run.pearls += 5; addText(P.x, P.y - 30, '+5', '#fff3e6', 16); }
    }
  };
  game.pending = function () { return pendingLv; };
  /* Простейший «автопилот» для автотестов баланса: уходит от врагов и снарядов, подбирает искры. */
  game._botThreat = function () {
    var x = 0, y = 0, near = 999, i, e, dx, dy, d, w, best = null, bd = 1e9;
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i]; dx = P.x - e.x; dy = P.y - e.y; d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d - e.r < near) near = d - e.r;
      if (d > 300 + e.r) continue;
      w = (e.boss ? 5 : 1) * 9000 / (d * d); x += dx / d * w; y += dy / d * w;
    }
    for (i = 0; i < ebullets.length; i++) {
      e = ebullets[i]; dx = P.x - e.x; dy = P.y - e.y; d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d < 130) { w = 6000 / (d * d); x += dx / d * w; y += dy / d * w; }
    }
    for (i = 0; i < pickups.length; i++) { e = pickups[i]; dx = e.x - P.x; dy = e.y - P.y; d = dx * dx + dy * dy; if (d < bd) { bd = d; best = e; } }
    if (best && bd < 500 * 500) { d = Math.sqrt(bd) || 1; w = near > 120 ? 1.2 : 0.35; x += (best.x - P.x) / d * w; y += (best.y - P.y) / d * w; }
    d = Math.sqrt(P.x * P.x + P.y * P.y);
    if (d > ARENA * 0.6) { w = (d - ARENA * 0.6) / (ARENA * 0.4) * 4; x -= P.x / d * w; y -= P.y / d * w; }
    d = Math.sqrt(x * x + y * y);
    if (d > 0.05) { x /= d; y /= d; } else { x = y = 0; }
    return { x: x, y: y, near: near };
  };
  game.enemyCount = function () { return enemies.length; };

  /* ---------- Отрисовка ---------- */
  function tf(x, y, sx, sy, rot) {
    var a = S * sx, d = S * (sy === undefined ? sx : sy), ex = OX + x * S, ey = OY + y * S, co, si;
    if (rot) { co = Math.cos(rot); si = Math.sin(rot); c.setTransform(a * co, a * si, -d * si, d * co, ex, ey); }
    else c.setTransform(a, 0, 0, d, ex, ey);
  }
  function tf0() { c.setTransform(S, 0, 0, S, OX, OY); }
  function img(s) { c.drawImage(s, -s.hw, -s.hh, s.hw * 2, s.hh * 2); }
  function vis(x, y, m) { return x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m; }
  function imul(a, b) { return Math.imul(a, b); }
  function hash2(x, y, s) { var h = imul(x, 374761393) + imul(y, 668265263) + imul(s, 1274126177) | 0; h = imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; }
  function nxt(h) { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; return h >>> 0; }

  function drawDecor() {
    var D = 230, cx, cy, h, n, k, px, py, spr, list = biome.decor, rot;
    for (cy = Math.floor(vy0 / D) - 1; cy <= Math.floor(vy1 / D) + 1; cy++) for (cx = Math.floor(vx0 / D) - 1; cx <= Math.floor(vx1 / D) + 1; cx++) {
      h = hash2(cx, cy, biomeIdx + 7); n = (h & 15) < 7 ? 1 : (h & 15) < 9 ? 2 : 0;
      for (k = 0; k < n; k++) {
        h = nxt(h); px = cx * D + (h % 1000) / 1000 * D; h = nxt(h); py = cy * D + (h % 1000) / 1000 * D; h = nxt(h);
        spr = list[h % list.length];
        if (!vis(px, py, 90)) continue;
        rot = spr.sway && !low ? Math.sin(time * 1.2 + px * 0.013) * 0.05 : 0;
        tf(px, py, 1, 1, rot); img(spr);
      }
    }
  }
  function drawArena() {
    if (wave.state === 'menu') return;
    var far = Math.max(Math.abs(vx0), Math.abs(vx1), Math.abs(vy0), Math.abs(vy1)) * 1.5;
    if (far < ARENA - 40) return;                      // край арены за пределами экрана
    tf0();
    c.strokeStyle = 'rgba(4,8,22,0.62)'; c.lineWidth = 900; c.beginPath(); c.arc(0, 0, ARENA + 470, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(4,8,22,0.3)'; c.lineWidth = 60; c.beginPath(); c.arc(0, 0, ARENA + 10, 0, TAU); c.stroke();
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = 'rgba(120,225,255,0.16)'; c.lineWidth = 14; c.beginPath(); c.arc(0, 0, ARENA, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(190,245,255,0.75)'; c.lineWidth = 2.5; c.setLineDash([26, 18]); c.lineDashOffset = -time * 24;
    c.beginPath(); c.arc(0, 0, ARENA, 0, TAU); c.stroke(); c.setLineDash([]);
    c.globalCompositeOperation = 'source-over';
  }
  function drawBossBack(e) {
    var k, a, r = e.r, bx, by, mx, my, ex, ey, n, col;
    if (e.tele) {
      tf0(); c.strokeStyle = 'rgba(255,80,100,' + (0.22 + 0.12 * Math.sin(time * 30)) + ')'; c.lineWidth = r * 1.5; c.lineCap = 'butt';
      c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + Math.cos(e.sa) * 640, e.y + Math.sin(e.sa) * 640); c.stroke(); c.lineCap = 'round';
    }
    if (e.type === 'boss0' || e.type === 'boss3') {
      n = e.type === 'boss0' ? 8 : 10; col = e.type === 'boss0' ? '#b98cff' : '#ff5a6e';
      tf0(); c.lineCap = 'round';
      for (k = 0; k < n; k++) {
        a = k / n * TAU + Math.sin(time * 0.8 + k) * 0.25;
        bx = e.x + Math.cos(a) * r * 0.7; by = e.y + Math.sin(a) * r * 0.7;
        mx = e.x + Math.cos(a + Math.sin(time * 2 + k * 1.7) * 0.5) * r * 1.35; my = e.y + Math.sin(a + Math.sin(time * 2 + k * 1.7) * 0.5) * r * 1.35;
        ex = e.x + Math.cos(a + Math.sin(time * 1.6 + k) * 0.7) * r * 1.85; ey = e.y + Math.sin(a + Math.sin(time * 1.6 + k) * 0.7) * r * 1.85;
        c.strokeStyle = '#1c1235'; c.lineWidth = r * 0.24; c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(mx, my, ex, ey); c.stroke();
        c.strokeStyle = col; c.lineWidth = 2; c.globalAlpha = 0.7; c.stroke(); c.globalAlpha = 1;
      }
    } else if (e.type === 'boss1') {
      for (k = 0; k < 6; k++) { a = time * 1.4 + k * TAU / 6; tf(e.x + Math.cos(a) * (r + 26), e.y + Math.sin(a) * (r + 18), 1, 1, a + PI / 2); img(A.enemy.swarm); }
    }
  }
  function drawEnemies() {
    var i, e, spr, sc, wob, rot;
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i]; if (e.dead || !vis(e.x, e.y, e.r * 2.6 + (e.boss ? 700 : 0))) continue;
      spr = A.enemy[e.type]; sc = e.r / e.d.r;
      c.globalAlpha = 0.8 * e.alpha; tf(e.x, e.y + e.r * 0.85, e.r / 22, e.r / 22); img(A.shadow); c.globalAlpha = 1;
      if (e.boss) drawBossBack(e);
      if (e.elite) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5 + 0.2 * Math.sin(time * 6 + e.ph); tf(e.x, e.y, e.r / 14); img(A.glow.yellow); c.globalCompositeOperation = 'source-over'; }
      wob = 1 + 0.07 * Math.sin(time * 7 + e.ph);
      if (e.d.ai === 'puff' && e.st === 1) { sc *= 1 + (0.8 - e.tm) * 0.7; wob = 1 + 0.12 * Math.sin(time * 40); }
      rot = e.d.rot ? e.ang : e.type === 'boss2' ? time * 0.7 : 0;
      c.globalAlpha = e.alpha;
      tf(e.x, e.y, sc * wob * (e.d.rot ? 1 : e.face), sc / wob, rot); img(spr);
      if (e.hit > 0 || (e.d.ai === 'puff' && e.st === 1 && Math.sin(time * 40) > 0)) { c.globalAlpha = e.hit > 0 ? Math.min(1, e.hit * 9) * 0.85 : 0.6; img(spr.white); }
      c.globalAlpha = 1;
      if (e.d.ai === 'puff' && e.st === 1) { tf0(); c.strokeStyle = 'rgba(255,166,77,0.55)'; c.lineWidth = 2; c.beginPath(); c.arc(e.x, e.y, 105, 0, TAU); c.stroke(); }
    }
  }
  function drawPlayer() {
    var h = HEROES[P.hero], i, n, a, R, L, b, len, ca, sa, bob = Math.sin(time * 3) * 2;
    if (run.over) return;
    // Луч маяка
    L = P.w.beam;
    if (L > 0 && wave.state !== 'menu') {
      tf0(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; len = beamLen(L);
      for (b = 0; b < (L >= 4 ? 2 : 1); b++) {
        ca = Math.cos(P.beamA + b * PI); sa = Math.sin(P.beamA + b * PI);
        c.strokeStyle = 'rgba(255,235,140,0.16)'; c.lineWidth = 30; c.beginPath(); c.moveTo(P.x, P.y); c.lineTo(P.x + ca * len, P.y + sa * len); c.stroke();
        c.strokeStyle = 'rgba(255,245,190,0.5)'; c.lineWidth = 9; c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2.5; c.stroke();
      }
      c.globalCompositeOperation = 'source-over';
    }
    c.globalAlpha = 0.8; tf(P.x, P.y + 20, 0.9, 0.9); img(A.shadow);
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.42 + 0.06 * Math.sin(time * 4);
    tf(P.x, P.y + bob, 2.6, 2.6); img(A.glow[h.glow]);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = P.inv > 0 && P.dashT <= 0 ? 0.55 + 0.4 * Math.sin(time * 34) : 1;
    tf(P.x, P.y + bob, P.face, 1);
    A.hero(c, P.hero, time, P.tx * P.face, P.ty);
    c.globalAlpha = 1;
    // Жемчужный щит
    L = P.w.orbs;
    if (L > 0 && wave.state !== 'menu') {
      n = Math.min(6, L + 1); R = 60 + L * 5;
      for (i = 0; i < n; i++) { a = P.orbA + i * TAU / n; tf(P.x + Math.cos(a) * R, P.y + Math.sin(a) * R, 1, 1); img(A.orb); }
    }
  }
  function drawWorldFx() {
    var i, p, s, a, r, j, pts, n, seg, k, x1, y1, x2, y2, dx, dy, len, t;
    // предметы
    for (i = 0; i < pickups.length; i++) {
      p = pickups[i]; if (!vis(p.x, p.y, 20)) continue;
      s = p.k === 'xp' ? A.xp[p.val < 4 ? 0 : p.val < 12 ? 1 : 2] : p.k === 'pearl' ? A.pearl : p.k === 'heart' ? A.heart : A.magnet;
      tf(p.x, p.y + Math.sin(time * 4 + p.ph) * 2, 1, 1); img(s);
    }
  }
  function drawShots() {
    var i, s, b;
    for (i = 0; i < shots.length; i++) {
      s = shots[i];
      if (s.k === 'b') { tf(s.x, s.y, 1, 1); img(A.bubble); } else { tf(s.x, s.y, 1.1, 1.1, s.rot); img(A.starfish); }
    }
    for (i = 0; i < ebullets.length; i++) { b = ebullets[i]; if (vis(b.x, b.y, 16)) { tf(b.x, b.y, 1, 1); img(A.ebullet); } }
  }
  function drawParts() {
    var i, p, a, sz, r, t, j, pts, k, x1, y1, x2, y2, dx, dy, len, n, off;
    // чернила (обычное смешивание)
    tf0(); c.fillStyle = '#150c2a';
    for (i = 0; i < parts.length; i++) {
      p = parts[i]; if (p.k !== 1) continue;
      a = p.life / p.max; c.globalAlpha = a * 0.85;
      c.beginPath(); c.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, TAU); c.fill();
    }
    // пузырьки
    c.strokeStyle = 'rgba(210,245,255,0.6)'; c.lineWidth = 1;
    for (i = 0; i < parts.length; i++) {
      p = parts[i]; if (p.k !== 2) continue;
      c.globalAlpha = Math.min(1, p.life / p.max * 2) * 0.7;
      c.beginPath(); c.arc(p.x + Math.sin(time * 3 + p.size * 9) * 3, p.y, p.size, 0, TAU); c.stroke();
    }
    // свечения
    c.globalCompositeOperation = 'lighter';
    for (i = 0; i < parts.length; i++) {
      p = parts[i]; if (p.k !== 0) continue;
      a = p.life / p.max; c.globalAlpha = a; sz = p.size / 32 * (0.6 + a * 0.4) * 2;
      tf(p.x, p.y, sz, sz); img(p.spr);
    }
    // кольца
    tf0();
    for (i = 0; i < rings.length; i++) {
      p = rings[i]; t = 1 - p.life / p.max; r = p.r0 + (p.r1 - p.r0) * (1 - (1 - t) * (1 - t));
      c.strokeStyle = 'rgba(' + p.col + ',' + (1 - t) * 0.8 + ')'; c.lineWidth = p.w * (1 - t * 0.6); c.globalAlpha = 1;
      c.beginPath(); c.arc(p.x, p.y, r, 0, TAU); c.stroke();
    }
    // молнии
    c.lineJoin = 'round';
    for (i = 0; i < bolts.length; i++) {
      p = bolts[i]; pts = p.pts; c.globalAlpha = Math.min(1, p.life * 6);
      for (k = 0; k < 2; k++) {
        c.strokeStyle = k ? 'rgba(255,255,255,0.95)' : 'rgba(170,120,255,0.7)'; c.lineWidth = k ? 1.8 : 6;
        c.beginPath(); c.moveTo(pts[0], pts[1]);
        for (j = 2; j < pts.length; j += 2) {
          x1 = pts[j - 2]; y1 = pts[j - 1]; x2 = pts[j]; y2 = pts[j + 1]; dx = x2 - x1; dy = y2 - y1; len = Math.sqrt(dx * dx + dy * dy) || 1; n = Math.max(2, len / 26 | 0);
          for (t = 1; t < n; t++) { off = Math.sin(p.seed + j * 7.1 + t * 12.9) * 9; c.lineTo(x1 + dx * t / n - dy / len * off, y1 + dy * t / n + dx / len * off); }
          c.lineTo(x2, y2);
        }
        c.stroke();
      }
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    // числа урона
    c.textAlign = 'center'; c.lineJoin = 'round';
    for (i = 0; i < texts.length; i++) {
      p = texts[i]; c.globalAlpha = Math.min(1, p.life * 3);
      c.font = 'bold ' + p.size + 'px Trebuchet MS, Verdana, sans-serif';
      c.lineWidth = 3; c.strokeStyle = 'rgba(5,15,35,0.75)'; c.strokeText(p.s, p.x, p.y);
      c.fillStyle = p.col; c.fillText(p.s, p.x, p.y);
    }
    c.globalAlpha = 1;
  }
  function overlays() {
    var i, p, x, y, cs, px, py, bx, w, joy = G.input.joy;
    if (!low) {
      // каустика — блики света на дне
      cs = 1.5 * scale;
      px = ((((cam.x + cam.ox) * scale + time * 14) % (512 * cs)) + 512 * cs) % (512 * cs);
      py = ((((cam.y + cam.oy) * scale + time * 9) % (512 * cs)) + 512 * cs) % (512 * cs);
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = biome.shaft * 0.75;
      c.setTransform(dpr * cs, 0, 0, dpr * cs, -px * dpr, -py * dpr);
      c.fillStyle = causticPat; c.fillRect(px / cs, py / cs, W / cs + 1, H / cs + 1);
      // лучи света с поверхности
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.globalAlpha = biome.shaft * 1.25; c.fillStyle = shaftGrad;
      for (i = 0; i < 3; i++) {
        bx = W * (0.2 + i * 0.33) + Math.sin(time * 0.3 + i * 2) * W * 0.05; w = W * 0.07 + i * 14;
        c.beginPath(); c.moveTo(bx, 0); c.lineTo(bx + w, 0); c.lineTo(bx + w * 1.7 - H * 0.22, H * 0.85); c.lineTo(bx - w * 0.7 - H * 0.22, H * 0.85); c.closePath(); c.fill();
      }
    }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.globalCompositeOperation = 'source-over';
    // планктон
    c.fillStyle = 'rgba(210,245,255,0.5)'; c.globalAlpha = 0.5; c.beginPath();
    for (i = 0; i < plankton.length; i++) {
      p = plankton[i];
      x = (((p.x * W - (cam.x + cam.ox) * scale * p.z * 0.6) % W) + W) % W;
      y = (((p.y * H - (cam.y + cam.oy) * scale * p.z * 0.6 - time * 7 * p.z) % H) + H) % H;
      c.moveTo(x + p.r, y); c.arc(x, y, p.r * p.z, 0, TAU);
    }
    c.fill();
    c.globalAlpha = biome.vig; c.drawImage(A.vignette, 0, 0, W, H);
    if (P && wave.state !== 'menu' && P.hp < P.maxHp * 0.3 && !run.over) { c.globalAlpha = 0.3 + 0.15 * Math.sin(time * 6); c.drawImage(A.vignetteRed, 0, 0, W, H); }
    if (hurtFlash > 0) { c.globalAlpha = Math.min(1, hurtFlash * 2.6); c.drawImage(A.vignetteRed, 0, 0, W, H); }
    if (fade > 0) { c.globalAlpha = Math.min(1, fade); c.fillStyle = '#dff6ff'; c.fillRect(0, 0, W, H); }
    c.globalAlpha = 1;
    // виртуальный джойстик
    if (joy && joy.on) {
      c.strokeStyle = 'rgba(200,240,255,0.35)'; c.lineWidth = 2; c.fillStyle = 'rgba(120,200,255,0.10)';
      c.beginPath(); c.arc(joy.ox, joy.oy, 54, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = 'rgba(200,240,255,0.5)'; c.beginPath(); c.arc(joy.ox + joy.dx, joy.oy + joy.dy, 22, 0, TAU); c.fill();
    }
  }

  game.render = function () {
    if (!P) return;
    var shx = cam.shake ? rnd(-1, 1) * cam.shake : 0, shy = cam.shake ? rnd(-1, 1) * cam.shake : 0;
    var cx = cam.x + cam.ox + shx, cy = cam.y + cam.oy + shy;
    S = scale * dpr; OX = W * dpr / 2 - cx * S; OY = H * dpr / 2 - cy * S;
    vx0 = cx - W / 2 / scale; vx1 = cx + W / 2 / scale; vy0 = cy - H / 2 / scale; vy1 = cy + H / 2 / scale;
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    tf0(); c.fillStyle = floorPat; c.fillRect(vx0 - 4, vy0 - 4, vx1 - vx0 + 8, vy1 - vy0 + 8);
    drawDecor();
    drawArena();
    drawWorldFx();
    drawEnemies();
    drawPlayer();
    drawShots();
    drawParts();
    overlays();
  };
})();
