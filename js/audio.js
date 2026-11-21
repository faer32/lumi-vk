/* Звук: все эффекты и музыка синтезируются через Web Audio — в архиве нет аудиофайлов.
   Контекст создаётся после первого действия игрока и приостанавливается при паузе/рекламе/уходе со вкладки. */
(function () {
  'use strict';
  var G = window.G;
  var ctx = null, master, sfxBus, musBus, delay, noiseBuf;
  var last = {}, musicTimer = 0, nextBeat = 0, beat = 0, intense = 0;

  var Au = G.audio = {};

  Au.unlock = function () {
    if (ctx) { Au.apply(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.connect(master);
      musBus = ctx.createGain(); musBus.connect(master);
      delay = ctx.createDelay(1); delay.delayTime.value = 0.36;
      var fb = ctx.createGain(); fb.gain.value = 0.32;
      delay.connect(fb); fb.connect(delay); delay.connect(musBus);
      var len = ctx.sampleRate * 0.5 | 0;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      musicTimer = setInterval(schedule, 120);
    } catch (e) { ctx = null; return; }
    Au.apply();
  };

  /* Применяет настройки и состояние блокировки. */
  Au.apply = function () {
    if (!ctx) return;
    sfxBus.gain.value = G.save.sfx ? 1 : 0;
    musBus.gain.value = G.save.music ? 0.55 : 0;
    var silent = G.sys.blocked() || document.hidden;
    try {
      if (silent) { if (ctx.state === 'running') ctx.suspend(); }
      else if (ctx.state !== 'running') { ctx.resume(); nextBeat = 0; }
    } catch (e) { /* не критично */ }
  };

  Au.intensity = function (v) { intense = v; };

  function tone(f0, f1, dur, type, vol, at, bus) {
    var t = (at || 0) + ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(t); o.stop(t + dur + 0.03);
  }
  function noise(dur, vol, freq, at, q) {
    var t = (at || 0) + ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = q ? 'bandpass' : 'lowpass'; f.frequency.value = freq; if (q) f.Q.value = q;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfxBus);
    s.start(t); s.stop(t + dur + 0.03);
  }

  var SFX = {
    shoot: [70, function () { tone(820 + Math.random() * 160, 1300, 0.07, 'sine', 0.045); }],
    pop: [45, function () { tone(330 + Math.random() * 120, 90, 0.13, 'sine', 0.11); }],
    xp: [50, function () { tone(1250 + Math.random() * 500, 0, 0.07, 'triangle', 0.045); }],
    pearl: [60, function () { tone(1568, 0, 0.09, 'triangle', 0.07); tone(2093, 0, 0.14, 'triangle', 0.07, 0.07); }],
    heal: [100, function () { tone(523, 0, 0.12, 'sine', 0.1); tone(784, 0, 0.2, 'sine', 0.1, 0.1); }],
    hurt: [150, function () { tone(240, 90, 0.28, 'sawtooth', 0.14); noise(0.18, 0.12, 900); }],
    dash: [100, function () { noise(0.22, 0.14, 1800, 0, 1.2); }],
    nova: [120, function () { tone(160, 520, 0.32, 'sine', 0.13); }],
    zap: [90, function () { tone(1100, 180, 0.1, 'sawtooth', 0.06); noise(0.08, 0.06, 3200, 0, 2); }],
    boom: [80, function () { noise(0.3, 0.2, 520); tone(130, 42, 0.3, 'sine', 0.18); }],
    bigboom: [200, function () { noise(0.9, 0.3, 420); tone(110, 30, 0.9, 'sine', 0.3); }],
    boss: [500, function () { tone(98, 0, 0.7, 'sawtooth', 0.12); tone(92, 0, 0.9, 'sawtooth', 0.12, 0.35); tone(49, 0, 1.2, 'sine', 0.25); }],
    wave: [300, function () { tone(523, 0, 0.14, 'triangle', 0.1); tone(659, 0, 0.14, 'triangle', 0.1, 0.11); tone(784, 0, 0.3, 'triangle', 0.1, 0.22); }],
    level: [200, function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0, 0.22, 'triangle', 0.11, i * 0.07); }); }],
    click: [40, function () { tone(660, 880, 0.05, 'sine', 0.08); }],
    buy: [80, function () { tone(988, 0, 0.08, 'triangle', 0.1); tone(1319, 0, 0.2, 'triangle', 0.1, 0.07); }],
    deny: [120, function () { tone(196, 150, 0.16, 'square', 0.05); }],
    lose: [500, function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, 0, 0.4, 'triangle', 0.11, i * 0.16); }); }],
    win: [500, function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0, 0.45, 'triangle', 0.11, i * 0.12); }); }]
  };

  Au.sfx = function (name) {
    if (!ctx || ctx.state !== 'running' || !G.save.sfx) return;
    var s = SFX[name]; if (!s) return;
    var now = performance.now();
    if (now - (last[name] || 0) < s[0]) return;
    last[name] = now;
    try { s[1](); } catch (e) { /* не критично */ }
  };

  /* ---------- Процедурная музыка: мягкие аккорды + арпеджио ---------- */
  var CHORDS = [
    [220.0, 261.63, 329.63, 493.88],   // Am9
    [174.61, 220.0, 261.63, 329.63],   // Fmaj7
    [130.81, 196.0, 246.94, 329.63],   // Cmaj7
    [196.0, 246.94, 293.66, 440.0]     // G(add9)
  ];
  var BEAT = 0.42;

  function pad(f, t, dur) {
    var o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * 1.004;
    lp.type = 'lowpass'; lp.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + dur * 0.35);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(musBus);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  function pluck(f, t, vol) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g); g.connect(musBus); g.connect(delay);
    o.start(t); o.stop(t + 0.55);
  }
  function schedule() {
    if (!ctx || ctx.state !== 'running' || !G.save.music) return;
    var now = ctx.currentTime;
    if (nextBeat < now - 0.5 || nextBeat === 0) nextBeat = now + 0.08;
    while (nextBeat < now + 0.4) {
      var step = beat % 8, ch = CHORDS[(beat >> 3) % CHORDS.length], t = nextBeat;
      if (step === 0) {
        for (var i = 0; i < 3; i++) pad(ch[i], t, BEAT * 8.4);
        tone(ch[0] / 2, 0, BEAT * 3, 'sine', 0.11, t - now, musBus);
      }
      if (Math.random() < (intense ? 0.85 : 0.6)) {
        var n = ch[(Math.random() * 4) | 0] * (Math.random() < 0.5 ? 2 : 4);
        pluck(n, t, 0.035);
      }
      if (intense && step % 2 === 0) tone(95, 40, 0.22, 'sine', 0.16, t - now, musBus);
      nextBeat += BEAT * (intense ? 0.5 : 0.5);
      beat++;
    }
  }
})();
