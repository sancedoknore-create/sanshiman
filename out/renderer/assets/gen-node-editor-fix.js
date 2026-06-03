;(function () {
  "use strict";

  var CLASS_NODE = "ssm-gen-editor-node";
  var CLASS_EDITOR = "ssm-gen-editor";

  function closestNode(el) {
    while (el && el !== document.body) {
      if (el.classList && el.classList.contains("react-flow__node")) return el;
      el = el.parentElement;
    }
    return null;
  }

  function markEditors(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var editors = scope.querySelectorAll("textarea.nodrag.nowheel");
    for (var i = 0; i < editors.length; i += 1) {
      var editor = editors[i];
      editor.classList.add(CLASS_EDITOR);
      editor.style.position = "relative";
      editor.style.zIndex = "100";
      editor.style.opacity = "1";
      editor.style.visibility = "visible";
      editor.style.pointerEvents = "auto";
      editor.style.color = "#fff7e8";
      editor.style.webkitTextFillColor = "#fff7e8";
      editor.style.backgroundColor = "#151927";
      editor.style.mixBlendMode = "normal";
      editor.style.filter = "none";

      var node = closestNode(editor);
      if (node) node.classList.add(CLASS_NODE);

      var wrapper = editor.closest && editor.closest(".node-wrapper");
      if (wrapper) {
        wrapper.classList.add(CLASS_NODE);
        wrapper.style.overflow = "visible";
      }
    }
  }

  function scheduleMark(root) {
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(function () { markEditors(root); });
    } else {
      setTimeout(function () { markEditors(root); }, 0);
    }
  }

  function install() {
    markEditors(document);
    // ReactFlow 切换 selected 时会重写 .react-flow__node 和 .node-wrapper 的 class 字符串，
    // 把运行时打的 ssm-gen-editor-node 标记类抹掉。监听 attributes/class 立即补回，
    // 避免依赖标记类的 CSS 兜底（::before/::after 关闭等）出现一帧闪烁。
    var observer = new MutationObserver(function (mutations) {
      var needRescan = false;
      for (var i = 0; i < mutations.length; i += 1) {
        var m = mutations[i];
        if (m.type === "childList") {
          for (var j = 0; j < m.addedNodes.length; j += 1) {
            var n = m.addedNodes[j];
            if (n && n.nodeType === 1) scheduleMark(n);
          }
        }
        if (m.type === "attributes" && m.attributeName === "class") {
          var t = m.target;
          if (!t || t.nodeType !== 1) continue;
          if (t.classList && t.classList.contains("react-flow__node")) {
            if (t.querySelector && t.querySelector("textarea.nodrag.nowheel") && !t.classList.contains(CLASS_NODE)) {
              t.classList.add(CLASS_NODE);
              needRescan = true;
            }
          } else if (t.classList && t.classList.contains("node-wrapper")) {
            if (t.querySelector && t.querySelector("textarea.nodrag.nowheel") && !t.classList.contains(CLASS_NODE)) {
              t.classList.add(CLASS_NODE);
              needRescan = true;
            }
          }
        }
      }
      if (needRescan) scheduleMark(document);
    });
    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    document.addEventListener("focusin", function (event) {
      var target = event.target;
      if (target && target.matches && target.matches("textarea.nodrag.nowheel")) markEditors(document);
    }, true);

    window.__ssmGenEditorFixInstalled = true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
