---
title: PDF
# A viewer, not a note. Keep it out of search, the explorer and
# backlinks; it is only ever reached from a "Go to PDF" link.
unlisted: true
---

<div id="pdfhead" style="display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;margin-bottom:1rem">
  <strong id="pdfname" style="font-size:1.05rem"></strong>
  <a id="pdfraw" href="#" target="_blank" rel="noopener" style="font-size:.9rem">open it on its own</a>
</div>

<a id="pdfopen" href="#" target="_blank" rel="noopener" style="display:none;padding:.9rem 1.1rem;border:1px solid var(--lightgray,#ddd);border-radius:8px;text-align:center;font-weight:600;text-decoration:none">Open the PDF</a>
<p id="pdfnote" style="display:none;font-size:.9rem;color:var(--gray,#888)">Phone browsers will not draw a PDF inside a page, so this opens it in ur PDF viewer instead.</p>

<iframe id="pdfframe" title="PDF" src="about:blank" style="width:100%;border:1px solid var(--lightgray,#ddd);border-radius:8px;background:#fff"></iframe>

<p id="pdferr" style="display:none">No PDF asked for. Open this page from a link on a subject page.</p>

<script>
(function () {
  var frame = document.getElementById("pdfframe");
  var open = document.getElementById("pdfopen");
  var note = document.getElementById("pdfnote");
  var err = document.getElementById("pdferr");

  function fail() { err.style.display = "block"; frame.style.display = "none"; }

  // ?file= is a path inside this site. Anything with a scheme or a host is
  // refused: this page must not turn into an open redirect that renders
  // somebody else's document under this domain.
  var raw = new URLSearchParams(location.search).get("file") || "";
  if (!raw || /^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.slice(0, 2) === "//") return fail();

  var url = new URL(raw, location.href);
  if (url.origin !== location.origin) return fail();

  // The link passes the real title. Only fall back to unslugging the filename
  // when it does not, which reads worse but still beats showing the raw slug.
  var file = decodeURIComponent(url.pathname.split("/").pop() || "PDF");
  var pretty = (new URLSearchParams(location.search).get("t") || "").trim() ||
    file.replace(/\.pdf$/i, "").replace(/-+/g, " ").replace(/\s+/g, " ").trim();
  document.getElementById("pdfname").textContent = pretty;
  document.title = pretty;
  document.getElementById("pdfraw").href = url.href;
  open.href = url.href;

  // Under 640px two things are true: the stylesheet forces height:auto on every
  // iframe, which collapses this one to the 150px default, and phone browsers
  // decline to render a PDF inline anyway. A dead grey box is worse than a
  // button, so on a phone this becomes a button.
  if (window.matchMedia("(max-width: 640px)").matches) {
    frame.style.display = "none";
    open.style.display = "block";
    note.style.display = "block";
  } else {
    frame.style.height = "82vh";
    frame.src = url.href;
  }
})();
</script>
