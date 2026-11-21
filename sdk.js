/* Сгенерировано _platforms/build.mjs для платформы vk */
window.__GP__ = "vk";
(()=>{"use strict";let e;var t={};let p="u">typeof window,n=!!(p&&window.AndroidBridge),o=!!(p&&window.webkit?.messageHandlers?.VKWebAppClose),r=!!(p&&window.ReactNativeWebView&&"function"==typeof window.ReactNativeWebView.postMessage),i=p&&!n&&!o,a=i&&/(^\?|&)vk_platform=mobile_web(&|$)/.test(location.search),s=i?"message":"VKWebAppEvent",d=["VKWebAppInit","VKWebAppGetCommunityAuthToken","VKWebAppAddToCommunity","VKWebAppAddToHomeScreenInfo","VKWebAppClose","VKWebAppCopyText","VKWebAppCreateHash","VKWebAppGetUserInfo","VKWebAppSetLocation","VKWebAppSendToClient","VKWebAppGetClientVersion","VKWebAppGetPhoneNumber","VKWebAppGetEmail","VKWebAppGetGroupInfo","VKWebAppGetGeodata","VKWebAppGetCommunityToken","VKWebAppGetConfig","VKWebAppGetLaunchParams","VKWebAppSetTitle","VKWebAppGetAuthToken","VKWebAppCallAPIMethod","VKWebAppJoinGroup","VKWebAppLeaveGroup","VKWebAppAllowMessagesFromGroup","VKWebAppDenyNotifications","VKWebAppAllowNotifications","VKWebAppOpenPayForm","VKWebAppOpenApp","VKWebAppShare","VKWebAppShowWallPostBox","VKWebAppScroll","VKWebAppShowOrderBox","VKWebAppShowLeaderBoardBox","VKWebAppShowInviteBox","VKWebAppShowRequestBox","VKWebAppAddToFavorites","VKWebAppShowStoryBox","VKWebAppStorageGet","VKWebAppStorageGetKeys","VKWebAppStorageSet","VKWebAppFlashGetInfo","VKWebAppSubscribeStoryApp","VKWebAppOpenWallPost","VKWebAppCheckAllowedScopes","VKWebAppCheckBannerAd","VKWebAppHideBannerAd","VKWebAppShowBannerAd","VKWebAppCheckNativeAds","VKWebAppShowNativeAds","VKWebAppRetargetingPixel","VKWebAppConversionHit","VKWebAppShowSubscriptionBox","VKWebAppCheckSurvey","VKWebAppShowSurvey","VKWebAppScrollTop","VKWebAppScrollTopStart","VKWebAppScrollTopStop","VKWebAppShowSlidesSheet","VKWebAppTranslate","VKWebAppRecommend","VKWebAppAddToProfile","VKWebAppGetFriends",...i&&!a?["VKWebAppResizeWindow","VKWebAppAddToMenu","VKWebAppShowInstallPushBox","VKWebAppShowCommunityWidgetPreviewBox","VKWebAppCallStart","VKWebAppCallJoin","VKWebAppCallGetStatus"]:["VKWebAppShowImages"]],A=p?window.AndroidBridge:void 0,b=o?window.webkit.messageHandlers:void 0,l=i?parent:void 0,u=function(t){var p;let a,u,W,V,K=[],c=Math.random().toString(36).substring(2,5);function w(e){K.push(e)}function S(e){return n?!!(A&&"function"==typeof A[e]):o?!!(b?.[e]&&"function"==typeof b[e].postMessage):!!i&&d.includes(e)}function f(){return o||n}function h(){return i&&window.parent!==window}function g(){return f()||h()}function v(e){if(o||n)return[...K].map(t=>t.call(null,e));let t=e?.data;if(!i||!t)return;if(r&&"string"==typeof t)try{t=JSON.parse(t)}catch{}let{type:p,data:s,frameId:d}=t;if(p){if("VKWebAppSettings"===p){a=d;return}[...K].map(e=>e({detail:{type:p,data:s}}))}}r&&/(android)/i.test(navigator.userAgent)?document.addEventListener(s,v):"u">typeof window&&"addEventListener"in window&&window.addEventListener(s,v);let y=(p=function(e,p){A?.[e]?A[e](JSON.stringify(p)):b?.[e]&&"function"==typeof b[e].postMessage?b[e].postMessage?.(p):r?window.ReactNativeWebView.postMessage(JSON.stringify({handler:e,params:p})):l&&"function"==typeof l.postMessage&&l.postMessage({handler:e,params:p,type:"vk-connect",webFrameId:a,connectVersion:t},"*")},u={current:0,next(){return++this.current}},W={},V={add(e,t){let p=null!=t?t:`${u.next()}_${c}`;return W[p]=e,p},resolve(e,t,p){let n=W[e];n&&(p(t)?n.resolve(t):n.reject(t),W[e]=null)}},w(e=>{if(e.detail?.data&&"object"==typeof e.detail.data&&"request_id"in e.detail.data){let{request_id:t,...p}=e.detail.data;t&&V.resolve(t,p,e=>!("error_type"in e))}}),function(e,t={}){return new Promise((n,o)=>{let r=V.add({resolve:n,reject:o},t.request_id);p(e,{...t,request_id:r})})});async function m(t){if(n||o)return S(t);if(e)return e.has(t);try{let t=await y("SetSupportedHandlers");e=new Set(t.supportedHandlers)}catch(t){e=new Set(["VKWebAppInit"])}return e.has(t)}return w(t=>{t.detail&&"SetSupportedHandlers"===t.detail.type&&(e=new Set(t.detail.data.supportedHandlers))}),{send:y,sendPromise:y,subscribe:w,unsubscribe:function(e){let t=K.indexOf(e);t>-1&&K.splice(t,1)},supports:function(e){return console.warn("bridge.supports method is deprecated. Use bridge.supportsAsync instead."),S(e)},supportsAsync:m,isWebView:f,isIframe:h,isEmbedded:g,isStandalone:function(){return!g()}}}("3.0.2");window.vkBridge=window.vkConnect=u;var W=window;for(var V in t)W[V]=t[V];t.__esModule&&Object.defineProperty(W,"__esModule",{value:!0})})();

