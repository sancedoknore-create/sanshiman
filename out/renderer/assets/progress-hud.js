/* ═══════════════════════════════════════════════════════════════════════
   Canvas Progress HUD — 叁视漫
   Floating generation progress cards, live on the canvas.
   Shows progress bars during generation, thumbnails on completion.
   ═══════════════════════════════════════════════════════════════════════ */
;(function () {
  "use strict"

  /* ── State ─────────────────────────────────────────────────────── */
  const cards = new Map()
  let pinned = false

  /* ── DOM refs ──────────────────────────────────────────────────── */
  let $hud, $toggle
  const $ = (s, c) => (c || document).querySelector(s)

  /* ── Helpers ───────────────────────────────────────────────────── */
  const esc = s => String(s || "").replace(/[&<>"']/g, m =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m])

  /* ── Create DOM ────────────────────────────────────────────────── */
  function createDom() {
    $hud = document.createElement("div")
    $hud.id = "progress-hud"
    document.body.appendChild($hud)

    $toggle = document.createElement("button")
    $toggle.id = "ph-toggle"
    $toggle.title = "固定进度面板"
    $toggle.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24Z"/></svg>`
    $toggle.onclick = () => {
      pinned = !pinned
      $toggle.classList.toggle("pinned", pinned)
      $toggle.title = pinned ? "取消固定" : "固定进度面板"
      if (!pinned && cards.size === 0) {
        $toggle.style.display = "none"
      }
    }
    document.body.appendChild($toggle)
  }

  /* ── Build / Update card ───────────────────────────────────────── */
  function getTaskId(task) {
    return task.payload?.historyTaskId || task.id
  }

  function getTaskLabel(task) {
    const type = task.payload?.type || ""
    const model = task.payload?.configName || task.payload?.modelId || ""
    return {
      type: type === "video" ? "视频" : type === "image" ? "图片" : "",
      model: model,
    }
  }

  function isTerminal(task) {
    return task.status === "completed" || task.status === "failed" || task.status === "cancelled"
  }

  function handleTaskUpdate(task) {
    if (!task || !task.payload) return
    const t = task.payload.type
    if (t !== "image" && t !== "video") return

    const id = getTaskId(task)
    const label = getTaskLabel(task)
    const progress = task.progress || 0
    const status = task.status
    const done = isTerminal(task)
    const ok = task.status === "completed"
    const failed = task.status === "failed"
    const resultUrl = task.resultUrl || (card.data && card.data.resultUrl) || ""

    let card = cards.get(id)

    if (!card) {
      card = { el: createCard(id, label, progress, status), data: task, removeTimer: null }
      cards.set(id, card)
      $hud.appendChild(card.el)
      updateHudVisibility()
    }

    updateCard(card.el, label, progress, status, resultUrl, task.error)

    if (done) {
      if (card.removeTimer) clearTimeout(card.removeTimer)
      const delay = ok ? 6000 : 8000
      card.removeTimer = setTimeout(() => removeCard(id), delay)
    }

    card.data = task
  }

  function createCard(id, label, progress, status) {
    const el = document.createElement("div")
    el.className = "ph-card"
    el.dataset.taskId = id
    el.innerHTML = `
      <div class="ph-row-top">
        <span class="ph-model">
          <span class="ph-dot running"></span>
          <span class="ph-model-text">${esc(label.model)}</span>
        </span>
        <span class="ph-pct">${progress}%</span>
      </div>
      <div class="ph-bar-track">
        <div class="ph-bar-fill" style="width:${Math.max(2, progress)}%"></div>
      </div>
      <div class="ph-result"></div>
      <div class="ph-error"></div>
    `
    return el
  }

  function updateCard(el, label, progress, status, resultUrl, errorMsg) {
    const dot = $(".ph-dot", el)
    const pct = $(".ph-pct", el)
    const bar = $(".ph-bar-fill", el)
    const result = $(".ph-result", el)
    const error = $(".ph-error", el)
    const modelText = $(".ph-model-text", el)

    if (modelText) modelText.textContent = label.model

    // Status dot
    if (dot) {
      dot.className = "ph-dot"
      if (status === "completed") dot.classList.add("done")
      else if (status === "failed" || status === "cancelled") dot.classList.add("failed")
      else dot.classList.add("running")
    }

    // Percentage
    if (pct) {
      pct.textContent = progress + "%"
      pct.className = "ph-pct"
      if (status === "completed") pct.classList.add("done")
      else if (status === "failed" || status === "cancelled") pct.classList.add("failed")
    }

    // Progress bar
    if (bar) {
      bar.style.width = Math.max(2, progress) + "%"
      bar.className = "ph-bar-fill"
      if (status === "completed") bar.classList.add("done")
      else if (status === "failed" || status === "cancelled") bar.classList.add("failed")
    }

    // Card-level classes
    if (status === "completed") {
      el.classList.add("completing")
      el.classList.remove("failing")
    } else if (status === "failed" || status === "cancelled") {
      el.classList.add("failing")
      el.classList.remove("completing")
    }

    // Thumbnail on completion
    if (status === "completed" && resultUrl && result) {
      result.classList.add("show")
      result.innerHTML = `
        <img src="${esc(resultUrl)}" alt="" loading="lazy" onerror="this.parentElement.classList.remove('show')" />
        <div class="ph-result-overlay" onclick="this.parentElement.classList.remove('show')">
          <span class="ph-result-hint">完成</span>
        </div>
      `
    }

    // Error message
    if ((status === "failed" || status === "cancelled") && error) {
      error.textContent = errorMsg || "生成失败"
    }
  }

  function removeCard(id) {
    const card = cards.get(id)
    if (!card) return

    if (card.removeTimer) clearTimeout(card.removeTimer)

    card.el.classList.add("removing")
    card.el.addEventListener("animationend", () => {
      if (card.el.parentNode) card.el.remove()
      cards.delete(id)
      updateHudVisibility()
    }, { once: true })
  }

  function updateHudVisibility() {
    if (cards.size > 0) {
      $hud.classList.add("has-tasks")
      $toggle.style.display = "flex"
      if (pinned) $toggle.classList.add("pinned")
    } else if (!pinned) {
      $hud.classList.remove("has-tasks")
      $toggle.style.display = "none"
      $toggle.classList.remove("pinned")
    } else {
      $hud.classList.remove("has-tasks")
    }
  }

  /* ── Init ──────────────────────────────────────────────────────── */
  async function init() {
    await new Promise(r => {
      if (document.readyState === "complete") r()
      else window.addEventListener("load", r, { once: true })
    })
    await new Promise(r => setTimeout(r, 600))

    createDom()

    try {
      if (window.api && window.api.engineAPI && window.api.engineAPI.onTaskUpdated) {
        window.api.engineAPI.onTaskUpdated(handleTaskUpdate)
      }
    } catch (e) {
      console.warn("[ProgressHUD] listener failed:", e.message)
    }

    // Poll for existing active tasks
    try {
      if (window.api && window.api.engineAPI && window.api.engineAPI.getStatus) {
        const status = await window.api.engineAPI.getStatus()
        if (status && status.success && status.status) {
          const all = [
            ...(status.status.active || []),
            ...(status.status.waiting || []),
          ]
          all.forEach(t => handleTaskUpdate(t))
        }
      }
    } catch {}
  }

  init().catch(e => console.error("[ProgressHUD] init failed:", e))
})()
