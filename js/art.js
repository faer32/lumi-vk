/* Вся графика игры рисуется кодом на canvas: спрайты готовятся один раз при загрузке,
   поэтому в архиве нет картинок, а игра весит считаные килобайты. */
(function () {
  'use strict';
  var G = window.G, TAU = Math.PI * 2, PI = Math.PI, SR = 2;
  var A = G.art = { enemy: {}, glow: {}, xp: [], biomes: [] };

  /* ---------- Утилиты ---------- */
  function cv(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    return c;
  }
  // Спрайт w×h мировых единиц с началом координат в центре.
  function mk(w, h, fn, sr) {
    sr = sr || SR;
    var c = cv(w * sr, h * sr), x = c.getContext('2d');
    x.scale(sr, sr); x.translate(w / 2, h / 2);
    x.lineCap = 'round'; x.lineJoin = 'round';
    fn(x);
    c.hw = w / 2; c.hh = h / 2;
    return c;
  }
  function white(c) {
    var d = cv(c.width, c.height), x = d.getContext('2d');
    x.drawImage(c, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#fff'; x.fillRect(0, 0, d.width, d.height);
    d.hw = c.hw; d.hh = c.hh;
    return d;
  }
  function srand(seed) {
    var s = (seed >>> 0) || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function hex(h, a) {
    var n = parseInt(h.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function circ(x, px, py, r) { x.beginPath(); x.arc(px, py, r, 0, TAU); }
  function ell(x, px, py, rx, ry, rot) { x.beginPath(); x.ellipse(px, py, rx, ry, rot || 0, 0, TAU); }
  function poly(x, pts) {
    x.beginPath();
    for (var i = 0; i < pts.length; i += 2) { if (i) x.lineTo(pts[i], pts[i + 1]); else x.moveTo(pts[i], pts[i + 1]); }
    x.closePath();
  }
  function star(x, n, r1, r2, rot) {
    x.beginPath();
    for (var i = 0; i < n * 2; i++) {
      var a = (rot || 0) + i * PI / n, r = i % 2 ? r2 : r1;
      if (i) x.lineTo(Math.cos(a) * r, Math.sin(a) * r); else x.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    x.closePath();
  }
  function blob(x, r, n, amp, ph, sy) {
    x.beginPath();
    for (var i = 0; i <= 48; i++) {
      var a = i / 48 * TAU;
      var rr = r * (1 + amp * Math.sin(a * n + ph) + amp * 0.5 * Math.sin(a * (n + 3) + ph * 2.3));
      var px = Math.cos(a) * rr, py = Math.sin(a) * rr * (sy || 1);
      if (i) x.lineTo(px, py); else x.moveTo(px, py);
    }
    x.closePath();
  }

  /* ---------- Свечения ---------- */
  var GLOWS = {
    cyan: [90, 220, 255], white: [255, 255, 255], yellow: [255, 225, 110], pink: [255, 110, 190],
    orange: [255, 150, 60], green: [120, 255, 150], violet: [175, 125, 255], red: [255, 80, 90], lime: [200, 255, 110], blue: [150, 200, 255]
  };
  function glow(rgb) {
    var r = 32;
    return mk(r * 2, r * 2, function (x) {
      var g = x.createRadialGradient(0, 0, 0, 0, 0, r), c = rgb.join(',');
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.22, 'rgba(' + c + ',0.85)');
      g.addColorStop(0.55, 'rgba(' + c + ',0.25)');
      g.addColorStop(1, 'rgba(' + c + ',0)');
      x.fillStyle = g; x.fillRect(-r, -r, r * 2, r * 2);
    }, 1);
  }

  /* ---------- Чернильные существа ---------- */
  function ink(x, r, acc, c0, c1, c2) {
    var g = x.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.05, 0, 0, r * 1.2);
    g.addColorStop(0, c0 || '#55428c'); g.addColorStop(0.55, c1 || '#261a47'); g.addColorStop(1, c2 || '#0f0920');
    x.save(); x.shadowColor = acc; x.shadowBlur = r * 0.5 * SR; x.fillStyle = g; x.fill(); x.restore();
    x.lineWidth = Math.max(1.7, r * 0.11); x.strokeStyle = acc; x.stroke();
  }
  function shine(x, r) {
    x.fillStyle = 'rgba(255,255,255,0.16)';
    ell(x, -r * 0.32, -r * 0.5, r * 0.34, r * 0.16, -0.5); x.fill();
  }
  function eye(x, ex, ey, er, col, slit) {
    x.save(); x.shadowColor = col; x.shadowBlur = er * 1.5 * SR; x.fillStyle = col; circ(x, ex, ey, er); x.fill(); x.restore();
    x.fillStyle = '#170d2c';
    if (slit) ell(x, ex, ey, er * 0.28, er * 0.8); else circ(x, ex + er * 0.2, ey + er * 0.12, er * 0.48);
    x.fill();
    x.fillStyle = 'rgba(255,255,255,0.95)'; circ(x, ex - er * 0.3, ey - er * 0.32, er * 0.22); x.fill();
  }
  function brows(x, ex, ey, er, col) {
    x.strokeStyle = col; x.lineWidth = Math.max(1.4, er * 0.45);
    x.beginPath(); x.moveTo(-ex - er * 1.2, ey - er * 1.5); x.lineTo(-ex + er * 0.9, ey - er * 0.8);
    x.moveTo(ex + er * 1.2, ey - er * 1.5); x.lineTo(ex - er * 0.9, ey - er * 0.8); x.stroke();
  }
  function enemySprite(r, fn) {
    var s = r * 4.2, c = mk(s, s, fn);
    c.white = white(c);
    return c;
  }

  function buildEnemies() {
    var E = A.enemy;
    E.blot = enemySprite(15, function (x) {
      blob(x, 15, 5, 0.06, 1); ink(x, 15, '#b98cff'); shine(x, 15);
      eye(x, -5.5, -2, 3.7, '#ffe27a'); eye(x, 5.5, -2, 3.7, '#ffe27a'); brows(x, 5.5, -2, 3.7, '#b98cff');
      x.strokeStyle = '#b98cff'; x.lineWidth = 1.5; x.beginPath(); x.arc(0, 8.5, 3.2, PI * 1.15, PI * 1.85); x.stroke();
    });
    E.dart = enemySprite(11, function (x) {
      x.beginPath(); x.moveTo(15, 0); x.quadraticCurveTo(4, -11, -9, -6); x.lineTo(-17, -10); x.lineTo(-13, 0);
      x.lineTo(-17, 10); x.lineTo(-9, 6); x.quadraticCurveTo(4, 11, 15, 0); x.closePath();
      ink(x, 11, '#ff7ac8'); eye(x, 5, -1, 3.3, '#c8f6ff');
    });
    E.swarm = enemySprite(8, function (x) {
      x.beginPath(); x.arc(2, 0, 6.5, PI + 0.6, 3 * PI - 0.6); x.lineTo(-13, 0); x.closePath();
      ink(x, 8, '#c69bff'); eye(x, 4, -0.5, 2.3, '#ffffff');
    });
    E.bulk = enemySprite(27, function (x) {
      blob(x, 27, 4, 0.05, 0.5, 0.92); ink(x, 27, '#ff6b6b', '#6a3a6e', '#2c1838', '#120a1e'); shine(x, 27);
      x.fillStyle = 'rgba(8,4,18,0.35)'; circ(x, -13, 9, 4.5); x.fill(); circ(x, 15, 5, 3.5); x.fill(); circ(x, 4, 16, 3); x.fill();
      eye(x, -8.5, -6, 4.4, '#ffb199'); eye(x, 8.5, -6, 4.4, '#ffb199'); brows(x, 8.5, -6, 4.4, '#ff6b6b');
      x.strokeStyle = '#ff6b6b'; x.lineWidth = 2.2; x.beginPath(); x.arc(0, 13, 8, PI * 1.15, PI * 1.85); x.stroke();
    });
    E.spitter = enemySprite(16, function (x) {
      blob(x, 16, 6, 0.05, 2); ink(x, 16, '#7dffb0'); shine(x, 16);
      eye(x, 0, -4.5, 5.2, '#a8ffcb');
      x.save(); x.shadowColor = '#7dffb0'; x.shadowBlur = 8; x.fillStyle = '#7dffb0'; circ(x, 0, 7.5, 3.4); x.fill(); x.restore();
      x.fillStyle = '#12241c'; circ(x, 0, 7.5, 1.9); x.fill();
    });
    E.splitter = enemySprite(20, function (x) {
      x.beginPath(); x.arc(-7.5, 0, 14, 0, TAU); x.moveTo(21.5, 0); x.arc(7.5, 0, 14, 0, TAU);
      ink(x, 20, '#c8ff6b');
      x.fillStyle = '#261a47'; circ(x, -7.5, 0, 12.6); x.fill(); circ(x, 7.5, 0, 12.6); x.fill();
      shine(x, 18);
      eye(x, -9, -2, 4, '#eaff9c'); eye(x, 9, -2, 4, '#eaff9c');
    });
    E.mini = enemySprite(10, function (x) {
      blob(x, 10, 4, 0.07, 3); ink(x, 10, '#c8ff6b'); eye(x, -3.4, -1, 2.5, '#eaff9c'); eye(x, 3.4, -1, 2.5, '#eaff9c');
    });
    E.puffer = enemySprite(15, function (x) {
      star(x, 11, 19.5, 13.5, 0.2); ink(x, 15, '#ffa64d', '#6d4a54', '#2e1a33', '#140a1c');
      eye(x, -5, -2, 3.4, '#ffd27a'); eye(x, 5, -2, 3.4, '#ffd27a'); brows(x, 5, -2, 3.4, '#ffa64d');
    });
    E.phantom = enemySprite(16, function (x) {
      x.beginPath(); x.moveTo(-14, 13); x.lineTo(-14, -2); x.bezierCurveTo(-14, -22, 14, -22, 14, -2); x.lineTo(14, 13);
      x.quadraticCurveTo(10.5, 7, 7, 13); x.quadraticCurveTo(3.5, 18, 0, 13); x.quadraticCurveTo(-3.5, 7, -7, 13); x.quadraticCurveTo(-10.5, 18, -14, 13); x.closePath();
      ink(x, 16, '#9fd8ff', '#4a6aa8', '#22305e', '#101833'); shine(x, 15);
      x.save(); x.shadowColor = '#dff3ff'; x.shadowBlur = 10; x.fillStyle = '#eaf7ff';
      ell(x, -5.2, -4, 2.8, 3.8); x.fill(); ell(x, 5.2, -4, 2.8, 3.8); x.fill(); x.restore();
    });

    // Стражи зон
    E.boss0 = enemySprite(56, function (x) {
      blob(x, 56, 7, 0.045, 0.7); ink(x, 56, '#b98cff'); shine(x, 54);
      x.fillStyle = 'rgba(8,4,18,0.3)';
      [[-30, 22, 7], [28, 26, 6], [0, 38, 5], [-38, -8, 4], [40, -4, 5]].forEach(function (p) { circ(x, p[0], p[1], p[2]); x.fill(); });
      eye(x, -19, -9, 11, '#ffe27a', true); eye(x, 19, -9, 11, '#ffe27a', true); brows(x, 19, -9, 9, '#b98cff');
      x.strokeStyle = '#b98cff'; x.lineWidth = 3; x.beginPath();
      x.moveTo(-16, 22); x.lineTo(-8, 17); x.lineTo(0, 22); x.lineTo(8, 17); x.lineTo(16, 22); x.stroke();
    });
    E.boss1 = enemySprite(60, function (x) {
      x.fillStyle = '#ffd76a'; x.strokeStyle = '#fff1b8'; x.lineWidth = 2;
      for (var i = -2; i <= 2; i++) {
        x.beginPath(); x.moveTo(i * 17 - 8, -42); x.lineTo(i * 17, -72 + Math.abs(i) * 7); x.lineTo(i * 17 + 8, -42); x.closePath(); x.fill(); x.stroke();
      }
      blob(x, 60, 6, 0.04, 1.4, 0.9); ink(x, 60, '#ff7ac8', '#6a3f80', '#2c1a45', '#120a20'); shine(x, 56);
      eye(x, -24, -10, 8, '#ffb0e0'); eye(x, 0, -16, 10, '#ffb0e0', true); eye(x, 24, -10, 8, '#ffb0e0');
      x.strokeStyle = '#ff7ac8'; x.lineWidth = 3; x.beginPath(); x.arc(0, 30, 14, PI * 1.12, PI * 1.88); x.stroke();
    });
    E.boss2 = enemySprite(58, function (x) {
      star(x, 14, 70, 50, 0); ink(x, 58, '#ffa64d', '#6d4a54', '#2e1a33', '#140a1c');
      x.strokeStyle = 'rgba(255,166,77,0.45)'; x.lineWidth = 2.5; circ(x, 0, 0, 36); x.stroke();
      eye(x, 0, 0, 17, '#ffd27a', true);
    });
    E.boss3 = enemySprite(68, function (x) {
      blob(x, 68, 3, 0.085, 0.4); ink(x, 68, '#ff5a6e', '#7a3558', '#33142e', '#13081a'); shine(x, 64);
      [[-40, -28, 5], [42, -24, 5], [-46, 14, 4.5], [46, 18, 4.5], [0, 46, 5]].forEach(function (p) { eye(x, p[0], p[1], p[2], '#ff9aa6'); });
      eye(x, 0, -4, 22, '#ff8492', true);
    });
  }

  /* ---------- Снаряды и предметы ---------- */
  function buildItems() {
    for (var k in GLOWS) A.glow[k] = glow(GLOWS[k]);

    A.bubble = mk(26, 26, function (x) {
      var g = x.createRadialGradient(-2, -2, 1, 0, 0, 8);
      g.addColorStop(0, 'rgba(235,255,255,0.95)'); g.addColorStop(0.6, 'rgba(120,225,255,0.75)'); g.addColorStop(1, 'rgba(60,170,240,0.55)');
      x.save(); x.shadowColor = '#7fe6ff'; x.shadowBlur = 10; x.fillStyle = g; circ(x, 0, 0, 7.5); x.fill(); x.restore();
      x.strokeStyle = 'rgba(240,255,255,0.95)'; x.lineWidth = 1.3; circ(x, 0, 0, 7.5); x.stroke();
      x.fillStyle = '#fff'; ell(x, -2.6, -3, 2.2, 1.2, -0.6); x.fill();
    });
    A.ebullet = mk(30, 30, function (x) {
      x.save(); x.shadowColor = '#ff4f9a'; x.shadowBlur = 14; x.fillStyle = '#2a0f2e'; circ(x, 0, 0, 6.5); x.fill(); x.restore();
      x.strokeStyle = '#ff6fb0'; x.lineWidth = 2.4; circ(x, 0, 0, 6.5); x.stroke();
      x.fillStyle = '#ffc0dc'; circ(x, -2, -2, 1.6); x.fill();
    });
    A.starfish = mk(34, 34, function (x) {
      x.save(); x.shadowColor = '#ffb04d'; x.shadowBlur = 12;
      star(x, 5, 11, 4.6, -PI / 2); x.fillStyle = '#ff9d4a'; x.strokeStyle = '#ff9d4a'; x.lineWidth = 3.4; x.fill(); x.stroke(); x.restore();
      x.fillStyle = '#ffe1b0';
      for (var i = 0; i < 5; i++) { var a = -PI / 2 + i * TAU / 5; circ(x, Math.cos(a) * 6, Math.sin(a) * 6, 1.1); x.fill(); }
      circ(x, 0, 0, 1.8); x.fill();
    });
    A.orb = mk(30, 30, function (x) {
      var g = x.createRadialGradient(-2.5, -2.5, 0.5, 0, 0, 8);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#ffe9f4'); g.addColorStop(1, '#e4a9d6');
      x.save(); x.shadowColor = '#ffd6f0'; x.shadowBlur = 14; x.fillStyle = g; circ(x, 0, 0, 7.5); x.fill(); x.restore();
    });
    // Искры опыта трёх достоинств
    [['#8ff0ff', '#35b8ee'], ['#a8ffb8', '#3fcf78'], ['#fff0a0', '#ffb62e']].forEach(function (cc, i) {
      var r = 5 + i * 1.6;
      A.xp.push(mk(28, 28, function (x) {
        x.save(); x.shadowColor = cc[0]; x.shadowBlur = 12;
        poly(x, [0, -r, r * 0.75, 0, 0, r, -r * 0.75, 0]); x.fillStyle = cc[1]; x.fill(); x.restore();
        poly(x, [0, -r, r * 0.75, 0, 0, 0, -r * 0.75, 0]); x.fillStyle = cc[0]; x.fill();
        x.fillStyle = '#fff'; circ(x, -r * 0.2, -r * 0.35, 1.2); x.fill();
      }));
    });
    A.pearl = mk(26, 26, function (x) {
      var g = x.createRadialGradient(-2, -2.5, 0.5, 0, 0, 7);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#fff3e6'); g.addColorStop(1, '#f0b9a6');
      x.save(); x.shadowColor = '#fff1d6'; x.shadowBlur = 10; x.fillStyle = g; circ(x, 0, 0, 6.5); x.fill(); x.restore();
      x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 1; circ(x, 0, 0, 6.5); x.stroke();
    });
    A.heart = mk(34, 34, function (x) {
      x.save(); x.shadowColor = '#ff7aa8'; x.shadowBlur = 12; heartPath(x, 9); x.fillStyle = '#ff5f93'; x.fill(); x.restore();
      x.fillStyle = 'rgba(255,255,255,0.7)'; ell(x, -4, -4, 2.6, 1.5, -0.6); x.fill();
    });
    A.magnet = mk(34, 34, function (x) {
      x.save(); x.shadowColor = '#7fe6ff'; x.shadowBlur = 12; magnetPath(x, 9); x.restore();
    });
    A.shadow = mk(64, 32, function (x) {
      var g = x.createRadialGradient(0, 0, 2, 0, 0, 30);
      g.addColorStop(0, 'rgba(2,10,22,0.45)'); g.addColorStop(1, 'rgba(2,10,22,0)');
      x.save(); x.scale(1, 0.5); x.fillStyle = g; x.fillRect(-32, -32, 64, 64); x.restore();
    }, 1);
    function vig(rgb) {
      var c = cv(256, 256), x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 60, 128, 128, 182);
      g.addColorStop(0, 'rgba(' + rgb + ',0)'); g.addColorStop(1, 'rgba(' + rgb + ',1)');
      x.fillStyle = g; x.fillRect(0, 0, 256, 256); return c;
    }
    A.vignette = vig('2,10,24');
    A.vignetteRed = vig('255,40,72');
    A.caustics = (function () {
      var S = 512, c = cv(S, S), x = c.getContext('2d'), R = srand(77);
      x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineCap = 'round';
      for (var i = 0; i < 46; i++) {
        var px = R() * S, py = R() * S, r = 26 + R() * 46, a0 = R() * TAU, len = 1.2 + R() * 2.4;
        x.lineWidth = 1.5 + R() * 3;
        for (var ox = -S; ox <= S; ox += S) for (var oy = -S; oy <= S; oy += S) {
          x.beginPath(); x.ellipse(px + ox, py + oy, r, r * (0.6 + R() * 0.1), a0, 0, len); x.stroke();
        }
      }
      return c;
    })();
  }
  function heartPath(x, s) {
    x.beginPath(); x.moveTo(0, s * 0.9);
    x.bezierCurveTo(-s * 1.5, -s * 0.2, -s * 0.7, -s * 1.2, 0, -s * 0.4);
    x.bezierCurveTo(s * 0.7, -s * 1.2, s * 1.5, -s * 0.2, 0, s * 0.9); x.closePath();
  }
  function magnetPath(x, s) {
    x.lineCap = 'butt'; x.lineWidth = s * 0.62;
    x.strokeStyle = '#ff5f6f'; x.beginPath(); x.arc(0, 0, s * 0.72, 0, PI); x.stroke();
    x.beginPath(); x.moveTo(-s * 0.72, 0); x.lineTo(-s * 0.72, -s * 0.5); x.moveTo(s * 0.72, 0); x.lineTo(s * 0.72, -s * 0.5); x.stroke();
    x.strokeStyle = '#f2fbff'; x.beginPath(); x.moveTo(-s * 0.72, -s * 0.5); x.lineTo(-s * 0.72, -s); x.moveTo(s * 0.72, -s * 0.5); x.lineTo(s * 0.72, -s); x.stroke();
    x.lineCap = 'round';
  }

  /* ---------- Герои (рисуются каждый кадр — у них живые щупальца и клешни) ---------- */
  A.hero = function (c, id, t, tx, ty) {
    c.lineCap = 'round'; c.lineJoin = 'round';
    if (id === 'bronya') crab(c, t); else if (id === 'iskra') ray(c, t, tx, ty); else jelly(c, t, tx, ty);
  };
  function jelly(c, t, tx, ty) {
    var i, bx, g;
    c.lineWidth = 3;
    for (i = 0; i < 5; i++) {
      bx = -8 + i * 4;
      c.strokeStyle = i % 2 ? 'rgba(150,235,255,0.85)' : 'rgba(215,250,255,0.9)';
      c.beginPath(); c.moveTo(bx, 5);
      c.quadraticCurveTo(bx + Math.sin(t * 7 + i * 1.3) * 3.5 + tx * 7, 12 + ty * 5, bx + tx * 15 + Math.sin(t * 5 + i) * 3, 13 + ty * 10 + Math.abs(tx) * 2);
      c.stroke();
    }
    g = c.createLinearGradient(0, -17, 0, 8);
    g.addColorStop(0, '#f4ffff'); g.addColorStop(0.5, '#86e8ff'); g.addColorStop(1, '#2f9fd8');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(-15, 6); c.bezierCurveTo(-17, -23, 17, -23, 15, 6);
    c.quadraticCurveTo(10, 10, 5, 6); c.quadraticCurveTo(0, 10, -5, 6); c.quadraticCurveTo(-10, 10, -15, 6); c.closePath(); c.fill();
    c.lineWidth = 1.6; c.strokeStyle = 'rgba(238,255,255,0.95)'; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.5)'; ell(c, -6.5, -10, 4, 2.2, -0.6); c.fill();
    c.fillStyle = '#0e2c4d'; ell(c, -5, -1.5, 2.6, 3.4); c.fill(); ell(c, 5, -1.5, 2.6, 3.4); c.fill();
    c.fillStyle = '#fff'; circ(c, -5.8, -2.8, 1); c.fill(); circ(c, 4.2, -2.8, 1); c.fill();
    c.fillStyle = 'rgba(255,140,175,0.75)'; circ(c, -9.5, 2.5, 2); c.fill(); circ(c, 9.5, 2.5, 2); c.fill();
    c.strokeStyle = '#0e2c4d'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 1.6, 2.4, 0.25, PI - 0.25); c.stroke();
    // фонарик
    var lx = 10 + Math.sin(t * 3) * 1.5, ly = -23 + Math.cos(t * 3) * 1;
    c.strokeStyle = 'rgba(215,250,255,0.9)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(1, -15); c.quadraticCurveTo(4, -26, lx, ly); c.stroke();
    c.fillStyle = '#fff6b0'; circ(c, lx, ly, 3); c.fill();
    c.fillStyle = '#fff'; circ(c, lx - 0.8, ly - 0.8, 1.1); c.fill();
  }
  function crab(c, t) {
    var i, s, g, cy;
    c.strokeStyle = '#d9562b'; c.lineWidth = 2.6;
    for (s = -1; s <= 1; s += 2) for (i = 0; i < 3; i++) {
      c.beginPath(); c.moveTo(s * 10, 4 + i * 2.5);
      c.lineTo(s * (18 + i), 8 + i * 3 + Math.sin(t * 10 + i * 2 + s) * 1.8); c.stroke();
    }
    for (s = -1; s <= 1; s += 2) {
      cy = -7 + Math.sin(t * 4 + s) * 2;
      c.strokeStyle = '#d9562b'; c.lineWidth = 3; c.beginPath(); c.moveTo(s * 11, -3); c.lineTo(s * 17, cy + 3); c.stroke();
      c.fillStyle = '#ff8a4a'; c.strokeStyle = '#ffd9b0'; c.lineWidth = 1.3;
      var open = 0.45 + Math.sin(t * 5 + s) * 0.2, base = s > 0 ? -PI / 2 + 0.3 : -PI / 2 - 0.3;
      c.beginPath(); c.moveTo(s * 20, cy); c.arc(s * 20, cy, 7.5, base + open, base - open + TAU); c.closePath(); c.fill(); c.stroke();
    }
    g = c.createLinearGradient(0, -13, 0, 12);
    g.addColorStop(0, '#ffc07a'); g.addColorStop(0.55, '#ff8a4a'); g.addColorStop(1, '#d9482a');
    c.fillStyle = g; ell(c, 0, 0, 16, 12); c.fill();
    c.strokeStyle = '#ffe0bd'; c.lineWidth = 1.6; c.stroke();
    c.strokeStyle = 'rgba(160,50,20,0.5)'; c.lineWidth = 1.4;
    c.beginPath(); c.arc(0, 14, 13, PI * 1.2, PI * 1.8); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.4)'; ell(c, -6, -6.5, 4.5, 2, -0.4); c.fill();
    for (s = -1; s <= 1; s += 2) {
      c.strokeStyle = '#ff8a4a'; c.lineWidth = 2; c.beginPath(); c.moveTo(s * 5, -10); c.lineTo(s * 6, -16); c.stroke();
      c.fillStyle = '#fff'; circ(c, s * 6, -17.5, 3.6); c.fill();
      c.fillStyle = '#2a1408'; circ(c, s * 6 + 0.8, -17.2, 1.8); c.fill();
    }
    c.strokeStyle = '#7a2410'; c.lineWidth = 1.3; c.beginPath(); c.arc(0, 0.5, 3.4, 0.25, PI - 0.25); c.stroke();
  }
  function ray(c, t, tx, ty) {
    var fl = 1 + Math.sin(t * 9) * 0.12, i, g;
    c.strokeStyle = '#b48cff'; c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(-12, 0);
    for (i = 1; i <= 4; i++) c.lineTo(-12 - i * 4.5 + tx * i * 1.5 + 4, Math.sin(t * 8 + i * 1.4) * 3.2 + ty * i * 2.5);
    c.stroke();
    g = c.createLinearGradient(-12, 0, 16, 0);
    g.addColorStop(0, '#ffb81a'); g.addColorStop(0.6, '#ffe45c'); g.addColorStop(1, '#fffbd0');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(17, 0); c.quadraticCurveTo(3, -19 * fl, -12, -4); c.lineTo(-15, 0); c.lineTo(-12, 4); c.quadraticCurveTo(3, 19 * fl, 17, 0); c.closePath(); c.fill();
    c.strokeStyle = '#fffbe0'; c.lineWidth = 1.5; c.stroke();
    c.strokeStyle = '#8f5cff'; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(-8, -1); c.lineTo(-2, 2.5); c.lineTo(-1, -2.5); c.lineTo(5, 1); c.stroke();
    c.fillStyle = '#3a2408'; ell(c, 10, -4, 1.8, 2.2); c.fill(); ell(c, 10, 4, 1.8, 2.2); c.fill();
    c.fillStyle = '#fff'; circ(c, 10.5, -4.6, 0.7); c.fill(); circ(c, 10.5, 3.4, 0.7); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 1.2;
    for (i = 0; i < 3; i++) {
      var a = t * 6 + i * 2.1, k = Math.sin(a * 1.7 + i);
      if (k > 0.3) { var sx = Math.cos(a) * 20, sy = Math.sin(a) * 15; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + 3, sy - 3); c.lineTo(sx + 1, sy + 3); c.stroke(); }
    }
  }

  /* ---------- Декорации зон ---------- */
  function coral(c1, c2, seed) {
    var s = mk(96, 96, function (x) {
      var R = srand(seed);
      x.fillStyle = 'rgba(2,10,22,0.28)'; ell(x, 0, 36, 26, 7); x.fill();
      function br(px, py, a, len, w, d) {
        var ex = px + Math.cos(a) * len, ey = py + Math.sin(a) * len;
        x.lineWidth = w; x.strokeStyle = d > 1 ? c1 : c2;
        x.beginPath(); x.moveTo(px, py); x.lineTo(ex, ey); x.stroke();
        if (d > 0) { var n = 2 + (R() < 0.4 ? 1 : 0); for (var i = 0; i < n; i++) br(ex, ey, a + (R() - 0.5) * 1.5, len * 0.72, w * 0.72, d - 1); }
        else { x.fillStyle = 'rgba(255,255,255,0.7)'; circ(x, ex, ey, 1.4); x.fill(); }
      }
      for (var i = 0; i < 3; i++) br(-12 + i * 12 + R() * 4, 34, -PI / 2 + (R() - 0.5) * 0.7, 19, 7, 3);
    });
    s.sway = 1; return s;
  }
  function rock(c1, c2, seed, moss) {
    return mk(90, 70, function (x) {
      var R = srand(seed), pts = [], i, a, r;
      x.fillStyle = 'rgba(2,10,22,0.28)'; ell(x, 0, 20, 34, 8); x.fill();
      for (i = 0; i < 9; i++) { a = i / 9 * TAU; r = 24 + R() * 10; pts.push(Math.cos(a) * r * 1.2, Math.sin(a) * r * 0.72); }
      var g = x.createLinearGradient(0, -24, 0, 24); g.addColorStop(0, c2); g.addColorStop(1, c1);
      poly(x, pts); x.fillStyle = g; x.fill(); x.lineWidth = 2; x.strokeStyle = 'rgba(0,0,0,0.25)'; x.stroke();
      x.strokeStyle = 'rgba(255,255,255,0.22)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(-18, -8); x.quadraticCurveTo(-4, -17, 12, -11); x.stroke();
      x.strokeStyle = 'rgba(0,0,0,0.2)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(2, -2); x.lineTo(8, 8); x.lineTo(16, 10); x.stroke();
      if (moss) { x.fillStyle = hex(moss, 0.7); ell(x, -10, -12, 12, 4, -0.2); x.fill(); ell(x, 12, -9, 8, 3, 0.3); x.fill(); }
    });
  }
  function kelp(col, col2, seed, h) {
    var s = mk(80, h + 20, function (x) {
      var R = srand(seed), f, i;
      x.fillStyle = 'rgba(2,10,22,0.28)'; ell(x, 0, h / 2, 20, 6); x.fill();
      for (f = 0; f < 4; f++) {
        var bx = -15 + f * 10 + R() * 4, top = -h / 2 + 6 + R() * 18, seg = (h / 2 - top) / 5, dir = R() < 0.5 ? 1 : -1;
        x.strokeStyle = f % 2 ? col : col2; x.lineWidth = 5.5 - f * 0.5;
        x.beginPath(); x.moveTo(bx, h / 2);
        for (i = 1; i <= 5; i++) x.quadraticCurveTo(bx + dir * 9 * (i % 2 ? 1 : -1), h / 2 - seg * (i - 0.5), bx + dir * 2 * (i % 2 ? 1 : -1), h / 2 - seg * i);
        x.stroke();
        x.fillStyle = f % 2 ? col2 : col;
        for (i = 1; i <= 4; i++) { ell(x, bx + dir * 7 * (i % 2 ? 1 : -1), h / 2 - seg * i + 2, 5.5, 2.4, dir * (i % 2 ? 0.7 : -0.7)); x.fill(); }
      }
    });
    s.sway = 1; return s;
  }
  function shell() {
    return mk(44, 40, function (x) {
      x.fillStyle = 'rgba(2,10,22,0.25)'; ell(x, 0, 12, 16, 4); x.fill();
      var g = x.createLinearGradient(0, -14, 0, 12); g.addColorStop(0, '#fff1e2'); g.addColorStop(1, '#f2a98c');
      x.beginPath(); x.moveTo(0, 12);
      for (var i = 0; i <= 6; i++) { var a = PI + i / 6 * PI, px = Math.cos(a) * 15, py = Math.sin(a) * 15 + 2; x.quadraticCurveTo(Math.cos(a - 0.26) * 18, Math.sin(a - 0.26) * 18 + 2, px, py); }
      x.closePath(); x.fillStyle = g; x.fill(); x.strokeStyle = '#c97a62'; x.lineWidth = 1.2; x.stroke();
      for (i = 1; i < 6; i++) { a = PI + i / 6 * PI; x.beginPath(); x.moveTo(0, 12); x.lineTo(Math.cos(a) * 14, Math.sin(a) * 14 + 2); x.stroke(); }
    });
  }
  function starDecor() {
    return mk(46, 46, function (x) {
      x.fillStyle = 'rgba(2,10,22,0.22)'; ell(x, 1, 3, 17, 15); x.fill();
      star(x, 5, 16, 6.8, -PI / 2 + 0.2); x.fillStyle = '#ff9d5c'; x.strokeStyle = '#ff9d5c'; x.lineWidth = 4.5; x.fill(); x.stroke();
      x.fillStyle = '#ffd9b0';
      for (var i = 0; i < 5; i++) { var a = -PI / 2 + 0.2 + i * TAU / 5; circ(x, Math.cos(a) * 9, Math.sin(a) * 9, 1.5); x.fill(); circ(x, Math.cos(a) * 4.5, Math.sin(a) * 4.5, 1.2); x.fill(); }
    });
  }
  function anemone(col, tip, base) {
    var s = mk(56, 50, function (x) {
      x.fillStyle = 'rgba(2,10,22,0.28)'; ell(x, 0, 16, 18, 5); x.fill();
      x.fillStyle = base; ell(x, 0, 12, 12, 7); x.fill();
      for (var i = 0; i < 10; i++) {
        var a = -PI * 0.93 + i / 9 * PI * 0.86, len = 17 + (i % 3) * 3, ex = Math.cos(a) * len, ey = 8 + Math.sin(a) * len;
        x.strokeStyle = col; x.lineWidth = 3.4; x.beginPath(); x.moveTo(Math.cos(a) * 5, 9); x.quadraticCurveTo(ex * 0.5 + 3, ey * 0.6, ex, ey); x.stroke();
        x.save(); x.shadowColor = tip; x.shadowBlur = 8; x.fillStyle = tip; circ(x, ex, ey, 2.1); x.fill(); x.restore();
      }
    });
    s.sway = 1; return s;
  }
  function column(broken, seed) {
    return mk(64, 116, function (x) {
      var R = srand(seed), top = broken ? -8 - R() * 14 : -42, i;
      x.fillStyle = 'rgba(2,10,22,0.3)'; ell(x, 0, 50, 26, 7); x.fill();
      var g = x.createLinearGradient(-13, 0, 13, 0); g.addColorStop(0, '#7f93c4'); g.addColorStop(0.45, '#cfdbf7'); g.addColorStop(1, '#7386b8');
      x.fillStyle = g;
      if (broken) { poly(x, [-12, 42, -12, top + 6, -6, top - 3, 0, top + 5, 6, top - 5, 12, top + 3, 12, 42]); x.fill(); }
      else x.fillRect(-12, top, 24, 42 - top);
      x.strokeStyle = 'rgba(40,55,100,0.35)'; x.lineWidth = 1.4;
      for (i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(i * 6, top + 10); x.lineTo(i * 6, 40); x.stroke(); }
      x.fillStyle = '#a9b9e4'; x.fillRect(-17, 40, 34, 9);
      x.fillStyle = '#8fa2d2'; x.fillRect(-17, 46, 34, 3);
      if (!broken) { x.fillStyle = '#b9c8ee'; x.fillRect(-16, top - 8, 32, 9); x.fillStyle = '#93a6d6'; x.fillRect(-16, top - 1, 32, 2.5); }
      else { x.fillStyle = '#9db0de'; x.save(); x.translate(22, 44); x.rotate(0.3); x.fillRect(-9, -5, 18, 10); x.restore(); }
      x.fillStyle = 'rgba(90,200,150,0.5)'; ell(x, -8, 30, 7, 3, 0.3); x.fill(); ell(x, 7, 12, 5, 2.4, -0.4); x.fill();
    });
  }
  function slab(seed) {
    return mk(100, 60, function (x) {
      var R = srand(seed);
      poly(x, [-40, -6, 22, -18, 42, 2, -18, 18]); x.fillStyle = '#7f95c9'; x.fill();
      x.strokeStyle = 'rgba(210,225,255,0.5)'; x.lineWidth = 2; x.stroke();
      x.strokeStyle = 'rgba(30,40,80,0.4)'; x.lineWidth = 1.4;
      x.beginPath(); x.moveTo(-8, -6); x.lineTo(2 + R() * 6, 2); x.lineTo(-4, 10); x.moveTo(2, 2); x.lineTo(20, 0); x.stroke();
      x.fillStyle = 'rgba(90,200,150,0.4)'; ell(x, 20, -6, 9, 3.4, -0.2); x.fill();
    });
  }
  function amphora() {
    return mk(50, 60, function (x) {
      x.fillStyle = 'rgba(2,10,22,0.28)'; ell(x, 2, 20, 20, 5); x.fill();
      x.save(); x.rotate(0.9);
      var g = x.createLinearGradient(-10, 0, 10, 0); g.addColorStop(0, '#a8643f'); g.addColorStop(0.5, '#e0a479'); g.addColorStop(1, '#9a5836');
      x.beginPath(); x.moveTo(-4, -20); x.lineTo(4, -20); x.lineTo(3.4, -14); x.bezierCurveTo(14, -8, 12, 12, 2, 20); x.lineTo(-2, 20); x.bezierCurveTo(-12, 12, -14, -8, -3.4, -14); x.closePath();
      x.fillStyle = g; x.fill(); x.strokeStyle = '#6e3c22'; x.lineWidth = 1.2; x.stroke();
      x.strokeStyle = '#6e3c22'; x.lineWidth = 2; x.beginPath(); x.moveTo(-9.5, 0); x.lineTo(9.5, 0); x.stroke();
      x.lineWidth = 1.8; x.beginPath(); x.arc(-8, -12, 4.5, PI * 0.5, PI * 1.5); x.stroke(); x.beginPath(); x.arc(8, -12, 4.5, -PI * 0.5, PI * 0.5); x.stroke();
      x.restore();
    });
  }
  function crystal(col, lite, seed) {
    return mk(70, 80, function (x) {
      var R = srand(seed);
      x.fillStyle = 'rgba(2,10,22,0.3)'; ell(x, 0, 28, 24, 6); x.fill();
      for (var i = 0; i < 4; i++) {
        var bx = -15 + i * 10 + R() * 4, h = 26 + R() * 30, w = 6 + R() * 4, lean = (bx / 15) * 9 + (R() - 0.5) * 6;
        var g = x.createLinearGradient(bx, 28, bx + lean, 28 - h); g.addColorStop(0, hex(col, 0.75)); g.addColorStop(1, lite);
        x.save(); x.shadowColor = col; x.shadowBlur = 16;
        poly(x, [bx - w, 28, bx + lean - w * 0.3, 28 - h * 0.85, bx + lean, 28 - h, bx + lean + w * 0.5, 28 - h * 0.8, bx + w, 28]);
        x.fillStyle = g; x.fill(); x.restore();
        x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 1; x.beginPath(); x.moveTo(bx + lean, 28 - h); x.lineTo(bx + 1, 28); x.stroke();
      }
    });
  }
  function vent() {
    return mk(70, 64, function (x) {
      x.fillStyle = 'rgba(2,10,22,0.3)'; ell(x, 0, 22, 30, 7); x.fill();
      poly(x, [-26, 24, -10, -10, 10, -10, 26, 24]); var g = x.createLinearGradient(0, -10, 0, 24); g.addColorStop(0, '#3a2030'); g.addColorStop(1, '#170d1c');
      x.fillStyle = g; x.fill(); x.strokeStyle = 'rgba(255,120,80,0.35)'; x.lineWidth = 1.5; x.stroke();
      x.save(); x.shadowColor = '#ff7a3c'; x.shadowBlur = 22; x.fillStyle = '#ff8a4a'; ell(x, 0, -10, 10, 3.6); x.fill(); x.restore();
      x.fillStyle = '#ffe0a0'; ell(x, 0, -10, 5, 1.6); x.fill();
      x.strokeStyle = 'rgba(255,140,80,0.5)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(-6, -2); x.lineTo(-10, 12); x.moveTo(5, 0); x.lineTo(9, 16); x.stroke();
    });
  }
  function spikes(seed) {
    return mk(70, 70, function (x) {
      var R = srand(seed);
      x.fillStyle = 'rgba(2,10,22,0.3)'; ell(x, 0, 24, 24, 6); x.fill();
      for (var i = 0; i < 4; i++) {
        var bx = -16 + i * 11, h = 22 + R() * 26, cv2 = (R() - 0.5) * 22;
        x.beginPath(); x.moveTo(bx - 6, 26); x.quadraticCurveTo(bx + cv2 * 0.4, 26 - h * 0.6, bx + cv2, 26 - h); x.quadraticCurveTo(bx + cv2 * 0.4 + 5, 26 - h * 0.5, bx + 6, 26); x.closePath();
        x.fillStyle = '#1d1128'; x.fill(); x.strokeStyle = 'rgba(255,90,110,0.55)'; x.lineWidth = 1.4; x.stroke();
      }
    });
  }
  function shroom(col, seed) {
    return mk(60, 56, function (x) {
      var R = srand(seed);
      x.fillStyle = 'rgba(2,10,22,0.3)'; ell(x, 0, 20, 20, 5); x.fill();
      for (var i = 0; i < 3; i++) {
        var bx = -14 + i * 14, h = 12 + R() * 16, w = 8 + R() * 5;
        x.strokeStyle = '#d9c8e8'; x.lineWidth = 3.4; x.beginPath(); x.moveTo(bx, 20); x.lineTo(bx + 1, 20 - h); x.stroke();
        x.save(); x.shadowColor = col; x.shadowBlur = 14; x.fillStyle = col;
        x.beginPath(); x.ellipse(bx + 1, 20 - h, w, w * 0.62, 0, PI, TAU); x.closePath(); x.fill(); x.restore();
        x.fillStyle = 'rgba(255,255,255,0.75)'; circ(x, bx - 2, 17 - h, 1.3); x.fill(); circ(x, bx + 4, 18 - h, 1); x.fill();
      }
    });
  }

  var BIOME_DEFS = [
    { floor: '#1d7080', b1: '#2a8d9c', b2: '#14596a', peb: '#52b7c0', shaft: 0.11, vig: 0.5, part: 'cyan',
      decor: function () { return [coral('#e0567f', '#ff9fb9', 11), coral('#e8763a', '#ffc078', 23), rock('#3d6f86', '#7fb4c4', 5), shell(), starDecor(), anemone('#e86fb5', '#ffd0ec', '#7a3d8f'), kelp('#3fae7e', '#6fd49b', 3, 70), coral('#b05fd6', '#e3b0ff', 37)]; } },
    { floor: '#1c634c', b1: '#2c8060', b2: '#124838', peb: '#63b784', shaft: 0.09, vig: 0.56, part: 'green',
      decor: function () { return [kelp('#3fae6a', '#7bd98f', 7, 110), kelp('#2f9c72', '#62c7a0', 19, 96), kelp('#58b04f', '#9be07a', 29, 84), rock('#2f5c50', '#6fa58f', 9, '#7bd98f'), shell(), anemone('#59c98a', '#d4ffe2', '#2f6b5a'), starDecor(), rock('#34584c', '#7aa894', 41, '#9be07a')]; } },
    { floor: '#2d4a7c', b1: '#3d6099', b2: '#213964', peb: '#7f9ad2', shaft: 0.07, vig: 0.6, part: 'blue', tiles: 1,
      decor: function () { return [column(false, 3), column(true, 8), column(true, 15), slab(4), slab(12), amphora(), rock('#3f548a', '#8ea3d3', 21), crystal('#5fb4ff', '#eaf6ff', 6), coral('#e0567f', '#ff9fb9', 51)]; } },
    { floor: '#3a2347', b1: '#522d5e', b2: '#291733', peb: '#8a55a0', shaft: 0.025, vig: 0.74, part: 'violet',
      decor: function () { return [crystal('#ff4f6a', '#ffd6dc', 2), crystal('#a05fff', '#ecdcff', 14), vent(), rock('#2a1a36', '#5c4070', 17), spikes(5), shroom('#8f6bff', 9), shroom('#4fd6e0', 31), crystal('#ff4f6a', '#ffd6dc', 44)]; } }
  ];

  function floorTile(b, seed) {
    var S = 512, c = cv(S, S), x = c.getContext('2d'), R = srand(seed), i;
    x.fillStyle = b.floor; x.fillRect(0, 0, S, S);
    function wrap(px, py, rad, fn) {
      for (var ox = -S; ox <= S; ox += S) for (var oy = -S; oy <= S; oy += S) {
        var X = px + ox, Y = py + oy;
        if (X + rad < 0 || X - rad > S || Y + rad < 0 || Y - rad > S) continue;
        fn(X, Y);
      }
    }
    for (i = 0; i < 30; i++) (function () {
      var rad = 45 + R() * 80, col = R() < 0.5 ? b.b1 : b.b2;
      wrap(R() * S, R() * S, rad, function (X, Y) {
        var g = x.createRadialGradient(X, Y, 0, X, Y, rad);
        g.addColorStop(0, hex(col, 0.55)); g.addColorStop(1, hex(col, 0));
        x.fillStyle = g; x.fillRect(X - rad, Y - rad, rad * 2, rad * 2);
      });
    })();
    if (b.tiles) {
      x.strokeStyle = 'rgba(190,210,255,0.07)'; x.lineWidth = 3;
      for (i = 0; i < 4; i++) { x.beginPath(); x.moveTo(i * 128 + 2, 0); x.lineTo(i * 128 + 2, S); x.moveTo(0, i * 128 + 2); x.lineTo(S, i * 128 + 2); x.stroke(); }
    }
    x.lineCap = 'round';
    for (i = 0; i < 46; i++) (function () {
      var rad = 14 + R() * 30, a0 = R() * TAU, w = 1.5 + R() * 2;
      wrap(R() * S, R() * S, rad, function (X, Y) {
        x.strokeStyle = 'rgba(255,255,255,0.05)'; x.lineWidth = w;
        x.beginPath(); x.arc(X, Y, rad, a0, a0 + 1.3); x.stroke();
      });
    })();
    for (i = 0; i < 70; i++) (function () {
      var rx = 1.5 + R() * 3.5, ry = rx * (0.5 + R() * 0.3), rot = R() * PI;
      wrap(R() * S, R() * S, 6, function (X, Y) {
        x.fillStyle = hex(b.peb, 0.3); x.beginPath(); x.ellipse(X, Y, rx, ry, rot, 0, TAU); x.fill();
      });
    })();
    return c;
  }

  /* Зона готовится при первом обращении (лениво), чтобы не тормозить запуск. */
  A.biome = function (i) {
    if (!A.biomes[i]) {
      var d = BIOME_DEFS[i];
      A.biomes[i] = { tile: floorTile(d, 100 + i * 17), decor: d.decor(), shaft: d.shaft, vig: d.vig, part: d.part, floor: d.floor };
    }
    return A.biomes[i];
  };

  /* ---------- Иконки усилений ---------- */
  var ICONS = {
    bubble: function (x) {
      x.strokeStyle = '#8feaff'; x.lineWidth = 3; x.fillStyle = 'rgba(120,225,255,0.3)';
      circ(x, -3, 2, 15); x.fill(); x.stroke(); circ(x, 16, -14, 6); x.fill(); x.stroke();
      x.fillStyle = '#fff'; ell(x, -9, -5, 5, 2.6, -0.6); x.fill();
    },
    orbs: function (x) {
      x.strokeStyle = 'rgba(255,214,240,0.5)'; x.lineWidth = 2; circ(x, 0, 0, 18); x.stroke();
      for (var i = 0; i < 3; i++) { var a = -PI / 2 + i * TAU / 3; x.fillStyle = '#ffe9f4'; circ(x, Math.cos(a) * 18, Math.sin(a) * 18, 7); x.fill(); x.fillStyle = '#fff'; circ(x, Math.cos(a) * 18 - 2, Math.sin(a) * 18 - 2, 2.2); x.fill(); }
      x.fillStyle = '#7fe6ff'; circ(x, 0, 0, 5); x.fill();
    },
    nova: function (x) {
      x.strokeStyle = '#8feaff'; x.lineWidth = 3.5; circ(x, 0, 0, 22); x.stroke();
      x.globalAlpha = 0.7; x.lineWidth = 3; circ(x, 0, 0, 14); x.stroke(); x.globalAlpha = 1;
      x.fillStyle = '#eaffff'; circ(x, 0, 0, 6); x.fill();
    },
    chain: function (x) {
      poly(x, [4, -24, -12, 3, -1, 3, -6, 24, 13, -5, 2, -5]); x.fillStyle = '#ffe45c'; x.fill(); x.strokeStyle = '#fff8c8'; x.lineWidth = 1.6; x.stroke();
    },
    star: function (x) {
      star(x, 5, 20, 8.5, -PI / 2); x.fillStyle = '#ff9d4a'; x.strokeStyle = '#ff9d4a'; x.lineWidth = 6; x.fill(); x.stroke();
      x.fillStyle = '#ffe1b0'; circ(x, 0, 0, 3); x.fill();
    },
    beam: function (x) {
      var g = x.createLinearGradient(-22, 0, 24, 0); g.addColorStop(0, 'rgba(255,240,150,0.95)'); g.addColorStop(1, 'rgba(255,240,150,0.1)');
      poly(x, [-20, 0, 24, -15, 24, 15]); x.fillStyle = g; x.fill();
      x.fillStyle = '#fff6b0'; circ(x, -18, 0, 6.5); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.stroke();
    },
    might: function (x) {
      x.strokeStyle = '#ffd24d'; x.lineWidth = 4;
      for (var i = 0; i < 8; i++) { var a = i * PI / 4; x.beginPath(); x.moveTo(Math.cos(a) * 15, Math.sin(a) * 15); x.lineTo(Math.cos(a) * 23, Math.sin(a) * 23); x.stroke(); }
      x.fillStyle = '#ffe680'; circ(x, 0, 0, 10.5); x.fill();
    },
    haste: function (x) {
      x.strokeStyle = '#8feaff'; x.lineWidth = 6;
      x.beginPath(); x.moveTo(-18, -14); x.lineTo(-4, 0); x.lineTo(-18, 14); x.moveTo(2, -14); x.lineTo(16, 0); x.lineTo(2, 14); x.stroke();
    },
    swift: function (x) {
      x.fillStyle = '#7fe6c0'; x.beginPath(); x.moveTo(20, 0); x.quadraticCurveTo(4, -16, -8, -4); x.lineTo(-20, -13); x.lineTo(-15, 0); x.lineTo(-20, 13); x.lineTo(-8, 4); x.quadraticCurveTo(4, 16, 20, 0); x.closePath(); x.fill();
      x.fillStyle = '#0e2c4d'; circ(x, 10, -2, 2.2); x.fill();
      x.strokeStyle = 'rgba(200,255,240,0.7)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(-24, -20); x.lineTo(-10, -20); x.moveTo(-24, 20); x.lineTo(-6, 20); x.stroke();
    },
    vital: function (x) { heartPath(x, 19); x.fillStyle = '#ff5f93'; x.fill(); x.fillStyle = 'rgba(255,255,255,0.7)'; ell(x, -9, -8, 5, 3, -0.6); x.fill(); },
    regen: function (x) {
      heartPath(x, 19); x.fillStyle = '#4fd68a'; x.fill();
      x.strokeStyle = '#fff'; x.lineWidth = 5; x.beginPath(); x.moveTo(0, -11); x.lineTo(0, 7); x.moveTo(-9, -2); x.lineTo(9, -2); x.stroke();
    },
    magnet: function (x) { x.save(); x.translate(0, -4); magnetPath(x, 22); x.restore(); },
    crit: function (x) {
      x.strokeStyle = '#ff7a8a'; x.lineWidth = 3.5; circ(x, 0, 0, 17); x.stroke(); circ(x, 0, 0, 8); x.stroke();
      x.beginPath(); x.moveTo(0, -25); x.lineTo(0, -13); x.moveTo(0, 25); x.lineTo(0, 13); x.moveTo(-25, 0); x.lineTo(-13, 0); x.moveTo(25, 0); x.lineTo(13, 0); x.stroke();
      x.fillStyle = '#fff'; circ(x, 0, 0, 2.6); x.fill();
    },
    armor: function (x) {
      x.beginPath(); x.moveTo(0, -23); x.lineTo(19, -15); x.quadraticCurveTo(19, 12, 0, 24); x.quadraticCurveTo(-19, 12, -19, -15); x.closePath();
      var g = x.createLinearGradient(-19, 0, 19, 0); g.addColorStop(0, '#6fb6ff'); g.addColorStop(0.5, '#6fb6ff'); g.addColorStop(0.5, '#3f8ae0'); g.addColorStop(1, '#3f8ae0');
      x.fillStyle = g; x.fill(); x.strokeStyle = '#dff0ff'; x.lineWidth = 2.5; x.stroke();
    },
    greed: function (x) {
      var g = x.createRadialGradient(-5, -6, 1, 0, 0, 17); g.addColorStop(0, '#fff'); g.addColorStop(0.55, '#fff3e6'); g.addColorStop(1, '#f0b9a6');
      x.fillStyle = g; circ(x, -2, 3, 16); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.stroke();
      x.fillStyle = '#ffe680'; star(x, 4, 9, 3, 0); x.save(); x.translate(17, -16); star(x, 4, 9, 3, 0); x.fill(); x.restore();
    },
    xp: function (x) {
      poly(x, [0, -23, 16, 0, 0, 23, -16, 0]); x.fillStyle = '#35b8ee'; x.fill();
      poly(x, [0, -23, 16, 0, 0, 0, -16, 0]); x.fillStyle = '#8ff0ff'; x.fill();
      x.fillStyle = '#fff'; circ(x, -4, -8, 2.6); x.fill();
    }
  };
  A.icon = function (id, px) {
    px = px || 96;
    var c = cv(px, px), x = c.getContext('2d');
    x.translate(px / 2, px / 2); x.scale(px / 64, px / 64);
    x.lineCap = 'round'; x.lineJoin = 'round';
    (ICONS[id] || ICONS.xp)(x);
    return c;
  };
  A.portrait = function (id, px) {
    var c = cv(px, px), x = c.getContext('2d');
    x.translate(px / 2, px / 2 + px * 0.06); x.scale(px / 62, px / 62);
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.5;
    x.drawImage(A.glow[id === 'bronya' ? 'orange' : id === 'iskra' ? 'yellow' : 'cyan'], -34, -34, 68, 68);
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    A.hero(x, id, 0.6, 0, 1);
    return c;
  };

  A.init = function () {
    buildItems();
    buildEnemies();
    A.biome(0);
  };
  A.srand = srand;
})();
