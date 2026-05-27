(function() {
  var canvas, ctx, W, H;
  var stars = [], dusts = [], comets = [];
  var startTime = Date.now();

  function initStars() {
    stars = [];
    dusts = [];

    for (var i = 0; i < 25; i++) {
      stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 2.0 + 1.5,
        baseAlpha: Math.random() * 0.4 + 0.5,
        speed: Math.random() * 2.5 + 1.0,
        offset: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.3 ? 30 + Math.random() * 40 : 200 + Math.random() * 40,
        glowR: Math.random() * 6 + 4
      });
    }
    for (var i = 0; i < 120; i++) {
      stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.0 + 0.5,
        baseAlpha: Math.random() * 0.35 + 0.25,
        speed: Math.random() * 2.0 + 0.8,
        offset: Math.random() * Math.PI * 2,
        hue: 190 + Math.random() * 60,
        glowR: Math.random() * 3 + 2
      });
    }
    for (var i = 0; i < 400; i++) {
      stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 0.6 + 0.2,
        baseAlpha: Math.random() * 0.22 + 0.12,
        speed: Math.random() * 1.8 + 0.5,
        offset: Math.random() * Math.PI * 2,
        hue: 210 + Math.random() * 40,
        glowR: 0
      });
    }
    for (var i = 0; i < 30; i++) {
      dusts.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.0 + 0.3,
        alpha: Math.random() * 0.15 + 0.04,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.15,
        hue: 200 + Math.random() * 40
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

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    initStars();
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    var t = (Date.now() - startTime) * 0.001;

    for (var i = 0; i < dusts.length; i++) {
      var d = dusts[i];
      d.x += d.vx; d.y += d.vy;
      if (d.x < -10) d.x = W + 10;
      if (d.x > W + 10) d.x = -10;
      if (d.y < -10) d.y = H + 10;
      if (d.y > H + 10) d.y = -10;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + d.hue + ', 50%, 70%, ' + d.alpha + ')';
      ctx.fill();
    }

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var wave = Math.sin(t * s.speed + s.offset);
      var alpha = s.baseAlpha + wave * 0.3;
      alpha = Math.max(0.03, Math.min(1, alpha));

      if (s.glowR > 0 && alpha > 0.15) {
        var glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.glowR);
        glow.addColorStop(0, 'hsla(' + s.hue + ', 60%, 80%, ' + (alpha * 0.5) + ')');
        glow.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.glowR, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + s.hue + ', 50%, 80%, ' + alpha + ')';
      ctx.fill();
    }

    for (var i = comets.length - 1; i >= 0; i--) {
      var c = comets[i];
      var tailX = c.x - c.vx * c.length;
      var tailY = c.y - c.vy * c.length;
      var grad = ctx.createLinearGradient(c.x, c.y, tailX, tailY);
      grad.addColorStop(0, 'rgba(255,255,255,' + (c.life * 0.95) + ')');
      grad.addColorStop(0.08, 'rgba(180,210,255,' + (c.life * 0.5) + ')');
      grad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(tailX, tailY);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(c.x, c.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + c.life + ')';
      ctx.fill();
      c.x += c.vx; c.y += c.vy;
      c.life -= c.decay;
      if (c.life <= 0) comets.splice(i, 1);
    }
  }

  function loop() {
    draw();
    requestAnimationFrame(loop);
  }

  function scheduleComet() {
    setTimeout(function() {
      if (comets.length < 3) spawnComet();
      scheduleComet();
    }, 3000 + Math.random() * 8000);
  }

  // === CSSOM 规则注入（React 无法触及） ===
  function injectForceRules(sheet) {
    if (!sheet) return;
    try {
      // 强制 textarea / input / select / contentEditable
      sheet.insertRule('textarea, input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), select, [contenteditable="true"], [contentEditable="true"] { background-color: #1e2127 !important; background: #1e2127 !important; color: #c0c4c8 !important; }', sheet.cssRules.length);
      sheet.insertRule('textarea:focus, input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):focus, select:focus, [contenteditable="true"]:focus, [contentEditable="true"]:focus { background-color: #24272e !important; background: #24272e !important; }', sheet.cssRules.length);
      // 覆盖 nodrag 可编辑区域
      sheet.insertRule('.nodrag.nowheel { background-color: #1e2127 !important; background: #1e2127 !important; color: #c0c4c8 !important; }', sheet.cssRules.length);
      return true;
    } catch(e) {
      return false;
    }
  }

  function start() {
    canvas = document.createElement('canvas');
    canvas.id = 'starfield-bg';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2;pointer-events:none;display:block;';
    document.body.insertBefore(canvas, document.body.firstChild);

    ctx = canvas.getContext('2d');
    resize();
    loop();
    scheduleComet();
    window.addEventListener('resize', resize);

    // === 样式注入：创建 2 个 style 元素放入 head ===
    // Style 1: 主题变量 + ReactFlow 透明
    var s1 = document.createElement('style');
    s1.id = 'sf-theme';
    s1.textContent = ':root,.theme-light,.theme-dark,html,body,#root{background:#020308!important;background-color:#020308!important;--bg-base:#09090b!important;--bg-panel:#18181b!important;--bg-secondary:#18181b!important;--text-primary:#f4f4f5!important;--text-secondary:#a1a1aa!important;--text-muted:#71717a!important;--border-color:#ffffff1a!important}.react-flow,.react-flow__background,.react-flow__renderer,.react-flow__viewport,.react-flow__pane{background:transparent!important;background-color:transparent!important}.react-flow{--xy-background-color:transparent!important;--xy-background-color-default:transparent!important}';
    document.head.appendChild(s1);

    // Style 2: 输入框强制样式 - 用 CSSOM insertRule
    var s2 = document.createElement('style');
    s2.id = 'sf-inputs';
    document.head.appendChild(s2);
    var sheet = s2.sheet || s2.styleSheet;
    if (sheet) {
      injectForceRules(sheet);
      // 如果 insertRule 失败（CSSOM 可能还不可用），稍后重试
      if (sheet.cssRules.length === 0) {
        setTimeout(function() { injectForceRules(s2.sheet || s2.styleSheet); }, 500);
        setTimeout(function() { injectForceRules(s2.sheet || s2.styleSheet); }, 2000);
      }
    }

    // === 兜底：JS 直接设置 inline style !important（应对 React 覆盖） ===
    function forceAll() {
      var els = document.querySelectorAll('textarea, input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), select, [contenteditable="true"], [contentEditable="true"]');
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        // setProperty with 'important' gives highest CSS priority — beats stylesheets
        el.style.setProperty('background-color', '#1e2127', 'important');
        el.style.setProperty('background', '#1e2127', 'important');
        el.style.setProperty('color', '#c0c4c8', 'important');
      }
    }

    // 立即执行 + 每 500ms 重扫（React re-render 会重置 inline style）
    forceAll();
    setInterval(forceAll, 500);

    // MutationObserver: React 创建新元素时，等它渲染完再 force
    var mo = new MutationObserver(function() {
      setTimeout(forceAll, 50);
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(start, 300); });
  } else {
    setTimeout(start, 300);
  }
})();
