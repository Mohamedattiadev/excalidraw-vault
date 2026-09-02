/* Put the playground on the chapter page, instead of one tab away from it.
 *
 * HTML & CSS 101 is published twice. dev-101 holds the course and, next to it,
 * an interactive playground -- code on the left, the page it makes on the
 * right, one per lecture at ?c=<id>. The vault serves the same chapters as
 * notes. Until now the only thing joining them was a badge that opened the
 * playground somewhere else, so the reader read here and typed there.
 *
 * Both sites are on the same origin -- mohamedattiadev.github.io -- so the
 * playground can simply be an iframe on the chapter page. One playground, still
 * the only copy, now on the page that is teaching the thing it demonstrates.
 *
 * WHY THIS IS A PLUGIN AND NOT A LINE OF MARKDOWN
 *
 * The chapter pages are a word-for-word port of the dev-101 READMEs, and
 * scripts/check-parity.mjs fails the build if they ever stop being one. Typing
 * an <iframe> into content/ would be exactly the drift that check exists to
 * catch. So the markdown stays untouched and the embed is added to the html on
 * the way out, which also means it cannot be forgotten on a new chapter: the
 * page already carries a link to its own playground, and that link is where the
 * topic id comes from.
 *
 *   [![Open the playground](...)](https://…/interactive/?c=01-tags)
 *                                                          ^^^^^^^
 *
 * Nothing here is hardcoded per chapter. A chapter with no such link gets no
 * embed, which is the right answer for one that has no playground.
 *
 * The url is rewritten to a root-relative path. Absolute would work too, but
 * only same-origin lets the playground read the vault's light/dark toggle
 * straight off <html saved-theme>, and following the theme is most of what
 * makes it look like part of the page rather than a window onto another site.
 * That also means a local `quartz build --serve` on its own shows an empty
 * frame: serve the two sites under one root to see it whole.
 */

const DEFAULTS = {
  /** Where the standalone pages are published. Stripped to make the src same-origin. */
  host: "https://mohamedattiadev.github.io",
  /** Which pages get an embed. Chapter pages only -- not the course index, which
   *  links every lecture at once and would be a wall of iframes. */
  slugPattern: "^02-personal/11-dev-101/html-css-101/\\d\\d-[^/]+/index$",
}

const PLAYGROUND_PATH = "/dev-101/HTML-CSS-101/interactive/"

/* Runs on every page, once. A playground link opens the playground over the
 * page instead of in a tab, so the reader does not lose the chapter they were
 * reading in order to try the thing it just described.
 *
 * Delegated from `document` on purpose. This site is a single page app: the
 * body is swapped out on every navigation, so a listener bound to a link would
 * be gone the moment the reader moved. `document` survives, and the guard makes
 * the script safe to run again when quartz re-executes it after a navigation.
 *
 * Modified clicks are left alone throughout -- ctrl, cmd, shift, middle button
 * are the reader saying "give me a tab", and taking that away is rude.
 */
