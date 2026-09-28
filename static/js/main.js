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
    window.dispatchEvent(new Event("dtwm-theme"));
    try { localStorage.setItem("dtwm-theme", next); } catch (e) {}
    label();
  });

  // ------------------------------------------------------------ web-native figures (static/v2)
  var BASE = "static/v2/";
  function getJSON(name) { return fetch(BASE + "data/" + name + ".json").then(function (r) { if (!r.ok) throw new Error(name); return r.json(); }); }
  var redrawers = [];
  function onTheme() { redrawers.forEach(function (f) { try { f(); } catch (e) {} }); }
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", onTheme); else if (mq.addListener) mq.addListener(onTheme);
  }
  window.addEventListener("dtwm-theme", onTheme);

  getJSON("tactile_layout").then(function (layout) {
    // hero task player; the timeline cells double as its progress bar
    var cells = [].slice.call(document.querySelectorAll(".tl-cell"));
    var tp = new Players.TaskPlayer({ video: document.getElementById("task-video"), canvas: document.getElementById("task-tactile"),
      veil: document.getElementById("task-veil"), tag: document.getElementById("task-tag"), cells: cells, layout: layout, base: BASE });
    tp.load("spray_can");
    redrawers.push(tp.redraw);
    var chips = document.querySelectorAll("[data-task]");
    chips.forEach(function (b) {
      b.addEventListener("click", function () {
        chips.forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true"); tp.load(b.getAttribute("data-task"));
      });
    });
    window.addEventListener("resize", tp.redraw);

    // paper Figure 1 tactile tile and pipeline touch panel
    getJSON("teaser").then(function (t) {
      var c = document.getElementById("teaser-tactile");
      var draw = function () { Tactile.draw(c, layout, t.tactile, t.tactile.vmax); };
      draw(); redrawers.push(draw); window.addEventListener("resize", draw);
      var m = document.getElementById("teaser-markers");
      if (m && t.centroids) m.innerHTML = t.centroids.map(function (p, i) {
        var cls = i === 0 ? "mk-l" : "mk-r";
        return '<g class="mk ' + cls + '"><line x1="' + (p[0] - 0.035) + '" x2="' + (p[0] + 0.035) + '" y1="' + p[1] + '" y2="' + p[1] + '"/>' +
               '<line x1="' + p[0] + '" x2="' + p[0] + '" y1="' + (p[1] - 0.047) + '" y2="' + (p[1] + 0.047) + '"/></g>';
      }).join("");
    }).catch(function () {});
    getJSON("pipeline").then(function (pd) {
      var c = document.getElementById("pipe-tactile");
      var draw = function () { Tactile.draw(c, layout, pd.tactile, pd.tactile.vmax); };
      draw(); redrawers.push(draw); window.addEventListener("resize", draw);
      var ins = document.getElementById("pipe-instr"); var instr = (pd.instruction_shown || pd.instruction || "").replace(/\s*\n\s*/g, " "); if (ins && instr) ins.textContent = /^[“"]/.test(instr) ? instr : "“" + instr + "”";
    }).catch(function () {});
  }).catch(function () {});

  getJSON("radar").then(function (d) { Charts.radar(document.getElementById("radar"), d); }).catch(function () {});
  getJSON("force_trend").then(function (d) { Charts.forceTrend(document.getElementById("force-trend"), d); }).catch(function () {});
  getJSON("train_touch").then(function (d) { Charts.trainTouch(document.getElementById("train-touch-chart"), d); }).catch(function () {});
  getJSON("horizon").then(function (d) { if (Charts.horizon) Charts.horizon(document.getElementById("horizon-chart"), d); }).catch(function () {});
  getJSON("motivation").then(function (d) {
    var ymax = 0;
    d.clips.forEach(function (c) { ymax = Math.max(ymax, Math.max.apply(null, c.force.left), Math.max.apply(null, c.force.right)); });
    d.clips.forEach(function (c, i) {
      var el = document.querySelector('.mchart[data-clip="' + c.key + '"]');
      if (el) Charts.forceLines(el, c, ymax * 1.2, i === 0, d.frames);
    });
  }).catch(function () {});
  document.querySelectorAll(".cmp").forEach(function (root) {
    new Players.CmpPlayer(root, BASE, root.getAttribute("data-clips").split(","));
  });

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
