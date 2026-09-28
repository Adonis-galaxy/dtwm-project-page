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
  // opts: {video, canvas, veil, tag, cells (timeline cell elements, 49), layout, base: "static/v2/", onEnd}
  // Plays at 15 fps, half the recording's 30 fps (the speed of the talk GIFs): the 13 observed frames, then the unknown
  // future for as long again, then onEnd (the page moves on to the next task).
  function TaskPlayer(opts) {
    var self = this, FPS = 15, SRC_FPS = 8, OBS = 13, FUT = 13, data = null, visible = true, ready = false, t0 = 0, raf = 0, token = 0;
    var cells = opts.cells || [];
    function fetchJSON(key) { return fetch(opts.base + "data/task_" + key + ".json").then(function (r) { return r.json(); }); }
    self.prefetch = function (key) {   // warm the cache so the next task starts without a gap
      fetchJSON(key).catch(function () {});
      fetch(opts.base + "media/task/" + key + ".mp4").catch(function () {});
      new Image().src = opts.base + "media/task/" + key + "_poster.jpg";
    };
    self.load = function (key) {
      var my = ++token;
      ready = false;   // the clock runs only once this clip's frames are decodable
      return fetchJSON(key).then(function (d) {
        if (my !== token) return;
        data = d; self._last = null;
        var v = opts.video, first = !self._started;
        self._started = true;
        // the poster (frame 12) only paints the first view; later switches keep the veil up until frame 0 is ready
        if (first || reduce) v.poster = opts.base + "media/task/" + key + "_poster.jpg"; else v.removeAttribute("poster");
        v.src = opts.base + "media/task/" + key + ".mp4";
        v.defaultPlaybackRate = FPS / SRC_FPS;
        v.load();
        v.playbackRate = FPS / SRC_FPS;
        if (reduce) { showFrame(OBS - 1, false); return; }
        if (first) showFrame(0, false);
        var went = false, go = function () {
          if (my !== token || went) return;
          went = true;
          v.removeEventListener("loadeddata", go); v.playbackRate = FPS / SRC_FPS;
          self._last = null; showFrame(0, false); self._last = 0; t0 = performance.now(); ready = true; start();
        };
        if (v.readyState >= 2) go(); else v.addEventListener("loadeddata", go);   // start only on real frames
      });
    };
    function showFrame(i, future) {
      if (!data) return;
      var fi = Math.min(i, OBS - 1);
      Tactile.draw(opts.canvas, opts.layout, { pressure: data.pressure[fi], bend: data.bend[fi] }, data.vmax, { dim: future });
      opts.veil.classList.toggle("on", !!future);
      opts.tag.textContent = future ? "future frame" : "observed frame " + i;
      opts.tag.classList.toggle("future", !!future);
      // observed: a cursor walks over frames 0-12; future: all 36 predicted frames light up together (predicted at once)
      cells.forEach(function (c, k) {
        c.classList.toggle("now", !future && k === i);
        c.classList.toggle("past", future ? k < OBS : k < i);
        c.classList.toggle("lit", !!future && k >= OBS);
      });
    }
    function tick(now) {
      if (!visible || !ready) { raf = 0; return; }
      var f = Math.max(0, Math.floor((now - t0) / 1000 * FPS)), v = opts.video;
      if (f >= OBS + FUT) {
        raf = 0;
        if (opts.onEnd) opts.onEnd(); else { t0 = now; start(); }
        return;
      }
      if (f < OBS) {
        var vt = f / SRC_FPS + 0.01;
        if (Math.abs(v.currentTime - vt) > 0.3) { try { v.currentTime = vt; } catch (e) {} }
        if (v.paused && f < OBS - 1) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      } else {   // hold frame 12 under the veil
        if (!v.paused) v.pause();
        var hold = (OBS - 1) / SRC_FPS;   // frame 12 spans [1.5, 1.625) s; only seek if playback fell behind
        if (!v.seeking && v.currentTime < hold - 0.02) { try { v.currentTime = hold + 0.01; } catch (e) {} }
      }
      var future = f >= OBS, i = future ? OBS : f;
      if (i !== self._last) { showFrame(i, future); self._last = i; }
      raf = requestAnimationFrame(tick);
    }
    function start() { if (!raf) raf = requestAnimationFrame(tick); }
    onVisible(opts.video, function (v) {
      var was = visible; visible = v;
      if (v && !reduce && ready) { if (!was) t0 = performance.now(); start(); } else if (!v) opts.video.pause();
    });
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
    var loaded = false;   // posters now; the six videos load when the grid first comes into view, not with the page
    videos.forEach(function (v) { v.poster = src(v.getAttribute("data-model")).replace(/\.mp4$/, ".jpg"); });
    onVisible(root, function (v) {
      visible = v;
      if (v && !loaded) { loaded = true; load(); return; }
      if (v && !reduce) play(); else videos.forEach(function (x) { x.pause(); });
    });
  }

  global.Players = { TaskPlayer: TaskPlayer, CmpPlayer: CmpPlayer };
})(window);
