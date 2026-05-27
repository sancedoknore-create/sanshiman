(function() {
  // Add native wheel event listeners to scrollable elements inside ReactFlow nodes
  // This fires BEFORE D3's handler, allowing us to stopPropagation and manually scroll
  function attachWheelHandler(el) {
    if (el.__wheelHandlerAttached) return;
    el.__wheelHandlerAttached = true;

    el.addEventListener('wheel', function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      el.scrollTop += e.deltaY;
    }, { passive: false });
  }

  function scanAndAttach() {
    document.querySelectorAll('.nowheel').forEach(function(el) {
      var style = window.getComputedStyle(el);
      var overflowY = style.overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        attachWheelHandler(el);
      }
    });
  }

  // Scan on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(scanAndAttach, 1000);
    });
  } else {
    setTimeout(scanAndAttach, 500);
  }

  // Watch for dynamically added elements
  var observer = new MutationObserver(function() {
    scanAndAttach();
  });

  function startObserver() {
    var root = document.getElementById('root');
    if (root) {
      observer.observe(root, { childList: true, subtree: true });
    } else {
      setTimeout(startObserver, 200);
    }
  }
  startObserver();

  // Also re-scan periodically
  setInterval(scanAndAttach, 3000);
})();
