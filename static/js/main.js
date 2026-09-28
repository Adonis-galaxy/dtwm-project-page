// Project page: theme toggle, hero task selector, comparison switch, BibTeX copy, and the animated taxel field
// behind the hero (a glove-like pressure raster; drawn once when the viewer prefers reduced motion).
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ------------------------------------------------------------ theme
  var root = document.documentElement, toggle = document.getElementById("theme-toggle");
  function theme() {
    return root.getAttribute("data-theme") ||
      (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }
  function label() { if (toggle) toggle.textContent = theme() === "dark" ? "light" : "dark"; }
  try { var saved = localStorage.getItem("dtwm-theme"); if (saved) root.setAttribute("data-theme", saved); } catch (e) {}
  label();
  if (toggle) toggle.addEventListener("click", function () {
    var next = theme() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    window.dispatchEvent(new Event("resize"));
    try { localStorage.setItem("dtwm-theme", next); } catch (e) {}
    label();
  });

  // ------------------------------------------------------------ selectors
  function group(selector, onPick) {
    var items = document.querySelectorAll(selector);
    items.forEach(function (b) {
      b.addEventListener("click", function () {
        items.forEach(function (x) { x.setAttribute(x.getAttribute("role") === "tab" ? "aria-selected" : "aria-pressed", "false"); });
        b.setAttribute(b.getAttribute("role") === "tab" ? "aria-selected" : "aria-pressed", "true");
        onPick(b);
      });
    });
  }
  var taskImg = document.getElementById("task-gif");
  group("[data-task]", function (b) { taskImg.src = b.getAttribute("data-task"); taskImg.alt = "The prediction task on a held-out clip: " + b.textContent.trim(); });
  var cmpImg = document.getElementById("cmp-gif");
  group("[data-cmp]", function (b) { cmpImg.src = b.getAttribute("data-cmp"); cmpImg.alt = "First predicted chunk of all six models: " + b.textContent.trim(); });

  // ------------------------------------------------------------ BibTeX copy
  var copyBtn = document.getElementById("copy-bib");
  if (copyBtn) copyBtn.addEventListener("click", function () {
    var t = document.getElementById("bibtex").textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () {
      copyBtn.textContent = "Copied"; setTimeout(function () { copyBtn.textContent = "Copy"; }, 1600);
    }, function () {});
  });

  // ------------------------------------------------------------ taxel field
  var cv = document.getElementById("taxels");
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext("2d"), dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0, running = true;
  // heat scale of the glove panels: pale yellow, orange, red, magenta, purple
  var STOPS = [[255, 227, 159], [247, 162, 79], [226, 80, 95], [179, 51, 106], [91, 34, 112]];
  function heat(v) {
    v = Math.max(0, Math.min(1, v)) * (STOPS.length - 1);
    var i = Math.min(Math.floor(v), STOPS.length - 2), f = v - i, a = STOPS[i], b = STOPS[i + 1];
    return "rgb(" + Math.round(a[0] + (b[0] - a[0]) * f) + "," + Math.round(a[1] + (b[1] - a[1]) * f) + "," + Math.round(a[2] + (b[2] - a[2]) * f) + ")";
  }
  function resize() {
    var r = cv.getBoundingClientRect(); W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  // five "fingertips" and a "palm" pressing and releasing on slow Lissajous paths
  var PRESS = [
    [0.62, 0.30, 0.10, 0.07, 0.00], [0.72, 0.22, 0.08, 0.09, 1.30], [0.82, 0.26, 0.07, 0.08, 2.60],
    [0.90, 0.36, 0.06, 0.07, 3.90], [0.55, 0.52, 0.08, 0.06, 5.20], [0.76, 0.58, 0.12, 0.08, 0.70]
  ];
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    var cellColor = getComputedStyle(cv).getPropertyValue("--h-cell").trim() || "rgba(255,255,255,0.035)";
    var pitch = W < 700 ? 16 : 20, size = pitch - 5;
    for (var y = pitch / 2; y < H; y += pitch) {
      for (var x = pitch / 2; x < W; x += pitch) {
        var u = x / W, v = y / H, s = 0;
        for (var k = 0; k < PRESS.length; k++) {
          var p = PRESS[k], ph = t * 0.00035 + p[4];
          var cx = p[0] + p[2] * Math.sin(ph * 1.3), cy = p[1] + p[3] * Math.cos(ph);
          var amp = 0.55 + 0.45 * Math.sin(ph * 0.9);
          var dx = (u - cx) * (W / H), dy = v - cy;
          s += amp * Math.exp(-(dx * dx + dy * dy) / 0.012);
        }
        if (s < 0.06) { ctx.fillStyle = cellColor; }
        else { ctx.fillStyle = heat(s * 0.85); ctx.globalAlpha = Math.min(0.9, 0.18 + s * 0.7); }
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
        ctx.globalAlpha = 1;
      }
    }
  }
  var last = 0;
  function loop(ts) {
    if (!running) return;
    if (ts - last > 50) { draw(ts); last = ts; }
    requestAnimationFrame(loop);
  }
  resize(); draw(0);
  window.addEventListener("resize", function () { resize(); draw(last); });
  if (!reduce) {
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { var was = running; running = e.isIntersecting; if (running && !was) requestAnimationFrame(loop); });
      }).observe(cv);
    }
    requestAnimationFrame(loop);
  }
})();
