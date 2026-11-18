(function () {
  "use strict";

  var I18N = window.PORTFOLIO_I18N;
  var PI = window.PixelIcons;
  var KEY = "dasha-lang";
  var lang = "ru";
  try { lang = localStorage.getItem(KEY) === "en" ? "en" : "ru"; } catch (e) {}

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function get(obj, path) { return path.split(".").reduce(function (a, k) { return a == null ? a : a[k]; }, obj); }
  /* Glue short Russian prepositions/conjunctions to the next word (no orphans at line ends). */
  function typo(s) {
    s = String(s == null ? "" : s);
    if (lang !== "ru") return s;
    var glue = /(^|[\s\u00A0(«"„])([авуикосуя]|во|до|за|из|ко|на|не|ни|но|об|от|по|со|то|без|для|над|под|при|про)(\s+)/gi;
    // two passes so chains like "и я направлюсь" glue fully
    s = s.replace(glue, "$1$2\u00A0").replace(glue, "$1$2\u00A0");
    return s.replace(/(\d)\s+(п\.п\.|%|тыс\.|раза?|дней|дня|день|лет|года|год)/gi, "$1\u00A0$2");
  }
  function typoHtml(html) {
    return String(html).split(/(<[^>]+>)/).map(function (part, i) { return i % 2 ? part : typo(part); }).join("");
  }
  function esc(s) { return typo(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function T() { return I18N[lang]; }
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- icons ---------------- */
  function hydrateIcons(root) {
    $$("[data-icon-tile]", root).forEach(function (el) { if (!el.firstChild) el.innerHTML = PI.tile(el.getAttribute("data-icon-tile")); });
    $$("[data-icon-glyph]", root).forEach(function (el) { if (!el.firstChild) el.innerHTML = PI.glyph(el.getAttribute("data-icon-glyph")); });
  }

  /* ---------------- static i18n ---------------- */
  function applyStatic() {
    var t = T();
    document.documentElement.lang = lang;
    $$("[data-i18n]").forEach(function (el) {
      var v = get(t, el.getAttribute("data-i18n"));
      if (typeof v === "string") el.textContent = typo(v);
    });
    $$("[data-i18n-aria]").forEach(function (el) {
      var v = get(t, el.getAttribute("data-i18n-aria"));
      if (typeof v === "string") el.setAttribute("aria-label", typo(v));
    });
    var title = $("[data-hero-title]");
    title.innerHTML = t.hero.title.map(function (l) { return "<span>" + esc(l) + "</span>"; }).join("");
    var lead = $("[data-hero-lead]");
    if (Array.isArray(t.hero.lead)) lead.innerHTML = t.hero.lead.map(esc).join("<br>");
    else lead.textContent = typo(t.hero.lead);
    $("[data-footer-title]").textContent = typo(t.contacts.title);
    $("[data-burger]").setAttribute("aria-label", t.ui.menu);
    $("#site-nav").setAttribute("aria-label", lang === "ru" ? "Основная навигация" : "Main navigation");
    document.title = lang === "ru"
      ? "Даша Стоюхина | Senior UX/UI дизайнер и арт-директор"
      : "Dasha Stoyukhina | Senior UX/UI designer and art director";
    $$("[data-lang]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-lang") === lang ? "true" : "false"); });
    $$("[data-resume-link]").forEach(function (a) {
      if (t.hero.resumeUrl) a.setAttribute("href", t.hero.resumeUrl);
    });
  }

  /* ---------------- cases ---------------- */
  function renderCases() {
    var t = T();
    var wrap = $("[data-cases]");
    var screen = t.ui.screen;
    var ph = '<div class="slide slide--ph"><span class="slide__label">' + esc(screen) + "</span></div>";
    wrap.innerHTML = t.cases.items.map(function (c) {
      return (
        '<article class="case case--' + c.id + ' reveal" data-case>' +
        '<div class="case__media" data-slider>' +
          '<div class="case__track" tabindex="0" role="group" aria-roledescription="carousel" aria-label="' + esc(c.name) + '">' +
            ph + ph + ph +
          "</div>" +
          '<button type="button" class="slider-btn slider-btn--prev" aria-label="' + esc(t.ui.prev) + '"><span class="slider-btn__i" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span></button>' +
          '<button type="button" class="slider-btn slider-btn--next" aria-label="' + esc(t.ui.next) + '"><span class="slider-btn__i" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span></button>' +
          '<div class="slider-dots">' +
            [0, 1, 2].map(function (n) { return '<button type="button" class="slider-dot' + (n === 0 ? " is-on" : "") + '" aria-label="' + esc(t.ui.slide + " " + (n + 1)) + '"></button>'; }).join("") +
          "</div>" +
        "</div>" +
        '<div class="case__body">' +
          '<p class="case__caption">' + esc(c.name) + "</p>" +
          '<h3 class="case__title">' + esc(c.title).replace(/\n/g, '<br class="br-d"> ') + "</h3>" +
          metricsHTML(c.metrics) +
          '<a class="btn btn--tiffany case-cta" href="#" data-case-link>' + esc(t.cases.open) + "</a>" +
        "</div>" +
        "</article>"
      );
    }).join("");
    hydrateIcons(wrap);
    initSliders();
    $$("[data-case-link]", wrap).forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); }); });
  }

  function metricsHTML(metrics) {
    if (!metrics || !metrics.length) return "";
    return (
      '<div class="case__metrics">' +
      metrics.map(function (m) {
        return (
          '<div class="metric-card">' +
          '<div class="metric-card__value">' + esc(m.value) + "</div>" +
          '<p class="metric-card__label">' + esc(m.label).replace(/\n/g, "<br>") + "</p>" +
          "</div>"
        );
      }).join("") +
      "</div>"
    );
  }

  function initSliders() {
    $$("[data-slider]").forEach(function (s) {
      var track = $(".case__track", s);
      var dots = $$(".slider-dot", s);
      var prev = $(".slider-btn--prev", s);
      var next = $(".slider-btn--next", s);
      function idx() { return Math.round(track.scrollLeft / track.clientWidth); }
      function go(n) {
        n = Math.max(0, Math.min(2, n));
        track.scrollTo({ left: n * track.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
      }
      function sync() {
        var i = idx();
        dots.forEach(function (d, k) { d.classList.toggle("is-on", k === i); });
        prev.disabled = i === 0;
        next.disabled = i === 2;
        s.setAttribute("data-slide", i);
      }
      dots.forEach(function (d, k) { d.addEventListener("click", function () { go(k); }); });
      prev.addEventListener("click", function () { go(idx() - 1); });
      next.addEventListener("click", function () { go(idx() + 1); });
      track.addEventListener("scroll", function () { window.requestAnimationFrame(sync); }, { passive: true });
      track.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight") { e.preventDefault(); go(idx() + 1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); go(idx() - 1); }
      });
      sync();
    });
  }

  /* ---------------- communication screens ---------------- */
  function renderComms() {
    var screen = T().ui.screen;
    var out = "";
    // collage: [left %, top %, width %, aspect, tone, z]; the phone sits in the middle on top
    var shapes = [
      [0, 0, 30, "4 / 5", "var(--cream-2)", 1],
      [64, 3, 36, "4 / 3", "var(--sand)", 1],
      [34, 14, 16, "9 / 18", "var(--rose-soft)", 4],
      [0, 36, 39, "16 / 11", "var(--sand)", 2],
      [62, 28, 32, "3 / 4", "var(--cream-2)", 2],
      [44, 62, 48, "16 / 10", "var(--sand)", 3],
      [6, 60, 42, "4 / 3", "var(--cream-2)", 3],
    ];
    shapes.forEach(function (s, i) {
      out += '<div class="shot' + (i === 2 ? " shot--phone" : "") + '" style="--l:' + s[0] + "%;--t:" + s[1] + "%;--w:" + s[2] + "%;--ar:" + s[3] +
        ";--tone:" + s[4] + ";--z:" + s[5] + '">' +
        '<span class="shot__label">' + esc(screen) + "</span></div>";
    });
    $("[data-comms]").innerHTML = out;
    initCollageDrag($("[data-comms]"));
  }

  var collageZ = 10;
  function initCollageDrag(box) {
    var narrow = window.matchMedia("(max-width: 640px)");
    $$(".shot", box).forEach(function (el) {
      el.addEventListener("pointerdown", function (e) {
        if (narrow.matches || e.button !== 0) return;
        e.preventDefault();
        var r = box.getBoundingClientRect();
        var sx = e.clientX;
        var sy = e.clientY;
        var l0 = el.offsetLeft;
        var t0 = el.offsetTop;
        el.style.zIndex = String(++collageZ);
        el.classList.add("is-dragging");
        el.setPointerCapture(e.pointerId);
        function move(ev) {
          var l = Math.max(-el.offsetWidth * 0.3, Math.min(r.width - el.offsetWidth * 0.7, l0 + ev.clientX - sx));
          var t = Math.max(0, Math.min(r.height - el.offsetHeight * 0.3, t0 + ev.clientY - sy));
          el.style.setProperty("--l", (l / r.width) * 100 + "%");
          el.style.setProperty("--t", (t / r.height) * 100 + "%");
        }
        function up(ev) {
          el.classList.remove("is-dragging");
          el.releasePointerCapture(ev.pointerId);
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerup", up);
          el.removeEventListener("pointercancel", up);
        }
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerup", up);
        el.addEventListener("pointercancel", up);
      });
    });
  }

  /* ---------------- traits ---------------- */
  function renderTraits() {
    var items = T().about.traits;
    $("[data-traits]").innerHTML = items.map(function (it) {
      return (
        '<article class="trait reveal">' +
        '<h3 class="trait__title">' + esc(it.title) + "</h3>" +
        '<p class="trait__text">' + (it.html ? typoHtml(it.text) : esc(it.text)) + "</p>" +
        "</article>"
      );
    }).join("");
  }

  /* ---------------- designer simulator (pixel mini-game, sim.js) ---------------- */
  function typoBag(obj) {
    var out = {};
    Object.keys(obj).forEach(function (k) { out[k] = typeof obj[k] === "string" ? typo(obj[k]) : obj[k]; });
    return out;
  }
  function renderSim() {
    var root = $("[data-sim]");
    if (root && window.DesignerSim) window.DesignerSim.mount(root, typoBag(T().sim));
  }

  /* ---------------- CV: master/detail instead of an accordion ---------------- */
  var RE_METRIC = {
    ru: /(\+\d+(?:\s?п\.п\.)?|\d+\+|\d+(?:[–-]\d+)?\s?(?:п\.п\.|%|тыс\.)|в\s\d\sраза?)/g,
    en: /(\+\d+(?:\s?pp)?|\d+\+|\d+(?:[–-]\d+)?k|\d+(?:[–-]\d+)?\s?pp|\d+x)/g,
  };
  function highlight(text) {
    return esc(text).replace(RE_METRIC[lang], '<mark class="metric">$1</mark>');
  }
  function detailHTML(job) {
    return job.sections.map(function (s, i) {
      return '<section class="cv-sec"><h4 class="cv-sec__title">' + esc(s.title) + '</h4><p class="cv-sec__text">' +
        (i === 1 ? highlight(s.text) : esc(s.text)) + "</p></section>";
    }).join("");
  }
  var cvActive = 0;
  function renderCV() {
    var jobs = T().about.cv;
    var root = $("[data-cv]");
    var list = jobs.map(function (j, i) {
      var on = i === cvActive;
      return (
        '<div class="cv-item' + (on ? " is-on" : "") + '" data-cv-item="' + i + '">' +
        '<button type="button" class="cv-btn" role="tab" id="cv-tab-' + i + '" aria-selected="' + on + '" aria-controls="cv-panel" tabindex="' + (on ? 0 : -1) + '" data-cv-tab="' + i + '">' +
          '<span class="cv-btn__main">' +
            '<span class="cv-btn__role">' + esc(j.role) + "</span>" +
            '<span class="cv-btn__company">' + esc(j.company) + "</span>" +
            '<span class="cv-btn__sum">' + esc(j.summary) + "</span>" +
          "</span>" +
          '<span class="cv-btn__mark" aria-hidden="true">' + PI.glyph("plus") + "</span>" +
        "</button>" +
        '<div class="cv-inline" role="region" aria-labelledby="cv-tab-' + i + '">' + detailHTML(j) + "</div>" +
        "</div>"
      );
    }).join("");
    root.innerHTML =
      '<div class="cv__list" role="tablist" aria-orientation="vertical" aria-label="' + esc(T().ui.cvLabel) + '">' + list + "</div>" +
      '<div class="cv__panel" id="cv-panel" role="tabpanel" aria-labelledby="cv-tab-' + cvActive + '" tabindex="0" data-cv-panel></div>';
    paintPanel();
    $$("[data-cv-tab]", root).forEach(function (b) {
      b.addEventListener("click", function () { selectJob(+b.getAttribute("data-cv-tab"), false); });
      b.addEventListener("keydown", function (e) {
        var n = jobs.length, i = +b.getAttribute("data-cv-tab"), to = null;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") to = (i + 1) % n;
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") to = (i - 1 + n) % n;
        if (e.key === "Home") to = 0;
        if (e.key === "End") to = n - 1;
        if (to !== null) { e.preventDefault(); selectJob(to, true); }
      });
    });
  }
  function paintPanel() {
    var job = T().about.cv[cvActive];
    var panel = $("[data-cv-panel]");
    if (!panel) return;
    panel.setAttribute("aria-labelledby", "cv-tab-" + cvActive);
    panel.innerHTML =
      '<div class="cv-panel__head"><span class="cv-panel__company">' + esc(job.company) + '</span><span class="cv-panel__role">' + esc(job.role) + "</span></div>" +
      '<div class="cv-panel__body">' + detailHTML(job) + "</div>";
    panel.classList.remove("is-swap");
    void panel.offsetWidth;
    panel.classList.add("is-swap");
  }
  function selectJob(i, focus) {
    cvActive = i;
    $$("[data-cv-item]").forEach(function (el) {
      var on = +el.getAttribute("data-cv-item") === i;
      el.classList.toggle("is-on", on);
      var b = $("[data-cv-tab]", el);
      b.setAttribute("aria-selected", on ? "true" : "false");
      b.setAttribute("tabindex", on ? "0" : "-1");
      if (on && focus) b.focus();
    });
    paintPanel();
  }

  /* ---------------- achievements ---------------- */
  function awardChips(text) {
    return '<ul class="ach-item__chips">' + text.split(/\),\s*/).map(function (s) {
      var m = s.replace(/\)$/, "").split(" (");
      return "<li><b>" + esc(m[0]) + "</b>" + (m[1] ? "<span>" + esc(m[1]) + "</span>" : "") + "</li>";
    }).join("") + "</ul>";
  }
  function renderAchievements() {
    $("[data-achievements]").innerHTML = T().about.achievements.map(function (a, i) {
      return (
        '<article class="ach-item reveal">' +
        '<h3 class="ach-item__title">' + esc(a.title) + "</h3>" +
        (i === 0 ? awardChips(a.text) : '<p class="ach-item__text">' + esc(a.text) + "</p>") +
        "</article>"
      );
    }).join("");
  }

  /* ---------------- contacts (footer) ---------------- */
  function renderContacts() {
    var t = T().contacts;
    $("[data-contacts-bubble]").textContent = typo(t.bubble);
    $("[data-contacts]").innerHTML = t.items.map(function (c) {
      var ext = /^https?:/.test(c.href) ? ' target="_blank" rel="noopener"' : "";
      return (
        '<li><a class="contact" href="' + esc(c.href) + '"' + ext + ">" +
        '<span class="contact__kind">' + esc(c.kind) + "</span>" +
        '<span class="contact__val">' + esc(c.value) + "</span>" +
        "</a></li>"
      );
    }).join("");
  }

  /* ---------------- nav ---------------- */
  function initNav() {
    var bar = $("[data-topbar]");
    var burger = $("[data-burger]");
    var nav = $("[data-nav]");
    function onScroll() { bar.classList.toggle("is-stuck", window.scrollY > 8); }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    burger.addEventListener("click", function () {
      var open = bar.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$("a", nav).forEach(function (a) {
      a.addEventListener("click", function () { bar.classList.remove("is-open"); burger.setAttribute("aria-expanded", "false"); });
    });
    if (!("IntersectionObserver" in window)) return;
    var map = { cases: "cases", about: "about", experience: "experience", achievements: "awards", contacts: "contacts" };
    var links = {};
    $$("[data-nav-link]").forEach(function (a) { links[a.getAttribute("data-nav-link")] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        Object.keys(links).forEach(function (k) { links[k].removeAttribute("aria-current"); });
        var l = links[map[en.target.id]];
        if (l) l.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
    // the footer is short: highlight "contacts" once the page is scrolled to the bottom
    window.addEventListener("scroll", function () {
      if (window.innerHeight + window.scrollY < document.documentElement.scrollHeight - 6) return;
      Object.keys(links).forEach(function (k) { links[k].removeAttribute("aria-current"); });
      if (links.contacts) links.contacts.setAttribute("aria-current", "true");
    }, { passive: true });
  }

  /* ---------------- reveal on scroll ---------------- */
  function initReveal() {
    var els = $$(".reveal:not(.is-in)");
    if (!("IntersectionObserver" in window) || reduceMotion) { els.forEach(function (e) { e.classList.add("is-in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    els.forEach(function (e, i) { e.style.setProperty("--i", String(i % 6)); io.observe(e); });
  }

  /* ---------------- language ---------------- */
  function renderAll() {
    applyStatic();
    renderCases();
    renderComms();
    renderTraits();
    renderSim();
    renderCV();
    renderAchievements();
    renderContacts();
    hydrateIcons(document);
    initReveal();
  }
  function setLang(l) {
    lang = l === "en" ? "en" : "ru";
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    renderAll();
  }
  $$("[data-lang]").forEach(function (b) { b.addEventListener("click", function () { setLang(b.getAttribute("data-lang")); }); });

  if (/[?&]grid\b/.test(location.search)) document.documentElement.classList.add("show-grid");
  var dashaSprite = $("[data-dasha-sprite]");
  if (dashaSprite) dashaSprite.innerHTML = PI.sprite("dasha");
  var catSprite = $("[data-cat-sprite]");
  if (catSprite) catSprite.innerHTML = PI.sprite("cat");
  PI.installCursors();
  initNav();
  renderAll();
})();