const CLIENT = `
(() => {
  if (window.__playgroundModal) return
  window.__playgroundModal = true

  const PATH = ${JSON.stringify(PLAYGROUND_PATH)}
  let box = null
  let lastFocus = null

  const isPlayground = (a) => {
    try { return new URL(a.href, location.href).pathname === PATH } catch { return false }
  }

  function close() {
    if (!box) return
    box.remove()
    box = null
    document.documentElement.style.removeProperty("overflow")
    if (lastFocus && lastFocus.isConnected) lastFocus.focus()
  }

  function open(url) {
    close()
    lastFocus = document.activeElement

    box = document.createElement("div")
    box.className = "pg-modal"
    box.setAttribute("role", "dialog")
    box.setAttribute("aria-modal", "true")
    box.setAttribute("aria-label", "the playground")
    box.innerHTML =
      '<div class="pg-modal-backdrop"></div>' +
      '<div class="pg-modal-box">' +
        '<div class="pg-modal-bar">' +
          '<span class="pg-modal-title">the playground</span>' +
          '<a class="pg-modal-tab" target="_blank" rel="noopener noreferrer">open in a new tab \\u2197</a>' +
          '<button class="pg-modal-close" type="button" aria-label="close the playground">\\u2715</button>' +
        '</div>' +
        '<iframe class="pg-modal-frame" title="the HTML and CSS playground"></iframe>' +
      '</div>'

    box.querySelector(".pg-modal-tab").href = url.href
    box.querySelector(".pg-modal-frame").src = url.pathname + url.search
    box.querySelector(".pg-modal-close").addEventListener("click", close)
    box.querySelector(".pg-modal-backdrop").addEventListener("click", close)

    // The page behind must not scroll while this is over it.
    document.documentElement.style.overflow = "hidden"
    document.body.appendChild(box)
    box.querySelector(".pg-modal-close").focus()
  }

  document.addEventListener("click", (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const a = e.target.closest && e.target.closest("a[href]")
    // target=_blank is the card's own "open it in its own tab", and the reader
    // asking for a tab should get a tab.
    if (!a || a.target === "_blank" || !isPlayground(a)) return

    /* stopPropagation, not just preventDefault. Quartz's router listens on
       window and this listens on document, so this one runs first -- but the
       router does not check defaultPrevented, so preventing the default alone
       leaves it free to soft-navigate to the playground anyway. It did: the
       modal opened and was then thrown away by a navigation half a second
       later. The links also carry data-router-ignore, which is the router's
       own way of being told to leave a link alone; this is the second lock. */
    e.preventDefault()
    e.stopPropagation()
    open(new URL(a.href, location.href))
  })

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && box) { e.preventDefault(); close() }
  })

  // A navigation while it is open would leave it floating over the new page.
  document.addEventListener("nav", close)
})()
`

const el = (tagName, properties, children = []) => ({
  type: "element",
  tagName,
  properties,
  children,
})

const text = (value) => ({ type: "text", value })

/* Block-level tags an embed can legally sit next to. The badge lives in a <p>,
 * and a <figure> inside a <p> is not a <figure> inside a <p> for long -- the
 * parser closes the paragraph and leaves the card orphaned above it. */
const BLOCKS = new Set(["p", "li", "td", "th", "blockquote", "div", "section"])

/* Walk once, looking for the first link to a chapter's own playground, and
 * carry the ancestor stack along so the insertion point comes back with it.
 *
 * Returns { topic, parent, index }: the ?c= id, and the block-level element's
 * parent and position, so the card can be spliced in directly after it. */
function findPlaygroundSlot(tree, host) {
  const prefix = host + PLAYGROUND_PATH

  const walk = (node, ancestors) => {
    if (node.type === "element" && node.tagName === "a") {
      const href = node.properties?.href
      if (typeof href === "string" && href.startsWith(prefix)) {
        let topic = null
        try {
          topic = new URL(href).searchParams.get("c")
        } catch {
          topic = null
        }

        // The course-wide link has no ?c= on it. It is not a chapter's own
        // playground and must not be embedded as if it were.
        if (topic) {
          for (let i = ancestors.length - 1; i >= 0; i--) {
            const a = ancestors[i]
            if (a.node.type === "element" && BLOCKS.has(a.node.tagName) && a.parent) {
              return { topic, parent: a.parent, index: a.index }
            }
          }
          return null
        }
      }
    }

    const children = node.children ?? []
    for (let i = 0; i < children.length; i++) {
      const hit = walk(children[i], [...ancestors, { node: children[i], parent: node, index: i }])
      if (hit) return hit
    }
    return null
  }

  return walk(tree, [])
}

/* Two marks on the links that leave this site for the course's own pages.
 *
 * data-router-ignore, on every one of them. The two sites share an origin --
 * that is the whole point, it is what lets the playground read this page's
 * theme -- and quartz's router decides what is one of its own pages by origin
 * alone. So it treats /dev-101/ as an internal route, fetches it and swaps it
 * into this document, and the playground arrives with its stylesheet resolved
 * against the vault's path. data-router-ignore is the router's own opt out and
 * says: this is a real page, do a real navigation.
 *
 * playground-link, on the text ones, so the stylesheet can make them look like
 * something u press. They were the plainest thing on the page before -- one
 * more coloured word in a paragraph of coloured words -- and the parts of a
 * chapter now end in one, so they have to read as an action. Links wrapping an
 * image are the badges and are left alone; they already look like buttons
 * because they are pictures of buttons.
 *
 * Only ever adds attributes. Every href is untouched, so all of these still
 * work exactly as written if no script runs at all. */
