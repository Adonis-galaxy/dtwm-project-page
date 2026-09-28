// Players: the hero task animation (observed frames + live tactile panel, then the unknown future) and the synchronised
// six-model comparison grid. Both pause when off screen and fall back to a still frame under reduced motion.
(function (global) {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function onVisible(el, cb) {
    if (!("IntersectionObserver" in window)) { cb(true); return; }
    new IntersectionObserver(function (es) { es.forEach(function (e) { cb(e.isIntersecting); }); }, { threshold: 0.15 }).observe(el);
  }

  // ---------------------------------------------------------------- hero task player
  // opts: {video, canvas, veil, tag, cells (timeline cell elements, 49), layout, base: "static/v2/"}
  function TaskPlayer(opts) {
    var self = this, FPS = 8, OBS = 13, TOTAL = 49, data = null, visible = true, t0 = 0, raf = 0;
    self.load = function (key) {
      return fetch(opts.base + "data/task_" + key + ".json").then(function (r) { return r.json(); }).then(function (d) {
        data = d;
        opts.video.poster = opts.base + "media/task/" + key + "_poster.jpg";
        opts.video.src = opts.base + "media/task/" + key + ".mp4";
        opts.video.load();
        t0 = performance.now();
        if (reduce) { showFrame(OBS - 1, false); return; }
        start();
      });
    };
    function showFrame(i, future) {
      if (!data) return;
      var fi = Math.min(i, OBS - 1);
      Tactile.draw(opts.canvas, opts.layout, { pressure: data.pressure[fi], bend: data.bend[fi] }, data.vmax, { dim: future });
      opts.veil.classList.toggle("on", !!future);
      opts.tag.textContent = future ? "future frame " + i + ": to predict" : "observed frame " + i;
      opts.tag.classList.toggle("future", !!future);
      if (opts.cells) opts.cells.forEach(function (c, k) { c.classList.toggle("now", k === i); c.classList.toggle("past", k < i); });
    }
    function tick(now) {
      if (!visible || !data) { raf = 0; return; }
      var f = Math.floor((now - t0) / 1000 * FPS) % (TOTAL + 8);
      var i = Math.min(f, TOTAL - 1);
      if (i < OBS) {
        var vt = i / FPS + 0.01;
        if (Math.abs(opts.video.currentTime - vt) > 0.25) { try { opts.video.currentTime = vt; } catch (e) {} }
        if (opts.video.paused) { var p = opts.video.play(); if (p && p.catch) p.catch(function () {}); }
      } else if (!opts.video.paused) { opts.video.pause(); try { opts.video.currentTime = (OBS - 1) / FPS; } catch (e) {} }
      if (i !== self._last) { showFrame(i, i >= OBS); self._last = i; }
      raf = requestAnimationFrame(tick);
    }
    function start() { if (!raf) raf = requestAnimationFrame(tick); }
    onVisible(opts.video, function (v) { visible = v; if (v && !reduce) start(); else if (!v) opts.video.pause(); });
    self.redraw = function () { if (data) showFrame(self._last == null ? OBS - 1 : self._last, (self._last || 0) >= OBS); };
  }

  // ---------------------------------------------------------------- comparison grid
  // root: element with .cmp-grid (6 figures with <video>), .cmp-progress .head, optional [data-clip] and [data-view] tabs
  function CmpPlayer(root, base, clips) {
    var videos = [].slice.call(root.querySelectorAll("video")), head = root.querySelector(".cmp-progress .head");
    var phase = root.querySelector(".cmp-phase"), clip = clips[0], view = "full", visible = false, raf = 0, meta = {};
    var FPS = 8, N = 29, OBS = 13;
    function src(m) { return base + "media/cmp/" + clip + "/" + m + (view === "hands" ? "_hands" : "") + ".mp4"; }
    function load() {
      root.classList.toggle("hands", view === "hands");
      videos.forEach(function (v) { var s0 = src(v.getAttribute("data-model")); v.poster = s0.replace(/\.mp4$/, ".jpg"); v.src = s0; v.load(); });
      if (visible && !reduce) play();
      var cap = root.querySelector(".cmp-task");
      if (cap) fetch(base + "data/cmp_" + clip + ".json").then(function (r) { return r.json(); }).then(function (d) {
        meta = d; cap.textContent = d.task + (d.ood ? " · task unseen in training" : "");
      }).catch(function () {});
    }
    function play() { videos.forEach(function (v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }); if (!raf) raf = requestAnimationFrame(sync); }
    function sync() {
      if (!visible) { raf = 0; return; }
      var lead = videos[0], t = lead.currentTime;
      for (var i = 1; i < videos.length; i++) if (Math.abs(videos[i].currentTime - t) > 0.1 && videos[i].readyState > 1) { try { videos[i].currentTime = t; } catch (e) {} }
      var f = Math.min(N - 1, Math.floor(t * FPS + 1e-3));
      if (head) head.style.left = (100 * (f + 0.5) / N) + "%";
      if (phase) { phase.textContent = f < OBS ? "observed frame " + f : "predicted frame " + f; phase.classList.toggle("future", f >= OBS); }
      raf = requestAnimationFrame(sync);
    }
    root.querySelectorAll("[data-clip]").forEach(function (b) {
      b.addEventListener("click", function () {
        root.querySelectorAll("[data-clip]").forEach(function (x) { x.setAttribute("aria-selected", "false"); });
        b.setAttribute("aria-selected", "true"); clip = b.getAttribute("data-clip"); load();
      });
    });
    root.querySelectorAll("[data-view]").forEach(function (b) {
      b.addEventListener("click", function () {
        root.querySelectorAll("[data-view]").forEach(function (x) { x.setAttribute("aria-selected", "false"); });
        b.setAttribute("aria-selected", "true"); view = b.getAttribute("data-view"); load();
      });
    });
    videos.forEach(function (v) { v.muted = true; v.loop = true; v.playsInline = true; });
    onVisible(root, function (v) { visible = v; if (v && !reduce) play(); else videos.forEach(function (x) { x.pause(); }); });
    load();
  }

  global.Players = { TaskPlayer: TaskPlayer, CmpPlayer: CmpPlayer };
})(window);
