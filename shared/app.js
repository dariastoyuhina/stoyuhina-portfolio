(function () {
  const root = document.documentElement;
  let lang = localStorage.getItem("dasha-lang") || "ru";

  function t() {
    return window.PORTFOLIO_I18N[lang];
  }

  function setLang(next) {
    lang = next;
    localStorage.setItem("dasha-lang", lang);
    root.lang = lang;
    document.querySelectorAll("[data-lang]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.lang === lang);
      btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang));
    });
    render();
  }

  function el(html) {
    const tpl = document.createElement("template");
    tpl.innerHTML = html.trim();
    return tpl.content.firstElementChild;
  }

  const IMAGE_ICON = `<svg class="ph-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <rect x="6" y="12" width="36" height="26" rx="2" stroke="currentColor" stroke-width="2" />
    <path d="M6 32l10-8 8 6 6-5 12 9" stroke="currentColor" stroke-width="2" fill="none" />
    <circle cx="16" cy="20" r="3" stroke="currentColor" stroke-width="2" />
  </svg>`;

  function renderNav() {
    const d = t();
    const map = {
      "[data-i18n='nav.cases']": d.nav.cases,
      "[data-i18n='nav.comms']": d.nav.comms,
      "[data-i18n='nav.about']": d.nav.about,
      "[data-i18n='nav.contact']": d.nav.contact,
      "[data-i18n='hero.cta']": d.hero.cta,
      "[data-i18n='cases.title']": d.cases.title,
      "[data-i18n='about.traitsTitle']": d.about.traitsTitle,
      "[data-i18n='about.intro']": d.about.intro,
      "[data-i18n='about.cvTitle']": d.about.cvTitle,
      "[data-i18n='about.achievementsTitle']": d.about.achievementsTitle,
      "[data-i18n='footer.gamification']": d.footer.gamification,
    };
    Object.entries(map).forEach(([sel, val]) => {
      document.querySelectorAll(sel).forEach((node) => {
        if (val != null) node.textContent = val;
      });
    });

    const name = document.querySelector("[data-i18n='hero.name']");
    if (name) name.textContent = d.hero.name;
    const role = document.querySelector("[data-i18n='hero.role']");
    if (role) role.innerHTML = d.hero.role;
    const lead = document.querySelector("[data-i18n='hero.lead']");
    if (lead) lead.textContent = d.hero.lead;
  }

  function caseVisual(_id, index) {
    const gaming = document.body.dataset.theme === "gaming";
    if (!gaming) {
      return `<div class="case-ph case-ph--${index + 1}" aria-hidden="true">${IMAGE_ICON}</div>`;
    }

    const palettes = {
      mobile: ["#D18E9F", "#C45C7A", "#F7EFE4", "#4B3621"],
      yandex: ["#4B3621", "#C45C7A", "#E8C4CF", "#F7EFE4"],
      helpy: ["#C45C7A", "#D18E9F", "#F7EFE4", "#A84D6A"],
      grandtour: ["#4B3621", "#E8C4CF", "#D18E9F", "#F7EFE4"],
    };
    const p = palettes[_id] || palettes.mobile;
    if (index === 0) {
      return `<div class="case-anim" aria-hidden="true">
        <div class="case-anim__layer case-anim__layer--a" style="--c:${p[0]}"></div>
        <div class="case-anim__layer case-anim__layer--b" style="--c:${p[1]}"></div>
      </div>`;
    }
    return `<div class="case-shot" style="--a:${p[0]};--b:${p[index]}"></div>`;
  }

  function renderCases() {
    const mount = document.querySelector("[data-cases]");
    if (!mount) return;
    const d = t();
    mount.innerHTML = "";
    d.cases.items.forEach((item, idx) => {
      const card = el(`
        <article class="case" data-case="${item.id}" style="--i:${idx}">
          <div class="case__media">
            <div class="case-slider" data-slider>
              <div class="case-slider__track">
                ${[0, 1, 2]
                  .map(
                    (i) =>
                      `<div class="case-slider__slide ${i === 0 ? "is-active" : ""}" data-slide="${i}">${caseVisual(
                        item.id,
                        i
                      )}</div>`
                  )
                  .join("")}
              </div>
              <div class="case-slider__dots">
                ${[0, 1, 2]
                  .map(
                    (i) =>
                      `<button class="slider-dot ${i === 0 ? "is-active" : ""}" type="button" data-dot="${i}" aria-label="Slide ${i + 1}"></button>`
                  )
                  .join("")}
              </div>
            </div>
          </div>
          <div class="case__body">
            <p class="case__name">${item.name}</p>
            <h3 class="case__title">${item.title}</h3>
            <a class="case-cta" href="#case-${item.id}" aria-disabled="true">
              <span>${d.cases.open}</span>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M4 9h10M10 5l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
          </div>
        </article>
      `);
      mount.appendChild(card);
    });
    initSliders();
  }

  const sliderTimers = new WeakMap();

  function initSliders() {
    document.querySelectorAll("[data-slider]").forEach((slider) => {
      if (slider.dataset.ready) return;
      slider.dataset.ready = "1";
      let index = 0;
      const slides = [...slider.querySelectorAll("[data-slide]")];
      const dots = [...slider.querySelectorAll("[data-dot]")];

      function go(i) {
        index = (i + slides.length) % slides.length;
        slides.forEach((s, n) => s.classList.toggle("is-active", n === index));
        dots.forEach((dot, n) => dot.classList.toggle("is-active", n === index));
      }

      dots.forEach((dot) => {
        dot.addEventListener("click", () => go(Number(dot.dataset.dot)));
      });

      let timer = setInterval(() => go(index + 1), 4200);
      sliderTimers.set(slider, timer);
      slider.addEventListener("mouseenter", () => {
        clearInterval(sliderTimers.get(slider));
      });
      slider.addEventListener("mouseleave", () => {
        clearInterval(sliderTimers.get(slider));
        timer = setInterval(() => go(index + 1), 4200);
        sliderTimers.set(slider, timer);
      });
    });
  }

  function renderTraits() {
    const mount = document.querySelector("[data-traits]");
    if (!mount) return;
    const d = t();
    mount.innerHTML = d.about.traits
      .map(
        (trait) => `
      <article class="trait-card">
        <h3>${trait.title}</h3>
        <p>${trait.html ? trait.text : trait.text}</p>
      </article>`
      )
      .join("");
  }

  function renderCV() {
    const mount = document.querySelector("[data-cv]");
    if (!mount) return;
    const d = t();
    mount.innerHTML = d.about.cv
      .map(
        (item) => `
      <div class="cv-item">
        <button class="cv-item__head" type="button" aria-expanded="false">
          <div>
            <p class="cv-item__role">${item.role} / ${item.company}</p>
            <p class="cv-item__summary">${item.summary}</p>
          </div>
          <span class="cv-item__icon" aria-hidden="true"></span>
        </button>
        <div class="cv-item__panel">
          <div>
            ${(item.sections || [])
              .map(
                (section) => `
              <div class="cv-section">
                <h4>+ ${section.title}:</h4>
                <p>${section.text}</p>
              </div>`
              )
              .join("")}
          </div>
        </div>
      </div>`
      )
      .join("");

    mount.querySelectorAll(".cv-item__head").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = btn.closest(".cv-item");
        const open = item.classList.contains("is-open");
        mount.querySelectorAll(".cv-item").forEach((node) => {
          node.classList.remove("is-open");
          node.querySelector(".cv-item__head").setAttribute("aria-expanded", "false");
        });
        if (!open) {
          item.classList.add("is-open");
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  function renderAchievements() {
    const mount = document.querySelector("[data-achievements]");
    if (!mount) return;
    const d = t();
    mount.innerHTML = (d.about.achievements || [])
      .map(
        (item) => `
      <div class="achievement-item">
        <h4>${item.title}</h4>
        <p>${item.text}</p>
      </div>`
      )
      .join("");
  }

  function renderFooter() {
    const mount = document.querySelector("[data-footer-contacts]");
    if (!mount) return;
    const d = t();
    mount.innerHTML = (d.footer.contacts || [])
      .map(
        (item) =>
          `<li><a href="${item.href}" target="_blank" rel="noopener">${item.label}</a></li>`
      )
      .join("");
  }

  function render() {
    renderNav();
    renderCases();
    renderTraits();
    renderCV();
    renderAchievements();
    renderFooter();
  }

  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });

  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  setLang(lang);
})();
