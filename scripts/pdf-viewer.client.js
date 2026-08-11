// The /pdf page. Draws the document itself with pdf.js instead of handing it to
// an <iframe> and hoping the browser has a viewer: the iframe route rendered
// nothing on the privacy builds and phones this site is actually read on, and
// even where it worked the zoom belonged to the browser's viewer rather than to
// the page. Here zoom is ours, so it goes as far as the reader wants.
//
// Loaded as a module from <head>, which is also what makes it survive Quartz's
// SPA navigation: micromorph patches <body> without executing scripts it finds
// there, but every non-persistent <head> node is removed and re-added, so a
// head script runs again on each soft nav.
import * as pdfjs from "./pdfjs/pdf.min.mjs"

const here = (rel) => new URL(rel, import.meta.url).href

pdfjs.GlobalWorkerOptions.workerSrc = here("./pdfjs/pdf.worker.min.mjs")

// A canvas larger than this is refused outright by Safari and quietly turns
// blank in some Chromium builds, so past a certain zoom we stop adding pixels
// and let the raster stretch. Zooming further still works, it just softens.
const MAX_CANVAS_PIXELS = 16 * 1024 * 1024
const PDF_TO_CSS = 96 / 72 // a PDF unit is 1/72", a CSS pixel is 1/96"
const ZOOM_MIN = 0.1
const ZOOM_MAX = 20
const ZOOM_STEPS = [
  0.1, 0.15, 0.25, 0.35, 0.5, 0.67, 0.8, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5, 6, 8, 10, 14, 20,
]
// Rendered canvases are kept for the pages near the viewport only. Eighteen
// pages at 400% is more bitmap than a phone will hold.
const KEEP_RENDERED = 8

