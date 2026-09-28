// Native SVG charts for the project page. Every chart is drawn at the container's pixel width (fixed font sizes, so
// text stays legible on phones) and re-drawn on resize; colours come from CSS classes bound to theme tokens, so a
// theme switch needs no re-draw.
(function (global) {
  "use strict";

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function fmt(v, d) { return (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); }
  function pct(v) { return Math.round(v * 100) + "%"; }
  function text(x, y, s, cls, anchor, extra) {
    return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" class="' + (cls || "") + '" text-anchor="' + (anchor || "start") + '"' + (extra || "") + ">" + esc(s) + "</text>";
  }
  function open(w, h, label) {
    return '<svg class="chart-svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="' + esc(label) + '">';
  }
  function niceTicks(lo, hi, n) {
    var span = hi - lo, step = Math.pow(10, Math.floor(Math.log10(span / n))), err = span / n / step;
    step *= err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
    var t = [], v = Math.ceil(lo / step) * step;
    for (; v <= hi + 1e-9; v += step) t.push(+v.toFixed(10));
    return t;
  }
  // Decimals needed so that neighbouring ticks never print the same label.
  function tickDec(t) { var st = t.length > 1 ? Math.abs(t[1] - t[0]) : 1; return Math.max(0, Math.ceil(-Math.log10(st) - 1e-9)); }

  // Re-draw on width changes only (height follows from width).
  function mount(el, drawFn) {
    var last = -1;
    function go() { var w = Math.round(el.clientWidth); if (w && w !== last) { last = w; el.innerHTML = drawFn(w); } }
    go();
    if ("ResizeObserver" in window) new ResizeObserver(go).observe(el); else window.addEventListener("resize", go);
  }

  // ---------------------------------------------------------------- force trend -> release (slide 50)
  function forceTrend(el, d) {
    var KEY = { steady: "c-hold", decays: "c-release", rises: "c-rise" };
    var GLYPH = { steady: [0.6, 0.62, 0.58, 0.61, 0.6, 0.59, 0.6], decays: [0.85, 0.8, 0.7, 0.55, 0.42, 0.32, 0.25], rises: [0.25, 0.3, 0.4, 0.52, 0.64, 0.74, 0.8] };
    mount(el, function (w) {
      var narrow = w < 520, h = narrow ? 300 : 330, top = 34, bottom = narrow ? 86 : 82, left = narrow ? 38 : 46, right = 12;
      var g = d.groups, ymax = Math.max.apply(null, g.map(function (x) { return x.release; })) * 1.28;
      var ih = h - top - bottom, iw = w - left - right, bw = Math.min(110, iw / g.length * 0.52);
      var y = function (v) { return top + ih * (1 - v / ymax); };
      var s = open(w, h, "Chance that a hand in contact lets go within the next chunk, by the observed force trend");
      niceTicks(0, ymax, 4).forEach(function (t) {
        s += '<line class="grid" x1="' + left + '" x2="' + (w - right) + '" y1="' + y(t) + '" y2="' + y(t) + '"/>';
        s += text(left - 8, y(t) + 4, pct(t), "tick", "end");
      });
      var steady = g.filter(function (x) { return x.key === "steady"; })[0];
      if (steady) s += '<line class="ref" x1="' + left + '" x2="' + (w - right) + '" y1="' + y(steady.release) + '" y2="' + y(steady.release) + '"/>';
      g.forEach(function (x, i) {
        var cx = left + iw * (i + 0.5) / g.length, cls = KEY[x.key] || "c-hold";
        s += '<rect class="fill ' + cls + '" x="' + (cx - bw / 2) + '" y="' + y(x.release) + '" width="' + bw + '" height="' + (y(0) - y(x.release)) + '" rx="6"/>';
        s += text(cx, y(x.release) - 10, pct(x.release), "value " + cls + "-text", "middle");
        if (x.ratio_vs_steady) s += text(cx, (y(x.release) + y(0)) / 2 + 5, fmt(x.ratio_vs_steady, 1) + "×", "inbar", "middle");
        var gw = Math.min(64, bw), gy = h - bottom + 16, gh = 24, pts = GLYPH[x.key] || GLYPH.steady;
        var path = pts.map(function (p, k) { return (k ? "L" : "M") + (cx - gw / 2 + gw * k / (pts.length - 1)).toFixed(1) + " " + (gy + gh * (1 - p)).toFixed(1); }).join(" ");
        s += '<path class="glyph-area ' + cls + '" d="' + path + " L" + (cx + gw / 2) + " " + (gy + gh) + " L" + (cx - gw / 2) + " " + (gy + gh) + ' Z"/>';
        s += '<path class="glyph ' + cls + '" d="' + path + '"/>';
        s += text(cx, h - (narrow ? 22 : 20), x.label, "xlabel " + cls + "-text", "middle");
      });
      s += text(8, 16, "chance the hand lets go within the next chunk", "axis-title", "start");
      return s + "</svg>";
    });
  }

  // ---------------------------------------------------------------- touch in training (slide 51)
  function trainTouch(el, d) {
    var CLS = ["c-vision", "c-trainonly", "c-dtwm"];
    mount(el, function (w) {
      var cols = w < 560 ? 1 : w < 900 ? 2 : 4, gapX = 22, pw = (w - gapX * (cols - 1)) / cols, ph = 222;
      var rowsN = Math.ceil(d.metrics.length / cols), h = rowsN * (ph + 16);
      var s = open(w, h, "Four metrics for the vision-only model, touch in training only, and touch in training and inference");
      d.metrics.forEach(function (m, k) {
        var ox = (k % cols) * (pw + gapX), oy = Math.floor(k / cols) * (ph + 16);
        var vals = m.values, lo = 0, hi = Math.max.apply(null, vals) * 1.22;
        if (m.slide_axis) { lo = m.slide_axis[0]; hi = m.slide_axis[1]; }
        if (m.ref !== undefined) hi = Math.max(hi, m.ref * 1.1);
        var tl = m.label, cut = tl.indexOf(" ("), two = pw < 300 && cut > 0 && cols > 1;
        var top = oy + (two ? 66 : 52), bot = oy + ph - 26, x0 = ox + 34, x1 = ox + pw - 4;
        var y = function (v) { return bot - (bot - top) * (v - lo) / (hi - lo); };
        if (two) { s += text(ox, oy + 14, tl.slice(0, cut), "panel-title") + text(ox, oy + 30, tl.slice(cut + 1), "panel-title sub"); }
        else s += text(ox, oy + 14, tl, "panel-title");
        if (m.note) s += text(ox, oy + (two ? 46 : 31), m.note + (m.slide_axis && m.slide_axis[0] > 0 ? " (axis starts at " + m.slide_axis[0].toFixed(2) + ")" : ""), "panel-note");
        var tk = niceTicks(lo, hi, 3), td = tickDec(tk);
        tk.forEach(function (t) {
          s += '<line class="grid" x1="' + x0 + '" x2="' + x1 + '" y1="' + y(t) + '" y2="' + y(t) + '"/>';
          s += text(x0 - 5, y(t) + 4, fmt(t, td) + (m.unit === "%" ? "%" : ""), "tick small", "end");
        });
        if (m.ref !== undefined) s += '<line class="ref" x1="' + x0 + '" x2="' + x1 + '" y1="' + y(m.ref) + '" y2="' + y(m.ref) + '"/>';
        var slot = (x1 - x0) / vals.length, bw = Math.min(34, slot * 0.62);
        vals.forEach(function (v, i) {
          var cx = x0 + slot * (i + 0.5);
          s += '<rect class="fill ' + CLS[i] + '" x="' + (cx - bw / 2) + '" y="' + y(v) + '" width="' + bw + '" height="' + Math.max(1, y(lo) - y(v)) + '" rx="4"/>';
          var dd = m.decimals !== undefined ? m.decimals : 3, lab = fmt(v, dd) + (m.unit === "%" ? "%" : "");
          s += text(cx, y(v) - 6, lab, "value small " + CLS[i] + "-text", "middle");
        });
      });
      return s + "</svg>";
    });
  }

  // ---------------------------------------------------------------- radar (paper Figure 1, right)
  function radar(el, d) {
    var CLS = { touchworld: "c-tw", feelworld: "c-fw", vtwm: "c-vt", dtwm: "c-dtwm" };
    mount(el, function (w) {
      var size = Math.min(w, 440), h = size + 10, cx = w / 2, cy = size / 2 + 6, R = size / 2 - (size < 360 ? 58 : 72);
      var n = d.axes.length, ang = function (i) { return -Math.PI / 2 + 2 * Math.PI * i / n; };
      var pt = function (i, r) { return [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))]; };
      var norm = function (a, v) { var t = (v - a.min) / (a.max - a.min); return Math.max(0.02, Math.min(1, t)); };
      var s = open(w, h, "Radar chart of six metrics for DTWM and the other visual-tactile world models (outer is better)");
      [0.25, 0.5, 0.75, 1].forEach(function (f) {
        s += '<polygon class="rgrid" points="' + d.axes.map(function (_, i) { return pt(i, R * f).join(","); }).join(" ") + '"/>';
      });
      d.axes.forEach(function (a, i) {
        var p = pt(i, R); s += '<line class="rgrid" x1="' + cx + '" y1="' + cy + '" x2="' + p[0] + '" y2="' + p[1] + '"/>';
        var q = pt(i, R + (size < 360 ? 16 : 22)), c = Math.cos(ang(i)), anchor = Math.abs(c) < 0.2 ? "middle" : c > 0 ? "start" : "end";
        var arrow = a.better === "lower" ? " ↓" : " ↑";
        var lines = String(a.label).split("\n");
        lines.forEach(function (ln, j) {
          var yy = q[1] + 4 + (j - (lines.length - 1) / 2) * 14, tail = j === lines.length - 1 ? arrow : "", us = ln.indexOf("_");
          if (us > 0) s += '<text x="' + q[0].toFixed(1) + '" y="' + yy.toFixed(1) + '" class="rlabel" text-anchor="' + anchor + '">' + esc(ln.slice(0, us)) +
            '<tspan class="rsub" dy="4">' + esc(ln.slice(us + 1)) + '</tspan><tspan dy="-4">' + esc(tail) + "</tspan></text>";
          else s += text(q[0], yy, ln + tail, "rlabel", anchor);
        });
      });
      var order = d.models.slice().sort(function (a, b) { return (a.key === "dtwm") - (b.key === "dtwm"); });
      order.forEach(function (m) {
        var pts = d.axes.map(function (a, i) { return pt(i, R * norm(a, m.values[a.key])).join(","); }).join(" ");
        var cls = CLS[m.key] || "c-vision";
        s += '<polygon class="rpoly ' + cls + (m.key === "dtwm" ? " main" : "") + '" points="' + pts + '"/>';
        d.axes.forEach(function (a, i) { var p = pt(i, R * norm(a, m.values[a.key])); s += '<circle class="rdot ' + cls + '" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (m.key === "dtwm" ? 3.6 : 2.6) + '"/>'; });
      });
      return s + "</svg>";
    });
  }

  // ---------------------------------------------------------------- force history of one clip (paper Figure 6)
  function forceLines(el, clip, ymax, showY, frames) {
    var cls = clip.key === "steady" ? "c-hold" : "c-release";
    mount(el, function (w) {
      var h = Math.max(120, Math.min(170, w * 0.62)), left = showY ? 22 : 8, right = 6, top = 8, bottom = 32;
      var L = clip.force.left, Rr = clip.force.right, n = L.length;
      var x = function (i) { return left + (w - left - right) * i / (n - 1); }, y = function (v) { return top + (h - top - bottom) * (1 - v / ymax); };
      var line = function (arr) { return arr.map(function (v, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1); }).join(" "); };
      var s = open(w, h, "Summed pressure of each hand over the observed frames: " + clip.label);
      s += '<line class="axis" x1="' + left + '" x2="' + (w - right) + '" y1="' + y(0) + '" y2="' + y(0) + '"/>';
      s += '<line class="axis" x1="' + left + '" x2="' + left + '" y1="' + top + '" y2="' + y(0) + '"/>';
      s += '<path class="area ' + cls + '" d="' + line(L) + " L" + x(n - 1) + " " + y(0) + " L" + x(0) + " " + y(0) + ' Z"/>';
      s += '<path class="line ' + cls + '" d="' + line(L) + '"/>';
      s += '<path class="line dashed ' + cls + '" d="' + line(Rr) + '"/>';
      [0, 4, 8, 12].forEach(function (f) { if (f < n) s += text(x(f), y(0) + 15, String(frames ? frames[f] : f), "tick small", "middle"); });
      s += text((left + w - right) / 2, h - 3, "observed frame", "axis-title small", "middle");
      if (showY) s += text(10, (top + y(0)) / 2, "summed pressure", "axis-title small", "middle", ' transform="rotate(-90 10 ' + ((top + y(0)) / 2).toFixed(1) + ')"');
      return s + "</svg>";
    });
  }


  // ---------------------------------------------------------------- prediction horizon (paper Figure 7)
  function horizon(el, d) {
    el.innerHTML = "";
    var grid = document.createElement("div"); grid.className = "hz-grid"; el.appendChild(grid);
    d.splits.forEach(function (sp) {
      var col = document.createElement("div"); col.className = "hz-col";
      col.innerHTML = '<h3 class="hz-title">' + esc(sp.name) + ' <span>' + sp.n_clips + ' clips</span></h3><p class="hz-sub">(a) LPIPS over a growing window</p><div class="chart hz-a"></div><p class="hz-sub">(b) per-frame difference, DTWM minus vision-only</p><div class="chart hz-b"></div>';
      grid.appendChild(col);
      var A = d.panel_a, ser = A.series.filter(function (x) { return x.split === sp.key; });
      mount(col.querySelector(".hz-a"), function (w) {
        var h = 210, left = 46, right = 54, top = 12, bottom = 40, hs = A.windows.map(function (x) { return x.h; });
        var all = []; ser.forEach(function (x) { all = all.concat(x.values); });
        var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all), pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
        var x = function (v) { return left + (w - left - right) * (v - hs[0]) / (hs[hs.length - 1] - hs[0]); };
        var y = function (v) { return top + (h - top - bottom) * (1 - (v - lo) / (hi - lo)); };
        var s = open(w, h, "LPIPS over growing scoring windows, " + sp.name);
        var tk = niceTicks(lo, hi, 3), td = Math.max(2, tickDec(tk));
        tk.forEach(function (t) { s += '<line class="grid" x1="' + left + '" x2="' + (w - right) + '" y1="' + y(t) + '" y2="' + y(t) + '"/>' + text(left - 6, y(t) + 4, fmt(t, td), "tick small", "end"); });
        hs.forEach(function (v) { s += text(x(v), h - bottom + 16, String(v), "tick small", "middle"); });
        s += text((left + w - right) / 2, h - 4, A.x_label, "axis-title small", "middle");
        ser.forEach(function (sr) {
          var cls = sr.model === "dtwm" ? "c-dtwm" : "c-vision";
          s += '<path class="line ' + cls + '" d="' + sr.values.map(function (v, i) { return (i ? "L" : "M") + x(hs[i]).toFixed(1) + " " + y(v).toFixed(1); }).join(" ") + '"/>';
          sr.values.forEach(function (v, i) { s += '<circle class="rdot ' + cls + '" cx="' + x(hs[i]) + '" cy="' + y(v) + '" r="3.4"/>'; });
          var last = sr.values[sr.values.length - 1];
          s += text(x(hs[hs.length - 1]) + 8, y(last) + 4, fmt(last, 3), "value small " + cls + "-text", "start");
        });
        return s + "</svg>";
      });
      var B = d.panel_b, sb = B.series.filter(function (x) { return x.split === sp.key; })[0];
      mount(col.querySelector(".hz-b"), function (w) {
        var h = 200, left = 52, right = 8, top = 22, bottom = 40, n = B.blocks.length;
        var lo = Math.min.apply(null, sb.ci.map(function (c) { return c[0]; })) * 1.15, hi = Math.max(0.004, Math.max.apply(null, sb.ci.map(function (c) { return c[1]; })) * 1.15);
        var y = function (v) { return top + (h - top - bottom) * (hi - v) / (hi - lo); }, slot = (w - left - right) / n, bw = Math.min(46, slot * 0.5);
        var s = open(w, h, "Per-frame LPIPS difference in four blocks of predicted frames, " + sp.name);
        B.blocks.forEach(function (bk, i) {
          if ((B.shaded_blocks || []).indexOf(bk.key) >= 0) s += '<rect class="shade" x="' + (left + slot * i) + '" y="' + top + '" width="' + slot + '" height="' + (h - top - bottom) + '"/>';
        });
        if ((B.shaded_blocks || []).length) {
          var k0 = B.blocks.map(function (b) { return b.key; }).indexOf(B.shaded_blocks[0]);
          s += text(left + slot * k0 + 6, top - 7, "second and third chunks", "axis-title small", "start");
          s += text(left + 6, top - 7, "first chunk", "axis-title small", "start");
        }
        var tk = niceTicks(lo, hi, 3), td = Math.max(2, tickDec(tk));
        tk.forEach(function (t) { s += '<line class="grid" x1="' + left + '" x2="' + (w - right) + '" y1="' + y(t) + '" y2="' + y(t) + '"/>' + text(left - 6, y(t) + 4, fmt(t, td), "tick small", "end"); });
        s += '<line class="axis" x1="' + left + '" x2="' + (w - right) + '" y1="' + y(0) + '" y2="' + y(0) + '"/>';
        B.blocks.forEach(function (bk, i) {
          var cx = left + slot * (i + 0.5), v = sb.delta[i], c = sb.ci[i];
          s += '<rect class="fill c-dtwm' + (sb.sig[i] ? "" : " faded") + '" x="' + (cx - bw / 2) + '" y="' + y(0) + '" width="' + bw + '" height="' + Math.max(1, y(v) - y(0)) + '" rx="4"/>';
          s += '<line class="whisker" x1="' + cx + '" x2="' + cx + '" y1="' + y(c[0]) + '" y2="' + y(c[1]) + '"/>';
          s += '<line class="whisker" x1="' + (cx - 5) + '" x2="' + (cx + 5) + '" y1="' + y(c[0]) + '" y2="' + y(c[0]) + '"/>';
          s += '<line class="whisker" x1="' + (cx - 5) + '" x2="' + (cx + 5) + '" y1="' + y(c[1]) + '" y2="' + y(c[1]) + '"/>';
          s += text(cx, h - bottom + 16, bk.label, "tick small", "middle");
        });
        s += text((left + w - right) / 2, h - 4, "predicted frames", "axis-title small", "middle");
        return s + "</svg>";
      });
    });
    var note = document.createElement("p"); note.className = "cap"; note.textContent = "Three training runs per model. Bars: 95% interval over clips. Negative = DTWM better."; el.appendChild(note);
  }

  global.Charts = { mount: mount, open: open, text: text, niceTicks: niceTicks, fmt: fmt, esc: esc,
                    forceTrend: forceTrend, trainTouch: trainTouch, radar: radar, forceLines: forceLines, horizon: horizon };
})(window);
