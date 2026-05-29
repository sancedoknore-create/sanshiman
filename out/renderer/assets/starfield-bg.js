(function() {
  var canvas, ctx, W, H;
  var stars = [], dusts = [], comets = [];
  var startTime = Date.now();
  var animId = null;
  var mouseDx = 0, mouseDy = 0;        // parallax 当前偏移
  var targetMx = 0, targetMy = 0;      // parallax 目标（鼠标决定）

  // ── 初始化 ────────────────────────────────────────────────

  function initStars() {
    stars = [];
    dusts = [];

    // 大星 (close — 视差最强)
    for (var i = 0; i < 25; i++) {
      var bigHue;
      var hr = Math.random();
      if (hr < 0.25)      bigHue = 285 + Math.random() * 35;   // 紫/品红
      else if (hr < 0.50) bigHue = 170 + Math.random() * 30;   // 青
      else                bigHue = 220 + Math.random() * 40;   // 蓝
      stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 2.0 + 1.5,
        baseAlpha: Math.random() * 0.4 + 0.5,
        speed: Math.random() * 2.5 + 1.0,
        offset: Math.random() * Math.PI * 2,
        hue: bigHue,
        glowR: Math.random() * 8 + 3,
        depth: 1.0
      });
    }
    // 中星 (mid)
    for (var i = 0; i < 120; i++) {
      stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.0 + 0.5,
        baseAlpha: Math.random() * 0.35 + 0.25,
        speed: Math.random() * 2.0 + 0.8,
        offset: Math.random() * Math.PI * 2,
        hue: 190 + Math.random() * 60,
        glowR: Math.random() * 4 + 1,
        depth: 0.45
      });
    }
    // 小星 (far — 几乎不动)
    for (var i = 0; i < 400; i++) {
      stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 0.6 + 0.2,
        baseAlpha: Math.random() * 0.22 + 0.12,
        speed: Math.random() * 1.8 + 0.5,
        offset: Math.random() * Math.PI * 2,
        hue: 210 + Math.random() * 40,
        glowR: 0,
        depth: 0.12
      });
    }
    // 尘埃
    for (var i = 0; i < 30; i++) {
      dusts.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.0 + 0.3,
        alpha: Math.random() * 0.15 + 0.04,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.15,
        hue: Math.random() < 0.3 ? 280 + Math.random() * 30 : 200 + Math.random() * 40
      });
    }
  }

  function spawnComet() {
    var edge = Math.floor(Math.random() * 4);
    var x, y, angle;
    if (edge === 0) { x = Math.random() * W; y = -10; angle = Math.PI * 0.3 + Math.random() * 0.4; }
    else if (edge === 1) { x = W + 10; y = Math.random() * H; angle = Math.PI * 0.8 + Math.random() * 0.4; }
    else if (edge === 2) { x = Math.random() * W; y = H + 10; angle = -Math.PI * 0.3 - Math.random() * 0.4; }
    else { x = -10; y = Math.random() * H; angle = -Math.random() * 0.4; }
    var speed = Math.random() * 5 + 4;
    comets.push({
      x: x, y: y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: 1.0,
      decay: Math.random() * 0.012 + 0.015,
      length: Math.random() * 60 + 40
    });
  }

  // 流星雨爆发：3-5 颗在相邻方向、相邻时间出生
  function spawnMeteorShower() {
    var n = 3 + Math.floor(Math.random() * 3);
    var baseEdge = Math.floor(Math.random() * 4);
    var baseAngle;
    if      (baseEdge === 0) baseAngle = Math.PI * 0.3 + Math.random() * 0.4;
    else if (baseEdge === 1) baseAngle = Math.PI * 0.8 + Math.random() * 0.4;
    else if (baseEdge === 2) baseAngle = -Math.PI * 0.3 - Math.random() * 0.4;
    else                     baseAngle = -Math.random() * 0.4;
    for (var k = 0; k < n; k++) {
      (function(idx) {
        setTimeout(function() {
          var x, y;
          if      (baseEdge === 0) { x = Math.random() * W;  y = -10; }
          else if (baseEdge === 1) { x = W + 10;             y = Math.random() * H; }
          else if (baseEdge === 2) { x = Math.random() * W;  y = H + 10; }
          else                     { x = -10;                y = Math.random() * H; }
          var angle = baseAngle + (Math.random() - 0.5) * 0.18;
          var speed = Math.random() * 5 + 5;
          comets.push({
            x: x, y: y,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            life: 1.0,
            decay: Math.random() * 0.010 + 0.013,
            length: Math.random() * 70 + 50
          });
        }, idx * (120 + Math.random() * 200));
      })(k);
    }
  }

  function resizeStarfield() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    initStars();
  }

  function drawStarfield() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    var t = (Date.now() - startTime) * 0.001;

    // 视差插值（缓慢追上鼠标）
    mouseDx += (targetMx - mouseDx) * 0.04;
    mouseDy += (targetMy - mouseDy) * 0.04;

    // 1. 尘埃
    for (var i = 0; i < dusts.length; i++) {
      var d = dusts[i];
      d.x += d.vx; d.y += d.vy;
      if (d.x < -10) d.x = W + 10; if (d.x > W + 10) d.x = -10;
      if (d.y < -10) d.y = H + 10; if (d.y > H + 10) d.y = -10;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + d.hue + ', 50%, 70%, ' + d.alpha + ')';
      ctx.fill();
    }

    // 2. 星星（带视差）
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var wave = Math.sin(t * s.speed + s.offset);
      var alpha = s.baseAlpha + wave * 0.3;
      alpha = Math.max(0.03, Math.min(1, alpha));
      var sx = s.x + mouseDx * s.depth;
      var sy = s.y + mouseDy * s.depth;
      if (s.glowR > 0 && alpha > 0.15) {
        var glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, s.glowR);
        glow.addColorStop(0, 'hsla(' + s.hue + ', 60%, 80%, ' + (alpha * 0.5) + ')');
        glow.addColorStop(1, 'transparent');
        ctx.beginPath(); ctx.arc(sx, sy, s.glowR, 0, Math.PI * 2);
        ctx.fillStyle = glow; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + s.hue + ', 50%, 80%, ' + alpha + ')';
      ctx.fill();
    }

    // 3. 星座连线（仅大星之间，距离阈值内）
    var threshold = 220;
    for (var i = 0; i < 25; i++) {
      var s1 = stars[i];
      var s1x = s1.x + mouseDx * s1.depth;
      var s1y = s1.y + mouseDy * s1.depth;
      for (var j = i + 1; j < 25; j++) {
        var s2 = stars[j];
        var s2x = s2.x + mouseDx * s2.depth;
        var s2y = s2.y + mouseDy * s2.depth;
        var dx = s1x - s2x, dy = s1y - s2y;
        var dist2 = dx * dx + dy * dy;
        if (dist2 < threshold * threshold) {
          var dist = Math.sqrt(dist2);
          var falloff = 1 - dist / threshold;
          // 缓慢呼吸
          var breath = 0.55 + 0.45 * Math.sin(t * 0.3 + (i + j) * 0.7);
          var lineAlpha = falloff * 0.18 * breath;
          if (lineAlpha > 0.01) {
            ctx.beginPath();
            ctx.moveTo(s1x, s1y);
            ctx.lineTo(s2x, s2y);
            ctx.strokeStyle = 'hsla(' + ((s1.hue + s2.hue) / 2) + ',60%,75%,' + lineAlpha + ')';
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
    }

    // 4. 彗星
    for (var i = comets.length - 1; i >= 0; i--) {
      var c = comets[i];
      var tailX = c.x - c.vx * c.length;
      var tailY = c.y - c.vy * c.length;
      var grad = ctx.createLinearGradient(c.x, c.y, tailX, tailY);
      grad.addColorStop(0,    'rgba(220,255,255,' + (c.life * 0.95) + ')');
      grad.addColorStop(0.08, 'rgba(150,210,255,' + (c.life * 0.55) + ')');
      grad.addColorStop(0.45, 'rgba(180,140,255,' + (c.life * 0.30) + ')');
      grad.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(tailX, tailY);
      ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(c.x, c.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + c.life + ')'; ctx.fill();
      c.x += c.vx; c.y += c.vy; c.life -= c.decay;
      if (c.life <= 0) comets.splice(i, 1);
    }
  }

  function starfieldLoop() {
    drawStarfield();
    animId = requestAnimationFrame(starfieldLoop);
  }

  var cometTimer;
  function scheduleComet() {
    cometTimer = setTimeout(function() {
      if (comets.length < 6) {
        // 1/4 概率来一次流星雨爆发；其余单颗
        if (Math.random() < 0.25) spawnMeteorShower();
        else spawnComet();
      }
      scheduleComet();
    }, 5000 + Math.random() * 10000);
  }

  function startStarfield() {
    canvas = document.createElement('canvas');
    canvas.id = 'starfield-bg';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2;pointer-events:none;display:block;';
    document.body.insertBefore(canvas, document.body.firstChild);
    ctx = canvas.getContext('2d');
    resizeStarfield();
    starfieldLoop();
    scheduleComet();

    // 视差：鼠标偏移（最大 ±18px）
    window.addEventListener('mousemove', function(e) {
      var cx = W / 2, cy = H / 2;
      targetMx = -((e.clientX - cx) / cx) * 18;
      targetMy = -((e.clientY - cy) / cy) * 18;
    }, { passive: true });
  }

  // ── CSS 主题注入 ────────────────────────────────────────────

  function injectCSS() {
    var s1 = document.getElementById('sf-theme');
    if (!s1) {
      s1 = document.createElement('style');
      s1.id = 'sf-theme';
      s1.textContent = ':root,.theme-light,.theme-dark,html,body,#root{background:#020308!important;background-color:#020308!important;--bg-base:#09090b!important;--bg-panel:#18181b!important;--bg-secondary:#18181b!important;--text-primary:#f4f4f5!important;--text-secondary:#a1a1aa!important;--text-muted:#71717a!important;--border-color:#ffffff1a!important}.react-flow,.react-flow__background,.react-flow__renderer,.react-flow__viewport,.react-flow__pane{background:transparent!important;background-color:transparent!important}.react-flow{--xy-background-color:transparent!important;--xy-background-color-default:transparent!important}';
      document.head.appendChild(s1);
    }
    var s2 = document.getElementById('sf-inputs');
    if (!s2) {
      s2 = document.createElement('style');
      s2.id = 'sf-inputs';
      s2.textContent = 'textarea,input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]),select,[contenteditable="true"],[contentEditable="true"]{background-color:#1e2127!important;background:#1e2127!important;color:#c0c4c8!important}textarea:focus,input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):focus,select:focus,[contenteditable="true"]:focus,[contentEditable="true"]:focus{background-color:#24272e!important;background:#24272e!important}.nodrag.nowheel{background-color:#1e2127!important;background:#1e2127!important;color:#c0c4c8!important}';
      document.head.appendChild(s2);
    }
    // 中心星云光晕（位于星空之上、标题之下）+ 标题字距呼吸动画
    var s3 = document.getElementById('sf-cosmic');
    if (!s3) {
      s3 = document.createElement('style');
      s3.id = 'sf-cosmic';
      s3.textContent = ''
        + 'body::after{'
        +   'content:"";position:fixed;inset:0;pointer-events:none;z-index:3;'
        +   'background:'
        +     'radial-gradient(ellipse 55% 40% at 50% 42%, rgba(110,150,230,.18), rgba(160,110,230,.10) 38%, transparent 68%),'
        +     'radial-gradient(ellipse 90% 70% at 50% 50%, transparent 55%, rgba(0,0,8,.35) 95%);'
        + '}'
        + '@keyframes ssm-title-breath{'
        +   '0%,100%{letter-spacing:.28em}'
        +   '50%{letter-spacing:.46em}'
        + '}'
        + '.ssm-title-breath{animation:ssm-title-breath 8s ease-in-out infinite}';
      document.head.appendChild(s3);
    }
  }

  function start() {
    injectCSS();
    startStarfield();

    window.addEventListener('resize', function() {
      resizeStarfield();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(start, 300); });
  } else {
    setTimeout(start, 300);
  }
})();
