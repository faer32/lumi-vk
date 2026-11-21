/* Интерфейс: экраны, HUD, магазин улучшений, выбор героя, карточки усилений. */
(function () {
  'use strict';
  var G = window.G, t = G.t, A = G.art;
  var ui = G.ui = {};

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined) e.textContent = txt;
    return e;
  }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  var SVG = {
    pause: '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="5" height="16" rx="1.5"/><rect x="14" y="4" width="5" height="16" rx="1.5"/></svg>',
    sfx: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.6 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="#cdefff" stroke-width="2" stroke-linecap="round"/></svg>',
    music: '<svg viewBox="0 0 24 24"><path d="M9 18V6l11-2v12" fill="none" stroke="#cdefff" stroke-width="2" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="3"/><circle cx="17.5" cy="16" r="3"/></svg>'
  };

  /* Какие блоки видны в каждом состоянии игры. */
  var SCREENS = {
    boot: ['scr-load'], menu: ['scr-menu'], shop: ['scr-shop'], heroes: ['scr-heroes'], help: ['scr-help'], intro: ['scr-intro'],
    playing: ['hud'], paused: ['hud', 'scr-pause'], levelup: ['hud', 'scr-levelup'], zone: ['hud', 'scr-zone'],
    revive: ['hud', 'scr-revive'], results: ['scr-results'], victory: ['hud', 'scr-victory']
  };
  var ALL = ['scr-load', 'hud', 'scr-menu', 'scr-shop', 'scr-heroes', 'scr-help', 'scr-intro', 'scr-pause', 'scr-levelup', 'scr-zone', 'scr-revive', 'scr-results', 'scr-victory'];

  ui.show = function (state) {
    var on = SCREENS[state] || [], i;
    for (i = 0; i < ALL.length; i++) {
      var node = $(ALL[i]);
      if (on.indexOf(ALL[i]) >= 0) node.classList.add('on'); else node.classList.remove('on');
    }
    if (state === 'menu') ui.refreshMenu();
    if (state === 'shop') ui.buildShop();
    if (state === 'heroes') ui.buildHeroes();
  };
  /* Верхний видимый экран — для навигации с клавиатуры. */
  ui.topScreen = function () {
    for (var i = ALL.length - 1; i >= 0; i--) if (ALL[i] !== 'hud' && $(ALL[i]).classList.contains('on')) return $(ALL[i]);
    return null;
  };

  ui.init = function () {
    $('btnPause').innerHTML = SVG.pause;
    $('btnSfx').innerHTML = $('btnSfx2').innerHTML = SVG.sfx;
    $('btnMusic').innerHTML = $('btnMusic2').innerHTML = SVG.music;
    if (G.platform.isMobile) document.body.classList.add('touch');
    ui.applyLang();
  };

  ui.applyLang = function () {
    var nodes = document.querySelectorAll('[data-t]'), i;
    for (i = 0; i < nodes.length; i++) nodes[i].textContent = t(nodes[i].getAttribute('data-t'));
    $('logoA').textContent = t('logoA'); $('logoB').textContent = t('logoB');
    $('btnLang').textContent = G.lang.toUpperCase();
    $('dashTxt').textContent = t('dash');
    document.title = t('title');
    document.documentElement.lang = G.lang;
    hc = {};
    ui.refreshMenu();
  };

  ui.refreshMenu = function () {
    var s = G.save;
    $('menuBest').textContent = t('best', s.best);
    $('menuPearls').textContent = $('shopPearls').textContent = $('heroPearls').textContent = Math.floor(s.pearls);
    $('btnSfx').classList.toggle('off', !s.sfx); $('btnSfx2').classList.toggle('off', !s.sfx);
    $('btnMusic').classList.toggle('off', !s.music); $('btnMusic2').classList.toggle('off', !s.music);
  };

  /* ---------- Постоянные улучшения ---------- */
  ui.buildShop = function () {
    var list = $('shopList'), s = G.save, keep = list.scrollTop;
    list.innerHTML = '';
    G.META.forEach(function (m) {
      var lv = s.meta[m.id] || 0, max = G.META_COST.length, cost = G.META_COST[lv];
      var row = el('div', 'item'), info = el('div', 'info'), pips = el('div', 'pips'), i, b;
      row.appendChild(A.icon(m.icon, 96));
      info.appendChild(el('h3', '', t('m_' + m.id)));
      info.appendChild(el('p', '', t('md_' + m.id)));
      for (i = 0; i < max; i++) pips.appendChild(el('i', i < lv ? 'on' : ''));
      info.appendChild(pips);
      row.appendChild(info);
      if (lv >= max) b = el('button', 'buy max', t('max'));
      else {
        b = el('button', 'buy' + (s.pearls >= cost ? '' : ' no'));
        b.appendChild(el('i', 'pearl')); b.appendChild(document.createTextNode(cost));
        b.onclick = function () {
          if (s.pearls < cost) { G.audio.sfx('deny'); return; }
          s.pearls -= cost; s.meta[m.id] = lv + 1;
          G.persist(); G.audio.sfx('buy');
          ui.refreshMenu(); ui.buildShop();
        };
      }
      row.appendChild(b);
      list.appendChild(row);
    });
    list.scrollTop = keep;
  };

  /* ---------- Герои ---------- */
  ui.buildHeroes = function () {
    var list = $('heroList'), s = G.save;
    list.innerHTML = '';
    G.HERO_ORDER.forEach(function (id) {
      var h = G.HEROES[id], owned = !!s.heroes[id], cur = s.hero === id;
      var card = el('div', 'hero' + (cur ? ' cur' : '')), txt = el('div', 'ht'), b;
      card.appendChild(A.portrait(id, 160));
      txt.appendChild(el('h3', '', t('h_' + id)));
      txt.appendChild(el('p', '', t('hd_' + id)));
      txt.appendChild(el('div', 'st', t('hp') + ' ' + h.hp + ' · ' + t('speed') + ' ' + h.spd));
      card.appendChild(txt);
      if (cur) b = el('button', 'buy cur', t('selected'));
      else if (owned) {
        b = el('button', 'buy sel', t('select'));
        b.onclick = function () { s.hero = id; G.persist(); G.audio.sfx('click'); ui.buildHeroes(); if (ui.onHero) ui.onHero(id); };
      } else {
        b = el('button', 'buy' + (s.pearls >= h.price ? '' : ' no'));
        b.appendChild(el('i', 'pearl')); b.appendChild(document.createTextNode(h.price));
        b.onclick = function () {
          if (s.pearls < h.price) { G.audio.sfx('deny'); return; }
          s.pearls -= h.price; s.heroes[id] = 1; s.hero = id;
          G.persist(); G.audio.sfx('buy');
          ui.refreshMenu(); ui.buildHeroes(); if (ui.onHero) ui.onHero(id);
        };
      }
      card.appendChild(b);
      list.appendChild(card);
    });
  };

  /* ---------- Карточки усилений ---------- */
  ui.cards = function (choices, onPick) {
    var box = $('cards');
    box.innerHTML = '';
    choices.forEach(function (ch, i) {
      var b = el('button', 'card' + (ch.k === 'w' ? ' wpn' : '')), ct = el('div', 'ct');
      b.appendChild(el('span', 'key', i + 1));
      b.appendChild(A.icon(ch.id, 128));
      ct.appendChild(el('h3', '', t('u_' + ch.id)));
      ct.appendChild(el('p', '', t('d_' + ch.id)));
      ct.appendChild(el('span', 'tagl' + (ch.lv === 0 ? ' new' : ''), ch.lv === 0 ? t('isNew') : t('lvl', ch.lv + 1)));
      b.appendChild(ct);
      b.onclick = function () { onPick(ch.id); };
      box.appendChild(b);
    });
  };
  ui.pickCard = function (i) {
    var cards = $('cards').children;
    if (cards[i]) cards[i].click();
  };

  /* ---------- Баннер и подсказка ---------- */
  var bannerT = 0, hintT = 0;
  ui.banner = function (a, b, boss, dur) {
    var n = $('banner');
    $('bannerA').textContent = a; $('bannerB').textContent = b || '';
    n.className = 'banner on' + (boss ? ' boss' : '');
    clearTimeout(bannerT);
    bannerT = setTimeout(function () { n.classList.remove('on'); }, dur || 2000);
  };
  ui.hint = function (text, dur) {
    var n = $('hint');
    n.textContent = text; n.classList.add('on');
    clearTimeout(hintT);
    hintT = setTimeout(function () { n.classList.remove('on'); }, dur || 6000);
  };
  ui.clearHints = function () {
    clearTimeout(bannerT); clearTimeout(hintT);
    $('banner').classList.remove('on'); $('hint').classList.remove('on');
  };

  /* ---------- HUD (DOM обновляется только при изменении значений) ---------- */
  var hc = {};
  function txt(id, v) { if (hc[id] !== v) { hc[id] = v; $(id).textContent = v; } }
  function fill(id, f) {
    f = Math.round(clamp01(f) * 250) / 250;
    if (hc[id] !== f) { hc[id] = f; $(id).style.transform = 'scaleX(' + f + ')'; }
  }
  function cls(id, name, on) {
    var k = id + '.' + name;
    if (hc[k] !== on) { hc[k] = on; $(id).classList.toggle(name, on); }
  }
  ui.hud = function () {
    var g = G.game, P = g.P, w = g.wave, r = g.run, boss;
    if (!P) return;
    txt('hudLv', P.level);
    fill('hpFill', P.hp / P.maxHp);
    txt('hpTxt', Math.ceil(P.hp) + ' / ' + Math.round(P.maxHp));
    fill('xpFill', P.xp / P.need);
    txt('waveTxt', w.n > 0 ? t('wave', w.n) : '');
    fill('waveFill', w.state === 'active' ? g.waveProgress() : 1);
    txt('hudPearls', Math.floor(r.pearls));
    boss = w.boss && !w.boss.dead ? w.boss : null;
    cls('bossBar', 'on', !!boss);
    if (boss) { txt('bossName', t('boss' + boss.type.slice(4))); fill('bossFill', boss.hp / boss.maxHp); }
    cls('btnDash', 'cd', g.dashFrac() < 1);
  };

  ui.zone = function (nextZone) { $('zoneNext').textContent = t('zoneNext', t('zone' + nextZone)); };

  function fmtTime(s) {
    s = Math.floor(s);
    var m = Math.floor(s / 60), ss = s % 60;
    return m + ':' + (ss < 10 ? '0' : '') + ss;
  }
  ui.results = function (d) {
    $('resWave').textContent = d.wave;
    $('resKills').textContent = d.kills;
    $('resTime').textContent = fmtTime(d.time);
    $('resLevel').textContent = d.level;
    $('resPearls').textContent = '+' + d.pearls;
    $('newBest').classList.toggle('on', !!d.best);
    $('btnDouble').style.display = d.pearls > 0 ? '' : 'none';
    $('btnDouble').disabled = false;
  };
  ui.doubled = function (pearls) {
    $('resPearls').textContent = '+' + pearls;
    $('btnDouble').style.display = 'none';
  };
  ui.$ = $;
})();
