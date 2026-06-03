/* 全局 <img> 失效占位
   背景：素材库 DB 里保存了图片绝对路径，但文件可能被删/移走 → sanshiman:// 协议返回 404 → <img> 报 error。
   做法：监听全局 error 事件（捕获阶段，因为 img.error 不冒泡），给失效的 <img> 加 .img-missing 类
        并外包一层 <span class="img-missing-wrap"> 用 ::after 显示"⊘ 文件丢失"提示。
   注意：缓存命中后被 React 重新挂载会重置 src，需要监听 src 变化重新检查。 */
(function () {
  'use strict';

  const MISSING_CLASS = 'img-missing';
  const WRAP_CLASS = 'img-missing-wrap';
  const SMALL_CLASS = 'img-missing-small';
  const HANDLED_ATTR = 'data-img-missing-handled';

  function markMissing(img) {
    if (!img || img.tagName !== 'IMG') return;
    if (img.classList.contains(MISSING_CLASS)) return;
    img.classList.add(MISSING_CLASS);

    // 包一层占位容器（用于 ::after）—— 已经在容器内则不再重复包
    const parent = img.parentElement;
    if (parent && !parent.classList.contains(WRAP_CLASS)) {
      const wrap = document.createElement('span');
      wrap.className = WRAP_CLASS;
      // 继承 img 的尺寸样式，避免布局抖动
      const cs = getComputedStyle(img);
      const w = img.width || parseInt(cs.width, 10) || 0;
      const h = img.height || parseInt(cs.height, 10) || 0;
      if (w && w < 80) wrap.classList.add(SMALL_CLASS);
      // 把 wrap 插到 img 原位，再把 img 移进 wrap
      try {
        parent.insertBefore(wrap, img);
        wrap.appendChild(img);
      } catch (e) {
        // React 可能在 reconcile 中，插入失败就放弃外包，至少 .img-missing 的 CSS 还在生效
      }
    }
  }

  function clearMissing(img) {
    if (!img || img.tagName !== 'IMG') return;
    if (!img.classList.contains(MISSING_CLASS)) return;
    img.classList.remove(MISSING_CLASS);
    const parent = img.parentElement;
    if (parent && parent.classList.contains(WRAP_CLASS)) {
      // 把 img 拿出来，删掉 wrap
      try {
        const grand = parent.parentElement;
        if (grand) {
          grand.insertBefore(img, parent);
          grand.removeChild(parent);
        }
      } catch (e) {
        // 忽略 — React 重渲染时 DOM 可能已变化
      }
    }
  }

  // 捕获阶段监听全局 error 事件 —— img/video/audio 加载失败的事件不冒泡
  document.addEventListener(
    'error',
    function (e) {
      const t = e.target;
      if (t && t.tagName === 'IMG') {
        // 只在 src 真的有值时才标记（空 src 不是真失败）
        if (t.src && t.src !== window.location.href) {
          markMissing(t);
        }
      }
    },
    true
  );

  // 监听 load 成功 —— React 重渲染换了 src 且新 src 加载成功时清掉占位
  document.addEventListener(
    'load',
    function (e) {
      const t = e.target;
      if (t && t.tagName === 'IMG' && t.naturalWidth > 0) {
        clearMissing(t);
      }
    },
    true
  );
})();
