---
title: PDF
---

<div id="pdfhead" style="display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;margin-bottom:1rem">
  <strong id="pdfname" style="font-size:1.05rem"></strong>
  <a id="pdfraw" href="#" style="font-size:.9rem">open the file on its own</a>
</div>
<iframe id="pdfframe" title="PDF" src="about:blank" style="width:100%;height:82vh;border:1px solid var(--lightgray,#ddd);border-radius:8px;background:#fff"></iframe>
<p id="pdferr" style="display:none">No PDF asked for. Open this page from a link on a subject page.</p>

<script>
(function () {
  // ?file= is a path inside this site. Anything with a scheme or a host is
  // refused: this page must not turn into an open redirect that renders
  // somebody else's document under this domain.
  var raw = new URLSearchParams(location.search).get("file") || "";
  var bad = !raw || /^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.slice(0, 2) === "//";
  if (bad) { document.getElementById("pdferr").style.display = "block";
             document.getElementById("pdfframe").style.display = "none"; return; }

  var url = new URL(raw, location.href);
  if (url.origin !== location.origin) {
    document.getElementById("pdferr").style.display = "block";
    document.getElementById("pdfframe").style.display = "none"; return;
  }
  var name = decodeURIComponent(url.pathname.split("/").pop() || "PDF");
  document.getElementById("pdfname").textContent = name;
  document.title = name;
  document.getElementById("pdfraw").href = url.href;
  document.getElementById("pdfframe").src = url.href;
})();
</script>