function svg(d) {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`
}

const ICON = {
  prev: svg('<path d="M15 18l-6-6 6-6"/>'),
  next: svg('<path d="M9 18l6-6-6-6"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  fitWidth: svg('<path d="M3 8v8M21 8v8M7 12h10M7 12l3-3M7 12l3 3M17 12l-3-3M17 12l-3 3"/>'),
  fitPage: svg('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
  rotate: svg('<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v5h-5"/>'),
  cols: svg(
    '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="9.5" y="4" width="5" height="16" rx="1"/><rect x="16" y="4" width="5" height="16" rx="1"/>',
  ),
  full: svg(
    '<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/>',
  ),
  open: svg(
    '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14L21 3"/>',
  ),
}

// ?file= names a path inside this site. Anything with a scheme, a host, or a
// different origin is refused: this page must not become an open redirect that
// renders somebody else's document under this domain.
function resolveFile(raw) {
  if (!raw || /^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.slice(0, 2) === "//") return null
  let url
  try {
    url = new URL(raw, location.href)
  } catch {
    return null
  }
  return url.origin === location.origin ? url : null
}

function basepath() {
  // /excalidraw-vault/pdf -> /excalidraw-vault
  return location.pathname.replace(/\/pdf(?:\.html)?\/?$/, "") || ""
}

function readIndex() {
  const el = document.getElementById("pdf-index")
  if (!el) return []
  try {
    return JSON.parse(el.textContent) || []
  } catch {
    return []
  }
}

// A bare /pdf is not an error, it is a question. Answer it with the list.
function showList(root) {
  const data = readIndex()
  const title = document.createElement("strong")
  title.textContent = data.length ? "PDFs on this site" : "No PDFs on this site yet"
  root.appendChild(title)
  if (!data.length) return
  const ul = document.createElement("ul")
  for (const d of data) {
    const li = document.createElement("li")
    const a = document.createElement("a")
    a.href =
      `${basepath()}/pdf?file=${encodeURIComponent(d.file)}&t=${encodeURIComponent(d.title)}` +
      (d.cols ? `&cols=${encodeURIComponent(d.cols)}` : "")
    a.textContent = d.title
    li.appendChild(a)
    ul.appendChild(li)
  }
  root.appendChild(ul)
}

function prettyName(url, given) {
  const t = (given || "").trim()
  if (t) return t
  const file = decodeURIComponent(url.pathname.split("/").pop() || "PDF")
  return file
    .replace(/\.pdf$/i, "")
    .replace(/-+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function buildChrome(root, name, href) {
  root.innerHTML = `
    <div class="pdfv-bar">
      <strong class="pdfv-title"></strong>
      <div class="pdfv-group">
        <button type="button" data-act="prev" title="Previous page (←)" aria-label="Previous page">${ICON.prev}</button>
        <input class="pdfv-page" inputmode="numeric" aria-label="Page number" value="1" />
        <span class="pdfv-count">/ ?</span>
        <button type="button" data-act="next" title="Next page (→)" aria-label="Next page">${ICON.next}</button>
      </div>
      <div class="pdfv-group">
        <button type="button" data-act="out" title="Zoom out (−)" aria-label="Zoom out">${ICON.minus}</button>
        <span class="pdfv-zoom">100%</span>
        <button type="button" data-act="in" title="Zoom in (+)" aria-label="Zoom in">${ICON.plus}</button>
        <button type="button" data-act="fitw" title="Fit width" aria-label="Fit width">${ICON.fitWidth}</button>
        <button type="button" data-act="fitp" title="Fit page (0)" aria-label="Fit page">${ICON.fitPage}</button>
        <button type="button" data-act="rot" title="Rotate" aria-label="Rotate">${ICON.rotate}</button>
        <button type="button" data-act="cols" title="Columns — lay the pages out side by side" aria-label="Columns">${ICON.cols}<span class="pdfv-cols">1</span></button>
      </div>
      <div class="pdfv-group">
        <button type="button" data-act="full" title="Fullscreen (f)" aria-label="Fullscreen">${ICON.full}</button>
        <a class="pdfv-btn" data-act="open" target="_blank" rel="noopener" title="Open the file itself">${ICON.open}<span>Open</span></a>
      </div>
    </div>
    <div class="pdfv-scroll" tabindex="0"><div class="pdfv-pages"></div></div>
    <p class="pdfv-note"></p>`
  root.querySelector(".pdfv-title").textContent = name
  root.querySelector('[data-act="open"]').href = href
  return {
    bar: root.querySelector(".pdfv-bar"),
    scroll: root.querySelector(".pdfv-scroll"),
    pages: root.querySelector(".pdfv-pages"),
    pageInput: root.querySelector(".pdfv-page"),
    count: root.querySelector(".pdfv-count"),
    zoomLabel: root.querySelector(".pdfv-zoom"),
    colsLabel: root.querySelector(".pdfv-cols"),
    colsBtn: root.querySelector('[data-act="cols"]'),
    note: root.querySelector(".pdfv-note"),
    prev: root.querySelector('[data-act="prev"]'),
    next: root.querySelector('[data-act="next"]'),
  }
}

async function mount(root, url, name, wantCols) {
  root.className = "pdfv"
  const ui = buildChrome(root, name, url.href)
  ui.note.textContent = "Loading…"

  let doc
  try {
    doc = await pdfjs.getDocument({
      url: url.href,
      // Fetch the byte ranges the pages on screen need, and stop there. Left on,
      // pdf.js keeps pulling the rest of the file in the background, which on a
      // 16 MB set of notes is minutes of a phone's data for pages nobody opened.
      // GitHub Pages answers Range requests; where a host does not, pdf.js falls
      // back to the whole file on its own.
      disableAutoFetch: true,
      // Both directories ship next to the worker. Without them a document that
      // leans on a standard font renders with the wrong metrics, or not at all.
      standardFontDataUrl: here("./pdfjs/standard_fonts/"),
      cMapUrl: here("./pdfjs/cmaps/"),
      cMapPacked: true,
    }).promise
  } catch (err) {
    ui.note.innerHTML = `This file could not be read here (${String(err && err.message).replace(/</g, "&lt;")}). Use <strong>Open</strong> above to hand it to your own PDF viewer.`
    return
  }

  ui.count.textContent = `/ ${doc.numPages}`
  ui.note.textContent =
    "Ctrl + scroll or pinch to zoom · + and − to step · 0 fits the page · f for fullscreen."

  const dpr = () => window.devicePixelRatio || 1
  let zoom = 1
  let rotation = 0
  let current = 1
  let fitMode = "width" // width | page | null, so a resize keeps the chosen fit
  // Some of these documents are not a sequence of pages at all: they are one
  // big sheet that was cut into tiles, numbered down each column. Stacked in
  // file order every horizontal continuation breaks — page 7 belongs to the
  // right of page 1, not below page 6 — so the tiles are put back on their
  // lattice, and the reader scrolls the sheet instead of the cut.
  // On a phone the whole sheet across is an overview and nothing more, so a
  // narrow screen starts in one column and the button offers the sheet.
  let cols = window.innerWidth >= 700 ? Math.min(8, Math.max(1, wantCols || 1)) : 1

  // One entry per page: the placeholder that reserves layout space, the canvas
  // once drawn, and what it was drawn at so a zoom knows it is stale.
  const items = []
  for (let n = 1; n <= doc.numPages; n++) {
    const el = document.createElement("div")
    el.className = "pdfv-pg"
    el.dataset.num = String(n)
    ui.pages.appendChild(el)
    items.push({ n, el, canvas: null, task: null, drawnKey: null, size: null, visible: false })
  }

  // Unrotated page dimensions, needed to size placeholders before a page is
  // ever rendered. Page 1 stands in until the real page resolves.
  const first = await doc.getPage(1)
  const base1 = first.getViewport({ scale: 1 })
  for (const it of items) it.size = { w: base1.width, h: base1.height }
  items[0].page = first

  async function pageOf(it) {
    if (!it.page) it.page = await doc.getPage(it.n)
    return it.page
  }

  function swapped() {
    return rotation % 180 !== 0
  }

  function cssSize(it) {
    const w = it.size.w * zoom * PDF_TO_CSS
    const h = it.size.h * zoom * PDF_TO_CSS
    return swapped() ? { w: h, h: w } : { w, h }
  }

  function layout() {
    for (const it of items) {
      const { w, h } = cssSize(it)
      // Fractional, not rounded: tiles that were flush on the original sheet
      // would otherwise show a hairline seam wherever the rounding disagreed.
      it.el.style.width = `${w}px`
      it.el.style.height = `${h}px`
    }
    ui.zoomLabel.textContent = `${Math.round(zoom * 100)}%`
  }

  // The lattice is filled column by column because that is the order the sheet
  // was cut in. Placing each tile explicitly keeps the pages in document order
  // in the DOM, which is what page numbers, tabbing and find-in-page follow.
  function applyCols() {
    const grid = cols > 1
    const rows = Math.ceil(items.length / cols)
    ui.pages.classList.toggle("pdfv-sheet", grid)
    ui.pages.style.gridTemplateColumns = grid ? `repeat(${cols}, max-content)` : ""
    items.forEach((it, i) => {
      it.el.style.gridColumn = grid ? String(Math.floor(i / rows) + 1) : ""
      it.el.style.gridRow = grid ? String((i % rows) + 1) : ""
    })
    ui.colsLabel.textContent = String(cols)
    ui.colsBtn.setAttribute("aria-pressed", grid ? "true" : "false")
  }

  function viewportWidth() {
    // 0.75rem of padding on each side of the page column, plus room for the
    // vertical scrollbar, or fit-width immediately produces a horizontal one.
    return Math.max(120, ui.scroll.clientWidth - 28)
  }

  function viewportHeight() {
    return Math.max(120, ui.scroll.clientHeight - 28)
  }

  function fitWidth() {
    const it = items[current - 1] || items[0]
    // Side by side, "width" means the width of the sheet, not of one tile.
    const w = (swapped() ? it.size.h : it.size.w) * PDF_TO_CSS * cols
    setZoom(viewportWidth() / w, { keep: true })
    fitMode = "width"
  }

  function fitPage() {
    const it = items[current - 1] || items[0]
    const w = (swapped() ? it.size.h : it.size.w) * PDF_TO_CSS
    const h = (swapped() ? it.size.w : it.size.h) * PDF_TO_CSS
    setZoom(Math.min(viewportWidth() / w, viewportHeight() / h), { keep: true })
    fitMode = "page"
  }

  // Zoom keeps whatever the reader was looking at under the same point on
  // screen; anchor is a client Y (a wheel or pinch centre) when there is one.
  function setZoom(next, { keep = false, anchorY = null } = {}) {
    const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next))
    if (Math.abs(z - zoom) < 1e-4) return
    if (!keep) fitMode = null

    const rect = ui.scroll.getBoundingClientRect()
    const focus = anchorY == null ? rect.height / 2 : anchorY - rect.top
    const before = ui.scroll.scrollTop + focus
    const centerX = ui.scroll.scrollLeft + rect.width / 2
    const ratio = z / zoom

    zoom = z
    layout()

    ui.scroll.scrollTop = Math.max(0, before * ratio - focus)
    ui.scroll.scrollLeft = Math.max(0, centerX * ratio - rect.width / 2)
    invalidate()
  }

  function step(dir) {
    const i = ZOOM_STEPS.findIndex((s) => (dir > 0 ? s > zoom + 1e-4 : s >= zoom - 1e-4))
    if (dir > 0) setZoom(i === -1 ? ZOOM_MAX : ZOOM_STEPS[i])
    else setZoom(i <= 0 ? ZOOM_MIN : ZOOM_STEPS[i - 1])
  }

  // Everything on screen is redrawn at the new scale; everything else loses its
  // canvas, so memory does not grow with every zoom step.
  function invalidate() {
    for (const it of items) {
      if (it.task) {
        it.task.cancel()
        it.task = null
      }
      it.drawnKey = null
      if (!it.visible) drop(it)
    }
    schedule()
  }

  function drop(it) {
    if (it.canvas) {
      it.canvas.width = it.canvas.height = 0
      it.canvas.remove()
      it.canvas = null
    }
    it.el.classList.remove("pdfv-drawn")
    it.drawnKey = null
  }

  function keyNow() {
    return `${zoom.toFixed(4)}/${rotation}`
  }

  async function draw(it) {
    const key = keyNow()
    if (it.drawnKey === key || it.busy) return
    // Claimed before the first await: two runs can otherwise both walk past a
    // check on it.task, and the page is then drawn twice.
    it.busy = true
    try {
      await drawInner(it, key)
    } finally {
      it.busy = false
    }
  }

  async function drawInner(it, key) {
    const page = await pageOf(it)

    // The real dimensions may differ from page 1's, which only mattered while
    // the placeholder stood in for them. Both this and the placeholder measure
    // the page as the file orients it (/Rotate included); the viewer's own
    // rotation is added on top.
    const base = page.getViewport({ scale: 1 })
    if (Math.abs(base.width - it.size.w) > 0.5 || Math.abs(base.height - it.size.h) > 0.5) {
      it.size = { w: base.width, h: base.height }
      layout()
    }

    const vp = page.getViewport({
      scale: zoom * PDF_TO_CSS,
      rotation: (page.rotate + rotation) % 360,
    })
    const cap = Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, vp.width * vp.height))
    const out = Math.min(dpr(), cap)

    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.floor(vp.width * out))
    canvas.height = Math.max(1, Math.floor(vp.height * out))
    const ctx = canvas.getContext("2d", { alpha: false })

    it.task = page.render({
      canvasContext: ctx,
      viewport: vp,
      transform: out === 1 ? null : [out, 0, 0, out, 0, 0],
    })
    try {
      await it.task.promise
    } catch (err) {
      if (err && err.name === "RenderingCancelledException") return
      throw err
    } finally {
      it.task = null
    }

    // A late arrival for a zoom level nobody is looking at any more is dropped
    // rather than painted over the current one.
    if (key !== keyNow()) return
    if (it.canvas) drop(it)
    it.el.appendChild(canvas)
    it.el.classList.add("pdfv-drawn")
    it.canvas = canvas
    it.drawnKey = key
  }

  let pending = false
  function schedule() {
    if (pending) return
    pending = true
    const go = () => {
      if (!pending) return
      pending = false
      run()
    }
    // A frame is the right moment, but a tab that is not painting yet (opened in
    // the background, which is exactly how "Go to PDF" opens this page) gets no
    // frames at all, and the first render must not wait for the reader to look.
    requestAnimationFrame(go)
    setTimeout(go, 150)
  }

  // One page is drawn at a time, nearest first. Firing all of them at once is
  // how the first page ended up last: they share the same main thread, so eight
  // parallel renders means eight times as long before anything is on screen.
  // The queue is re-sorted after every page, so scrolling changes what is next.
  let queue = []
  let drawing = false
  async function pump() {
    if (drawing) return
    const key = keyNow()
    const next = queue.find((it) => it.drawnKey !== key && !it.busy)
    if (!next) return
    drawing = true
    try {
      await draw(next)
    } catch (err) {
      console.error("pdf page", next.n, err)
    } finally {
      drawing = false
    }
    pump()
  }

  function run() {
    const rect = ui.scroll.getBoundingClientRect()
    const near = []
    for (const it of items) {
      const r = it.el.getBoundingClientRect()
      // Distance to the viewport in both axes, because side by side the next
      // tile to draw is as often to the right as it is below.
      const dy = Math.max(0, rect.top - r.bottom, r.top - rect.bottom)
      const dx = Math.max(0, rect.left - r.right, r.left - rect.right)
      it.visible = dy < rect.height && dx < rect.width
      near.push({ it, dist: Math.hypot(dx, dy) })
    }
    near.sort((a, b) => a.dist - b.dist)
    // Only what is on screen or one screen away is worth drawing. Rendering runs
    // on the main thread, so queueing pages nobody is near makes the page the
    // reader *is* looking at wait behind them — at high zoom, for a long time.
    queue = near.filter(({ it }) => it.visible).map(({ it }) => it)
    near.slice(KEEP_RENDERED).forEach(({ it }) => {
      if (!it.visible) drop(it)
    })
    pump()

    // The counter names the tile nearest the top left corner of the view, which
    // in one column is simply the page you are reading, and side by side is the
    // one you would start a row at.
    let n = current
    let bestScore = Infinity
    for (const it of items) {
      const r = it.el.getBoundingClientRect()
      if (r.bottom <= rect.top || r.top >= rect.bottom) continue
      if (r.right <= rect.left || r.left >= rect.right) continue
      const score = Math.abs(r.top - rect.top) + Math.abs(r.left - rect.left) / 2
      if (score < bestScore) {
        bestScore = score
        n = it.n
      }
    }
    if (n !== current) {
      current = n
      if (document.activeElement !== ui.pageInput) ui.pageInput.value = String(n)
      ui.prev.disabled = n <= 1
      ui.next.disabled = n >= items.length
    }
  }

  function goto(n) {
    const target = items[Math.min(items.length, Math.max(1, n)) - 1]
    if (!target) return
    ui.scroll.scrollTop = Math.max(0, target.el.offsetTop - 8)
    // Side by side a page can be off to the right as easily as below.
    ui.scroll.scrollLeft = Math.max(0, target.el.offsetLeft - 8)
    schedule()
  }

  root.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]")
    if (!btn) return
    switch (btn.dataset.act) {
      case "prev":
        return goto(current - 1)
      case "next":
        return goto(current + 1)
      case "in":
        return step(1)
      case "out":
        return step(-1)
      case "fitw":
        return fitWidth()
      case "fitp":
        return fitPage()
      case "rot":
        rotation = (rotation + 90) % 360
        if (fitMode === "width") fitWidth()
        else if (fitMode === "page") fitPage()
        else {
          layout()
          invalidate()
        }
        return
      case "cols": {
        // Between one column and however many the sheet was cut into. A reader
        // who wants a single page at a time can have it, and come back.
        const sheet = Math.min(8, Math.max(2, wantCols || 2))
        cols = cols === 1 ? sheet : 1
        applyCols()
        if (fitMode === "page") fitPage()
        else fitWidth()
        goto(current)
        return
      }
      case "full":
        if (document.fullscreenElement) document.exitFullscreen()
        else root.requestFullscreen?.().catch(() => {})
        return
    }
  })

  ui.pageInput.addEventListener("change", () => {
    const n = parseInt(ui.pageInput.value, 10)
    if (Number.isFinite(n)) goto(n)
    else ui.pageInput.value = String(current)
  })

  ui.scroll.addEventListener("scroll", schedule, { passive: true })

  ui.scroll.addEventListener(
    "wheel",
    (e) => {
      if (!e.ctrlKey && !e.metaKey) return
      // Ctrl+wheel is the browser's page zoom by default, which would scale the
      // chrome around the document instead of the document.
      e.preventDefault()
      setZoom(zoom * Math.exp(-e.deltaY / 400), { anchorY: e.clientY })
    },
    { passive: false },
  )

  // Pinch. Two pointers, distance ratio drives the zoom; one pointer is left
  // alone so ordinary scrolling still works.
  const touches = new Map()
  let pinch = null
  ui.scroll.addEventListener(
    "pointerdown",
    (e) => {
      if (e.pointerType !== "touch") return
      touches.set(e.pointerId, e)
      if (touches.size === 2) {
        const [a, b] = [...touches.values()]
        pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), z: zoom }
      }
    },
    { passive: true },
  )
  ui.scroll.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "touch" || !touches.has(e.pointerId)) return
      touches.set(e.pointerId, e)
      if (touches.size !== 2 || !pinch) return
      const [a, b] = [...touches.values()]
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
      if (!pinch.d) return
      e.preventDefault()
      setZoom(pinch.z * (d / pinch.d), { anchorY: (a.clientY + b.clientY) / 2 })
    },
    { passive: false },
  )
  const endTouch = (e) => {
    touches.delete(e.pointerId)
    if (touches.size < 2) pinch = null
  }
  ui.scroll.addEventListener("pointerup", endTouch, { passive: true })
  ui.scroll.addEventListener("pointercancel", endTouch, { passive: true })

  // Keys only when the reader is in the viewer, so the page's own shortcuts and
  // the search box keep working everywhere else.
  const onKey = (e) => {
    if (!root.contains(document.activeElement) && !document.fullscreenElement) return
    if (document.activeElement === ui.pageInput && e.key !== "Escape") return
    if (e.metaKey || e.altKey) return
    const k = e.key
    if (k === "+" || k === "=") step(1)
    else if (k === "-" || k === "_") step(-1)
    else if (k === "0") fitPage()
    else if (k === "9") fitWidth()
    else if (k === "f" && !e.ctrlKey) root.querySelector('[data-act="full"]').click()
    else if (k === "ArrowRight" || k === "PageDown") goto(current + 1)
    else if (k === "ArrowLeft" || k === "PageUp") goto(current - 1)
    else return
    e.preventDefault()
  }
  document.addEventListener("keydown", onKey)

  let resizeT
  const onResize = () => {
    clearTimeout(resizeT)
    resizeT = setTimeout(() => {
      if (fitMode === "width") fitWidth()
      else if (fitMode === "page") fitPage()
      else schedule()
    }, 150)
  }
  window.addEventListener("resize", onResize)

  // Navigating away in the SPA replaces the body, so the document, the worker
  // and these window-level listeners have to be let go here. Staying on the
  // page (a hash link, say) is not a teardown, so the check repeats until the
  // root really is gone.
  const teardown = () => {
    if (root.isConnected) return
    document.removeEventListener("nav", teardown)
    document.removeEventListener("keydown", onKey)
    window.removeEventListener("resize", onResize)
    for (const it of items) drop(it)
    doc.destroy()
  }
  document.addEventListener("nav", teardown)

  applyCols()
  layout()
  fitWidth()
  schedule()
}

// Called by the boot snippet in every page's <head>, on load and on every SPA
// navigation. It is a function rather than top-level code because a module is
// evaluated once per URL per tab: importing it a second time returns the same
// instance without re-running it, so the work has to be behind a call.
export function initPdfViewer() {
  const root = document.getElementById("pdfapp")
  if (!root || root.dataset.ready) return
  root.dataset.ready = "1"

  const q = new URLSearchParams(location.search)
  const url = resolveFile(q.get("file") || "")
  if (!url) return showList(root)

  const name = prettyName(url, q.get("t"))
  document.title = name
  // How many tiles wide the sheet this file was cut from was. Carried on the
  // link, because the cut throws the geometry away: once every page is its own
  // page, nothing in the file says they were ever a lattice.
  const cols = Math.max(1, Math.min(8, parseInt(q.get("cols"), 10) || 1))
  mount(root, url, name, cols).catch((err) => {
    console.error(err)
    root.innerHTML = `<p class="pdfv-note">The viewer failed to start. <a href="${url.href}" target="_blank" rel="noopener">Open the PDF directly</a>.</p>`
  })
}

initPdfViewer()
