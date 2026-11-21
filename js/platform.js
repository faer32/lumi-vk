/* Обёртка над SDK Яндекс Игр: инициализация, язык, сохранения, реклама, лидерборд,
   разметка геймплея и события паузы. Вне платформы (локальный запуск) работает
   в режиме заглушки: реклама «показывается» мгновенно, прогресс хранится в localStorage. */
(function () {
  'use strict';
  var G = window.G = window.G || {};

  var SAVE_KEY = 'lumi_deep_save_v1';
  var LEADERBOARD = 'bestwave';   // техническое название лидерборда в Консоли

  /* ---------- Причины блокировки (пауза и звук) ---------- */
  var reasons = {};
  G.sys = {
    block: function (reason, on) {
      var had = !!reasons[reason];
      if (on) reasons[reason] = 1; else delete reasons[reason];
      if (had !== !!on && G.onSysChange) G.onSysChange(reason, !!on);
    },
    blocked: function () { for (var k in reasons) return true; return false; },
    has: function (r) { return !!reasons[r]; }
  };

  /* ---------- Сохранение ---------- */
  function defaults() {
    return {
      v: 1, ts: 0, pearls: 0, best: 0, kills: 0, runs: 0,
      meta: { hp: 0, dmg: 0, spd: 0, mag: 0, greed: 0, xp: 0 },
      heroes: { lumi: 1 }, hero: 'lumi',
      sfx: 1, music: 1, lang: '', intro: 0
    };
  }
  function merge(d) {
    var s = defaults(), k, j;
    if (!d || typeof d !== 'object') return s;
    for (k in s) {
      if (d[k] === undefined || d[k] === null) continue;
      if (typeof s[k] === 'object') { for (j in d[k]) s[k][j] = d[k][j]; }
      else if (typeof d[k] === typeof s[k]) s[k] = d[k];
    }
    return s;
  }
  function readLocal() {
    try { var raw = window.localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }
  function writeLocal() {
    try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(G.save)); } catch (e) { /* хранилище недоступно */ }
  }

  G.save = merge(readLocal());

  var cloudTimer = 0;
  G.persist = function () {
    G.save.ts = Date.now();
    writeLocal();
    var p = G.platform.player;
    if (!p || !p.setData) return;
    clearTimeout(cloudTimer);
    cloudTimer = setTimeout(function () {
      try { p.setData({ save: G.save }, true).catch(function () {}); } catch (e) { /* нет сети */ }
    }, 1200);
  };

  /* ---------- Платформа ---------- */
  var P = G.platform = {
    ysdk: null, player: null, stub: true, lang: '', isMobile: false,
    gpOn: false, readySent: false, wantReady: false
  };

  function detectTouch() {
    try {
      return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches);
    } catch (e) { return false; }
  }

  function setup(ysdk) {
    P.ysdk = ysdk; P.stub = false;
    try { P.lang = ysdk.environment.i18n.lang || ''; } catch (e) { /* нет данных */ }
    try {
      var di = ysdk.deviceInfo;
      if (di && (di.isMobile() || di.isTablet())) P.isMobile = true;
    } catch (e) { /* нет данных */ }
    // События паузы от платформы: реклама, окна покупок, уход со вкладки.
    try {
      ysdk.on('game_api_pause', function () { G.sys.block('platform', true); });
      ysdk.on('game_api_resume', function () { G.sys.block('platform', false); });
    } catch (e) { /* старый SDK */ }

    return ysdk.getPlayer().then(function (player) {
      P.player = player;
      return player.getData(['save']);
    }).then(function (data) {
      var cloud = data && data.save;
      if (cloud && typeof cloud === 'object' && (cloud.ts || 0) > (G.save.ts || 0)) {
        G.save = merge(cloud);
        writeLocal();
      }
    }).catch(function () { /* играем с локальным сохранением */ });
  }

  function loadScript() {
    return new Promise(function (resolve) {
      var done = false;
      function fin(ok) { if (done) return false; done = true; resolve(ok); return true; }
      if (location.protocol === 'file:') { fin(false); return; }
      var s = document.createElement('script');
      s.src = 'sdk.js';           // относительный путь — требование для игр на серверах Яндекса
      s.async = true;
      s.onload = function () {
        if (!window.YaGames) { fin(false); return; }
        if (!fin(true)) lateInit();  // SDK догрузился после таймаута
      };
      s.onerror = function () { fin(false); };
      document.head.appendChild(s);
      setTimeout(function () { fin(!!window.YaGames); }, 8000);
    });
  }

  function initSdk() {
    return window.YaGames.init().then(setup).catch(function () { /* заглушка */ });
  }
  function lateInit() {
    initSdk().then(function () {
      if (P.wantReady) P.ready();
      if (G.onLateSdk) G.onLateSdk();
    });
  }

  /* Возвращает промис, который выполняется всегда (с SDK или без него). */
  P.init = function () {
    P.isMobile = detectTouch();
    return loadScript().then(function (ok) {
      if (ok && window.YaGames) return initSdk();
    }).catch(function () {});
  };

  /* Game Ready: игра загружена и доступна для взаимодействия (п. 1.19.2). */
  P.ready = function () {
    P.wantReady = true;
    if (P.readySent || !P.ysdk) return;
    try {
      var f = P.ysdk.features;
      if (f && f.LoadingAPI) { f.LoadingAPI.ready(); P.readySent = true; }
    } catch (e) { /* не критично */ }
  };

  /* Разметка геймплея (п. 1.19.3): вызываем только при смене состояния. */
  P.gameplay = function (on) {
    if (P.gpOn === on) return;
    P.gpOn = on;
    try {
      var f = P.ysdk && P.ysdk.features;
      if (f && f.GameplayAPI) { if (on) f.GameplayAPI.start(); else f.GameplayAPI.stop(); }
    } catch (e) { /* не критично */ }
  };

  /* После рекламы возвращаем фокус игре и снимаем блокировки. */
  function afterAd() {
    try { window.focus(); } catch (e) { /* не критично */ }
    G.sys.block('blur', false);
    G.sys.block('ad', false);
  }

  /* Полноэкранная реклама: только в логических паузах, по действию игрока. */
  P.interstitial = function (done) {
    var called = false;
    function fin() { if (called) return; called = true; afterAd(); if (done) done(); }
    if (!P.ysdk) { if (done) done(); return; }
    G.sys.block('ad', true);
    try {
      P.ysdk.adv.showFullscreenAdv({ callbacks: { onClose: fin, onError: fin, onOffline: fin } });
    } catch (e) { fin(); }
  };

  /* Реклама за вознаграждение: награда выдаётся в onRewarded, продолжение — после onClose. */
  P.rewarded = function (onReward, onDone) {
    var rewarded = false, called = false;
    function fin() {
      if (called) return; called = true;
      afterAd();
      if (rewarded && onReward) onReward();
      if (onDone) onDone(rewarded);
    }
    if (!P.ysdk) {            // локальный запуск: имитируем успешный просмотр
      rewarded = true;
      setTimeout(fin, 250);
      return;
    }
    G.sys.block('ad', true);
    try {
      P.ysdk.adv.showRewardedVideo({
        callbacks: {
          onRewarded: function () { rewarded = true; },
          onClose: fin,
          onError: fin
        }
      });
    } catch (e) { fin(); }
  };

  /* Рекорд в лидерборд (нужен лидерборд с техническим названием LEADERBOARD в Консоли). */
  P.submitScore = function (score) {
    var y = P.ysdk;
    if (!y || !y.leaderboards || !y.isAvailableMethod) return;
    try {
      y.isAvailableMethod('leaderboards.setScore').then(function (ok) {
        if (ok) return y.leaderboards.setScore(LEADERBOARD, score);
      }).catch(function () {});
    } catch (e) { /* лидерборд не настроен */ }
  };
})();
