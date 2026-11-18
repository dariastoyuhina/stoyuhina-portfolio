/* "Один день дизайнера": a pixel mini game set in Dasha's room, in the site palette.
   Tap the floor to walk, catch ideas and coffee, close client edits before they burn,
   and ship the layout before the mood runs out. */
(function () {
  "use strict";

  var PI = window.PixelIcons;
  var PAL = PI.PALETTE;
  var SPR = PI.SPRITES;
  var LOGICAL_H = 110;
  var MAX_MOOD = 5;
  var SPAWN_MIN = 14;
  var SPAWN_MAX = 44;

  var ITEMS = {
    idea: { sprite: "idea", life: 9, weight: 38 },
    bug: { sprite: "note", life: 10, weight: 24 },
    coffee: { sprite: "coffee", life: 9, weight: 16 },
    like: { sprite: "chat", life: 9, weight: 22 },
  };

  var CLOUD = [
    "....wwww......",
    "..wwwwwwww.ww.",
    ".wwwwwwwwwwwww",
    "wwwwwwwwwwwwww",
    ".ssssssssssss.",
  ];

  function bake(rows, flip, palette) {
    var h = rows.length;
    var w = rows[0].length;
    var c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    var x = c.getContext("2d");
    for (var j = 0; j < h; j++) {
      for (var i = 0; i < w; i++) {
        var col = (palette || PAL)[rows[j][flip ? w - 1 - i : i]];
        if (!col) continue;
        x.fillStyle = col;
        x.fillRect(i, j, 1, 1);
      }
    }
    return c;
  }

  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  var G = null;

  function mount(root, texts) {
    if (G) return setTexts(texts);
    root.innerHTML = "";
    var box = el("div", "sim");
    var canvas = el("canvas", "sim__canvas");
    canvas.setAttribute("tabindex", "0");
    var hud = el("div", "sim__hud");
    var tag = el("span", "sim__tag");
    var mood = el("div", "sim__stat");
    var moodK = el("span", "sim__k");
    var hearts = el("span", "sim__hearts");
    for (var i = 0; i < MAX_MOOD; i++) hearts.appendChild(el("span", "sim__heart", PI.glyph("heart")));
    mood.appendChild(moodK);
    mood.appendChild(hearts);
    var prog = el("div", "sim__stat");
    var progK = el("span", "sim__k");
    var bar = el("span", "sim__bar", "<i></i>");
    var progV = el("span", "sim__v", "0%");
    prog.appendChild(progK);
    prog.appendChild(bar);
    prog.appendChild(progV);
    hud.appendChild(tag);
    hud.appendChild(mood);
    hud.appendChild(prog);
    var pops = el("div", "sim__pops");
    var overlay = el("div", "sim__overlay");
    var card = el("div", "sim__card");
    var title = el("h3", "sim__title");
    var text = el("p", "sim__text");
    var go = el("button", "btn btn--primary sim__go");
    go.type = "button";
    card.appendChild(title);
    card.appendChild(text);
    card.appendChild(go);
    overlay.appendChild(card);
    box.appendChild(canvas);
    box.appendChild(hud);
    box.appendChild(pops);
    box.appendChild(overlay);
    root.appendChild(box);

    var r = rng(7);
    G = {
      root: root,
      box: box,
      canvas: canvas,
      ctx: canvas.getContext("2d"),
      ui: { tag: tag, moodK: moodK, hearts: hearts, progK: progK, bar: bar.firstChild, progV: progV, pops: pops, overlay: overlay, title: title, text: text, go: go },
      t: texts,
      mode: "intro",
      W: 320,
      H: LOGICAL_H,
      scale: 3,
      time: 0,
      playTime: 0,
      spawnIn: 0.6,
      items: [],
      keys: {},
      sprites: {
        dasha: bake(SPR.dasha),
        dashaWalk: bake(SPR.dashaWalk),
        dashaL: bake(SPR.dasha, true),
        dashaWalkL: bake(SPR.dashaWalk, true),
        cat: bake(SPR.cat),
        catL: bake(SPR.cat, true),
        idea: bake(ITEM_SPR.idea, false, ITEM_PAL),
        note: bake(ITEM_SPR.note, false, ITEM_PAL),
        coffee: bake(ITEM_SPR.coffee, false, ITEM_PAL),
        chat: bake(ITEM_SPR.chat, false, ITEM_PAL),
        cloud: bake(CLOUD, false, { w: "#ffffff", s: "#e6f0f4" }),
      },
      clouds: [0, 1, 2, 3, 4].map(function (i) { return { x: r() * 600, y: 4 + Math.round(r() * 18), v: 3 + r() * 4, s: 1 + (i % 2) }; }),
      decor: [],
      p: { x: 0, y: 0, tx: 0, ty: 0, face: 1, moving: false, walkT: 0 },
      cat: { x: 0, y: 0, face: 1 },
      running: false,
      visible: true,
      last: 0,
    };

    canvas.addEventListener("pointerdown", onPointer);
    canvas.addEventListener("keydown", onKey);
    canvas.addEventListener("keyup", function (e) { G.keys[e.key] = false; });
    go.addEventListener("click", start);
    window.addEventListener("resize", resize);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        G.visible = en[0].isIntersecting;
        if (G.visible) loop();
      }, { threshold: 0.05 }).observe(box);
    }
    resize();
    reset();
    setTexts(texts);
    showOverlay("intro");
    loop();
  }

  function setTexts(texts) {
    if (!G) return;
    G.t = texts;
    G.ui.tag.textContent = texts.label;
    G.ui.moodK.textContent = texts.mood;
    G.ui.progK.textContent = texts.layout;
    G.box.setAttribute("aria-label", texts.label);
    G.canvas.setAttribute("aria-label", texts.rules);
    if (G.mode !== "play") showOverlay(G.mode);
  }

  function resize() {
    var cw = G.box.clientWidth || 320;
    var scale = cw >= 1100 ? 4 : cw >= 700 ? 3 : 2;
    G.scale = scale;
    G.W = Math.ceil(cw / scale);
    G.H = LOGICAL_H;
    G.canvas.width = G.W;
    G.canvas.height = G.H;
    G.canvas.style.width = G.W * scale + "px";
    G.canvas.style.height = G.H * scale + "px";
    G.box.style.height = G.H * scale + "px";
    G.ctx.imageSmoothingEnabled = false;
    G.groundTop = Math.round(G.H * 0.42);
    var W = G.W;
    var gt = G.groundTop;
    var wide = W >= 300;
    G.desk = { x: Math.max(26, Math.round(W * 0.1)), y: gt + 20 };
    G.chair = { x: G.desk.x + 25, y: gt + 21 };
    G.win = { x: Math.round(W * 0.5) - 26, y: 7, w: 52, h: 24 };
    G.poster = wide ? { x: Math.round(W * 0.27) - 10, y: 8 } : null;
    G.clock = wide ? { x: Math.round(W * 0.37), y: 12 } : null;
    G.shelf = { x: Math.min(W - 46, Math.round(W * 0.7)), y: 22 };
    G.lamp = wide ? { x: Math.round(W * 0.64), y: gt + 14 } : null;
    G.sofa = wide ? { x: Math.round(W * 0.77), y: gt + 15, w: 52 } : null;
    G.side = wide ? { x: Math.round(W * 0.77) - 12, y: gt + 15 } : null;
    G.catbed = wide ? { x: Math.round(W * 0.3), y: gt + 16 } : null;
    G.plant = { x: W - 13, y: gt + 16 };
    G.rug = { x: Math.round(W * 0.4), y: gt + 26, w: Math.max(60, Math.round(W * 0.26)), h: 20 };
    clampPlayer();
    draw();
  }

  function walkBounds() {
    return { x0: 8, x1: G.W - 8, y0: G.groundTop + 12, y1: G.H - 3 };
  }

  function clampPlayer() {
    var b = walkBounds();
    var p = G.p;
    p.x = Math.max(b.x0, Math.min(b.x1, p.x || G.W * 0.5));
    p.y = Math.max(b.y0, Math.min(b.y1, p.y || (b.y0 + b.y1) / 2));
    p.tx = Math.max(b.x0, Math.min(b.x1, p.tx || p.x));
    p.ty = Math.max(b.y0, Math.min(b.y1, p.ty || p.y));
  }

  function reset() {
    var b = walkBounds();
    G.mood = 4;
    G.progress = 0;
    G.items = [];
    G.playTime = 0;
    G.spawnIn = 0.6;
    G.p.x = G.p.tx = Math.round(G.W * 0.5);
    G.p.y = G.p.ty = Math.round((b.y0 + b.y1) / 2);
    G.cat.x = G.p.x - 14;
    G.cat.y = G.p.y + 2;
    paintHud();
  }

  function start() {
    reset();
    G.mode = "play";
    G.ui.overlay.hidden = true;
    G.box.classList.add("is-playing");
    try { G.canvas.focus({ preventScroll: true }); } catch (e) {}
    loop();
  }

  function showOverlay(mode) {
    var t = G.t;
    G.mode = mode;
    G.box.classList.remove("is-playing");
    G.ui.overlay.hidden = false;
    if (mode === "win") {
      G.ui.title.textContent = t.winTitle;
      G.ui.text.textContent = t.win.replace("{t}", String(Math.round(G.playTime)));
      G.ui.go.textContent = t.again;
    } else if (mode === "lose") {
      G.ui.title.textContent = t.loseTitle;
      G.ui.text.textContent = t.lose;
      G.ui.go.textContent = t.again;
    } else {
      G.ui.title.textContent = t.title;
      G.ui.text.textContent = t.rules;
      G.ui.go.textContent = t.start;
    }
  }

  function toLogical(e) {
    var rect = G.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * G.W,
      y: ((e.clientY - rect.top) / rect.height) * G.H,
    };
  }

  function onPointer(e) {
    if (G.mode !== "play") return;
    e.preventDefault();
    var q = toLogical(e);
    var best = null;
    var bestD = 14;
    G.items.forEach(function (it) {
      var d = Math.hypot(it.x - q.x, it.y - 4 - q.y);
      if (d < bestD) { bestD = d; best = it; }
    });
    var b = walkBounds();
    var tx = best ? best.x : q.x;
    var ty = best ? best.y : q.y + 6;
    G.p.tx = Math.max(b.x0, Math.min(b.x1, tx));
    G.p.ty = Math.max(b.y0, Math.min(b.y1, ty));
    G.marker = { x: G.p.tx, y: G.p.ty, t: 0.5 };
  }

  function onKey(e) {
    var k = e.key;
    var dirs = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, a: 1, d: 1, w: 1, s: 1 };
    if ((k === "Enter" || k === " ") && G.mode !== "play") { e.preventDefault(); start(); return; }
    if (!dirs[k] || G.mode !== "play") return;
    e.preventDefault();
    G.keys[k] = true;
  }

  function spawn() {
    if (G.items.length >= 5) return;
    var total = 0;
    var kinds = Object.keys(ITEMS);
    kinds.forEach(function (k) { total += ITEMS[k].weight; });
    var roll = Math.random() * total;
    var kind = kinds[0];
    for (var i = 0; i < kinds.length; i++) {
      roll -= ITEMS[kinds[i]].weight;
      if (roll <= 0) { kind = kinds[i]; break; }
    }
    if (G.playTime < 1.5) kind = "idea";
    var b = walkBounds();
    var x;
    var y;
    var tries = 0;
    do {
      var a = Math.random() * Math.PI * 2;
      var d = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
      x = Math.max(b.x0 + 6, Math.min(b.x1 - 6, G.p.x + Math.cos(a) * d));
      y = Math.max(b.y0 + 4, Math.min(b.y1, G.p.y + Math.sin(a) * d * 0.6));
      tries++;
    } while (tries < 16 && (x < G.chair.x + 10 && y < G.desk.y + 6 || Math.hypot(x - G.p.x, y - G.p.y) < SPAWN_MIN - 2 ||
      G.items.some(function (o) { return Math.hypot(o.x - x, o.y - y) < 10; })));
    G.items.push({ kind: kind, x: Math.round(x), y: Math.round(y), life: ITEMS[kind].life, phase: Math.random() * 6 });
  }

  function pop(text, x, y, kind) {
    var n = el("span", "sim__pop sim__pop--" + kind);
    n.textContent = text;
    n.style.left = (x / G.W) * 100 + "%";
    n.style.top = ((y - 26) / G.H) * 100 + "%";
    G.ui.pops.appendChild(n);
    setTimeout(function () { n.remove(); }, 1100);
  }

  function collect(it) {
    var t = G.t;
    if (it.kind === "idea") { G.progress += 14; pop(t.idea, it.x, it.y, "good"); }
    if (it.kind === "bug") { G.progress += 7; pop(t.fix, it.x, it.y, "good"); }
    if (it.kind === "coffee") { G.mood = Math.min(MAX_MOOD, G.mood + 1); pop(t.coffee, it.x, it.y, "love"); }
    if (it.kind === "like") { G.mood = Math.min(MAX_MOOD, G.mood + 1); G.progress += 4; pop(t.like, it.x, it.y, "love"); }
    G.progress = Math.min(100, G.progress);
    paintHud();
    if (G.progress >= 100) showOverlay("win");
  }

  function update(dt) {
    G.time += dt;
    G.clouds.forEach(function (c) { c.x += c.v * dt; });
    if (G.marker) { G.marker.t -= dt; if (G.marker.t <= 0) G.marker = null; }
    var p = G.p;
    if (G.mode === "play") {
      G.playTime += dt;
      var kx = (G.keys.ArrowRight || G.keys.d ? 1 : 0) - (G.keys.ArrowLeft || G.keys.a ? 1 : 0);
      var ky = (G.keys.ArrowDown || G.keys.s ? 1 : 0) - (G.keys.ArrowUp || G.keys.w ? 1 : 0);
      if (kx || ky) {
        var b = walkBounds();
        p.tx = Math.max(b.x0, Math.min(b.x1, p.x + kx * 10));
        p.ty = Math.max(b.y0, Math.min(b.y1, p.y + ky * 10));
      }
      G.spawnIn -= dt;
      if (G.spawnIn <= 0) {
        spawn();
        G.spawnIn = Math.max(0.75, 1.5 - G.progress * 0.007);
      }
      for (var i = G.items.length - 1; i >= 0; i--) {
        var it = G.items[i];
        it.life -= dt;
        if (Math.abs(it.x - p.x) < 9 && Math.abs(it.y - p.y) < 7) {
          G.items.splice(i, 1);
          collect(it);
          if (G.mode !== "play") return;
          continue;
        }
        if (it.life <= 0) {
          G.items.splice(i, 1);
          if (it.kind === "bug") {
            G.mood -= 1;
            pop(G.t.burn, it.x, it.y, "bad");
            paintHud();
            if (G.mood <= 0) { showOverlay("lose"); return; }
          }
        }
      }
    }
    var dx = p.tx - p.x;
    var dy = p.ty - p.y;
    var dist = Math.hypot(dx, dy);
    var speed = 42 + G.mood * 8;
    p.moving = dist > 0.6;
    if (p.moving) {
      var step = Math.min(dist, speed * dt);
      p.x += (dx / dist) * step;
      p.y += (dy / dist) * step;
      if (Math.abs(dx) > 0.5) p.face = dx > 0 ? 1 : -1;
      p.walkT += dt;
    } else {
      p.walkT = 0;
    }
    var c = G.cat;
    var cx = p.x - 15 * p.face;
    var cy = p.y + 3;
    var cdx = cx - c.x;
    var cdy = cy - c.y;
    var cd = Math.hypot(cdx, cdy);
    if (cd > 2) {
      var cs = Math.min(cd, (speed * 0.95) * dt);
      c.x += (cdx / cd) * cs;
      c.y += (cdy / cd) * cs;
      if (Math.abs(cdx) > 0.5) c.face = cdx > 0 ? 1 : -1;
    }
  }

  function paintHud() {
    var hs = G.ui.hearts.children;
    for (var i = 0; i < hs.length; i++) hs[i].classList.toggle("is-off", i >= G.mood);
    G.ui.bar.style.width = G.progress + "%";
    G.ui.progV.textContent = Math.round(G.progress) + "%";
  }

  /* ---------------- drawing ---------------- */
  function rect(x, y, w, h, c) {
    G.ctx.fillStyle = c;
    G.ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }

  /* ---------------- the room: site colours ---------------- */
  /* muted on purpose: soft pastels, burgundy only as a quiet accent */
  var C = {
    wall: "#f8f5e8", paper: "#f0e7dd", panel: "#dfeae2", rail: "#cfddd4", base: "#b07c7d",
    floor: "#f2e3e3", plank: "#e8d2d4", plankHi: "#f8eeee",
    ink: "#6e3a3b", tile: "#9c6264", tileHi: "#b57e7f", screen: "#4a2c2e",
    rose: "#f1d8e0", roseD: "#e6c6d1", pink: "#ecd6d7", cream: "#faf6ea",
    tiffany: "#dbe9e0", tiffanyD: "#c6dacd", jade: "#95c2b2", jadeL: "#b9d9cc",
    sky: "#dcebf0", skyHi: "#ebf4f5", mount: "#c0cad8", mountD: "#adb9ca", snow: "#ffffff", grass: "#c3dac9",
    butter: "#f4e4ad", coffee: "#cfab98",
  };

  var ITEM_PAL = { o: C.ink, y: C.butter, w: "#fffaf0", g: "#ddd3c8", r: C.roseD, k: C.tile, c: C.cream, v: C.coffee, t: C.tiffany };
  var ITEM_SPR = {
    idea: ["..ooooo..", ".oyyyyyo.", "oywyyyyyo", "oyyyyyyyo", ".oyyyyyo.", "..oyyyo..", "..ogggo..", "..ogggo..", "...ooo..."],
    note: ["ooooooooo", "orrrrrrro", "orrrkrrro", "orrrkrrro", "orrrkrrro", "orrrrrrro", "orrrkrrro", "ooooooooo"],
    coffee: [".........", "..w.w....", "...w.w...", "ooooooo..", "ovvvvvoo.", "occccco.o", "occccco.o", ".occco...", "..ooo...."],
    chat: [".ooooooo.", "ottttttto", "otktktkto", "ottttttto", ".ooottoo.", "...oto...", "...oo...."],
  };

  function heart3(x, y, c) {
    rect(x, y, 1, 1, c); rect(x + 2, y, 1, 1, c);
    rect(x, y + 1, 3, 1, c); rect(x + 1, y + 2, 1, 1, c);
  }

  function drawWall() {
    var W = G.W;
    var gt = G.groundTop;
    rect(0, 0, W, gt, C.wall);
    for (var y = 6; y < gt - 12; y += 10) {
      for (var x = ((y / 10) % 2 ? 9 : 3); x < W; x += 12) heart3(x, y, C.paper);
    }
    rect(0, gt - 10, W, 10, C.panel);
    rect(0, gt - 11, W, 1, C.rail);
    for (x = 6; x < W; x += 14) rect(x, gt - 8, 1, 6, C.rail);
    rect(0, gt - 2, W, 3, C.base);
  }

  function drawClock() {
    var x = G.clock.x;
    var y = G.clock.y;
    rect(x - 3, y - 5, 7, 11, C.tile);
    rect(x - 5, y - 3, 11, 7, C.tile);
    rect(x - 4, y - 4, 9, 9, C.tile);
    rect(x - 2, y - 4, 5, 9, C.cream);
    rect(x - 4, y - 2, 9, 5, C.cream);
    rect(x - 3, y - 3, 7, 7, C.cream);
    rect(x, y - 3, 1, 4, C.ink);
    var a = G.time * 0.8;
    rect(x + Math.round(Math.cos(a) * 2), y + Math.round(Math.sin(a) * 2), 1, 1, C.tile);
  }

  function drawChair() {
    var x = G.chair.x;
    var y = G.chair.y;
    shadow(x, y, 14);
    rect(x - 5, y - 2, 2, 2, C.ink);
    rect(x + 3, y - 2, 2, 2, C.ink);
    rect(x - 5, y - 3, 10, 1, C.ink);
    rect(x - 1, y - 9, 2, 6, C.ink);
    rect(x - 6, y - 11, 12, 3, C.tile);
    rect(x - 6, y - 11, 12, 1, C.tileHi);
    rect(x + 4, y - 23, 3, 13, C.tile);
    rect(x + 4, y - 23, 1, 13, C.tileHi);
    rect(x + 3, y - 15, 2, 1, C.ink);
  }

  function drawLamp() {
    var x = G.lamp.x;
    var y = G.lamp.y;
    shadow(x, y, 8);
    rect(x - 3, y - 1, 7, 1, C.ink);
    rect(x, y - 28, 1, 27, C.ink);
    for (var i = 0; i < 6; i++) rect(x - 2 - Math.floor(i / 2), y - 36 + i, 5 + Math.floor(i / 2) * 2, 1, i % 3 === 2 ? C.roseD : C.rose);
    rect(x - 3, y - 30, 7, 1, "rgba(255, 246, 214, 0.9)");
  }

  function drawSofa() {
    var s = G.sofa;
    var x = s.x;
    var y = s.y;
    var w = s.w;
    shadow(x + w / 2, y, w);
    rect(x + 2, y - 2, 2, 2, C.ink);
    rect(x + w - 4, y - 2, 2, 2, C.ink);
    rect(x + 3, y - 22, w - 6, 11, C.rose);
    rect(x + 3, y - 22, w - 6, 1, C.roseD);
    rect(x + Math.round(w / 2), y - 21, 1, 9, C.roseD);
    rect(x + 1, y - 12, w - 2, 10, C.roseD);
    rect(x + 3, y - 12, w - 6, 3, C.rose);
    rect(x, y - 16, 5, 14, C.roseD);
    rect(x + w - 5, y - 16, 5, 14, C.roseD);
    rect(x, y - 16, 5, 1, C.rose);
    rect(x + w - 5, y - 16, 5, 1, C.rose);
    rect(x + 8, y - 19, 8, 6, C.tiffany);
    rect(x + 8, y - 19, 8, 1, C.tiffanyD);
  }

  function drawSide() {
    var x = G.side.x;
    var y = G.side.y;
    rect(x - 4, y - 10, 8, 2, C.tile);
    rect(x - 3, y - 8, 1, 8, C.ink);
    rect(x + 2, y - 8, 1, 8, C.ink);
    rect(x - 2, y - 14, 4, 4, C.cream);
    rect(x + 2, y - 13, 1, 2, C.cream);
  }

  function drawCatbed() {
    var x = G.catbed.x;
    var y = G.catbed.y;
    rect(x - 8, y - 5, 16, 5, C.tiffanyD);
    rect(x - 9, y - 4, 18, 3, C.tiffanyD);
    rect(x - 6, y - 4, 12, 2, C.cream);
    heart3(x - 1, y - 4, C.roseD);
  }

  function drawWindow() {
    var w = G.win;
    rect(w.x - 3, w.y - 3, w.w + 6, w.h + 6, C.tile);
    rect(w.x, w.y, w.w, w.h, C.sky);
    rect(w.x, w.y, w.w, Math.round(w.h * 0.4), C.skyHi);
    var ctx = G.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(w.x, w.y, w.w, w.h);
    ctx.clip();
    G.clouds.forEach(function (c) {
      var span = w.w + 30;
      var cx = w.x + (((c.x % span) + span) % span) - 15;
      ctx.drawImage(G.sprites.cloud, Math.round(cx), w.y + 2 + (c.y % 8));
    });
    var base = w.y + w.h;
    var px = w.x + Math.round(w.w * 0.36);
    for (var i = 0; i < 26; i++) {
      rect(px - i, w.y + 9 + Math.round(i * 0.8), i * 2 + 1, 1, C.mount);
      if (i < 5) rect(px - i, w.y + 9 + Math.round(i * 0.8), i * 2 + 1, 1, C.snow);
    }
    rect(w.x, w.y + 9 + 21, w.w, w.h, C.mount);
    var sx = w.x + Math.round(w.w * 0.74);
    for (i = 0; i < 16; i++) rect(sx - i, base - 16 + i, i * 2 + 1, 1, C.mountD);
    rect(sx, base - 16, 1, 1, C.snow);
    rect(w.x, base - 4, w.w, 4, C.grass);
    ctx.restore();
    rect(w.x + Math.round(w.w / 2) - 1, w.y, 2, w.h, C.tile);
    rect(w.x, w.y + Math.round(w.h / 2) - 1, w.w, 2, C.tile);
    rect(w.x - 6, w.y + w.h + 3, w.w + 12, 3, C.tile);
    rect(w.x - 5, w.y + w.h + 3, w.w + 10, 1, C.tileHi);
    rect(w.x + 4, w.y + w.h, 4, 3, C.tile);
    rect(w.x + 4, w.y + w.h - 4, 4, 4, C.jade);
    // curtains
    rect(w.x - 10, w.y - 5, 7, w.h + 7, C.rose);
    rect(w.x + w.w + 3, w.y - 5, 7, w.h + 7, C.rose);
    for (var k = 0; k < 3; k++) {
      rect(w.x - 9 + k * 2, w.y - 5, 1, w.h + 7, C.roseD);
      rect(w.x + w.w + 4 + k * 2, w.y - 5, 1, w.h + 7, C.roseD);
    }
    rect(w.x - 14, w.y - 6, w.w + 28, 1, C.ink);
  }

  function drawPoster() {
    var x = G.poster.x;
    var y = G.poster.y;
    rect(x, y, 20, 24, C.ink);
    rect(x + 1, y + 1, 18, 22, C.tile);
    var H = ["..xx..xx..", ".xxxxxxxx.", ".xxxxxxxx.", "..xxxxxx..", "...xxxx...", "....xx...."];
    H.forEach(function (row, j) {
      for (var i = 0; i < row.length; i++) if (row[i] === "x") rect(x + 5 + i, y + 6 + j, 1, 1, C.pink);
    });
    rect(x + 5, y + 16, 10, 1, C.rose);
    rect(x + 7, y + 18, 6, 1, C.rose);
  }

  function drawShelf() {
    var x = G.shelf.x;
    var y = G.shelf.y;
    var books = [[C.tiffany, 9], [C.rose, 11], [C.cream, 8], [C.tile, 10], [C.pink, 9], [C.tiffanyD, 11]];
    var bx = x + 2;
    books.forEach(function (b, i) {
      rect(bx, y - b[1], 3, b[1], b[0]);
      rect(bx, y - b[1], 3, 1, "rgba(82, 22, 23, 0.25)");
      bx += i === 2 ? 5 : 4;
    });
    rect(bx + 3, y - 5, 6, 5, C.tile);
    rect(bx + 2, y - 10, 2, 5, C.jade);
    rect(bx + 5, y - 12, 2, 7, C.jadeL);
    rect(bx + 8, y - 9, 2, 4, C.jade);
    rect(x, y, 40, 3, C.tile);
    rect(x, y, 40, 1, C.tileHi);
    rect(x + 4, y + 3, 2, 4, C.ink);
    rect(x + 34, y + 3, 2, 4, C.ink);
  }

  function drawFloor() {
    var W = G.W;
    var gt = G.groundTop + 1;
    rect(0, gt, W, G.H - gt, C.floor);
    rect(0, gt, W, 2, "rgba(82, 22, 23, 0.12)");
    for (var y = gt + 9, row = 0; y < G.H; y += 9, row++) {
      rect(0, y, W, 1, C.plank);
      rect(0, y + 1, W, 1, C.plankHi);
      for (var x = ((row * 37) % 90) + 10; x < W; x += 90) rect(x, y - 8, 1, 8, C.plank);
    }
    var r = G.rug;
    rect(r.x + 3, r.y, r.w - 6, r.h, C.roseD);
    rect(r.x, r.y + 2, r.w, r.h - 4, C.roseD);
    rect(r.x + 4, r.y + 1, r.w - 8, r.h - 2, C.rose);
    rect(r.x + 1, r.y + 3, r.w - 2, r.h - 6, C.rose);
    for (x = r.x + 10; x < r.x + r.w - 10; x += 10) heart3(x, r.y + Math.round(r.h / 2) - 1, C.cream);
  }

  function drawPlant() {
    var x = G.plant.x;
    var y = G.plant.y;
    shadow(x, y, 14);
    rect(x - 5, y - 9, 10, 9, C.tile);
    rect(x - 6, y - 10, 12, 2, C.tileHi);
    var L = [[-6, -22, 3, 10], [-2, -27, 3, 16], [2, -24, 3, 13], [5, -19, 3, 8], [-9, -16, 3, 5]];
    L.forEach(function (l, i) { rect(x + l[0], y + l[1], l[2], l[3], i % 2 ? C.jadeL : C.jade); });
  }

  function shadow(x, y, w) {
    rect(x - w / 2, y, w, 1, "rgba(82, 22, 23, 0.18)");
    rect(x - w / 2 + 1, y + 1, w - 2, 1, "rgba(82, 22, 23, 0.1)");
  }

  function drawDesk() {
    var d = G.desk;
    var x = d.x - 18;
    var y = d.y;
    shadow(d.x, y, 38);
    rect(x + 2, y - 10, 2, 10, C.ink);
    rect(x + 32, y - 10, 2, 10, C.ink);
    rect(x, y - 13, 36, 4, C.ink);
    rect(x + 1, y - 12, 34, 2, C.tileHi);
    rect(x + 15, y - 17, 6, 4, C.ink);
    rect(x + 26, y - 19, 4, 6, C.cream);
    rect(x + 30, y - 18, 1, 3, C.cream);
    var mx = x + 5;
    var my = y - 36;
    rect(mx, my, 26, 20, C.ink);
    rect(mx + 2, my + 2, 22, 16, C.screen);
    var p = G.progress / 100;
    var rows = [
      { c: C.rose, w: 12 },
      { c: C.tiffany, w: 20 },
      { c: C.pink, w: 16 },
      { c: C.cream, w: 18 },
    ];
    rows.forEach(function (r, i) {
      var part = Math.max(0, Math.min(1, p * 4 - i));
      var w = Math.round(r.w * part);
      if (w > 0) rect(mx + 3, my + 3 + i * 4, w, 2, r.c);
    });
    if (Math.floor(G.time * 2) % 2 === 0 && p < 1) {
      var i = Math.min(3, Math.floor(p * 4));
      var part = Math.max(0, Math.min(1, p * 4 - i));
      rect(mx + 3 + Math.round(rows[i].w * part), my + 3 + i * 4, 1, 2, "#ffffff");
    }
    rect(mx + 22, my + 16, 1, 1, C.tiffany);
  }

  function drawItem(it) {
    var img = G.sprites[ITEMS[it.kind].sprite];
    if (it.kind === "bug" && it.life < 2.2 && Math.floor(G.time * 8) % 2 === 0) return;
    var bob = Math.round(Math.sin(G.time * 4 + it.phase));
    shadow(it.x, it.y, 8);
    G.ctx.drawImage(img, Math.round(it.x - img.width / 2), Math.round(it.y - img.height - 1 + bob));
    if (it.kind === "bug") {
      var left = Math.max(0, it.life / ITEMS.bug.life);
      rect(it.x - 5, it.y - img.height - 4 + bob, 10, 2, C.ink);
      rect(it.x - 4, it.y - img.height - 3 + bob, Math.round(8 * left), 1, left < 0.3 ? C.roseD : C.tiffanyD);
    }
  }

  function drawCat() {
    var c = G.cat;
    var img = c.face > 0 ? G.sprites.cat : G.sprites.catL;
    shadow(c.x, c.y, 8);
    G.ctx.drawImage(img, Math.round(c.x - img.width / 2), Math.round(c.y - img.height));
  }

  function drawPlayer() {
    var p = G.p;
    var walking = p.moving && Math.floor(p.walkT * 7) % 2 === 1;
    var key = (walking ? "dashaWalk" : "dasha") + (p.face < 0 ? "L" : "");
    var img = G.sprites[key];
    var bob = p.moving && Math.floor(p.walkT * 7) % 2 === 0 ? -1 : 0;
    shadow(p.x, p.y, 12);
    G.ctx.drawImage(img, Math.round(p.x - img.width / 2), Math.round(p.y - img.height + bob));
  }

  function draw() {
    var ctx = G.ctx;
    ctx.clearRect(0, 0, G.W, G.H);
    drawWall();
    drawWindow();
    if (G.poster) drawPoster();
    if (G.clock) drawClock();
    drawShelf();
    drawFloor();
    if (G.marker) {
      var m = G.marker;
      rect(m.x - 2, m.y, 5, 1, C.tile);
      rect(m.x, m.y - 2, 1, 5, C.tile);
    }
    var list = [
      { y: G.desk.y, f: drawDesk }, { y: G.chair.y, f: drawChair }, { y: G.plant.y, f: drawPlant },
      { y: G.cat.y, f: drawCat }, { y: G.p.y, f: drawPlayer },
    ];
    if (G.lamp) list.push({ y: G.lamp.y, f: drawLamp });
    if (G.sofa) list.push({ y: G.sofa.y, f: drawSofa });
    if (G.side) list.push({ y: G.side.y + 0.5, f: drawSide });
    if (G.catbed) list.push({ y: G.catbed.y, f: drawCatbed });
    G.items.forEach(function (it) { list.push({ y: it.y, f: function () { drawItem(it); } }); });
    list.sort(function (a, b) { return a.y - b.y; });
    list.forEach(function (o) { o.f(); });
  }

  function loop() {
    if (G.running) return;
    G.running = true;
    G.last = performance.now();
    function frame(now) {
      if (!G.visible) { G.running = false; return; }
      var dt = Math.min(0.05, (now - G.last) / 1000);
      G.last = now;
      update(dt);
      draw();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  window.DesignerSim = { mount: mount, setTexts: setTexts };
})();
