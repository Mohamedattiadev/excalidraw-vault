---
title: PDF
# A viewer, not a note. Keep it out of search, the explorer and
# backlinks; it is only ever reached from a "Go to PDF" link.
unlisted: true
---

<div id="pdfhead" style="display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;margin-bottom:1rem">
  <strong id="pdfname" style="font-size:1.05rem"></strong>
  <a id="pdfopen" href="#" target="_blank" rel="noopener" style="display:none;padding:.5rem .9rem;border:1px solid var(--lightgray,#ddd);border-radius:8px;font-weight:600;text-decoration:none;white-space:nowrap">Open the PDF ↗</a>
</div>

<p id="pdfnote" style="display:none;font-size:.9rem;color:var(--gray,#888);margin-bottom:1rem"></p>

<iframe id="pdfframe" title="PDF" src="about:blank" style="display:none;width:100%;border:1px solid var(--lightgray,#ddd);border-radius:8px;background:#fff"></iframe>

<div id="pdflist" style="display:none"></div>

<script>
(function () {
  var frame = document.getElementById("pdfframe");
  var open = document.getElementById("pdfopen");
  var note = document.getElementById("pdfnote");
  var list = document.getElementById("pdflist");
  var nameEl = document.getElementById("pdfname");

  function basepath() {
    // /excalidraw-vault/pdf -> /excalidraw-vault
    return location.pathname.replace(/\/pdf(?:\.html)?\/?$/, "") || "";
  }

  // No ?file= is not an error, it just means "which one?". Answer it.
  function showList() {
    var data = [];
    try { data = JSON.parse(document.getElementById("pdf-index").textContent) || []; } catch (e) {}
    nameEl.textContent = data.length ? "PDFs on this site" : "No PDFs on this site yet";
    if (!data.length) return;
    var ul = document.createElement("ul");
    data.forEach(function (d) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = basepath() + "/pdf?file=" + encodeURIComponent(d.file) + "&t=" + encodeURIComponent(d.title);
      a.textContent = d.title;
      li.appendChild(a);
      ul.appendChild(li);
    });
    list.appendChild(ul);
    list.style.display = "block";
  }

  // ?file= is a path inside this site. Anything with a scheme or a host is
  // refused: this page must not turn into an open redirect that renders
  // somebody else's document under this domain.
  var raw = new URLSearchParams(location.search).get("file") || "";
  if (!raw || /^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.slice(0, 2) === "//") return showList();

  var url;
  try { url = new URL(raw, location.href); } catch (e) { return showList(); }
  if (url.origin !== location.origin) return showList();

  var file = decodeURIComponent(url.pathname.split("/").pop() || "PDF");
  var pretty = (new URLSearchParams(location.search).get("t") || "").trim() ||
    file.replace(/\.pdf$/i, "").replace(/-+/g, " ").replace(/\s+/g, " ").trim();
  nameEl.textContent = pretty;
  document.title = pretty;

  // The button is always there. Whether a browser will draw a PDF inside a page
  // is not something to rely on: phones refuse, Firefox with pdf.js turned off
  // shows an empty frame, and some privacy builds block the embed outright.
  open.href = url.href;
  open.style.display = "inline-block";

  if (window.matchMedia("(max-width: 640px)").matches) {
    note.textContent = "Phone browsers will not draw a PDF inside a page, so the button opens it in ur PDF viewer.";
    note.style.display = "block";
    return;
  }

  frame.style.display = "block";
  frame.style.height = "82vh";
  frame.src = url.href;

  // No attempt to detect whether it actually rendered: a PDF viewer is not a
  // DOM, so an emptiness check calls a perfectly good render a failure. Say
  // plainly that the button is there if nothing shows, and leave it at that.
  note.textContent = "If the PDF does not appear below, ur browser will not draw one inline. Use the button above.";
  note.style.display = "block";
})();
</script>
