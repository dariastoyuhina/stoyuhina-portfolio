(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (reduce || coarse) return;

  document.documentElement.classList.add("has-custom-cursor");

  const cursor = document.createElement("div");
  cursor.className = "custom-cursor";
  cursor.innerHTML = `
    <span class="custom-cursor__core"></span>
    <span class="custom-cursor__ring"></span>
  `;
  document.body.appendChild(cursor);

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let rx = x;
  let ry = y;
  let hovering = false;

  window.addEventListener(
    "mousemove",
    (e) => {
      x = e.clientX;
      y = e.clientY;
      cursor.classList.add("is-visible");
    },
    { passive: true }
  );

  document.addEventListener("mouseleave", () => {
    cursor.classList.remove("is-visible");
  });

  const hoverSelector =
    "a, button, .case-cta, .trait-card, .cv-item__head, .slider-dot, .lang-btn, .nav-link, .nav-pill";
  document.addEventListener(
    "mouseover",
    (e) => {
      if (e.target.closest(hoverSelector)) {
        hovering = true;
        cursor.classList.add("is-hover");
      }
    },
    true
  );
  document.addEventListener(
    "mouseout",
    (e) => {
      if (e.target.closest(hoverSelector)) {
        hovering = false;
        cursor.classList.remove("is-hover");
      }
    },
    true
  );

  function tick() {
    rx += (x - rx) * 0.22;
    ry += (y - ry) * 0.22;
    cursor.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    requestAnimationFrame(tick);
  }
  tick();
})();
