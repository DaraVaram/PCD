/* =========================================================================
   PCD project page — page behaviours (reveal, nav, copy, links)
   ========================================================================= */
(function () {
  "use strict";

  /* -----------------------------------------------------------------------
     EDIT THESE: point the buttons at your real URLs. Leave a value as ""
     to keep it as a gentle "coming soon" placeholder.
     ----------------------------------------------------------------------- */
  var LINKS = {
    paper: "https://arxiv.org/pdf/2606.29521",  // "Read the paper" / "See the appendix"
    arxiv: "https://arxiv.org/abs/2606.29521",  // arXiv abstract page
    code: ""                                     // e.g. "https://github.com/yourname/pcd"
  };

  var toast = document.getElementById("toast");
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toast.classList.remove("show"); }, 1900);
  }

  // wire data-link buttons
  Array.prototype.forEach.call(document.querySelectorAll("[data-link]"), function (a) {
    var key = a.getAttribute("data-link"), url = LINKS[key];
    if (url) {
      a.setAttribute("href", url);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    } else {
      a.setAttribute("aria-disabled", "true");
      a.setAttribute("title", "Link coming soon");
      a.addEventListener("click", function (e) {
        e.preventDefault();
        showToast("Add your " + key + " link in js/main.js");
      });
    }
  });

  /* ---------------- scroll progress ---------------- */
  var bar = document.getElementById("scrollProgress");
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var p = max > 0 ? (h.scrollTop || document.body.scrollTop) / max : 0;
    bar.style.width = (p * 100).toFixed(2) + "%";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------------- reveal on scroll ---------------- */
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var reveals = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    Array.prototype.forEach.call(reveals, function (r) { r.classList.add("in"); });
  } else {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en, i) {
        if (en.isIntersecting) {
          var elt = en.target;
          setTimeout(function () { elt.classList.add("in"); }, Math.min(i * 55, 220));
          ro.unobserve(elt);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    Array.prototype.forEach.call(reveals, function (r) { ro.observe(r); });
  }

  /* ---------------- dot nav (show + active section) ---------------- */
  var dotnav = document.getElementById("dotnav");
  var hero = document.getElementById("hero");

  if (dotnav && hero && "IntersectionObserver" in window) {
    var links = Array.prototype.slice.call(dotnav.querySelectorAll("a"));
    var sections = links.map(function (a) { return document.querySelector(a.getAttribute("href")); });
    new IntersectionObserver(function (e) {
      dotnav.classList.toggle("show", !e[0].isIntersecting);
    }, { threshold: 0.25 }).observe(hero);

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var idx = sections.indexOf(en.target);
          links.forEach(function (l, i) { l.classList.toggle("active", i === idx); });
        }
      });
    }, { threshold: 0.5, rootMargin: "-20% 0px -40% 0px" });
    sections.forEach(function (s) { if (s) spy.observe(s); });
  }

  /* ---------------- hero trajectory self-draw ---------------- */
  var trace = document.getElementById("heroTrace");
  if (trace) {
    if (reduce) { trace.style.strokeDashoffset = "0"; }
    else { requestAnimationFrame(function () { trace.classList.add("draw"); }); }
  }

  /* ---------------- BibTeX copy ---------------- */
  var copyBtn = document.getElementById("copyBib");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var text = document.getElementById("bibtex").innerText;
      var done = function () {
        showToast("BibTeX copied to clipboard");
        var span = copyBtn.querySelector("span");
        if (span) { var old = span.textContent; span.textContent = "Copied"; setTimeout(function () { span.textContent = old; }, 1600); }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else { fallback(); }
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) { showToast("Press Ctrl+C to copy"); }
        document.body.removeChild(ta);
      }
    });
  }
})();
