(function() {
  var canvas, ctx, W, H;
  var stars = [], dusts = [], comets = [];
  var startTime = Date.now();
  var animId = null;
  var cometTimer = null;
  var mouseDx = 0, mouseDy = 0;
  var targetMx = 0, targetMy = 0;
  var reducedMotion = false; // 星河灵卷：减少动态时静态灵卷背景

  try {
    reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (_) {}

  function initStars() {
    stars = [];
    dusts = [];

    for (var i = 0; i < 18; i++) {
      var hr = Math.random();
      var bigHue = hr < 0.26 ? 285 + Math.random() * 26 : (hr < 0.52 ? 175 + Math.random() * 26 : 216 + Math.random() * 34);
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.45 + 1.05,
        baseAlpha: Math.random() * 0.18 + 0.24,
        speed: Math.random() * 1.15 + 0.45,
        offset: Math.random() * Math.PI * 2,
        hue: bigHue,
        glowR: Math.random() * 6 + 2,
        depth: 0.72
      });
    }

    for (var j = 0; j < 90; j++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 0.75 + 0.35,
        baseAlpha: Math.random() * 0.20 + 0.16,
        speed: Math.random() * 1.0 + 0.35,
        offset: Math.random() * Math.PI * 2,
        hue: 190 + Math.random() * 56,
        glowR: Math.random() * 2.6 + 0.8,
        depth: 0.32
      });
    }

    for (var k = 0; k < 260; k++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 0.45 + 0.16,
        baseAlpha: Math.random() * 0.14 + 0.07,
        speed: Math.random() * 0.9 + 0.25,
        offset: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.18 ? 38 + Math.random() * 12 : 210 + Math.random() * 38,
        glowR: 0,
        depth: 0.08
      });
    }

    for (var d = 0; d < 18; d++) {
      dusts.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 0.85 + 0.25,
        alpha: Math.random() * 0.08 + 0.025,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.08,
        hue: Math.random() < 0.28 ? 280 + Math.random() * 26 : 200 + Math.random() * 36
      });
    }
  }

  function spawnComet() {
    if (reducedMotion) return;
    var edge = Math.floor(Math.random() * 4);
    var x, y, angle;
    if (edge === 0) { x = Math.random() * W; y = -10; angle = Math.PI * 0.3 + Math.random() * 0.35; }
    else if (edge === 1) { x = W + 10; y = Math.random() * H; angle = Math.PI * 0.82 + Math.random() * 0.32; }
    else if (edge === 2) { x = Math.random() * W; y = H + 10; angle = -Math.PI * 0.3 - Math.random() * 0.32; }
    else { x = -10; y = Math.random() * H; angle = -Math.random() * 0.35; }
    var speed = Math.random() * 3.4 + 3.2;
    comets.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.76,
      decay: Math.random() * 0.010 + 0.012,
      length: Math.random() * 48 + 34
    });
  }

  function spawnMeteorShower() {
    if (reducedMotion) return;
    var n = 2 + Math.floor(Math.random() * 2);
    var baseEdge = Math.floor(Math.random() * 4);
    var baseAngle;
    if (baseEdge === 0) baseAngle = Math.PI * 0.3 + Math.random() * 0.35;
    else if (baseEdge === 1) baseAngle = Math.PI * 0.82 + Math.random() * 0.32;
    else if (baseEdge === 2) baseAngle = -Math.PI * 0.3 - Math.random() * 0.32;
    else baseAngle = -Math.random() * 0.35;

    for (var k = 0; k < n; k++) {
      (function(idx) {
        setTimeout(function() {
          var x, y;
          if (baseEdge === 0) { x = Math.random() * W; y = -10; }
          else if (baseEdge === 1) { x = W + 10; y = Math.random() * H; }
          else if (baseEdge === 2) { x = Math.random() * W; y = H + 10; }
          else { x = -10; y = Math.random() * H; }
          var angle = baseAngle + (Math.random() - 0.5) * 0.14;
          var speed = Math.random() * 3.6 + 3.8;
          comets.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.72,
            decay: Math.random() * 0.009 + 0.011,
            length: Math.random() * 54 + 40
          });
        }, idx * (180 + Math.random() * 220));
      })(k);
    }
  }

  function resizeStarfield() {
    if (!canvas) return;
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    initStars();
  }

  function drawStarfield() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    var t = (Date.now() - startTime) * 0.001;

    mouseDx += (targetMx - mouseDx) * 0.035;
    mouseDy += (targetMy - mouseDy) * 0.035;

    for (var i = 0; i < dusts.length; i++) {
      var d = dusts[i];
      if (!reducedMotion) {
        d.x += d.vx;
        d.y += d.vy;
      }
      if (d.x < -10) d.x = W + 10;
      if (d.x > W + 10) d.x = -10;
      if (d.y < -10) d.y = H + 10;
      if (d.y > H + 10) d.y = -10;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + d.hue + ', 42%, 70%, ' + d.alpha + ')';
      ctx.fill();
    }

    for (var sIdx = 0; sIdx < stars.length; sIdx++) {
      var s = stars[sIdx];
      var wave = reducedMotion ? 0 : Math.sin(t * s.speed + s.offset);
      var alpha = s.baseAlpha + wave * 0.12;
      alpha = Math.max(0.025, Math.min(0.78, alpha));
      var sx = s.x + mouseDx * s.depth;
      var sy = s.y + mouseDy * s.depth;
      if (s.glowR > 0 && alpha > 0.12) {
        var glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, s.glowR);
        glow.addColorStop(0, 'hsla(' + s.hue + ', 54%, 80%, ' + (alpha * 0.36) + ')');
        glow.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(sx, sy, s.glowR, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + s.hue + ', 45%, 82%, ' + alpha + ')';
      ctx.fill();
    }

    var threshold = 190;
    for (var a = 0; a < 18; a++) {
      var s1 = stars[a];
      var s1x = s1.x + mouseDx * s1.depth;
      var s1y = s1.y + mouseDy * s1.depth;
      for (var b = a + 1; b < 18; b++) {
        var s2 = stars[b];
        var s2x = s2.x + mouseDx * s2.depth;
        var s2y = s2.y + mouseDy * s2.depth;
        var dx = s1x - s2x;
        var dy = s1y - s2y;
        var dist2 = dx * dx + dy * dy;
        if (dist2 < threshold * threshold) {
          var dist = Math.sqrt(dist2);
          var falloff = 1 - dist / threshold;
          var breath = reducedMotion ? 0.55 : 0.55 + 0.45 * Math.sin(t * 0.22 + (a + b) * 0.7);
          var lineAlpha = falloff * 0.09 * breath;
          if (lineAlpha > 0.008) {
            ctx.beginPath();
            ctx.moveTo(s1x, s1y);
            ctx.lineTo(s2x, s2y);
            ctx.strokeStyle = 'hsla(' + ((s1.hue + s2.hue) / 2) + ',54%,75%,' + lineAlpha + ')';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    }

    for (var cIdx = comets.length - 1; cIdx >= 0; cIdx--) {
      var c = comets[cIdx];
      var tailX = c.x - c.vx * c.length;
      var tailY = c.y - c.vy * c.length;
      var grad = ctx.createLinearGradient(c.x, c.y, tailX, tailY);
      grad.addColorStop(0, 'rgba(230,255,255,' + (c.life * 0.78) + ')');
      grad.addColorStop(0.10, 'rgba(160,220,255,' + (c.life * 0.42) + ')');
      grad.addColorStop(0.48, 'rgba(214,168,90,' + (c.life * 0.20) + ')');
      grad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(tailX, tailY);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.45;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(c.x, c.y, 1.55, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + c.life + ')';
      ctx.fill();
      c.x += c.vx;
      c.y += c.vy;
      c.life -= c.decay;
      if (c.life <= 0) comets.splice(cIdx, 1);
    }
  }

  function starfieldLoop() {
    drawStarfield();
    if (!reducedMotion) animId = requestAnimationFrame(starfieldLoop);
  }

  function scheduleComet() {
    if (reducedMotion) return;
    cometTimer = setTimeout(function() {
      if (comets.length < 4) {
        if (Math.random() < 0.14) spawnMeteorShower();
        else spawnComet();
      }
      scheduleComet();
    }, 12000 + Math.random() * 20000);
  }

  function startStarfield() {
    canvas = document.createElement('canvas');
    canvas.id = 'starfield-bg';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2;pointer-events:none;display:block;';
    document.body.insertBefore(canvas, document.body.firstChild);
    ctx = canvas.getContext('2d');
    resizeStarfield();
    drawStarfield();
    if (!reducedMotion) starfieldLoop();
    scheduleComet();

    window.addEventListener('mousemove', function(e) {
      if (reducedMotion) return;
      var cx = W / 2;
      var cy = H / 2;
      targetMx = -((e.clientX - cx) / cx) * 10;
      targetMy = -((e.clientY - cy) / cy) * 10;
    }, { passive: true });
  }

  function injectCSS() {
    var s1 = document.getElementById('sf-theme');
    if (!s1) {
      s1 = document.createElement('style');
      s1.id = 'sf-theme';
      s1.textContent = ':root,.theme-light,.theme-dark,html,body,#root{background:#020308!important;background-color:#020308!important;--bg-base:#020308!important;--bg-panel:#10131d!important;--bg-secondary:#151a28!important;--text-primary:#f4f1e8!important;--text-secondary:#b8bfd4!important;--text-muted:#6f7890!important;--border-color:rgba(180,205,255,.13)!important}.react-flow,.react-flow__background,.react-flow__renderer,.react-flow__viewport,.react-flow__pane{background:transparent!important;background-color:transparent!important}.react-flow{--xy-background-color:transparent!important;--xy-background-color-default:transparent!important}';
      document.head.appendChild(s1);
    }
    var s2 = document.getElementById('sf-inputs');
    if (!s2) {
      s2 = document.createElement('style');
      s2.id = 'sf-inputs';
      s2.textContent = 'textarea,input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]),select,[contenteditable="true"],[contentEditable="true"]{background-color:rgba(10,14,24,.92)!important;background:rgba(10,14,24,.92)!important;color:#f4f1e8!important}.nodrag.nowheel{background-color:rgba(7,10,18,.82)!important;background:rgba(7,10,18,.82)!important;color:#b8bfd4!important}';
      document.head.appendChild(s2);
    }
    var s3 = document.getElementById('sf-cosmic');
    if (!s3) {
      s3 = document.createElement('style');
      s3.id = 'sf-cosmic';
      s3.textContent = ''
        + 'body::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:3;background:radial-gradient(ellipse 55% 40% at 50% 42%,rgba(95,214,255,.10),rgba(214,168,90,.060) 38%,transparent 68%),radial-gradient(ellipse 90% 70% at 50% 50%,transparent 55%,rgba(0,0,8,.44) 95%)}'
        + '@keyframes ssm-title-breath{0%,100%{letter-spacing:.28em}50%{letter-spacing:.40em}}'
        + '.ssm-title-breath{animation:ssm-title-breath 9s ease-in-out infinite}'
        + '@media (prefers-reduced-motion: reduce){.ssm-title-breath{animation:none!important}}';
      document.head.appendChild(s3);
    }
  }

  function start() {
    injectCSS();
    startStarfield();
    window.addEventListener('resize', function() {
      resizeStarfield();
      if (reducedMotion) drawStarfield();
    });
    window.addEventListener('beforeunload', function() {
      if (animId) cancelAnimationFrame(animId);
      if (cometTimer) clearTimeout(cometTimer);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(start, 300); });
  } else {
    setTimeout(start, 300);
  }
})();
