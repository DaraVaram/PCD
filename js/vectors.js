/* =========================================================================
   PCD interactive vector figure
   Recreates Fig. 3 ("PCD-Comparison"): composes the update direction d* for
   five multi-objective methods from a fixed primary gradient g1 (anchor) and
   an adjustable secondary gradient g2 (angle + magnitude). All formulas
   verified against the paper.
   ========================================================================= */
(function () {
  "use strict";

  var SVGNS = "http://www.w3.org/2000/svg";
  var DEFAULT_ANG = 105;   // degrees
  var DEFAULT_MAG = 0.70;  // ||g2||; unequal to ||g1||=1 so symmetric methods separate
  var DEG = Math.PI / 180;

  /* ---------------- vector helpers ---------------- */
  function V(x, y) { return { x: x, y: y }; }
  function add(a, b) { return V(a.x + b.x, a.y + b.y); }
  function sub(a, b) { return V(a.x - b.x, a.y - b.y); }
  function mul(a, s) { return V(a.x * s, a.y * s); }
  function dot(a, b) { return a.x * b.x + a.y * b.y; }
  function nrm(a) { return Math.hypot(a.x, a.y); }
  function unit(a) { var n = nrm(a); return n < 1e-9 ? V(1, 0) : V(a.x / n, a.y / n); }
  function fromAngMag(deg, mag) { return V(mag * Math.cos(deg * DEG), mag * Math.sin(deg * DEG)); }
  function angDeg(a) { return Math.atan2(a.y, a.x) / DEG; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ---------------- the five methods (verified) ---------------- */
  function mWS(g1, g2) { return add(mul(g1, 0.5), mul(g2, 0.5)); }

  function mMGDA(g1, g2) {
    var diff = sub(g1, g2), dd = dot(diff, diff);
    var a = dd > 1e-12 ? (dot(g2, g2) - dot(g1, g2)) / dd : 0.5;
    a = clamp(a, 0, 1);
    return add(mul(g1, a), mul(g2, 1 - a));
  }

  function mPCGrad(g1, g2) {
    var d12 = dot(g1, g2);
    if (d12 < 0) {
      var g1p = sub(g1, mul(g2, d12 / dot(g2, g2)));
      var g2p = sub(g2, mul(g1, d12 / dot(g1, g1)));
      return add(g1p, g2p);
    }
    return add(g1, g2);
  }

  function mCAGrad(g1, g2, c) {
    c = c == null ? 0.5 : c;
    var g0 = mul(add(g1, g2), 0.5), n0 = nrm(g0);
    if (n0 < 1e-9) return V(0, 0);
    var best = g0, bestVal = -Infinity;
    for (var i = 0; i <= 240; i++) {
      var w = i / 240;
      var gw = add(mul(g1, w), mul(g2, 1 - w)), nw = nrm(gw);
      if (nw < 1e-9) continue;
      var d = add(g0, mul(gw, c * n0 / nw));
      var val = Math.min(dot(g1, d), dot(g2, d));
      if (val > bestVal) { bestVal = val; best = d; }
    }
    return best;
  }

  function mPCD(g1, g2, tau) {
    var g2sq = dot(g2, g2), g2g1 = dot(g2, g1);
    if (g2g1 >= tau * g2sq) return { d: V(g1.x, g1.y), active: false, mu: 0 };
    var mu = tau - g2g1 / g2sq;
    return { d: add(g1, mul(g2, mu)), active: true, mu: mu };
  }

  var METHODS = [
    { key: "WS", name: "Weighted Sum", color: "#EF6C00" },
    { key: "MGDA", name: "MGDA", color: "#2E7D32" },
    { key: "PCGrad", name: "PCGrad", color: "#6D4C41" },
    { key: "CAGrad", name: "CAGrad", color: "#E53935" },
    { key: "PCD", name: "PCD", color: "#6A1B9A", pcd: true }
  ];

  function computeAll(g1, g2, tau) {
    var pcd = mPCD(g1, g2, tau);
    return {
      WS: mWS(g1, g2), MGDA: mMGDA(g1, g2), PCGrad: mPCGrad(g1, g2),
      CAGrad: mCAGrad(g1, g2), PCD: pcd.d, _pcd: pcd
    };
  }

  /* ---------------- self-test against verified vectors ---------------- */
  (function selfTest() {
    var g1 = V(1, 0);
    var gc = V(Math.cos(150 * DEG), Math.sin(150 * DEG)); // (-0.8660,0.5)
    var gn = V(Math.cos(60 * DEG), Math.sin(60 * DEG));   // (0.5,0.8660)
    var cases = [
      ["WS", gc, 0, 0.067, 0.25], ["MGDA", gc, 0, 0.067, 0.25],
      ["PCGrad", gc, 0, 0.25, 0.933], ["CAGrad", gc, 0, 0.1005, 0.375],
      ["PCD", gc, 0, 0.25, 0.433], ["PCD", gc, 0.3, -0.0098, 0.583],
      ["PCD", gc, 0.7, -0.3562, 0.783],
      ["WS", gn, 0, 0.75, 0.433], ["MGDA", gn, 0, 0.75, 0.433],
      ["PCGrad", gn, 0, 1.5, 0.866], ["CAGrad", gn, 0, 1.125, 0.6495],
      ["PCD", gn, 0, 1, 0], ["PCD", gn, 0.3, 1, 0], ["PCD", gn, 0.7, 1.1, 0.1732]
    ];
    var fails = 0;
    cases.forEach(function (c) {
      var r = computeAll(g1, c[1], c[2])[c[0]];
      if (Math.abs(r.x - c[3]) > 0.01 || Math.abs(r.y - c[4]) > 0.01) {
        fails++;
        console.warn("[PCD self-test] mismatch", c[0], "tau", c[2],
          "got", r.x.toFixed(4), r.y.toFixed(4), "want", c[3], c[4]);
      }
    });
    if (!fails) console.log("%c[PCD] vector self-test passed (14/14)", "color:#6A1B9A;font-weight:bold");
  })();

  /* ---------------- geometry / rendering ---------------- */
  var svg = document.getElementById("vecSvg");
  if (!svg) return;
  var W = 600, H = 600, O = V(270, 380), S = 150; // origin + px-per-unit
  function sx(p) { return O.x + p.x * S; }
  function sy(p) { return O.y - p.y * S; }

  function el(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  // layers (built once): region (shaded), static (axes), dynamic (arrows), handles
  var gStatic = el("g", {}), gRegion = el("g", {}), gDyn = el("g", {}), gHandles = el("g", {});
  svg.appendChild(gRegion); svg.appendChild(gStatic); svg.appendChild(gDyn); svg.appendChild(gHandles);

  // axes + reference circle (||g||=1) + origin
  gStatic.appendChild(el("line", { x1: sx(V(-1.5, 0)), y1: sy(V(0, 0)), x2: sx(V(2.0, 0)), y2: sy(V(0, 0)), stroke: "#E7E3EE", "stroke-width": 1 }));
  gStatic.appendChild(el("line", { x1: sx(V(0, -1.15)), y1: sy(V(0, -1.15)), x2: sx(V(0, 1.45)), y2: sy(V(0, 1.45)), stroke: "#E7E3EE", "stroke-width": 1 }));
  gStatic.appendChild(el("circle", { cx: sx(V(0, 0)), cy: sy(V(0, 0)), r: S, fill: "none", stroke: "#ECE6F4", "stroke-width": 1, "stroke-dasharray": "2 5" }));
  gStatic.appendChild(el("circle", { cx: sx(V(0, 0)), cy: sy(V(0, 0)), r: 4, fill: "#1A1523" }));

  // g1 = fixed primary anchor marker; g2 = draggable secondary handle
  var g1Marker = el("circle", { cx: sx(V(1, 0)), cy: sy(V(1, 0)), r: 6.5, fill: "#1A1523", stroke: "#fff", "stroke-width": 2 });
  g1Marker.setAttribute("aria-hidden", "true");
  gHandles.appendChild(g1Marker);
  var g2Handle = el("circle", { r: 10, fill: "#fff", stroke: "#6A1B9A", "stroke-width": 2.5, cursor: "grab" });
  g2Handle.classList.add("vhandle");
  g2Handle.setAttribute("aria-hidden", "true"); // keyboard control is via the sliders
  gHandles.appendChild(g2Handle);

  // arrowhead drawer
  function arrow(layer, from, to, color, width, opacity) {
    var fx = sx(from), fy = sy(from), tx = sx(to), ty = sy(to);
    var ang = Math.atan2(ty - fy, tx - fx), len = Math.hypot(tx - fx, ty - fy);
    if (len < 2) return;
    var hl = Math.min(13, len * 0.5), hw = Math.max(width * 1.7, 5);
    var bx = tx - hl * Math.cos(ang), by = ty - hl * Math.sin(ang);
    layer.appendChild(el("line", { x1: fx, y1: fy, x2: bx, y2: by, stroke: color, "stroke-width": width, "stroke-linecap": "round", opacity: opacity }));
    var px = -Math.sin(ang), py = Math.cos(ang);
    layer.appendChild(el("polygon", {
      points: tx + "," + ty + " " + (bx + px * hw) + "," + (by + py * hw) + " " + (bx - px * hw) + "," + (by - py * hw),
      fill: color, opacity: opacity
    }));
  }

  function labelXY(layer, x, y, text, color, weight) {
    var t = el("text", {
      x: x, y: y, fill: color,
      stroke: "#fff", "stroke-width": 3.2, "paint-order": "stroke",
      "font-family": "'JetBrains Mono', monospace", "font-size": 14, "font-weight": weight || 500
    });
    t.textContent = text; layer.appendChild(t);
  }
  function label(layer, p, text, color, dx, dy, weight) {
    labelXY(layer, sx(p) + (dx || 0), sy(p) + (dy || 0), text, color, weight);
  }

  /* ---------------- state + DOM refs ---------------- */
  var state = {
    g1: V(1, 0),
    g2: fromAngMag(DEFAULT_ANG, DEFAULT_MAG),
    tau: 0.20,
    visible: { WS: true, MGDA: true, PCGrad: true, CAGrad: true, PCD: true },
    tour: false
  };

  var tauSlider = document.getElementById("tauSlider");
  var tauVal = document.getElementById("tauVal");
  var conflictSlider = document.getElementById("conflictSlider");
  var conflictVal = document.getElementById("conflictVal");
  var strengthSlider = document.getElementById("strengthSlider");
  var strengthVal = document.getElementById("strengthVal");
  var readout = document.getElementById("vecReadout");
  var badge = document.getElementById("conflictBadge");

  function fmt(n) { return (n >= 0 ? " " : "") + n.toFixed(2); }
  function setFill(slider, pct) {
    slider.style.background = "linear-gradient(90deg,var(--pcd) 0%, var(--pcd) " + pct + "%, var(--mist) " + pct + "%)";
  }
  function syncControls() {
    var deg = Math.round(clamp(angDeg(state.g2), 0, 180));
    var mag = nrm(state.g2);
    if (conflictSlider) { conflictSlider.value = deg; conflictVal.textContent = deg + "°"; setFill(conflictSlider, deg / 180 * 100); }
    if (strengthSlider) { strengthSlider.value = mag.toFixed(2); strengthVal.textContent = mag.toFixed(2); setFill(strengthSlider, (mag - 0.3) / 1.2 * 100); }
    tauSlider.value = state.tau; tauVal.textContent = state.tau.toFixed(2); setFill(tauSlider, state.tau * 100);
  }

  function render() {
    while (gDyn.firstChild) gDyn.removeChild(gDyn.firstChild);
    while (gRegion.firstChild) gRegion.removeChild(gRegion.firstChild);

    var g1 = state.g1, g2 = state.g2, tau = state.tau;

    /* feasible half-space H2 = { d : g2.d >= tau*||g2||^2 }; boundary through P = tau*g2 */
    var P = mul(g2, tau);
    var gU = unit(g2), perpU = V(-gU.y, gU.x), L = 6;
    var A = add(P, mul(perpU, L)), B = sub(P, mul(perpU, L));
    var Cc = add(B, mul(gU, L)), Dd = add(A, mul(gU, L));
    gRegion.appendChild(el("polygon", { points: [A, B, Cc, Dd].map(function (p) { return sx(p) + "," + sy(p); }).join(" "), fill: "#6A1B9A", opacity: 0.08 }));
    gRegion.appendChild(el("line", { x1: sx(A), y1: sy(A), x2: sx(B), y2: sy(B), stroke: "#6A1B9A", "stroke-width": 1.4, "stroke-dasharray": "5 4", opacity: 0.5 }));
    // place the label along the boundary, on the side away from where the method arrows point
    var perpL = dot(perpU, add(g1, g2)) > 0 ? mul(perpU, -1) : perpU;
    label(gRegion, add(P, mul(perpL, 1.35)), "feasible (τ)", "#6A1B9A", -12, 4, 500);

    /* reference rays */
    arrow(gDyn, V(0, 0), g1, "#9A92A8", 2, 1);
    arrow(gDyn, V(0, 0), g2, "#9A92A8", 2, 1);
    label(gDyn, mul(unit(g1), nrm(g1) + 0.12), "g₁", "#4A4453", 4, 4, 600);
    label(gDyn, mul(unit(g2), nrm(g2) + 0.14), "g₂", "#4A4453", -4, 0, 600);

    /* method arrows (PCD drawn last so it sits on top) */
    var res = computeAll(g1, g2, tau);
    function byKey(key) { return METHODS.filter(function (x) { return x.key === key; })[0]; }
    ["WS", "MGDA", "CAGrad", "PCGrad", "PCD"].forEach(function (key) {
      if (!state.visible[key]) return;
      var m = byKey(key), d = res[key], isP = !!m.pcd;
      arrow(gDyn, V(0, 0), d, m.color, isP ? 4.6 : 3.2, isP ? 1 : 0.92);
    });
    // labels: place PCD first so it keeps its spot; nudge any colliding label downward
    var placed = [];
    ["PCD", "WS", "MGDA", "CAGrad", "PCGrad"].forEach(function (key) {
      if (!state.visible[key]) return;
      var m = byKey(key), d = res[key], isP = !!m.pcd;
      var u = unit(d), rad = Math.max(nrm(d) + 0.1, isP ? 0.74 : 0.96);
      var lx = sx(mul(u, rad)) + (u.x < 0 ? -16 : 3), ly = sy(mul(u, rad)) + 4;
      for (var k = 0; k < placed.length; k++) {
        if (Math.abs(lx - placed[k][0]) < 30 && Math.abs(ly - placed[k][1]) < 16) { ly = placed[k][1] + 17; }
      }
      placed.push([lx, ly]);
      labelXY(gDyn, lx, ly, m.key, m.color, isP ? 700 : 600);
    });

    /* update draggable handle position */
    g2Handle.setAttribute("cx", sx(g2));
    g2Handle.setAttribute("cy", sy(g2));

    /* readouts */
    var cosv = dot(g1, g2) / ((nrm(g1) * nrm(g2)) || 1);
    var pcd = res._pcd, primDesc = dot(g1, pcd.d);
    badge.className = "conflict-badge " + (cosv < 0 ? "conflict" : "noconflict");
    badge.textContent = (cosv < 0 ? "Conflict" : "No conflict") + "  ·  cos∠(g₁,g₂) = " + fmt(cosv);

    var primTxt = primDesc > 1e-6
      ? "<span class='ok'>" + fmt(primDesc) + " &gt; 0 ✓</span>"
      : "<span class='warn'>" + fmt(primDesc) + " ≤ 0</span>";
    readout.innerHTML =
      "<b>PCD</b> " + (pcd.active ? "active · μ=" + pcd.mu.toFixed(2) : "inactive · d★=g₁") + "<br>" +
      "primary descent g₁·d★ = " + primTxt +
      (primDesc <= 1e-6 ? "<br><span class='warn'>secondary pressure now overrides the primary (τ past breakdown)</span>" : "");
  }

  /* ---------------- legend (method visibility toggles) ---------------- */
  var legendBox = document.getElementById("vecLegend");
  METHODS.forEach(function (m) {
    var item = document.createElement("button");
    item.type = "button";
    item.className = "leg-item" + (m.pcd ? " is-pcd" : "");
    item.setAttribute("aria-pressed", "true");
    item.setAttribute("aria-label", "Toggle " + m.name + " in the figure");
    item.innerHTML =
      "<span class='leg-swatch' style='color:" + m.color + "'></span>" +
      "<span class='leg-name'>" + m.name + "</span>" +
      (m.pcd ? "<span class='leg-tag'>ours · asymmetric</span>" : "<span class='leg-tag'>symmetric</span>");
    item.addEventListener("click", function () {
      cancelTour();
      state.visible[m.key] = !state.visible[m.key];
      item.classList.toggle("off", !state.visible[m.key]);
      item.setAttribute("aria-pressed", state.visible[m.key] ? "true" : "false");
      render();
    });
    legendBox.appendChild(item);
  });

  /* ---------------- dragging g2 (free angle + magnitude) ---------------- */
  var dragging = false;
  function pointMath(evt) {
    var r = svg.getBoundingClientRect();
    var x = (evt.clientX - r.left) / r.width * W;
    var y = (evt.clientY - r.top) / r.height * H;
    return V((x - O.x) / S, -(y - O.y) / S);
  }
  function onDown(evt) {
    var p = pointMath(evt);
    if (nrm(sub(p, state.g2)) > 0.42) return;   // only grab near g2's tip
    cancelTour();
    dragging = true; svg.classList.add("grabbing");
    svg.setPointerCapture && svg.setPointerCapture(evt.pointerId);
    evt.preventDefault();
  }
  function onMove(evt) {
    if (!dragging) return;
    var p = pointMath(evt);
    if (nrm(p) < 1e-6) return;
    var deg = clamp(angDeg(p), 0, 180);          // keep g2 in the upper half-plane
    var mag = clamp(nrm(p), 0.3, 1.5);
    state.g2 = fromAngMag(deg, mag);
    syncControls();
    render();
  }
  function onUp(evt) {
    dragging = false; svg.classList.remove("grabbing");
    svg.releasePointerCapture && evt.pointerId != null && svg.releasePointerCapture(evt.pointerId);
  }
  svg.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);

  /* ---------------- sliders ---------------- */
  tauSlider.addEventListener("input", function () {
    cancelTour();
    state.tau = parseFloat(tauSlider.value);
    tauVal.textContent = state.tau.toFixed(2); setFill(tauSlider, state.tau * 100);
    render();
  });
  if (conflictSlider) conflictSlider.addEventListener("input", function () {
    cancelTour();
    var deg = parseFloat(conflictSlider.value);
    state.g2 = fromAngMag(deg, nrm(state.g2));
    conflictVal.textContent = deg + "°"; setFill(conflictSlider, deg / 180 * 100);
    render();
  });
  if (strengthSlider) strengthSlider.addEventListener("input", function () {
    cancelTour();
    var mag = parseFloat(strengthSlider.value);
    state.g2 = fromAngMag(angDeg(state.g2), mag);
    strengthVal.textContent = mag.toFixed(2); setFill(strengthSlider, (mag - 0.3) / 1.2 * 100);
    render();
  });

  /* ---------------- auto-tour ---------------- */
  var tourBtn = document.getElementById("tourBtn");
  var tourRAF = null, tourStart = null;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setTour(on) {
    state.tour = on;
    tourBtn.classList.toggle("btn-primary", !on);
    tourBtn.innerHTML = on
      ? "<svg viewBox='0 0 24 24' class='ico'><rect x='6' y='5' width='4' height='14'/><rect x='14' y='5' width='4' height='14'/></svg> Stop"
      : "<svg viewBox='0 0 24 24' class='ico'><path d='M8 5v14l11-7z'/></svg> Watch it work";
  }
  function cancelTour() {
    if (!state.tour) return;
    if (tourRAF) cancelAnimationFrame(tourRAF);
    tourRAF = null; tourStart = null; setTour(false);
  }
  function tourFrame(ts) {
    if (!tourStart) tourStart = ts;
    var t = (ts - tourStart) / 1000, DUR = 9, phase = (t % DUR) / DUR;
    var ang = 135 + 25 * Math.sin(t * 0.7);                 // sweep 110-160 deg (always conflicting)
    state.g2 = fromAngMag(ang, DEFAULT_MAG);
    state.tau = phase < 0.5 ? phase * 2 : (1 - phase) * 2;  // tau ping-pongs 0 -> 1 -> 0
    syncControls();
    render();
    tourRAF = requestAnimationFrame(tourFrame);
  }
  tourBtn.addEventListener("click", function () {
    if (state.tour) { cancelTour(); return; }
    setTour(true);
    if (reduceMotion) {
      state.g2 = fromAngMag(DEFAULT_ANG, DEFAULT_MAG); state.tau = 0.5;
      syncControls(); render(); setTour(false); return;
    }
    tourStart = null; tourRAF = requestAnimationFrame(tourFrame);
  });

  /* ---------------- reset ---------------- */
  document.getElementById("resetBtn").addEventListener("click", function () {
    cancelTour();
    state.g2 = fromAngMag(DEFAULT_ANG, DEFAULT_MAG);
    state.tau = 0.20;
    Object.keys(state.visible).forEach(function (k) { state.visible[k] = true; });
    Array.prototype.forEach.call(legendBox.children, function (c) { c.classList.remove("off"); c.setAttribute("aria-pressed", "true"); });
    syncControls();
    render();
  });

  syncControls();
  render();
})();