function markPlaygroundLinks(tree, host) {
  const site = host + "/dev-101/"
  const prefix = host + PLAYGROUND_PATH
  const hasImage = (node) =>
    node.type === "element" && node.tagName === "img" ? true : (node.children ?? []).some(hasImage)

  const walk = (node) => {
    if (node.type === "element" && node.tagName === "a") {
      const href = node.properties?.href
      if (typeof href === "string" && href.startsWith(site)) {
        node.properties.dataRouterIgnore = ""

        if (href.startsWith(prefix) && !hasImage(node)) {
          const existing = node.properties.className
          const classes = Array.isArray(existing) ? existing : existing ? [existing] : []
          if (!classes.includes("playground-link")) classes.push("playground-link")
          node.properties.className = classes
        }
      }
    }
    for (const child of node.children ?? []) walk(child)
  }

  walk(tree)
}

const PlaygroundEmbed = (userOpts) => {
  const opts = { ...DEFAULTS, ...userOpts }
  const slugPattern = new RegExp(opts.slugPattern)

  return {
    name: "PlaygroundEmbed",

    externalResources() {
      // afterDOMReady, and not spaPreserve: it guards itself, so running again
      // after a navigation is free, and the listener it left on document is
      // still there either way.
      return { js: [{ loadTime: "afterDOMReady", contentType: "inline", script: CLIENT }] }
    },

    htmlPlugins() {
      return [
        () => (tree, file) => {
          const slug = file.data?.slug
          if (typeof slug !== "string") return

          // Every page can link to the playground -- the course index does, and
          // so does the video page -- so the links are dressed everywhere. Only
          // a chapter page gets a whole playground embedded in it.
          markPlaygroundLinks(tree, opts.host)

          if (!slugPattern.test(slug)) return

          const slot = findPlaygroundSlot(tree, opts.host)
          if (!slot) {
            // Every chapter of this course has a playground and links to it.
            // One that does not is either a new chapter that forgot the badge
            // or a port that dropped it, and both are worth hearing about --
            // the embed would otherwise just quietly not be there.
            console.warn(`[playground-embed] no ?c= playground link on ${slug}, no embed added`)
            return
          }

          const query = `?c=${encodeURIComponent(slot.topic)}`
          // Absolute for the link out, so it is a real address someone can copy.
          // Root-relative for the frame, so it is same-origin and can read the
          // theme off this page. The playground works out it is in a frame by
          // itself and trims its own chrome; nothing has to be said in the url.
          const standalone = `${opts.host}${PLAYGROUND_PATH}${query}`
          const embedded = `${PLAYGROUND_PATH}${query}`

          const card = el("figure", { className: ["playground-embed"], dataTopic: slot.topic }, [
            el("figcaption", { className: ["playground-embed-bar"] }, [
              // Not "play with this chapter": the badge directly above says
              // exactly that, and two lines running saying the same words is
              // how a page starts to read like a form.
              el("span", { className: ["playground-embed-label"] }, [text("the playground")]),
              el("span", { className: ["playground-embed-topic"] }, [text(slot.topic)]),
              el(
                "a",
                {
                  className: ["playground-embed-open"],
                  href: standalone,
                  target: "_blank",
                  rel: "noopener noreferrer",
                },
                [text("open it in its own tab ↗")],
              ),
            ]),
            el("iframe", {
              className: ["playground-embed-frame"],
              src: embedded,
              title: `The HTML & CSS 101 playground, opened on ${slot.topic}`,
              loading: "lazy",
            }),
          ])

          slot.parent.children.splice(slot.index + 1, 0, card)
        },
      ]
    },
  }
}

PlaygroundEmbed.quartzCategory = "transformer"

export default PlaygroundEmbed
export { PlaygroundEmbed }
