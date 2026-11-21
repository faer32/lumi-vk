/* Запуск, состояния игры, управление (клавиатура, мышь, касания), главный цикл. */
(function () {
  'use strict';
  var G = window.G, t = G.t, ui = G.ui, game = G.game, audio = G.audio, platform = G.platform;
  var $ = ui.$;
  var canvas = $('game');
  var flow = G.flow = { state: 'boot', helpBack: 'menu', earned: 0, doubled: false };
  var input = G.input = { mx: 0, my: 0, dash: false, joy: { on: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 } };
  var keys = {};

  /* ---------- Состояния ---------- */
  function syncGameplay() { platform.gameplay(flow.state === 'playing' && !G.sys.blocked()); }
  function setState(s) {
    flow.state = s;
    ui.show(s);
    if (s !== 'playing') { input.joy.on = false; input.joy.id = null; input.dash = false; }
    syncGameplay();
  }
  flow.set = setState;

  /* Пауза и звук при рекламе, уходе со вкладки и потере фокуса (пп. 1.3, 4.7). */
  G.onSysChange = function (reason, on) {
    if (on && (reason === 'hidden' || reason === 'blur') && flow.state === 'playing') setState('paused');
    audio.apply();
    syncGameplay();
  };

  function showMenu() {
    ui.clearHints();
    game.menuScene(G.save.hero);
    audio.intensity(0);
    setState('menu');
  }
  function startRun() {
    ui.clearHints();
    game.newRun(G.save.hero);
    flow.doubled = false;
    setState('playing');
    if (G.save.runs < 3) ui.hint(platform.isMobile ? t('hintMobile') : t('hintPc'), 7000);
  }
  function play() {
    if (!G.save.intro) { setState('intro'); return; }
    startRun();
  }
  function finishRun() {
    var r = game.run, P = game.P, s = G.save, wave = game.wave.n;
    var earned = Math.floor(r.pearls), best = wave > s.best;
    flow.earned = earned;
    s.pearls += earned; s.kills += r.kills; s.runs++;
    if (best) s.best = wave;
    G.persist();
    if (best) platform.submitScore(wave);
    ui.results({ wave: wave, kills: r.kills, time: r.time, level: P.level, pearls: earned, best: best });
    audio.sfx('lose'); audio.intensity(0);
    setState('results');
  }

  /* ---------- События игры ---------- */
  game.cb.levelUp = function (choices) {
    audio.sfx('level');
    ui.cards(choices, function (id) {
      if (flow.state !== 'levelup') return;
      audio.sfx('click');
      game.applyUpgrade(id);
      setState('playing');
    });
    setState('levelup');
  };
  game.cb.waveStart = function (n, bossIdx, zone) {
    if (bossIdx >= 0) ui.banner(t('bossWarn'), t('boss' + bossIdx), true, 2600);
    else ui.banner(t('wave', n), zone >= 0 ? t('zone' + zone) : '', false, 2000);
  };
  game.cb.waveClear = function (n, bonus, clean) { if (clean) ui.banner(t('waveClear'), t('bonus', bonus), false, 2200); };
  game.cb.zoneClear = function (zone, nextZone) { ui.zone(nextZone); audio.sfx('win'); setState('zone'); };
  game.cb.victory = function () { audio.sfx('win'); setState('victory'); };
  game.cb.death = function () {
    if (!game.run.revived) setState('revive'); else finishRun();
  };

  /* ---------- Кнопки ---------- */
  function on(id, fn) {
    $(id).addEventListener('click', function () { audio.unlock(); audio.sfx('click'); fn(); });
  }
  function toggle(key) { G.save[key] = G.save[key] ? 0 : 1; G.persist(); audio.apply(); ui.refreshMenu(); }
  function openHelp() { flow.helpBack = flow.state; setState('help'); }

  on('btnPlay', play);
  on('btnIntroGo', function () { G.save.intro = 1; G.persist(); startRun(); });
  on('btnShop', function () { setState('shop'); });
  on('btnHeroes', function () { setState('heroes'); });
  on('btnHelp', openHelp); on('btnHelp2', openHelp);
  on('btnShopBack', function () { setState('menu'); });
  on('btnHeroesBack', function () { setState('menu'); });
  on('btnHelpBack', function () { setState(flow.helpBack); });
  on('btnSfx', function () { toggle('sfx'); }); on('btnSfx2', function () { toggle('sfx'); });
  on('btnMusic', function () { toggle('music'); }); on('btnMusic2', function () { toggle('music'); });
  on('btnLang', function () {
    var i = G.LANGS.indexOf(G.lang);
    G.setLang(G.LANGS[(i + 1) % G.LANGS.length]);
    G.save.lang = G.lang; G.persist(); ui.applyLang();
  });
  on('btnPause', function () { if (flow.state === 'playing') setState('paused'); });
  on('btnResume', function () { setState('playing'); });
  on('btnQuit', function () { finishRun(); });
  on('btnZoneNext', function () {
    // логическая пауза между зонами — здесь уместна полноэкранная реклама
    platform.interstitial(function () { game.nextWave(false); setState('playing'); });
  });
  on('btnEndless', function () {
    platform.interstitial(function () { game.nextWave(true); setState('playing'); });
  });
  on('btnFinish', finishRun);
  on('btnRevive', function () {
    $('btnRevive').disabled = true;
    platform.rewarded(function () { game.revive(); }, function (ok) {
      $('btnRevive').disabled = false;
      if (ok) setState('playing');
    });
  });
  on('btnGiveUp', finishRun);
  on('btnDouble', function () {
    if (flow.doubled) return;
    $('btnDouble').disabled = true;
    platform.rewarded(function () {
      flow.doubled = true;
      G.save.pearls += flow.earned; G.persist();
      ui.doubled(flow.earned * 2); audio.sfx('buy');
    }, function () { $('btnDouble').disabled = false; });
  });
  on('btnAgain', function () { platform.interstitial(startRun); });
  on('btnMenu', function () { platform.interstitial(showMenu); });
  ui.onHero = function (id) { if (flow.state === 'heroes') game.menuScene(id); };

  // Рывок: отдельная кнопка на сенсорных экранах
  $('btnDash').addEventListener('pointerdown', function (e) {
    e.preventDefault(); e.stopPropagation();
    if (flow.state === 'playing') input.dash = true;
  });

  // После клика мышью снимаем фокус с кнопки, чтобы «Пробел» не нажимал её повторно.
  document.addEventListener('click', function (e) {
    var a = document.activeElement;
    if (e.detail > 0 && a && a !== document.body && a.blur) a.blur();
  });

  /* ---------- Клавиатура (по кодам клавиш — не зависит от раскладки) ---------- */
  var MOVE = { KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1, ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1 };
  function focusMove(dir) {
    var scr = ui.topScreen(); if (!scr) return;
    var list = Array.prototype.slice.call(scr.querySelectorAll('button')).filter(function (b) { return !b.disabled && b.offsetParent !== null; });
    if (!list.length) return;
    var i = list.indexOf(document.activeElement);
    i = i < 0 ? (dir > 0 ? 0 : list.length - 1) : (i + dir + list.length) % list.length;
    list[i].focus();
  }
  window.addEventListener('keydown', function (e) {
    var code = e.code, s = flow.state;
    audio.unlock();
    if (MOVE[code] || code === 'Space') e.preventDefault();
    if (e.repeat && s === 'playing') return;
    keys[code] = true;
    if (s === 'playing') {
      if (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') input.dash = true;
      else if (code === 'Escape' || code === 'KeyP') setState('paused');
      return;
    }
    if (s === 'levelup' && (code === 'Digit1' || code === 'Digit2' || code === 'Digit3' || code === 'Numpad1' || code === 'Numpad2' || code === 'Numpad3')) {
      ui.pickCard(parseInt(code.slice(-1), 10) - 1); return;
    }
    if (code === 'Escape' || code === 'KeyP') {
      if (s === 'paused') setState('playing');
      else if (s === 'shop' || s === 'heroes') setState('menu');
      else if (s === 'help') setState(flow.helpBack);
      return;
    }
    if (code === 'ArrowDown' || code === 'ArrowRight') focusMove(1);
    else if (code === 'ArrowUp' || code === 'ArrowLeft') focusMove(-1);
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });

  /* ---------- Мышь и касания: плавающий джойстик ---------- */
  var JR = 54;
  canvas.addEventListener('pointerdown', function (e) {
    audio.unlock();
    if (flow.state !== 'playing' || input.joy.id !== null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    var j = input.joy;
    j.id = e.pointerId; j.on = true; j.ox = e.clientX; j.oy = e.clientY; j.dx = j.dy = 0;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* не критично */ }
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', function (e) {
    var j = input.joy;
    if (j.id !== e.pointerId) return;
    var dx = e.clientX - j.ox, dy = e.clientY - j.oy, l = Math.sqrt(dx * dx + dy * dy);
    if (l > JR) { j.ox += dx / l * (l - JR); j.oy += dy / l * (l - JR); dx = dx / l * JR; dy = dy / l * JR; }
    j.dx = dx; j.dy = dy;
  });
  function joyEnd(e) { var j = input.joy; if (j.id === e.pointerId) { j.id = null; j.on = false; j.dx = j.dy = 0; } }
  canvas.addEventListener('pointerup', joyEnd);
  canvas.addEventListener('pointercancel', joyEnd);
  canvas.addEventListener('lostpointercapture', joyEnd);
  // Любое действие игрока означает, что фокус у игры: снимаем блокировку «blur».
  document.addEventListener('pointerdown', function (e) {
    G.sys.block('blur', false); audio.unlock();
    if (e.pointerType === 'touch' && !platform.isMobile) { platform.isMobile = true; document.body.classList.add('touch'); }
  }, true);
  document.addEventListener('keydown', function () { G.sys.block('blur', false); }, true);

  function readInput() {
    var j = input.joy, x = 0, y = 0, l;
    if (j.on) {
      x = j.dx / JR; y = j.dy / JR; l = Math.sqrt(x * x + y * y);
      if (l < 0.14) x = y = 0;
    } else {
      if (keys.KeyA || keys.ArrowLeft) x -= 1;
      if (keys.KeyD || keys.ArrowRight) x += 1;
      if (keys.KeyW || keys.ArrowUp) y -= 1;
      if (keys.KeyS || keys.ArrowDown) y += 1;
    }
    input.mx = x; input.my = y;
  }

  /* ---------- Запреты браузерных жестов (пп. 1.6.1.8, 1.6.2.7, 1.10.2) ---------- */
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('selectstart', function (e) { e.preventDefault(); });
  document.addEventListener('dragstart', function (e) { e.preventDefault(); });
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  document.addEventListener('touchmove', function (e) {
    var n = e.target;
    while (n && n !== document.body) { if (n.classList && (n.classList.contains('scroll') || n.classList.contains('panel'))) return; n = n.parentNode; }
    if (e.cancelable) e.preventDefault();
  }, { passive: false });

  /* ---------- Вкладка, фокус, размер окна ---------- */
  document.addEventListener('visibilitychange', function () { G.sys.block('hidden', document.hidden); });
  window.addEventListener('pagehide', function () { G.sys.block('hidden', true); });
  window.addEventListener('pageshow', function () { G.sys.block('hidden', document.hidden); });
  window.addEventListener('blur', function () { keys = {}; G.sys.block('blur', true); });
  window.addEventListener('focus', function () { G.sys.block('blur', false); });

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    if (!w || !h) return;
    document.documentElement.style.fontSize = Math.max(12, Math.min(20, Math.min(w / 24, h / 30))) + 'px';
    game.resize();
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });

  /* ---------- Главный цикл ---------- */
  var last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    var raw = (now - last) / 1000, dt = Math.min(0.05, raw), s = flow.state;
    last = now;
    if (!(raw > 0) || document.hidden || s === 'boot') return;
    if (!G.sys.blocked()) {
      if (s === 'playing') { readInput(); game.update(dt); game.perf(raw); }
      else if (s === 'menu' || s === 'shop' || s === 'heroes' || s === 'help' || s === 'intro') game.menuUpdate(dt);
    }
    game.render();
    if (s !== 'menu' && s !== 'results') ui.hud();
  }

  /* ---------- Загрузка ---------- */
  function boot() {
    var sdk = platform.init();          // SDK грузится параллельно с подготовкой графики
    G.art.init();
    game.init(canvas);
    resize();
    sdk.then(function () {
      G.setLang(G.save.lang || G.pickLang(platform.lang || navigator.language));
      ui.init();
      showMenu();
      requestAnimationFrame(function (now) { last = now; requestAnimationFrame(frame); });
      platform.ready();                 // Game Ready: меню на экране, можно играть
    });
  }
  G.onLateSdk = function () {
    if (!G.save.lang) { G.setLang(G.pickLang(platform.lang)); ui.applyLang(); }
  };
  // Для автотестов и отладки
  G.debug = { startRun: startRun, finishRun: finishRun, showMenu: showMenu, setState: setState };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