/* YaGames-совместимый адаптер для ВКонтакте, Одноклассников и Пикабу Игр.
   Игры написаны под SDK Яндекс Игр; этот файл подкладывается вместо /sdk.js и реализует
   используемое ими подмножество API поверх VK Bridge (ВК, ОК) или PkbSDK (Пикабу).
   Если платформа недоступна (локальный запуск, блокировщик), работает заглушка на localStorage.
   Платформа задаётся при сборке через window.__GP__ = 'vk' | 'ok' | 'pikabu'. */
(function () {
  'use strict';
  if (window.YaGames && window.YaGames.__shim) return;

  var PLATFORM = window.__GP__ || 'vk';
  var START = Date.now();
  var INIT_TIMEOUT = 5000;
  var INTERSTITIAL_GAP = 90000;     // ВК/ОК не ограничивают частоту сами, в отличие от Яндекса
  var FIRST_AD_DELAY = 45000;       // ОК: запрещена реклама в первые 30 секунд
  var VK_CHUNK = 3000;              // VK Storage: до 4096 символов на значение
  var VK_WRITE_GAP = 20000;         // VK Storage: до 1000 вызовов в час
  var PKB_FLUSH_GAP = 10000;        // Пикабу: до 100 сохранений за 5 минут

  var qs = {};
  try { new URLSearchParams(location.search).forEach(function (v, k) { qs[k] = v; }); } catch (e) { /* старый браузер */ }

  function log() { try { console.info.apply(console, ['[platform:' + PLATFORM + ']'].concat([].slice.call(arguments))); } catch (e) { /* нет консоли */ } }
  function later(fn) { setTimeout(fn, 0); }
  function call(cb, arg) { try { if (typeof cb === 'function') cb(arg); } catch (e) { console.error(e); } }
  function timeout(p, ms) {
    return new Promise(function (res, rej) {
      var t = setTimeout(function () { rej(new Error('timeout')); }, ms);
      p.then(function (v) { clearTimeout(t); res(v); }, function (e) { clearTimeout(t); rej(e); });
    });
  }
  function loadScript(src, ms) {
    return timeout(new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = res; s.onerror = function () { rej(new Error('load ' + src)); };
      (document.head || document.documentElement).appendChild(s);
    }), ms);
  }
  function isMobileUA() {
    var ua = navigator.userAgent || '';
    if (/Android|iPhone|iPod|Mobile|Windows Phone/i.test(ua)) return true;
    try { return navigator.maxTouchPoints > 1 && window.matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600; } catch (e) { return false; }
  }
  function isTabletUA() {
    var ua = navigator.userAgent || '';
    return /iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  }
  function normLang(l) {
    l = String(l || 'ru').toLowerCase().slice(0, 2);
    return l === 'ua' ? 'uk' : l;
  }

  /* ---------- события в стиле Яндекса ---------- */
  var listeners = {};
  function on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return function () { off(ev, fn); }; }
  function off(ev, fn) { var a = listeners[ev]; if (a) { var i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } }
  function emit(ev, arg) { (listeners[ev] || []).slice().forEach(function (f) { call(f, arg); }); }

  var paused = {};
  function pause(reason, on) {
    var was = Object.keys(paused).length > 0;
    if (on) paused[reason] = 1; else delete paused[reason];
    var now = Object.keys(paused).length > 0;
    if (was !== now) emit(now ? 'game_api_pause' : 'game_api_resume');
  }
  document.addEventListener('visibilitychange', function () { pause('hidden', document.hidden); });

  /* ---------- локальное хранилище (зеркало и запасной вариант) ---------- */
  var LS_PREFIX = '__gp_' + PLATFORM + '_';
  var mem = {};
  var safeStorage = {
    getItem: function (k) { try { return localStorage.getItem(k); } catch (e) { return k in mem ? mem[k] : null; } },
    setItem: function (k, v) { try { localStorage.setItem(k, String(v)); } catch (e) { mem[k] = String(v); } },
    removeItem: function (k) { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } },
    clear: function () { try { localStorage.clear(); } catch (e) { mem = {}; } },
    key: function (i) { try { return localStorage.key(i); } catch (e) { return Object.keys(mem)[i] || null; } },
    get length() { try { return localStorage.length; } catch (e) { return Object.keys(mem).length; } }
  };
  function localGet(key) { try { var r = safeStorage.getItem(LS_PREFIX + key); return r == null ? undefined : JSON.parse(r); } catch (e) { return undefined; } }
  function localSet(key, v) { try { if (v === undefined) safeStorage.removeItem(LS_PREFIX + key); else safeStorage.setItem(LS_PREFIX + key, JSON.stringify(v)); } catch (e) { /* переполнено */ } }

  /* ---------- бэкенды платформ ---------- */
  // Общий интерфейс бэкенда:
  //   init() -> Promise; lang; mobile; tablet; user {id, name, photo, authorized}
  //   loadData(keys) -> Promise<object>; saveData(obj, flush) -> Promise
  //   interstitial() -> Promise<boolean shown>; rewarded() -> Promise<'reward' | 'closed' | 'error'>
  //   ready(); auth() -> Promise

  function stubBackend(reason) {
    log('заглушка:', reason);
    return {
      name: 'stub', lang: normLang(qs.lang || 'ru'), mobile: isMobileUA(), tablet: isTabletUA(),
      user: { id: 'local', name: '', photo: '', authorized: false },
      init: function () { return Promise.resolve(); },
      loadData: function (keys) { var o = {}; (keys || []).forEach(function (k) { var v = localGet(k); if (v !== undefined) o[k] = v; }); return Promise.resolve(o); },
      saveData: function (obj) { Object.keys(obj).forEach(function (k) { localSet(k, obj[k]); }); return Promise.resolve(); },
      interstitial: function () { return Promise.resolve(false); },
      rewarded: function () { return Promise.resolve('error'); },
      ready: function () {},
      auth: function () { return Promise.resolve(); }
    };
  }

  /* --- ВКонтакте и Одноклассники: VK Bridge --- */
  function vkBackend() {
    var bridge = window.vkBridge;
    var isOk = PLATFORM === 'ok' || qs.vk_client === 'ok' || /_ok$/.test(qs.vk_platform || '');
    var plat = qs.vk_platform || '';
    var b = {
      name: isOk ? 'ok' : 'vk',
      lang: normLang(qs.vk_language || 'ru'),
      mobile: /^mobile_/.test(plat) || (!plat && isMobileUA()),
      tablet: /ipad/.test(plat),
      user: { id: String(qs.vk_user_id || qs.vk_ok_user_id || ''), name: '', photo: '', authorized: true },
      lastAd: 0
    };
    var written = {};                 // ключ хранилища -> последнее записанное значение
    var pending = null, writeTimer = 0, lastWrite = 0;

    b.init = function () {
      if (!bridge) return Promise.reject(new Error('vkBridge missing'));
      bridge.subscribe(function (e) {
        var t = e && e.detail && e.detail.type;
        if (t === 'VKWebAppViewHide') pause('view', true);
        else if (t === 'VKWebAppViewRestore') pause('view', false);
      });
      return timeout(bridge.send('VKWebAppInit'), INIT_TIMEOUT).then(function () {
        return timeout(bridge.send('VKWebAppGetUserInfo'), 3000).then(function (u) {
          if (u.id) b.user.id = String(u.id);
          b.user.name = [u.first_name, u.last_name].filter(Boolean).join(' ');
          b.user.photo = u.photo_200 || u.photo_100 || '';
        }).catch(function () { /* профиль не обязателен */ });
      });
    };

    function storageGet(keys) {
      var out = {}, i = 0, batches = [];
      for (; i < keys.length; i += 10) batches.push(keys.slice(i, i + 10));
      return Promise.all(batches.map(function (ks) {
        return bridge.send('VKWebAppStorageGet', { keys: ks }).then(function (r) {
          (r.keys || []).forEach(function (kv) { out[kv.key] = kv.value; });
        });
      })).then(function () { return out; });
    }
    function storageSet(key, value) {
      if (written[key] === value) return Promise.resolve();
      return bridge.send('VKWebAppStorageSet', { key: key, value: value }).then(function () { written[key] = value; });
    }
    function sk(key) { return 'gd_' + String(key).replace(/[^a-zA-Z0-9_-]/g, '_'); }

    b.loadData = function (keys) {
      keys = keys || [];
      var out = {};
      return storageGet(keys.map(function (k) { return sk(k) + '_n'; })).then(function (meta) {
        var parts = [];
        keys.forEach(function (k) {
          var n = parseInt(meta[sk(k) + '_n'], 10) || 0;
          written[sk(k) + '_n'] = meta[sk(k) + '_n'] || '';
          for (var i = 0; i < n; i++) parts.push(sk(k) + '_' + i);
        });
        return storageGet(parts).then(function (vals) {
          keys.forEach(function (k) {
            var n = parseInt(meta[sk(k) + '_n'], 10) || 0, s = '';
            for (var i = 0; i < n; i++) { written[sk(k) + '_' + i] = vals[sk(k) + '_' + i] || ''; s += vals[sk(k) + '_' + i] || ''; }
            if (n) { try { out[k] = JSON.parse(s); } catch (e) { log('битое сохранение', k); } }
          });
          return out;
        });
      }).catch(function (e) {
        log('VK Storage недоступен, читаю локально', e);
        keys.forEach(function (k) { var v = localGet(k); if (v !== undefined) out[k] = v; });
        return out;
      });
    };

    function writeNow() {
      clearTimeout(writeTimer); writeTimer = 0;
      if (!pending) return Promise.resolve();
      var obj = pending; pending = null; lastWrite = Date.now();
      var ops = [];
      Object.keys(obj).forEach(function (k) {
        var s = obj[k] === undefined ? '' : JSON.stringify(obj[k]), n = Math.ceil(s.length / VK_CHUNK);
        var prevN = parseInt(written[sk(k) + '_n'], 10) || 0;
        for (var i = 0; i < n; i++) ops.push([sk(k) + '_' + i, s.slice(i * VK_CHUNK, (i + 1) * VK_CHUNK)]);
        for (var j = n; j < prevN; j++) ops.push([sk(k) + '_' + j, '']);
        ops.push([sk(k) + '_n', n ? String(n) : '']);   // счётчик пишется последним
      });
      return ops.reduce(function (p, op) { return p.then(function () { return storageSet(op[0], op[1]); }); }, Promise.resolve())
        .catch(function (e) { log('ошибка VK Storage', e); });
    }
    b.saveData = function (obj, flush) {
      Object.keys(obj).forEach(function (k) { localSet(k, obj[k]); });
      pending = Object.assign(pending || {}, obj);
      var wait = Math.max(0, VK_WRITE_GAP - (Date.now() - lastWrite));
      if (flush && wait === 0) return writeNow();
      if (!writeTimer) writeTimer = setTimeout(writeNow, wait || 1000);
      return Promise.resolve();
    };
    function flushOnHide() { if (pending) writeNow(); }
    document.addEventListener('visibilitychange', function () { if (document.hidden) flushOnHide(); });
    window.addEventListener('pagehide', flushOnHide);

    b.interstitial = function () {
      var now = Date.now();
      if (now - START < FIRST_AD_DELAY || now - b.lastAd < INTERSTITIAL_GAP) return Promise.resolve(false);
      return bridge.send('VKWebAppShowNativeAds', { ad_format: 'interstitial' })
        .then(function (r) { var ok = !!(r && r.result); if (ok) b.lastAd = Date.now(); return ok; })
        .catch(function () { return false; });
    };
    b.rewarded = function () {
      return bridge.send('VKWebAppShowNativeAds', { ad_format: 'reward' })
        .then(function (r) { if (r && r.result) { b.lastAd = Date.now(); return 'reward'; } return 'error'; })
        .catch(function () { return 'error'; });
    };
    b.ready = function () {};
    b.auth = function () { return Promise.resolve(); };
    return b;
  }

  /* --- Пикабу Игры: PkbSDK --- */
  function pikabuBackend() {
    var sdk = null, started = false, lastFlush = 0, flushTimer = 0;
    var b = { name: 'pikabu', lang: 'ru', mobile: isMobileUA(), tablet: isTabletUA(), user: { id: '', name: '', photo: '', authorized: false } };
    function syncUser() {
      var p = sdk.player || {};
      b.user = { id: String(p.id || ''), name: p.name || '', photo: p.avatar || '', authorized: !!p.isAuthorized };
    }
    b.init = function () {
      var load = window.PkbSDK ? Promise.resolve() : loadScript('https://games.pikabu.ru/sdk/sdk.js', INIT_TIMEOUT);
      return load.then(function () { return timeout(window.PkbSDK.init(), INIT_TIMEOUT); }).then(function (s) {
        sdk = s; syncUser();
        try {
          sdk.on('userAuthorized', function () { syncUser(); emit('player_authorized'); });
          sdk.on('storageSaveError', function (reason) { log('ошибка облачного сохранения:', reason); });
        } catch (e) { /* старая версия SDK */ }
      });
    };
    b.loadData = function (keys) {
      var o = {};
      (keys || []).forEach(function (k) { var v = sdk.storage.get(k); if (v !== undefined && v !== null) o[k] = v; });
      return Promise.resolve(o);
    };
    function flush() {
      clearTimeout(flushTimer); flushTimer = 0; lastFlush = Date.now();
      return sdk.storage.flush().then(function (r) { if (r && !r.success) log('сохранение не удалось:', r.reason); }).catch(function () {});
    }
    b.saveData = function (obj, force) {
      Object.keys(obj).forEach(function (k) { sdk.storage.set(k, obj[k]); });
      if (!force) return Promise.resolve();
      var wait = Math.max(0, PKB_FLUSH_GAP - (Date.now() - lastFlush));
      if (wait === 0) return flush();
      if (!flushTimer) flushTimer = setTimeout(flush, wait);
      return Promise.resolve();
    };
    document.addEventListener('visibilitychange', function () { if (document.hidden && sdk && flushTimer) flush(); });
    function showAd(kind) {
      var ad = sdk.ads && sdk.ads[kind];
      if (!ad || !ad.isSupported) return Promise.resolve(null);
      return ad.canShow().then(function (can) { return can ? ad.show() : null; }).catch(function () { return null; });
    }
    b.interstitial = function () { return showAd('fullscreen').then(function (r) { return !!(r && r.rendered); }); };
    b.rewarded = function () {
      return showAd('rewarded').then(function (r) { return !r || !r.rendered ? 'error' : r.reward ? 'reward' : 'closed'; });
    };
    b.ready = function () { if (!started) { started = true; try { sdk.gameStarted(); } catch (e) { /* нет SDK */ } } };
    b.auth = function () {
      if (b.user.authorized) return Promise.resolve();
      pause('auth', true);
      return sdk.auth.openAuthDialog().then(syncUser, syncUser).then(function () {
        pause('auth', false);
        if (!b.user.authorized) throw new Error('auth cancelled');
      });
    };
    return b;
  }

  /* ---------- YaGames-совместимый объект ---------- */
  function makeSdk(be) {
    var adBusy = false;
    var statsKey = '__stats';

    // Как и SDK Яндекса, завершаем показ ровно одним колбэком: межстраничная реклама — всегда onClose(shown),
    // rewarded — onClose после onRewarded/отказа или onError, если реклама не показалась.
    function runAd(kind, opts) {
      var cb = (opts && opts.callbacks) || {};
      if (adBusy) {
        later(function () { if (kind === 'fullscreen') call(cb.onClose, false); else call(cb.onError, new Error('ad in progress')); });
        return;
      }
      adBusy = true;
      pause('ad', true);
      call(cb.onOpen);
      function end() { adBusy = false; pause('ad', false); }
      if (kind === 'fullscreen') {
        be.interstitial().catch(function () { return false; }).then(function (shown) { end(); call(cb.onClose, !!shown); });
        return;
      }
      be.rewarded().catch(function () { return 'error'; }).then(function (r) {
        end();
        if (r === 'reward') { call(cb.onRewarded); call(cb.onClose); }
        else if (r === 'closed') call(cb.onClose);
        else call(cb.onError, new Error('rewarded unavailable'));
      });
    }

    function makePlayer() {
      var u = be.user;
      var authorized = !!u.authorized;
      return {
        getUniqueID: function () { return u.id || ''; },
        getName: function () { return u.name || ''; },
        getPhoto: function () { return u.photo || ''; },
        getMode: function () { return authorized ? '' : 'lite'; },
        isAuthorized: function () { return authorized; },
        getPayingStatus: function () { return 'unknown'; },
        signature: '',
        getData: function (keys) {
          if (!keys) return Promise.reject(new Error('getData без ключей не поддерживается'));
          return be.loadData(keys);
        },
        setData: function (obj, flush) { return be.saveData(obj || {}, !!flush); },
        getStats: function (keys) {
          return be.loadData([statsKey]).then(function (d) {
            var s = d[statsKey] || {}, o = {};
            (keys || Object.keys(s)).forEach(function (k) { if (k in s) o[k] = s[k]; });
            return o;
          });
        },
        setStats: function (obj) {
          return be.loadData([statsKey]).then(function (d) { var s = Object.assign(d[statsKey] || {}, obj); var o = {}; o[statsKey] = s; return be.saveData(o, true); });
        },
        incrementStats: function (inc) {
          return be.loadData([statsKey]).then(function (d) {
            var s = d[statsKey] || {};
            Object.keys(inc || {}).forEach(function (k) { s[k] = (s[k] || 0) + inc[k]; });
            var o = {}; o[statsKey] = s;
            return be.saveData(o, true).then(function () { return s; });
          });
        },
        getIDsPerGame: function () { return Promise.resolve([]); }
      };
    }

    var noLb = function () { return Promise.reject(new Error('Лидерборды недоступны на платформе ' + be.name)); };
    var leaderboards = {
      setScore: function () { return Promise.resolve(); },
      getEntries: noLb, getPlayerEntry: noLb, getDescription: noLb
    };

    var sdk = {
      __shim: true,
      platform: be.name,
      environment: {
        app: { id: String(qs.vk_app_id || '') },
        browser: { lang: normLang(navigator.language) },
        i18n: { lang: be.lang, tld: 'ru' },
        payload: qs.payload || null
      },
      deviceInfo: {
        type: be.tablet ? 'tablet' : be.mobile ? 'mobile' : 'desktop',
        isMobile: function () { return be.mobile && !be.tablet; },
        isTablet: function () { return be.tablet; },
        isDesktop: function () { return !be.mobile && !be.tablet; },
        isTV: function () { return false; }
      },
      features: {
        LoadingAPI: { ready: function () { be.ready(); } },
        GameplayAPI: { start: function () {}, stop: function () {} },
        GamesAPI: { getAllGames: function () { return Promise.resolve({ games: [], developerURL: '' }); }, getGameByID: function () { return Promise.resolve({ isAvailable: false }); } }
      },
      adv: {
        showFullscreenAdv: function (o) { runAd('fullscreen', o); },
        showRewardedVideo: function (o) { runAd('rewarded', o); },
        showBannerAdv: function () { return Promise.resolve({ stickyAdvIsShowing: false, reason: 'UNKNOWN' }); },
        hideBannerAdv: function () { return Promise.resolve({ stickyAdvIsShowing: false }); },
        getBannerAdvStatus: function () { return Promise.resolve({ stickyAdvIsShowing: false, reason: 'UNKNOWN' }); }
      },
      auth: { openAuthDialog: function () { return be.auth(); } },
      getPlayer: function () { return Promise.resolve(makePlayer()); },
      getStorage: function () { return Promise.resolve(safeStorage); },
      getFlags: function (o) { return Promise.resolve((o && o.defaultFlags) || {}); },
      getPayments: function () { return Promise.reject(new Error('Платежи не подключены')); },
      leaderboards: leaderboards,
      getLeaderboards: function () {
        return Promise.resolve({
          setLeaderboardScore: function () { return Promise.resolve(); },
          getLeaderboardEntries: noLb, getLeaderboardPlayerEntry: noLb, getLeaderboardDescription: noLb
        });
      },
      shortcut: { canShowPrompt: function () { return Promise.resolve({ canShow: false }); }, showPrompt: function () { return Promise.resolve({ outcome: 'rejected' }); } },
      feedback: { canReview: function () { return Promise.resolve({ value: false, reason: 'UNKNOWN' }); }, requestReview: function () { return Promise.resolve({ feedbackSent: false }); } },
      clipboard: { writeText: function (t) { try { return navigator.clipboard.writeText(t); } catch (e) { return Promise.reject(e); } } },
      screen: { fullscreen: { STATUS_ON: 'on', STATUS_OFF: 'off', status: 'off', request: function () { return Promise.resolve(); }, exit: function () { return Promise.resolve(); } } },
      serverTime: function () { return Date.now(); },
      isAvailableMethod: function (name) {
        return Promise.resolve(!/^(leaderboards|payments|multiplayer|shortcut|feedback)\b/.test(String(name)));
      },
      EVENTS: { HISTORY_BACK: 'HISTORY_BACK', ACCOUNT_SELECTION_DIALOG_OPENED: 'ACCOUNT_SELECTION_DIALOG_OPENED', ACCOUNT_SELECTION_DIALOG_CLOSED: 'ACCOUNT_SELECTION_DIALOG_CLOSED' },
      on: on, off: off,
      onEvent: on,
      dispatchEvent: function (ev) { if (ev === 'EXIT') return Promise.resolve(); return Promise.resolve(); }
    };
    return sdk;
  }

  // Подключение к платформе стартует сразу при загрузке файла: у некоторых игр таймаут на SDK всего 4 секунды.
  var framed = true;
  try { framed = window.top !== window.self; } catch (e) { /* чужой родительский фрейм */ }
  var onPlatform = PLATFORM === 'pikabu' ? framed : !!(qs.vk_app_id || qs.sign || qs.vk_user_id);
  var backend = PLATFORM === 'pikabu' ? pikabuBackend() : vkBackend();
  var initPromise = (onPlatform ? backend.init() : Promise.reject(new Error('запуск вне платформы'))).then(function () { log('SDK готов, игрок', backend.user.id || '-'); return backend; }, function (e) {
    return stubBackend(e && e.message);
  }).then(makeSdk);
  window.YaGames = {
    __shim: true,
    platform: PLATFORM,
    init: function () { return initPromise; }
  };
  window.GAME_PLATFORM = PLATFORM;
})();
