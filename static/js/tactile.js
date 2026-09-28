// Bimanual tactile panel drawn from the glove layout (static/v2/data/tactile_layout.json), the same encoding as the
// paper's plotstyle.tactile_panel: pressure = warm colour on the glove cells, finger flexion = blue fill of a gauge.
// Colours follow the page theme: in light mode more pressure is darker (magma_r, as in the paper), in dark mode brighter.
(function (global) {
  "use strict";

  var RAMPS = {
    light: [[252, 253, 191], [254, 159, 109], [222, 73, 104], [140, 41, 129], [59, 15, 112]],
    dark: [[91, 34, 112], [179, 51, 106], [226, 80, 95], [247, 162, 79], [255, 227, 159]]
  };
  function ramp(stops, v) {
    v = Math.max(0, Math.min(1, v)) * (stops.length - 1);
    var i = Math.min(Math.floor(v), stops.length - 2), f = v - i, a = stops[i], b = stops[i + 1];
    return "rgb(" + Math.round(a[0] + (b[0] - a[0]) * f) + "," + Math.round(a[1] + (b[1] - a[1]) * f) + "," +
      Math.round(a[2] + (b[2] - a[2]) * f) + ")";
  }
  function cssVar(el, name, fallback) {
    var v = getComputedStyle(el).getPropertyValue(name).trim();
    return v || fallback;
  }
  function isDark() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "dark";
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // Draw one frame. frame = {pressure: [n cells], bend: [n bars]}; vmax = clip-wide pressure maximum.
  function draw(canvas, layout, frame, vmax, opts) {
    opts = opts || {};
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = canvas.clientWidth || canvas.parentNode.clientWidth;
    var cols = layout.cols, rows = layout.rows, cell = W / cols, H = Math.round(cell * rows);
    canvas.style.height = H + "px";
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var dark = isDark(), stops = dark ? RAMPS.dark : RAMPS.light;
    var base = cssVar(canvas, "--tac-cell", dark ? "#262d38" : "#e3e7ee");
    var track = cssVar(canvas, "--tac-track", dark ? "#1f2630" : "#eef1f6");
    var fill = cssVar(canvas, "--tac-bend", dark ? "#62b0e8" : "#2f7fc1");
    var dim = !!opts.dim, gap = Math.max(0.6, cell * 0.14), rad = cell * 0.18;
    ctx.globalAlpha = dim ? 0.35 : 1;
    var vm = Math.max(vmax || 0, 1e-3);
    for (var i = 0; i < layout.cells.length; i++) {
      var rc = layout.cells[i], v = frame && frame.pressure ? frame.pressure[i] : 0;
      ctx.fillStyle = (!dim && v > 0.004) ? ramp(stops, v / vm) : base;
      roundRect(ctx, rc[1] * cell + gap / 2, rc[0] * cell + gap / 2, cell - gap, cell - gap, rad);
      ctx.fill();
    }
    for (var j = 0; j < layout.bars.length; j++) {
      var b = layout.bars[j], x = (b.x + 0.5) * cell, y = (b.y + 0.5) * cell, w = b.w * cell, h = b.h * cell;
      ctx.fillStyle = track; roundRect(ctx, x, y, w, h, Math.min(w / 2, 3)); ctx.fill();
      var frac = (!dim && frame && frame.bend) ? Math.max(0, Math.min(1, frame.bend[j])) : 0;
      if (frac > 0) { ctx.fillStyle = fill; roundRect(ctx, x, y + h * (1 - frac), w, h * frac, Math.min(w / 2, 3)); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }

  global.Tactile = { draw: draw, isDark: isDark };
})(window);
