/* =========================================================================
   PCD interactive vector figure
   Recreates Fig. "PCD-Comparison": composes the update direction d* for
   five multi-objective methods from two unit gradients g1 (primary) and
   g2 (secondary). All formulas verified against the paper.
   ========================================================================= */
(function () {
  "use strict";

  var SVGNS = "http://www.w3.org/2000/svg";

  /* ---------------- vector helpers ---------------- */
  function V(x, y) { return { x: x, y: y }; }
  function add(a, b) { return V(a.x + b.x, a.y + b.y); }
  function sub(a, b) { return V(a.x - b.x, a.y - b.y); }
  function mul(a, s) { return V(a.x * s, a.y * s); }
  function dot(a, b) { return a.x * b.x + a.y * b.y; }
  function nrm(a) { return Math.hypot(a.x, a.y); }
  function unit(a) { var n = nrm(a); return n < 1e-9 ? V(1, 0) : V(a.x / n, a.y / n); }

  /* ---------------- the five methods (verified) ---------------- */
  function mWS(g1, g2) { return add(mul(g1, 0.5), mul(g2, 0.5)); }

  function mMGDA(g1, g2) {
    var diff = sub(g1, g2), dd = dot(diff, diff);
    var a = dd > 1e-12 ? (dot(g2, g2) - dot(g1, g2)) / dd : 0.5;
    a = Math.max(0, Math.min(1, a));
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
    var gc = V(Math.cos(150 * Math.PI / 180), Math.sin(150 * Math.PI / 180)); // (-0.8660,0.5)
    var gn = V(Math.cos(60 * Math.PI / 180), Math.sin(60 * Math.PI / 180));   // (0.5,0.8660)
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

  // static layers (built once)
  var gStatic = el("g", {}), gRegion = el("g", {}), gDyn = el("g", {}), gHandles = el("g", {});
  svg.appendChild(gRegion); svg.appendChild(gStatic); svg.appendChild(gDyn); svg.appendChild(gHandles);

  // unit circle + axes + origin
  gStatic.appendChild(el("line", { x1: sx(V(-1.5, 0)), y1: sy(V(0, 0)), x2: sx(V(2.0, 0)), y2: sy(V(0, 0)), stroke: "#E7E3EE", "stroke-width": 1 }));
  gStatic.appendChild(el("line", { x1: sx(V(0, -1.15)), y1: sy(V(0, -1.15)), x2: sx(V(0, 1.45)), y2: sy(V(0, 1.45)), stroke: "#E7E3EE", "stroke-width": 1 }));
  gStatic.appendChild(el("circle", { cx: sx(V(0, 0)), cy: sy(V(0, 0)), r: S, fill: "none", stroke: "#ECE6F4", "stroke-width": 1, "stroke-dasharray": "2 5" }));
  gStatic.appendChild(el("circle", { cx: sx(V(0, 0)), cy: sy(V(0, 0)), r: 4, fill: "#1A1523" }));

  // persistent, keyboard-operable gradient handles (focusable sliders)
  var handleEls = {};
  [["g1", "#1A1523", "Primary gradient g₁ angle, in degrees"],
   ["g2", "#6A1B9A", "Secondary gradient g₂ angle, in degrees"]].forEach(function (h) {
    var which = h[0];
    var c = el("circle", { r: 10, fill: "#fff", stroke: h[1], "stroke-width": 2.5, cursor: "grab" });
    c.classList.add("vhandle");
    c.setAttribute("tabindex", "0");
    c.setAttribute("role", "slider");
    c.setAttribute("aria-label", h[2]);
    c.setAttribute("aria-valuemin", "-180");
    c.setAttribute("aria-valuemax", "180");
    c.addEventListener("keydown", function (e) {
      var step = e.shiftKey ? 1 : 5, d = 0;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") d = -step;
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") d = step;
      else return;
      e.preventDefault();
      cancelTour();
      var v = state[which], ang = Math.atan2(v.y, v.x) + d * Math.PI / 180;
      state[which] = V(Math.cos(ang), Math.sin(ang));
      render();
    });
    gHandles.appendChild(c);
    handleEls[which] = c;
  });

  // arrowhead drawer
  function arrow(layer, from, to, color, width, opacity, dash) {
    var fx = sx(from), fy = sy(from), tx = sx(to), ty = sy(to);
    var ang = Math.atan2(ty - fy, tx - fx), len = Math.hypot(tx - fx, ty - fy);
    if (len < 2) return;
    var hl = Math.min(13, len * 0.5), hw = Math.max(width * 1.7, 5);
    var bx = tx - hl * Math.cos(ang), by = ty - hl * Math.sin(ang);
    var line = el("line", { x1: fx, y1: fy, x2: bx, y2: by, stroke: color, "stroke-width": width, "stroke-linecap": "round", opacity: opacity });
    if (dash) line.setAttribute("stroke-dasharray", dash);
    layer.appendChild(line);
    var px = -Math.sin(ang), py = Math.cos(ang);
    var p1 = tx + "," + ty;
    var p2 = (bx + px * hw) + "," + (by + py * hw);
    var p3 = (bx - px * hw) + "," + (by - py * hw);
    layer.appendChild(el("polygon", { points: p1 + " " + p2 + " " + p3, fill: color, opacity: opacity }));
  }

  function label(layer, p, text, color, dx, dy, weight) {
    var t = el("text", { x: sx(p) + (dx || 0), y: sy(p) + (dy || 0), fill: color, "font-family": "'JetBrains Mono', monospace", "font-size": 14.5, "font-weight": weight || 500 });
    t.textContent = text; layer.appendChild(t);
  }

  /* ---------------- state ---------------- */
  var state = {
    g1: V(1, 0),
    g2: V(Math.cos(150 * Math.PI / 180), Math.sin(150 * Math.PI / 180)),
    tau: 0.20,
    visible: { WS: true, MGDA: true, PCGrad: true, CAGrad: true, PCD: true },
    tour: false
  };

  var tauSlider = document.getElementById("tauSlider");
  var tauVal = document.getElementById("tauVal");
  var readout = document.getElementById("vecReadout");
  var badge = document.getElementById("conflictBadge");

  function fmt(n) { return (n >= 0 ? " " : "") + n.toFixed(2); }

  function render() {
    // clear dynamic + region
    while (gDyn.firstChild) gDyn.removeChild(gDyn.firstChild);
    while (gRegion.firstChild) gRegion.removeChild(gRegion.firstChild);

    var g1 = state.g1, g2 = state.g2, tau = state.tau;

    /* feasible half-space H2 = { d : g2·d >= tau (||g2||=1) } */
    var P = mul(g2, tau);                 // closest boundary point to origin
    var perp = V(-g2.y, g2.x);
    var L = 6;
    var A = add(P, mul(perp, L)), B = sub(P, mul(perp, L));
    var Cc = add(B, mul(g2, L)), Dd = add(A, mul(g2, L));
    var poly = [A, B, Cc, Dd].map(function (p) { return sx(p) + "," + sy(p); }).join(" ");
    gRegion.appendChild(el("polygon", { points: poly, fill: "#6A1B9A", opacity: 0.08 }));
    // boundary line
    gRegion.appendChild(el("line", { x1: sx(A), y1: sy(A), x2: sx(B), y2: sy(B), stroke: "#6A1B9A", "stroke-width": 1.4, "stroke-dasharray": "5 4", opacity: 0.5 }));
    label(gRegion, add(P, mul(perp, -1.15)), "feasible (τ)", "#6A1B9A", 0, 0, 500);

    /* reference rays g1, g2 */
    arrow(gDyn, V(0, 0), g1, "#9A92A8", 2, 1);
    arrow(gDyn, V(0, 0), g2, "#9A92A8", 2, 1);
    label(gDyn, mul(g1, 1.12), "g₁", "#4A4453", 4, 4, 600);
    label(gDyn, mul(g2, 1.12), "g₂", "#4A4453", -4, 0, 600);

    /* method arrows */
    var res = computeAll(g1, g2, tau);
    var order = ["WS", "MGDA", "CAGrad", "PCGrad", "PCD"];
    order.forEach(function (key) {
      if (!state.visible[key]) return;
      var m = METHODS.filter(function (x) { return x.key === key; })[0];
      var d = res[key];
      var isP = !!m.pcd;
      arrow(gDyn, V(0, 0), d, m.color, isP ? 4.6 : 3.2, isP ? 1 : 0.92);
      // label, nudged radially outward
      var u = unit(d), off = isP ? 16 : 13;
      var lp = add(d, mul(u, 0.001));
      label(gDyn, lp, m.key === "PCD" ? "PCD" : m.key, m.color,
        u.x * off + (u.x < 0 ? -18 : 2), -u.y * off + 5, isP ? 700 : 600);
    });

    /* handles: update the persistent focusable sliders (kept in gHandles) */
    [["g1", g1], ["g2", g2]].forEach(function (h) {
      var c = handleEls[h[0]];
      c.setAttribute("cx", sx(h[1]));
      c.setAttribute("cy", sy(h[1]));
      c.setAttribute("aria-valuenow", Math.round(Math.atan2(h[1].y, h[1].x) * 180 / Math.PI));
    });

    /* readouts */
    var c = dot(g1, g2);
    var pcd = res._pcd, primDesc = dot(g1, pcd.d);
    var conflict = c < 0;
    badge.className = "conflict-badge " + (conflict ? "conflict" : "noconflict");
    badge.textContent = (conflict ? "Conflict" : "No conflict") + "  ·  g₁·g₂ = " + fmt(c);

    var primClass = primDesc > 1e-6 ? "ok" : "warn";
    var primTxt = primDesc > 1e-6
      ? "<span class='ok'>" + fmt(primDesc) + " &gt; 0 ✓</span>"
      : "<span class='warn'>" + fmt(primDesc) + " ≤ 0</span>";
    var status = pcd.active
      ? "active · μ=" + pcd.mu.toFixed(2)
      : "inactive · d★=g₁";
    readout.innerHTML =
      "<b>PCD</b> " + status + "<br>" +
      "primary descent g₁·d★ = " + primTxt +
      (primDesc <= 1e-6 ? "<br><span class='warn'>secondary pressure now overrides the primary (τ past breakdown)</span>" : "");

    // slider fill
    var pct = (state.tau * 100).toFixed(0);
    tauSlider.style.background = "linear-gradient(90deg,var(--pcd) 0%, var(--pcd) " + pct + "%, var(--mist) " + pct + "%)";
  }

  /* ---------------- legend ---------------- */
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

  /* ---------------- dragging ---------------- */
  var dragging = null;
  function pointMath(evt) {
    var r = svg.getBoundingClientRect();
    var x = (evt.clientX - r.left) / r.width * W;
    var y = (evt.clientY - r.top) / r.height * H;
    return V((x - O.x) / S, -(y - O.y) / S);
  }
  function nearestHandle(p) {
    var d1 = nrm(sub(p, state.g1)), d2 = nrm(sub(p, state.g2));
    if (Math.min(d1, d2) > 0.32) return null;
    return d1 <= d2 ? "g1" : "g2";
  }
  function onDown(evt) {
    var p = pointMath(evt), h = nearestHandle(p);
    if (!h) return;
    cancelTour();
    dragging = h; svg.classList.add("grabbing");
    svg.setPointerCapture && svg.setPointerCapture(evt.pointerId);
    evt.preventDefault();
  }
  function onMove(evt) {
    if (!dragging) return;
    var p = pointMath(evt);
    if (nrm(p) < 1e-6) return;
    state[dragging] = unit(p);          // constrain to unit length (rotate)
    render();
  }
  function onUp(evt) {
    dragging = null; svg.classList.remove("grabbing");
    svg.releasePointerCapture && evt.pointerId != null && svg.releasePointerCapture(evt.pointerId);
  }
  svg.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);

  /* ---------------- tau slider ---------------- */
  tauSlider.addEventListener("input", function () {
    cancelTour();
    state.tau = parseFloat(tauSlider.value);
    tauVal.textContent = state.tau.toFixed(2);
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
    var t = (ts - tourStart) / 1000;       // seconds
    var DUR = 9;
    var phase = (t % DUR) / DUR;           // 0..1 loop
    // g2 sweeps between 110° and 160° (always conflicting: g1·g2 < 0)
    var ang = (135 + 25 * Math.sin(t * 0.7)) * Math.PI / 180;
    state.g2 = V(Math.cos(ang), Math.sin(ang));
    // tau ping-pongs 0 -> 1 -> 0
    var tri = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
    state.tau = tri;
    tauSlider.value = state.tau;
    tauVal.textContent = state.tau.toFixed(2);
    render();
    tourRAF = requestAnimationFrame(tourFrame);
  }
  tourBtn.addEventListener("click", function () {
    if (state.tour) { cancelTour(); return; }
    setTour(true);
    state.g1 = V(1, 0);
    if (reduceMotion) {                    // no continuous animation; just set a telling frame
      state.g2 = V(Math.cos(150 * Math.PI / 180), Math.sin(150 * Math.PI / 180));
      state.tau = 0.5; tauSlider.value = 0.5; tauVal.textContent = "0.50";
      render(); setTour(false); return;
    }
    tourStart = null; tourRAF = requestAnimationFrame(tourFrame);
  });

  /* ---------------- reset ---------------- */
  document.getElementById("resetBtn").addEventListener("click", function () {
    cancelTour();
    state.g1 = V(1, 0);
    state.g2 = V(Math.cos(150 * Math.PI / 180), Math.sin(150 * Math.PI / 180));
    state.tau = 0.20; tauSlider.value = 0.20; tauVal.textContent = "0.20";
    Object.keys(state.visible).forEach(function (k) { state.visible[k] = true; });
    Array.prototype.forEach.call(legendBox.children, function (c) { c.classList.remove("off"); c.setAttribute("aria-pressed", "true"); });
    render();
  });

  render();
})();
