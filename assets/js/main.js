(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- Theme ---------- */
  var themeToggle = $("#themeToggle");
  function setTheme(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("theme", t); } catch (e) {}
    document.dispatchEvent(new CustomEvent("themechange"));
  }
  themeToggle.addEventListener("click", function () {
    setTheme(root.getAttribute("data-theme") === "light" ? "dark" : "light");
  });

  /* ---------- Nav ---------- */
  var nav = $("#nav");
  var menuBtn = $("#menuBtn");
  function onScroll() { nav.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function closeMenu() { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); }
  menuBtn.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  $$("#navLinks a").forEach(function (a) { a.addEventListener("click", closeMenu); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });

  // Scroll spy
  var links = $$("#navLinks a");
  var sections = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); }).filter(Boolean);
  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Reveal ---------- */
  var revealEls = $$(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Terminal rows ---------- */
  $$(".term-row").forEach(function (row, i) {
    if (reduceMotion) { row.classList.add("on"); return; }
    setTimeout(function () { row.classList.add("on"); }, 350 + i * 260);
  });

  /* ---------- Ticker: duplicate content for a seamless loop ---------- */
  var track = $("#tickerTrack");
  if (track) track.innerHTML += track.innerHTML;

  /* ---------- Project filters ---------- */
  var cards = $$("#projectGrid .pcard");
  var filters = $$(".filter");
  $$("[data-count]").forEach(function (el) {
    var k = el.getAttribute("data-count");
    el.textContent = k === "all" ? cards.length : cards.filter(function (c) { return c.dataset.cat === k; }).length;
  });
  function applyFilter(f) {
    filters.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.filter === f)); });
    cards.forEach(function (c) {
      var show = f === "all" || c.dataset.cat === f;
      c.hidden = !show;
      if (show) c.classList.add("in");
    });
  }
  filters.forEach(function (b) { b.addEventListener("click", function () { applyFilter(b.dataset.filter); }); });
  $$("[data-jump-filter]").forEach(function (a) {
    a.addEventListener("click", function () { applyFilter(a.getAttribute("data-jump-filter")); });
  });

  /* ---------- Copy email ---------- */
  var toast = $("#toast");
  var toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("on"); }, 1800);
  }
  var copyBtn = $("#copyEmail");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var email = copyBtn.getAttribute("data-email");
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(email).then(function () { showToast("Email copied"); }, function () { showToast(email); });
      } else {
        showToast(email);
      }
    });
  }

  /* ---------- Year ---------- */
  $("#year").textContent = new Date().getFullYear();

  /* ---------- Equity chart ---------- */
  var data = window.ALPHA_LAB;
  var chartEl = $("#equityChart");
  if (!data || !chartEl) return;

  var SERIES = [
    { key: "Momentum_CS", label: "XS momentum", color: "--accent", on: true },
    { key: "Ensemble", label: "Ensemble", color: "--blue", on: true },
    { key: "Momentum_TS", label: "TS momentum", color: "--amber", on: true },
    { key: "Reversal_ST", label: "ST reversal", color: "--neg", on: false },
    { key: "Momentum_Vol", label: "Vol-scaled mom.", color: "--violet", on: false }
  ];
  var OOS_START = "2017-01-01";
  var dates = data.dates.map(function (d) { return new Date(d + "T00:00:00Z"); });
  var oosStart = new Date(OOS_START + "T00:00:00Z");
  var SVGNS = "http://www.w3.org/2000/svg";

  function cssVar(name) { return getComputedStyle(root).getPropertyValue(name).trim(); }
  function el(tag, attrs, parent) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  // Legend
  var legend = $("#chartLegend");
  SERIES.forEach(function (s) {
    var b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-pressed", String(s.on));
    b.innerHTML = '<i></i>' + s.label;
    b.addEventListener("click", function () {
      s.on = !s.on;
      b.setAttribute("aria-pressed", String(s.on));
      draw();
    });
    s.btn = b;
    legend.appendChild(b);
  });

  // Verdict table
  var NAMES = { Momentum_CS: "XS momentum", Ensemble: "Ensemble", Momentum_TS: "TS momentum", Reversal_ST: "ST reversal", Momentum_Vol: "Vol-scaled momentum" };
  var ORDER = ["Momentum_CS", "Ensemble", "Momentum_TS", "Reversal_ST", "Momentum_Vol"];
  var tbody = $("#verdictTable tbody");
  ORDER.forEach(function (k) {
    var v = data.verdicts[k];
    if (!v) return;
    var cls = v.verdict === "SURVIVED" ? "tag-pos" : v.verdict === "REJECTED" ? "tag-neg" : "tag-amb";
    var tr = document.createElement("tr");
    tr.innerHTML =
      '<td class="name">' + NAMES[k] + "</td>" +
      '<td class="r">' + v.is_sharpe.toFixed(3) + "</td>" +
      '<td class="r">' + v.oos_sharpe.toFixed(3) + "</td>" +
      '<td class="verdict-cell"><span class="tag ' + cls + '">' + v.verdict.toLowerCase() + "</span></td>";
    tbody.appendChild(tr);
  });

  var tip = document.createElement("div");
  tip.className = "chart-tip";
  chartEl.appendChild(tip);

  var state = {};

  function draw() {
    var old = chartEl.querySelector("svg");
    if (old) old.remove();

    var W = Math.max(300, chartEl.clientWidth);
    var H = Math.max(200, chartEl.clientHeight);
    var m = { t: 12, r: 12, b: 26, l: 40 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;

    SERIES.forEach(function (s) {
      var c = cssVar(s.color);
      s.c = c;
      s.btn.querySelector("i").style.background = c;
    });
    var active = SERIES.filter(function (s) { return s.on; });

    // y-domain (log) over visible series
    var lo = Infinity, hi = -Infinity;
    (active.length ? active : SERIES).forEach(function (s) {
      data.curves[s.key].forEach(function (v) { if (v < lo) lo = v; if (v > hi) hi = v; });
    });
    var ly0 = Math.log(lo * 0.95), ly1 = Math.log(hi * 1.05);
    var t0 = dates[0].getTime(), t1 = dates[dates.length - 1].getTime();
    function x(d) { return m.l + ((d.getTime() - t0) / (t1 - t0)) * iw; }
    function y(v) { return m.t + ih - ((Math.log(v) - ly0) / (ly1 - ly0)) * ih; }

    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, "aria-hidden": "true" });

    // OOS band
    el("rect", { class: "oos-band", x: x(oosStart), y: m.t, width: m.l + iw - x(oosStart), height: ih }, svg);
    var ol = el("text", { class: "oos-label", x: x(oosStart) + 8, y: m.t + 14 }, svg);
    ol.textContent = "OUT-OF-SAMPLE →";

    // y gridlines
    var ticks = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10];
    var axis = el("g", { class: "axis" }, svg);
    ticks.forEach(function (tv) {
      if (Math.log(tv) < ly0 || Math.log(tv) > ly1) return;
      var yy = y(tv);
      el("line", { class: "gridline", x1: m.l, x2: m.l + iw, y1: yy, y2: yy }, axis);
      var t = el("text", { x: m.l - 8, y: yy + 3.5, "text-anchor": "end" }, axis);
      t.textContent = tv + "×";
    });
    // x ticks
    var step = W < 520 ? 5 : 2;
    for (var yr = 2006; yr <= 2026; yr += step) {
      var d = new Date(Date.UTC(yr, 0, 1));
      if (d.getTime() < t0) continue;
      var tx = el("text", { x: x(d), y: H - 6, "text-anchor": "middle" }, axis);
      tx.textContent = yr;
    }

    // series (draw dimmer ones first)
    active.slice().reverse().forEach(function (s) {
      var vals = data.curves[s.key];
      var dstr = "";
      for (var i = 0; i < vals.length; i++) dstr += (i ? "L" : "M") + x(dates[i]).toFixed(1) + "," + y(vals[i]).toFixed(1);
      el("path", { class: "series", d: dstr, stroke: s.c }, svg);
    });

    // crosshair + dots
    var cross = el("line", { class: "crosshair", y1: m.t, y2: m.t + ih, x1: -10, x2: -10, opacity: 0 }, svg);
    var dots = active.map(function (s) { return el("circle", { r: 3.5, fill: s.c, stroke: cssVar("--panel"), "stroke-width": 1.5, opacity: 0 }, svg); });
    var hit = el("rect", { x: m.l, y: m.t, width: iw, height: ih, fill: "transparent", style: "cursor:crosshair" }, svg);

    function move(clientX) {
      var r = svg.getBoundingClientRect();
      var px = ((clientX - r.left) / r.width) * W;
      var t = t0 + ((px - m.l) / iw) * (t1 - t0);
      // binary search nearest date
      var a = 0, b = dates.length - 1;
      while (b - a > 1) { var mid = (a + b) >> 1; if (dates[mid].getTime() < t) a = mid; else b = mid; }
      var i = Math.abs(dates[a].getTime() - t) < Math.abs(dates[b].getTime() - t) ? a : b;
      var cx = x(dates[i]);
      cross.setAttribute("x1", cx); cross.setAttribute("x2", cx); cross.setAttribute("opacity", 1);
      var rows = "";
      active.forEach(function (s, j) {
        var v = data.curves[s.key][i];
        dots[j].setAttribute("cx", cx); dots[j].setAttribute("cy", y(v)); dots[j].setAttribute("opacity", 1);
        rows += '<div class="row"><span><i style="background:' + s.c + '"></i>' + s.label + "</span><span>" + v.toFixed(2) + "×</span></div>";
      });
      tip.innerHTML = '<div class="date">' + data.dates[i] + (dates[i] >= oosStart ? " · OOS" : " · IS") + "</div>" + rows;
      tip.classList.add("on");
      var tipW = tip.offsetWidth;
      var left = (cx / W) * r.width + 14;
      if (left + tipW > r.width) left = (cx / W) * r.width - tipW - 14;
      tip.style.left = Math.max(0, left) + "px";
    }
    function leave() {
      tip.classList.remove("on");
      cross.setAttribute("opacity", 0);
      dots.forEach(function (d) { d.setAttribute("opacity", 0); });
    }
    hit.addEventListener("mousemove", function (e) { move(e.clientX); });
    hit.addEventListener("mouseleave", leave);
    hit.addEventListener("touchstart", function (e) { move(e.touches[0].clientX); }, { passive: true });
    hit.addEventListener("touchmove", function (e) { move(e.touches[0].clientX); }, { passive: true });
    hit.addEventListener("touchend", function () { setTimeout(leave, 1600); });

    chartEl.insertBefore(svg, tip);
    state.w = W;
  }

  draw();
  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (chartEl.clientWidth !== state.w) draw(); }, 120);
  });
  document.addEventListener("themechange", draw);
})();
