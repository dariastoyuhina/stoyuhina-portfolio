/* Interactive isometric pixel-art room.
   Everything is drawn procedurally onto a tiny 208x180 canvas (scaled up crisp by CSS).
   World axes: x -> right/down, y -> left/down, z -> up.  Back corner is (0,0).
   Left wall is the plane x=0, right wall (with the window) is the plane y=0. */
(function () {
  "use strict";

  var host = document.querySelector("[data-room]");
  if (!host) return;

  var stage = host.querySelector("[data-stage]");
  var canvas = host.querySelector("[data-canvas]");
  var spotsEl = host.querySelector("[data-spots]");
  var bubble = host.querySelector("[data-bubble]");
  var bubbleShown = host.querySelector("[data-bubble-shown]");
  var bubbleRest = host.querySelector("[data-bubble-rest]");
  var bubbleTail = host.querySelector("[data-bubble-tail]");
  var liveEl = host.querySelector("[data-live]");
  // everything is drawn on a tiny offscreen buffer, then blown up crisp onto the visible canvas
  var buf = document.createElement("canvas");
  buf.width = 208; buf.height = 180;
  var ctx = buf.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  var screenCtx = canvas.getContext("2d");

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SPR = window.RoomSprites;

  var W = 208, H = 180, OX = 104, OY = 68, N = 12, WALL = 60;

  /* ------------------------------------------------------------------ *
   *  small helpers
   * ------------------------------------------------------------------ */
  function hex(h) {
    var n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mul(c, f) {
    return [clamp((c[0] * f) | 0, 0, 255), clamp((c[1] * f) | 0, 0, 255), clamp((c[2] * f) | 0, 0, 255), c[3] === undefined ? 255 : c[3]];
  }
  function mix(a, b, t) {
    return [(a[0] + (b[0] - a[0]) * t) | 0, (a[1] + (b[1] - a[1]) * t) | 0, (a[2] + (b[2] - a[2]) * t) | 0, 255];
  }
  function css(c) { return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"; }
  function h2(x, y) {
    var n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    n ^= n >>> 16;
    return (n >>> 0) / 4294967296;
  }
  function proj(x, y, z) { return [OX + (x - y) * 8, OY + (x + y) * 4 - z]; }
  function frac(v) { return v - Math.floor(v); }

  /* ------------------------------------------------------------------ *
   *  pixel layers + face rasterizers (exact 2:1 isometric pixel edges)
   * ------------------------------------------------------------------ */
  function makeLayer() {
    var c = document.createElement("canvas");
    c.width = W; c.height = H;
    var cx = c.getContext("2d");
    var img = cx.createImageData(W, H);
    var d = img.data;
    return {
      c: c, d: d,
      set: function (x, y, col) {
        if (!col || x < 0 || y < 0 || x >= W || y >= H) return;
        var i = (y * W + x) * 4;
        if (col === "clear") { d[i + 3] = 0; return; }
        var a = col[3] === undefined ? 255 : col[3];
        if (a >= 255) { d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; return; }
        var sa = a / 255, da = d[i + 3] / 255, oa = sa + da * (1 - sa);
        if (oa <= 0) return;
        d[i] = (col[0] * sa + d[i] * da * (1 - sa)) / oa;
        d[i + 1] = (col[1] * sa + d[i + 1] * da * (1 - sa)) / oa;
        d[i + 2] = (col[2] * sa + d[i + 2] * da * (1 - sa)) / oa;
        d[i + 3] = oa * 255;
      },
      alpha: function (x, y) { return x < 0 || y < 0 || x >= W || y >= H ? 0 : d[(y * W + x) * 4 + 3]; },
      flush: function () { cx.putImageData(img, 0, 0); return c; },
    };
  }

  function bounds(pts) {
    var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    pts.forEach(function (p) {
      x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]);
      y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]);
    });
    return [Math.floor(x0) - 1, Math.ceil(x1) + 1, Math.floor(y0) - 1, Math.ceil(y1) + 1];
  }

  /* horizontal plane z, rect [x0,x1]x[y0,y1].  fn(u,v,sx,sy,wx,wy,wz) */
  function faceTop(L, x0, y0, x1, y1, z, fn) {
    var b = bounds([proj(x0, y0, z), proj(x1, y0, z), proj(x1, y1, z), proj(x0, y1, z)]);
    for (var sy = b[2]; sy <= b[3]; sy++) {
      for (var sx = b[0]; sx <= b[1]; sx++) {
        var a = (sx + 0.5 - OX) / 8, bb = (sy + 0.5 - OY + z) / 4;
        var x = (a + bb) / 2, y = (bb - a) / 2;
        if (x >= x0 && x < x1 && y >= y0 && y < y1) {
          var c = fn(x - x0, y - y0, sx, sy, x, y, z);
          if (c) L.set(sx, sy, c);
        }
      }
    }
  }
  /* vertical plane y=Y, facing +y (visible, left-front). u runs left->right (= x). */
  function faceY(L, Y, x0, x1, z0, z1, fn) {
    var b = bounds([proj(x0, Y, z0), proj(x1, Y, z0), proj(x1, Y, z1), proj(x0, Y, z1)]);
    for (var sy = b[2]; sy <= b[3]; sy++) {
      for (var sx = b[0]; sx <= b[1]; sx++) {
        var x = Y + (sx + 0.5 - OX) / 8;
        var z = OY + (x + Y) * 4 - (sy + 0.5);
        if (x >= x0 && x < x1 && z >= z0 && z < z1) {
          var c = fn(x - x0, z - z0, sx, sy, x, Y, z);
          if (c) L.set(sx, sy, c);
        }
      }
    }
  }
  /* vertical plane x=X, facing +x (visible, right-front). u runs left->right (= y1 - y). */
  function faceX(L, X, y0, y1, z0, z1, fn) {
    var b = bounds([proj(X, y0, z0), proj(X, y1, z0), proj(X, y1, z1), proj(X, y0, z1)]);
    for (var sy = b[2]; sy <= b[3]; sy++) {
      for (var sx = b[0]; sx <= b[1]; sx++) {
        var y = X - (sx + 0.5 - OX) / 8;
        var z = OY + (X + y) * 4 - (sy + 0.5);
        if (y >= y0 && y < y1 && z >= z0 && z < z1) {
          var c = fn(y1 - y, z - z0, sx, sy, X, y, z);
          if (c) L.set(sx, sy, c);
        }
      }
    }
  }

  /* ------------------------------------------------------------------ *
   *  sunlight from the window (right wall, above the bed)
   * ------------------------------------------------------------------ */
  var SUN = { a: 0.25, b: 8, wx0: 4.2, wx1: 8.4, wz0: 24, wz1: 50 };
  var SUN_TINT = [255, 238, 188, 255];
  function lit(x, y, z) {
    var zw = z + SUN.b * y, xw = x - SUN.a * y;
    if (zw < SUN.wz0 || zw > SUN.wz1 || xw < SUN.wx0 || xw > SUN.wx1) return false;
    if (Math.abs(xw - 6.3) < 0.07 || Math.abs(zw - 37) < 0.55) return false;
    return true;
  }
  function sunlit(c) { return mix(mul(c, 1.07), SUN_TINT, 0.42); }

  /* box with three visible faces. faces: constant colour or fn */
  function box(L, x0, y0, z0, x1, y1, z1, o) {
    function w(f) { return typeof f === "function" ? f : function () { return f; }; }
    function post(c, wx, wy, wz) { return c && c !== "clear" && o.sun && lit(wx, wy, wz) ? sunlit(c) : c; }
    if (o.fy) {
      var fy = w(o.fy);
      faceY(L, y1, x0, x1, z0, z1, function (u, v, sx, sy, wx, wy, wz) { return post(fy(u, v, sx, sy, wx, wy, wz), wx, wy, wz); });
    }
    if (o.fx) {
      var fx = w(o.fx);
      faceX(L, x1, y0, y1, z0, z1, function (u, v, sx, sy, wx, wy, wz) { return post(fx(u, v, sx, sy, wx, wy, wz), wx, wy, wz); });
    }
    if (o.top) {
      var tp = w(o.top);
      faceTop(L, x0, y0, x1, y1, z1, function (u, v, sx, sy, wx, wy, wz) { return post(tp(u, v, sx, sy, wx, wy, wz), wx, wy, wz); });
    }
  }
  function solid(c) { return { top: mul(c, 1.14), fy: c, fx: mul(c, 0.78) }; }
  function solidBox(L, x0, y0, z0, x1, y1, z1, c, sun) {
    var s = solid(c); s.sun = !!sun;
    box(L, x0, y0, z0, x1, y1, z1, s);
  }

  /* 1px dark outline around opaque pixels of a layer ("sel-out") */
  function outline(L, col) {
    var snap = new Uint8Array(W * H);
    for (var i = 0; i < W * H; i++) snap[i] = L.d[i * 4 + 3] > 8 ? 1 : 0;
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        if (snap[y * W + x]) continue;
        var n = (x > 0 && snap[y * W + x - 1]) || (x < W - 1 && snap[y * W + x + 1]) ||
                (y > 0 && snap[(y - 1) * W + x]) || (y < H - 1 && snap[(y + 1) * W + x]);
        if (n) L.set(x, y, col);
      }
    }
  }

  /* ------------------------------------------------------------------ *
   *  palette
   * ------------------------------------------------------------------ */
  var P = {
    wallL: hex("#8a4650"), wallR: hex("#a65e66"),
    wsL: hex("#5f3732"), wsR: hex("#78443b"),
    base: hex("#38211f"),
    beam: hex("#3f2624"), beamHi: hex("#62403a"),
    floor: [hex("#aa734f"), hex("#b68059"), hex("#9e6946")], seam: hex("#6c432e"),
    slabL: hex("#5d3c2e"), slabR: hex("#432920"),
    wood: hex("#9b6544"), woodHi: hex("#b77f5a"), woodDk: hex("#6c4230"), woodDk2: hex("#4a2d22"),
    metal: hex("#d8cdd0"),
    outline: [44, 18, 22, 190],
  };

  /* shadows on the floor: [x0,y0,x1,y1,mul] */
  var SHADOWS = [
    [2.0, 0.5, 2.7, 5.3, 0.82],
    [3.1, 2.1, 3.7, 3.4, 0.84],
    [3.6, 3.2, 9.5, 3.95, 0.8],
    [9.7, 2.0, 12.0, 2.7, 0.8],
    [1.5, 6.2, 2.15, 7.7, 0.82],
    [1.5, 9.0, 2.2, 12.0, 0.84],
    [11.0, 9.3, 11.7, 10.2, 0.84],
  ];

  /* rug --------------------------------------------------------------- */
  var RUG = { x: 4.4, y: 5.0, s: 5.4 };
  var RC = { base: hex("#d98fa6"), border: hex("#f3e2d1"), line: hex("#9f4663"), pat: hex("#e9b0c1"), dot: hex("#fbede4"), dk: hex("#c4728e") };
  function rugColor(x, y) {
    var lx = x - RUG.x, ly = y - RUG.y;
    if (lx < 0 || ly < 0 || lx >= RUG.s || ly >= RUG.s) return null;
    var e = Math.min(lx, ly, RUG.s - lx, RUG.s - ly);
    if (e < 0.13) return RC.line;
    if (e < 0.5) {
      var d = frac((lx + ly) * 1.6);
      return d < 0.22 ? RC.pat : RC.border;
    }
    if (e < 0.63) return RC.line;
    var d1 = frac((lx + ly) * 1.5), d2 = frac((lx - ly + 20) * 1.5);
    var cx = Math.abs(d1 - 0.5) + Math.abs(d2 - 0.5);
    if (d1 < 0.1 && d2 < 0.1) return RC.dot;
    if (d1 < 0.1 || d2 < 0.1) return RC.pat;
    if (Math.abs(d1 - 0.5) < 0.08 && Math.abs(d2 - 0.5) < 0.08) return RC.dk;
    return cx < 0 ? RC.dk : RC.base;
  }

  function floorColor(x, y, sx, sy) {
    var c = rugColor(x, y);
    if (!c) {
      var p = Math.floor(y * 2), fy = y * 2 - p;
      var off = h2(p, 7) * 3, jx = (x + off) / 3, j = Math.floor(jx), fx = jx - j;
      var seam = fy < 0.25 || fx < 0.045;
      var tn = h2(p, j + 11);
      c = seam ? P.seam : tn < 0.34 ? P.floor[0] : tn < 0.67 ? P.floor[1] : P.floor[2];
      if (!seam && h2(sx, sy) > 0.9) c = mul(c, 0.93);
    }
    var dm = Math.min(x, y);
    if (dm < 0.6) c = mul(c, 0.84 + 0.16 * (dm / 0.6));
    for (var i = 0; i < SHADOWS.length; i++) {
      var s = SHADOWS[i];
      if (x >= s[0] && x < s[2] && y >= s[1] && y < s[3]) { c = mul(c, s[4]); break; }
    }
    if (lit(x, y, 0)) c = sunlit(c);
    return c;
  }

  /* walls ------------------------------------------------------------- */
  function wallFn(left) {
    var up = left ? P.wallL : P.wallR;
    var ws = left ? P.wsL : P.wsR;
    return function (u, v, sx, sy, wx, wy, z) {
      var t = left ? wy : wx;
      if (z < 2.4) return mul(P.base, left ? 0.9 : 1.05);
      if (z < 14) {
        var c = ws;
        if ((t % 1.5) < 0.13) c = mul(c, 0.76);
        if (z >= 12.6) c = mul(c, 1.2);
        return c;
      }
      if (z < 15.3) return mul(P.woodHi, left ? 0.7 : 0.82);
      var w = up;
      if ((t % 1) < 0.125) w = mul(w, 1.05);
      if (h2(sx, sy) > 0.93) w = mul(w, 1.06);
      if (z > 54) w = mul(w, 0.88);
      if (!left) {
        var g = 1 - (Math.pow((wx - 6.3) / 6.5, 2) + Math.pow((z - 37) / 30, 2));
        if (g > 0) w = mix(w, [255, 226, 190, 255], g * 0.2);
      }
      return w;
    };
  }

  /* ------------------------------------------------------------------ *
   *  window (right wall, above the bed): view texture
   * ------------------------------------------------------------------ */
  var WIN = { x0: 4.2, x1: 8.4, z0: 24, z1: 50 };
  var winPixels = [];
  function tri(u, c, h, w) { return Math.max(0, h * (1 - Math.abs(u - c) / w)); }
  var SKY = [[0.82, "#78b0dc"], [0.64, "#93c3e8"], [0.46, "#b4d6ee"], [0.3, "#d7e5ea"], [0, "#f1e4cb"]].map(function (a) { return [a[0], hex(a[1])]; });
  var VIEW = {
    far: hex("#8aa3c2"), farDk: hex("#7189ad"), snow: hex("#f4f7fb"), snowDk: hex("#d9e2ee"),
    mid: hex("#6a8f94"), midDk: hex("#587f86"), near: hex("#5d8b5c"), nearDk: hex("#487548"),
    cloud: hex("#ffffff"), cloudDk: hex("#dde8f2"),
  };
  var CLOUDS = [[0.22, 0.78, 0.16, 0.07, 0.012], [0.66, 0.66, 0.2, 0.06, 0.008], [0.9, 0.86, 0.1, 0.04, 0.016]];
  function viewColor(u, v, t, px, py) {
    var i, c = SKY[SKY.length - 1][1];
    for (i = 0; i < SKY.length; i++) if (v >= SKY[i][0]) { c = SKY[i][1]; break; }
    // soft sun glare top-right
    var g = 1 - Math.hypot((u - 0.88) * 1.4, v - 0.95) * 1.5;
    if (g > 0) c = mix(c, [255, 244, 214, 255], g * 0.5);
    // far mountains (Ararat with its little sister)
    var far = 0.2 + Math.max(tri(u, 0.3, 0.52, 0.42), tri(u, 0.78, 0.34, 0.24));
    var farPeak = Math.max(tri(u, 0.3, 0.52, 0.42), tri(u, 0.78, 0.34, 0.24)) > 0.2;
    if (v < far) {
      c = u > 0.3 && u < 0.62 || u > 0.78 ? VIEW.farDk : VIEW.far;
      var snowLine = far - 0.15 - h2(Math.floor(u * 70), 3) * 0.035;
      if (farPeak && v > snowLine) c = u > 0.3 && u < 0.62 || u > 0.78 ? VIEW.snowDk : VIEW.snow;
    }
    var mid = 0.14 + 0.07 * Math.sin(u * 6 + 1) + 0.03 * Math.sin(u * 15) + tri(u, 0.62, 0.07, 0.2);
    if (v < mid) c = h2(px, py) > 0.8 ? VIEW.midDk : VIEW.mid;
    var near = 0.06 + 0.05 * Math.sin(u * 4.5 + 2) + 0.02 * Math.sin(u * 11);
    if (v < near) c = h2(px + 3, py) > 0.74 ? VIEW.nearDk : VIEW.near;
    // clouds
    for (i = 0; i < CLOUDS.length; i++) {
      var k = CLOUDS[i];
      var cx = ((k[0] + t * k[4]) % 1.5) - 0.25;
      var dx = (u - cx) / k[2], dy = (v - k[1]) / k[3];
      if (dx * dx + dy * dy < 1) c = dy > 0.2 ? VIEW.cloudDk : VIEW.cloud;
    }
    return c;
  }

  /* ------------------------------------------------------------------ *
   *  static base: slab, floor, walls, beams, decor
   * ------------------------------------------------------------------ */
  function buildBase() {
    var L = makeLayer();

    // floor slab (front faces)
    faceY(L, N, 0, N, -7, 0, function (u, v, sx, sy, x, y, z) {
      var c = P.slabL;
      if (z > -1.1) c = mul(c, 1.25);
      if ((x % 3) < 0.07) c = mul(c, 0.8);
      return c;
    });
    faceX(L, N, 0, N, -7, 0, function (u, v, sx, sy, x, y, z) {
      var c = P.slabR;
      if (z > -1.1) c = mul(c, 1.25);
      if ((y % 3) < 0.07) c = mul(c, 0.8);
      return c;
    });
    faceTop(L, 0, 0, N, N, 0, floorColor);

    // walls
    faceX(L, 0, 0, N, 0, WALL, wallFn(true));
    faceY(L, 0, 0, N, 0, WALL, wallFn(false));

    // fairy lights along the left wall
    for (var k = 0; k <= 60; k++) {
      var yy = 0.45 + (k / 60) * 11.1;
      var zz = 57 - 3.2 * Math.sin((k / 60) * Math.PI);
      var p = proj(0, yy, zz);
      L.set(Math.round(p[0]), Math.round(p[1]), hex("#3b2321"));
    }
    for (var b = 0; b < 10; b++) {
      var by = 0.9 + b * 1.15;
      var bz = 57 - 3.2 * Math.sin(((by - 0.45) / 11.1) * Math.PI);
      var bp = proj(0, by, bz);
      L.set(Math.round(bp[0]), Math.round(bp[1]) + 1, hex("#ffe8a0"));
      L.set(Math.round(bp[0]), Math.round(bp[1]) + 2, hex("#ffcb5e"));
    }

    // window: frame, glass hole, mullions
    faceY(L, 0, WIN.x0 - 0.22, WIN.x1 + 0.22, WIN.z0 - 2.4, WIN.z1 + 2.4, function (u, v, sx, sy, x, y, z) {
      var inGlass = x >= WIN.x0 && x < WIN.x1 && z >= WIN.z0 && z < WIN.z1;
      if (inGlass) {
        if (Math.abs(x - 6.3) < 0.09 || Math.abs(z - 37) < 0.6) return hex("#55352b");
        return "clear";
      }
      return z > WIN.z1 || x < WIN.x0 - 0.1 ? hex("#4f3228") : hex("#6b4334");
    });
    // inner window shade (thin darker rim on the glass edges)
    // sill
    box(L, WIN.x0 - 0.35, 0, WIN.z0 - 4, WIN.x1 + 0.35, 0.5, WIN.z0 - 2.4, { top: hex("#c58d66"), fy: hex("#8a5a40"), fx: hex("#6b4330") });

    // curtains (soft pink, translucent) + rod
    function curtain(xa, xb) {
      faceY(L, 0.28, xa, xb, 15, 55, function (u, v, sx, sy, x, y, z) {
        var fold = Math.floor((x - xa) * 8 / 2) % 2 === 0;
        var a = 214;
        var c = fold ? [247, 200, 214, a] : [236, 170, 192, a];
        if (z < 17) c = [214, 140, 168, a];
        if (z > 52.5) c = [150, 96, 112, 255];
        return c;
      });
    }
    curtain(3.45, 4.2);
    curtain(8.4, 9.15);
    box(L, 3.3, 0, 54.6, 9.3, 0.3, 56.3, { top: P.beamHi, fy: P.beam, fx: P.beam });
    solidBox(L, 3.15, 0, 54.2, 3.4, 0.3, 56.7, hex("#c58d66"));
    solidBox(L, 9.2, 0, 54.2, 9.45, 0.3, 56.7, hex("#c58d66"));

    // heart poster on the left wall (Figma heart, 8x7 on the burgundy tile)
    var PO = { y0: 6.1, y1: 9.0, z0: 25, z1: 52 };
    var heart = window.PixelIcons ? window.PixelIcons.ICONS.heart : [];
    faceX(L, 0.02, PO.y0, PO.y1, PO.z0, PO.z1, function (u, v, sx, sy, x, y, z) {
      var uw = PO.y1 - PO.y0;
      var px = u * 8; // screen px from left edge
      var py = PO.z1 - z;
      var edge = Math.min(px, uw * 8 - px, py, (PO.z1 - PO.z0) - py);
      if (edge < 1.2) return hex("#e8d0a8");      // gold frame
      if (edge < 2.2) return hex("#4a2a20");      // inner dark rim
      var hx = Math.floor((px - (uw * 8 - 16) / 2) / 2), hy = Math.floor((py - ((PO.z1 - PO.z0) - 14) / 2) / 2);
      if (hx >= 0 && hx < 8 && hy >= 0 && hy < 7 && heart[hy] && heart[hy][hx] === "X") {
        return hy === 1 && hx < 3 ? hex("#fff0f2") : hex("#ecd0d2");
      }
      return hex("#793133");
    });

    // small frames over the desk
    function frame(y0, y1, z0, z1, paper, art) {
      faceX(L, 0.02, y0, y1, z0, z1, function (u, v, sx, sy, x, y, z) {
        var px = u * 8, py = z1 - z, w = (y1 - y0) * 8, h = z1 - z0;
        var e = Math.min(px, w - px, py, h - py);
        if (e < 1.1) return hex("#e8d0a8");
        var a = art(px / w, 1 - py / h, sx, sy);
        return a || paper;
      });
    }
    frame(1.0, 2.6, 36, 49, hex("#f7efe0"), function (u, v) {
      var d = Math.hypot(u - 0.5, v - 0.55);
      if (d < 0.12) return hex("#fff7f0");
      if (d < 0.3) return hex("#e98aa9");
      if (v < 0.25 && Math.abs(u - 0.5) < 0.05) return hex("#6c9a58");
      return null;
    });
    frame(3.2, 4.6, 32, 43, hex("#cfe5ee"), function (u, v) {
      if (v < 0.45 + (0.5 - Math.abs(u - 0.5)) * 0.9 && v < 0.78) return v > 0.55 ? hex("#f4f7fb") : hex("#4f8f8d");
      return null;
    });

    // ceiling beams and corner posts (dark wood, Asian timber frame)
    var beam = { top: P.beamHi, fy: P.beam, fx: mul(P.beam, 0.82) };
    box(L, 0, 0, WALL - 3, N, 0.5, WALL + 1, beam);
    box(L, 0, 0, WALL - 3, 0.5, N, WALL + 1, beam);
    box(L, 0, 0, 0, 0.55, 0.55, WALL + 1, beam);
    box(L, N - 0.5, 0, 0, N, 0.5, WALL + 1, beam);
    box(L, 0, N - 0.5, 0, 0.5, N, WALL + 1, beam);
    // mid posts
    box(L, 0, 0, 0, 0.4, 0.4, WALL + 1, beam);

    L.flush();
    return L.c;
  }

  /* ------------------------------------------------------------------ *
   *  furniture
   * ------------------------------------------------------------------ */
  function buildDesk() {
    var L = makeLayer();
    var wood = P.wood, dark = P.woodDk2;
    // modesty panel (visible through the knee space)
    box(L, 0, 1.9, 2, 0.3, 4.6, 10.5, { fx: dark, fy: dark, top: dark });
    // drawer pedestal
    box(L, 0.05, 0.5, 0, 1.95, 1.9, 10.5, {
      fx: function (u, v) {
        if (v < 1) return dark;
        if (Math.abs(v - 5.6) < 0.6) return dark;
        if (u < 0.12 || u > 1.28) return P.woodDk;
        if (Math.abs(u - 0.7) < 0.22 && (Math.abs(v - 8) < 0.55 || Math.abs(v - 3.3) < 0.55)) return P.metal;
        return v > 5.6 ? mul(wood, 0.84) : mul(wood, 0.78);
      },
      fy: mul(wood, 0.95), top: wood,
    });
    // end panel
    box(L, 0.05, 4.55, 0, 1.95, 5.0, 10.5, { fx: mul(wood, 0.74), fy: wood, top: wood });
    // top slab
    box(L, 0, 0.5, 10.5, 2.0, 5.0, 12.5, {
      top: function (u, v, sx, sy) {
        var c = P.woodHi;
        if (frac(v * 3) < 0.14) c = mul(c, 0.9);
        if (h2(sx, sy) > 0.94) c = mul(c, 0.94);
        return c;
      },
      fy: mul(wood, 0.92), fx: mul(wood, 0.72), sun: true,
    });
    // PC: tower
    box(L, 0.25, 0.7, 12.5, 1.15, 1.75, 24, {
      fx: function (u, v) {
        if (v > 8 && v < 9.2) return hex("#ff8fb8");
        if (v > 3 && v < 7 && u > 0.2 && u < 0.8 && Math.floor(u * 8) % 2 === 0) return hex("#232029");
        return hex("#2f2a36");
      },
      fy: hex("#38323f"), top: hex("#46404f"),
    });
    // monitor stand + panel
    solidBox(L, 0.45, 2.9, 12.5, 1.0, 3.9, 13.3, hex("#3b3744"));
    solidBox(L, 0.65, 3.25, 13.3, 0.85, 3.55, 17.2, hex("#3b3744"));
    box(L, 0.6, 2.4, 17, 0.9, 4.4, 29, { fx: hex("#1d1a24"), fy: hex("#26222f"), top: hex("#2d2936") });
    // keyboard + mouse + mug
    box(L, 1.1, 2.9, 12.5, 1.6, 4.1, 13.2, {
      top: function (u, v, sx, sy) { return (sx + sy) % 2 === 0 && (sx % 2 === 0) ? hex("#c6b6bc") : hex("#ece2e3"); },
      fx: hex("#c9bcc0"), fy: hex("#d8cdd0"),
    });
    solidBox(L, 1.15, 4.35, 12.5, 1.4, 4.6, 13.5, hex("#f0a9bf"));
    solidBox(L, 1.5, 4.6, 12.5, 1.8, 4.9, 15, hex("#f7efe4"), true);
    outline(L, P.outline);
    L.flush();
    return L.c;
  }

  function monitorPixels() {
    // same traversal as faceX (u: left->right, v: z)
    var res = [];
    var X = 0.9, y0 = 2.5, y1 = 4.3, z0 = 18, z1 = 28;
    var b = bounds([proj(X, y0, z0), proj(X, y1, z0), proj(X, y1, z1), proj(X, y0, z1)]);
    for (var sy = b[2]; sy <= b[3]; sy++) {
      for (var sx = b[0]; sx <= b[1]; sx++) {
        var y = X - (sx + 0.5 - OX) / 8;
        var z = OY + (X + y) * 4 - (sy + 0.5);
        if (y >= y0 && y < y1 && z >= z0 && z < z1) res.push([sx, sy, (y1 - y) / (y1 - y0), (z - z0) / (z1 - z0)]);
      }
    }
    return res;
  }

  function buildChair() {
    var L = makeLayer();
    var pink = hex("#c9728f"), wood = P.woodDk;
    [[2.15, 2.15], [2.85, 2.15], [2.15, 2.85], [2.85, 2.85]].forEach(function (p) {
      solidBox(L, p[0], p[1], 0, p[0] + 0.14, p[1] + 0.14, 5, wood);
    });
    box(L, 2.1, 2.1, 5, 3.1, 3.1, 7.4, { top: mul(pink, 1.1), fy: pink, fx: mul(pink, 0.8) });
    box(L, 2.95, 2.1, 7.4, 3.12, 3.1, 18, {
      fx: function (u, v) { return v > 3 && v < 9 && u > 0.1 && u < 0.7 ? mul(pink, 0.85) : wood; },
      fy: wood, top: wood,
    });
    outline(L, P.outline);
    L.flush();
    return L.c;
  }

  var BED = { x0: 3.6, x1: 9.2, y0: 0.2, y1: 3.2, top: 8.6 };
  function buildBed() {
    var L = makeLayer();
    var frame = hex("#8b5638"), frameHi = hex("#a76c4b");
    var cream = hex("#f6eee3"), creamDk = hex("#e5d9c9");
    var blank = hex("#e8a3b8"), blankHi = hex("#f7cdd9"), blankDk = hex("#c9688a");

    box(L, 3.6, 0.2, 0, 9.2, 3.2, 4, { fy: frame, fx: mul(frame, 0.76), top: frameHi, sun: true });
    // headboard
    box(L, 3.6, 0.2, 0, 3.9, 3.2, 17, {
      fx: function (u, v) {
        var inner = u > 0.25 && u < 2.75 && v > 5.5 && v < 15;
        if (inner) return (Math.floor(u * 8 / 2) % 2 === 0) ? mul(frame, 0.7) : mul(frame, 0.62);
        return mul(frame, 0.8);
      },
      fy: frameHi, top: frameHi, sun: true,
    });
    // footboard
    box(L, 9.0, 0.2, 0, 9.2, 3.2, 9.6, { fx: function (u, v) { return v > 2.5 && v < 8 && u > 0.2 && u < 2.8 ? mul(frame, 0.68) : mul(frame, 0.78); }, fy: frameHi, top: frameHi, sun: true });
    // mattress + blanket
    box(L, 3.9, 0.35, 4, 9.0, 3.05, BED.top, {
      top: function (u, v, sx, sy, x, y) {
        if (x < 5.1) return creamDk;
        if (x < 5.2) return blankDk;
        if (x < 5.8) return blankHi;
        if (x > 8.55) return blankDk;
        var cu = frac((x - 5.8) / 0.8) - 0.5, cv = frac((y - 0.35) / 0.9) - 0.5;
        var d = Math.abs(cu * 0.8) + Math.abs(cv * 0.9);
        if (d < 0.07) return cream;
        if (d < 0.19) return blankDk;
        return blank;
      },
      fy: function (u, v, sx, sy, x, y, z) {
        if (x < 5.1) return z < 5.2 ? mul(creamDk, 0.9) : creamDk;
        if (z < 5.4) return (Math.floor(x * 8) % 4 === 1) ? cream : blankDk;
        return z > 8.1 ? blankHi : mul(blank, 0.92);
      },
      fx: mul(blank, 0.78), sun: true,
    });
    // pillows
    box(L, 4.0, 0.5, BED.top, 5.0, 1.6, BED.top + 2.2, { top: cream, fy: creamDk, fx: mul(creamDk, 0.86), sun: true });
    box(L, 4.0, 1.8, BED.top, 5.0, 2.9, BED.top + 2.2, { top: cream, fy: creamDk, fx: mul(creamDk, 0.86), sun: true });
    outline(L, P.outline);
    L.flush();
    return L.c;
  }

  var CAB = { x0: 9.7, x1: 11.8, y0: 0.2, y1: 2.0, h: 44 };
  var CASE_COLORS = ["#e86a7a", "#4aa3b8", "#f5d36b", "#f7f1e1", "#a78bd8", "#5fbf8f", "#f29b5b", "#7aa7e8"].map(hex);
  function buildCabinet() {
    var L = makeLayer();
    var wood = hex("#7d4d34"), woodHi = hex("#9a6445"), inner = hex("#2c1b1d");
    var bays = [[12, 21], [22.6, 31.8], [33.4, 42]];
    box(L, CAB.x0, CAB.y0, 0, CAB.x1, CAB.y1, CAB.h, {
      fy: function (u, v, sx, sy) {
        var z = v;
        if (u < 0.14 || u > 1.96) return wood;
        if (z < 2.2) return mul(wood, 0.7);
        if (z >= 42) return woodHi;
        // lower cupboard
        if (z < 10.6) {
          var panel = u > 0.2 && u < 1.9 && z > 3.2 && z < 9.6 && Math.abs(u - 1.05) > 0.05;
          if (Math.abs(u - 0.98) < 0.07 && z > 5 && z < 8) return P.metal;
          if (Math.abs(u - 1.12) < 0.07 && z > 5 && z < 8) return P.metal;
          return panel ? mul(woodHi, 0.9) : wood;
        }
        for (var b = 0; b < bays.length; b++) {
          var bz = bays[b];
          if (z >= bz[0] && z < bz[1]) {
            var idx = Math.floor((u - 0.14) / 0.25);
            var fr = ((u - 0.14) / 0.25) - idx;
            var ch = 5.5 + Math.floor(h2(idx, b + 4) * 3.4);
            if (fr < 0.82 && z - bz[0] < ch) {
              var col = CASE_COLORS[(idx + b * 3) % CASE_COLORS.length];
              if (b === 1 && idx === 3) { // The Last of Us
                return (z - bz[0]) > ch - 3.2 && (z - bz[0]) < ch - 1.2 ? hex("#d9542e") : hex("#1f1b22");
              }
              if (z - bz[0] > ch - 1.2) return mul(col, 1.18);
              return fr > 0.62 ? mul(col, 0.82) : col;
            }
            return inner;
          }
        }
        return wood; // shelf boards
      },
      fx: function (u, v, sx, sy) {
        if (v >= 42) return woodHi;
        if (v < 2.2) return mul(wood, 0.55);
        return (u > 0.3 && u < 1.5 && v > 4 && v < 40) ? mul(wood, 0.72) : mul(wood, 0.62);
      },
      top: woodHi,
    });
    outline(L, P.outline);
    L.flush();
    return L.c;
  }

  function buildBonsai() {
    var L = makeLayer();
    var wood = hex("#8a5a3c");
    [[0.38, 6.28], [1.3, 6.28], [0.38, 7.2], [1.3, 7.2]].forEach(function (p) {
      solidBox(L, p[0], p[1], 0, p[0] + 0.14, p[1] + 0.14, 5, mul(wood, 0.8));
    });
    box(L, 0.3, 6.2, 5, 1.5, 7.4, 7, { top: mul(wood, 1.2), fy: wood, fx: mul(wood, 0.76) });
    box(L, 0.55, 6.45, 7, 1.25, 7.15, 10.5, { top: hex("#5a6785"), fy: hex("#43506b"), fx: hex("#35405a") });
    box(L, 0.5, 6.4, 10.5, 1.3, 7.2, 11.4, { top: hex("#2b2230"), fy: hex("#6c7a98"), fx: hex("#515f7d") });
    // trunk + blossoms
    var c = proj(0.9, 6.8, 11.2);
    var cx = Math.round(c[0]), cy = Math.round(c[1]);
    var trunk = hex("#4f3225");
    [[0, 0], [0, -1], [-1, -2], [-1, -3], [0, -4], [1, -5], [1, -6], [-2, -4], [-3, -5], [2, -6], [3, -7]].forEach(function (p) { L.set(cx + p[0], cy + p[1], trunk); });
    var blobs = [[0, -12, 5.5], [-6, -8, 4.2], [6, -9, 4.4], [1, -7, 3.2], [-3, -15, 3]];
    var petal = [hex("#f0a3bd"), hex("#ffd3df"), hex("#d9779a"), hex("#6c9a58")];
    blobs.forEach(function (bl, bi) {
      for (var dy = -7; dy <= 7; dy++) for (var dx = -8; dx <= 8; dx++) {
        if (dx * dx + dy * dy * 1.15 <= bl[2] * bl[2]) {
          var px = cx + bl[0] + dx, py = cy + bl[1] + dy;
          var r = h2(px * 3 + bi, py);
          var col = petal[0];
          if (dx + dy < -bl[2] * 0.4) col = petal[1];
          if (r > 0.78) col = petal[1];
          else if (r < 0.14) col = petal[2];
          else if (r > 0.7 && r <= 0.74 && dy > 0) col = petal[3];
          L.set(px, py, col);
        }
      }
    });
    outline(L, P.outline);
    L.flush();
    return L.c;
  }

  function buildScreen() {
    var L = makeLayer();
    var BL = [[0.4, 9.0, 9.93], [1.05, 9.93, 10.87], [0.4, 10.87, 11.8]];
    var blossoms = [[9.4, 24], [9.8, 31], [10.3, 36], [10.6, 27], [11.0, 33], [11.4, 22], [10.1, 16], [11.3, 12], [9.5, 13]];
    var paper = hex("#efe2c0"), paperDk = hex("#e0d0a6");
    function paint(u, v, sx, sy, x, y, z) {
      var ph = 40, ee = 1.2;
      // frame
      var e = Math.min(z, ph - z);
      if (e < ee) return hex("#4a2a20");
      var base = z > ph - 4 ? paperDk : paper;
      // branch
      var z0 = 6 + (y - 9) * 7;
      if (Math.abs(z - z0) < 0.7 && z < 36) return hex("#6a4533");
      for (var i = 0; i < blossoms.length; i++) {
        var dy = (y - blossoms[i][0]) * 8, dz = z - blossoms[i][1];
        var d = dy * dy + dz * dz * 0.8;
        if (d < 2.4) return hex("#ee86a8");
        if (d < 5) return hex("#fbc6d5");
      }
      return base;
    }
    // panel faces
    BL.forEach(function (p) {
      faceX(L, p[0], p[1], p[2], 0, 40, function (u, v, sx, sy, x, y, z) {
        var edge = Math.min((y - p[1]) * 8, (p[2] - y) * 8);
        if (edge < 1) return hex("#4a2a20");
        return paint(u, v, sx, sy, x, y, z);
      });
    });
    // connectors (the fold)
    faceY(L, 9.93, 0.4, 1.05, 0, 40, function (u, v, sx, sy, x, y, z) { return z < 1.2 || z > 38.8 ? hex("#4a2a20") : mul(paper, 0.78); });
    faceY(L, 10.87, 0.4, 1.05, 0, 40, function (u, v, sx, sy, x, y, z) { return z < 1.2 || z > 38.8 ? hex("#4a2a20") : mul(paper, 0.72); });
    outline(L, P.outline);
    L.flush();
    return L.c;
  }

  function buildLantern() {
    var L = makeLayer();
    var dark = hex("#4a2d22");
    solidBox(L, 10.35, 9.35, 0, 10.95, 9.95, 2, dark);
    box(L, 10.4, 9.4, 2, 10.9, 9.9, 17, {
      fx: function (u, v) { return (Math.floor(u * 8) % 2 === 0 || Math.floor(v) % 5 === 0) ? hex("#ffd98a") : hex("#fff1c9"); },
      fy: function (u, v) { return (Math.floor(u * 8) % 2 === 0 || Math.floor(v) % 5 === 0) ? hex("#ffe29c") : hex("#fff4d4"); },
      top: hex("#fff6dc"),
    });
    box(L, 10.3, 9.3, 17, 11.0, 10.0, 19, { top: mul(dark, 1.4), fy: dark, fx: mul(dark, 0.8) });
    outline(L, P.outline);
    L.flush();
    return L.c;
  }

  /* ------------------------------------------------------------------ *
   *  build everything
   * ------------------------------------------------------------------ */
  var baseCanvas = buildBase();
  var windowView = makeLayer();
  var monPix = monitorPixels();
  (function collectWindow() {
    var X0 = WIN.x0, X1 = WIN.x1, Z0 = WIN.z0, Z1 = WIN.z1, Y = 0;
    var b = bounds([proj(X0, Y, Z0), proj(X1, Y, Z0), proj(X1, Y, Z1), proj(X0, Y, Z1)]);
    for (var sy = b[2]; sy <= b[3]; sy++) {
      for (var sx = b[0]; sx <= b[1]; sx++) {
        var x = Y + (sx + 0.5 - OX) / 8;
        var z = OY + (x + Y) * 4 - (sy + 0.5);
        if (x >= X0 - 0.25 && x < X1 + 0.25 && z >= Z0 - 2.5 && z < Z1 + 2.5) {
          winPixels.push([sx, sy, clamp((x - X0) / (X1 - X0), 0, 1), clamp((z - Z0) / (Z1 - Z0), 0, 1)]);
        }
      }
    }
  })();
  var lastWinStamp = -1;
  function renderWindow(t) {
    var stamp = Math.floor(t / 260);
    if (stamp === lastWinStamp) return;
    lastWinStamp = stamp;
    var tt = reduceMotion ? 0 : t / 1000;
    for (var i = 0; i < winPixels.length; i++) {
      var p = winPixels[i];
      windowView.set(p[0], p[1], viewColor(p[2], p[3], tt, p[0], p[1]));
    }
    windowView.flush();
  }

  var layers = {
    desk: buildDesk(), chair: buildChair(), bed: buildBed(), cab: buildCabinet(),
    bonsai: buildBonsai(), screen: buildScreen(), lantern: buildLantern(),
  };

  /* ------------------------------------------------------------------ *
   *  sprites
   * ------------------------------------------------------------------ */
  var charPal = SPR.PAL;
  var CH = {};
  ["idle", "blink", "walkA", "walkB"].forEach(function (n) {
    var rows = SPR.charFrame(n === "idle" ? null : n);
    CH[n] = SPR.toCanvas(rows, charPal, false);
    CH[n + "F"] = SPR.toCanvas(rows, charPal, true);
  });
  var CHAR_W = CH.idle.width, CHAR_H = CH.idle.height;
  var petSprites = {
    dogSleep: SPR.toCanvas(SPR.DOG_SLEEP, SPR.PET_PAL, false),
    ratSleep: SPR.toCanvas(SPR.RAT_SLEEP, SPR.PET_PAL, false),
    dogAwake: SPR.toCanvas(SPR.DOG_AWAKE, SPR.PET_PAL, false),
    dogTail: SPR.toCanvas(SPR.DOG_TAIL, SPR.PET_PAL, false),
    ratAwake: SPR.toCanvas(SPR.RAT_AWAKE, SPR.PET_PAL, false),
    heart: SPR.toCanvas(SPR.HEART_SMALL, { p: "#ff7fa6" }, false),
    z: SPR.toCanvas(SPR.Z_SMALL, { z: "#fff7fb" }, false),
  };

  /* ------------------------------------------------------------------ *
   *  state, world objects, ordering
   * ------------------------------------------------------------------ */
  var state = {
    x: 6.6, y: 7.0, flip: false, moving: false, frame: 0, blinkUntil: 0,
    pets: "sleep", petsSince: 0, pcFlash: 0, pcFlashUntil: 0,
  };
  var objects = [
    { n: "desk", box: [0, 0.5, 2.0, 5.0], layer: layers.desk, post: drawMonitor },
    { n: "chair", box: [2.1, 2.1, 3.1, 3.1], layer: layers.chair },
    { n: "bed", box: [3.6, 0.2, 9.2, 3.2], layer: layers.bed, post: drawPets },
    { n: "cab", box: [9.7, 0.2, 11.8, 2.0], layer: layers.cab },
    { n: "bonsai", box: [0.3, 6.2, 1.5, 7.4], layer: layers.bonsai },
    { n: "screen", box: [0.3, 9.0, 1.5, 11.8], layer: layers.screen },
    { n: "lantern", box: [10.3, 9.3, 11.0, 10.0], layer: layers.lantern },
  ];
  var charObj = { n: "char", box: [0, 0, 0, 0], draw: drawChar };

  function behind(a, b) { return a.box[2] <= b.box[0] || a.box[3] <= b.box[1]; }
  function order(items) {
    var out = [], seen = [];
    function visit(i) {
      if (seen[i]) return;
      seen[i] = 1;
      for (var j = 0; j < items.length; j++) {
        if (j !== i && behind(items[j], items[i]) && !behind(items[i], items[j])) visit(j);
      }
      out.push(items[i]);
    }
    for (var i = 0; i < items.length; i++) visit(i);
    return out;
  }

  /* monitor screen (dynamic) */
  function drawMonitor(t) {
    var flash = state.pcFlashUntil > t;
    var phase = flash ? Math.floor((state.pcFlashUntil - t) / 130) % 2 : -1;
    for (var i = 0; i < monPix.length; i++) {
      var p = monPix[i], u = p[2], v = p[3], c;
      if (flash) {
        c = phase === 0 ? "#ffffff" : "#15122e";
        if (phase === 0 && v > 0.5) c = "#ffe3ee";
      } else {
        c = "#2d3162";
        if (v > 0.84) c = "#403b7e";
        else if (u < 0.2) c = "#363468";
        else if (v > 0.44 && v < 0.76 && u > 0.28 && u < 0.6) c = "#f0a9bf";
        else if (v > 0.44 && v < 0.76 && u > 0.66 && u < 0.92) c = "#f7efe0";
        else if ((Math.abs(v - 0.3) < 0.05 || Math.abs(v - 0.16) < 0.05) && u > 0.28 && u < 0.9) c = "#8f86c9";
        else if (v < 0.12 && u > 0.28 && u < 0.34 && Math.floor(t / 520) % 2 === 0) c = "#ffffff";
        else if (u > 0.04 && u < 0.14 && v > 0.55 && v < 0.7) c = "#f0a9bf";
      }
      ctx.fillStyle = c;
      ctx.fillRect(p[0], p[1], 1, 1);
    }
  }

  /* pets on the bed (dynamic) */
  var petAnchor = proj(6.5, 2.0, BED.top);
  function drawPets(t) {
    var ax = Math.round(petAnchor[0]), ay = Math.round(petAnchor[1]);
    if (state.pets === "sleep") {
      var br = reduceMotion ? 0 : Math.floor(t / 900) % 2; // breathing
      ctx.drawImage(petSprites.dogSleep, ax - 11, ay - 8 - br);
      ctx.drawImage(petSprites.ratSleep, ax - 10, ay - 4 - (1 - br));
      if (!reduceMotion) {
        for (var k = 0; k < 2; k++) {
          var ph = ((t / 1800) + k * 0.5) % 1;
          ctx.globalAlpha = 1 - ph;
          ctx.drawImage(petSprites.z, ax - 12 + Math.round(ph * 6) + k * 3, ay - 20 - Math.round(ph * 10));
        }
        ctx.globalAlpha = 1;
      }
    } else {
      var dt = (t - state.petsSince) / 1000;
      var hop = reduceMotion ? 0 : Math.abs(Math.sin(dt * 7)) * 3 * (dt < 3 ? 1 : 0.3);
      var wag = Math.floor(t / 150) % 2;
      ctx.drawImage(petSprites.dogTail, ax + 6 + wag, ay - 9 - Math.round(hop));
      ctx.drawImage(petSprites.dogAwake, ax - 7, ay - 14 - Math.round(hop));
      ctx.drawImage(petSprites.ratAwake, ax + 5, ay - 9 - Math.round(Math.abs(Math.sin(dt * 9 + 1)) * 3));
      if (!reduceMotion) {
        for (var h = 0; h < 3; h++) {
          var hp = ((dt * 0.7) + h / 3) % 1;
          ctx.globalAlpha = 1 - hp;
          ctx.drawImage(petSprites.heart, ax - 12 + h * 9 + Math.round(Math.sin(dt * 3 + h) * 2), ay - 22 - Math.round(hp * 14));
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  /* character */
  var charScreen = { x: 0, y: 0 };
  function drawChar(t) {
    var p = proj(state.x, state.y, 0);
    var fx = Math.round(p[0]), fy = Math.round(p[1]);
    charScreen.x = fx; charScreen.y = fy;
    // shadow
    ctx.fillStyle = "rgba(30,8,18,0.28)";
    ctx.fillRect(fx - 4, fy - 1, 9, 1);
    ctx.fillRect(fx - 6, fy, 13, 1);
    ctx.fillRect(fx - 4, fy + 1, 9, 1);
    var name = "idle", bob = 0;
    if (state.moving) {
      var step = Math.floor(t / 150) % 2;
      name = step ? "walkA" : "walkB";
      bob = step ? 1 : 0;
    } else if (state.blinkUntil > t) {
      name = "blink";
    }
    var spr = CH[name + (state.flip ? "F" : "")];
    ctx.drawImage(spr, fx - Math.floor(CHAR_W / 2), fy - CHAR_H + 1 - bob);
  }

  /* ------------------------------------------------------------------ *
   *  light beam, dust, atmosphere
   * ------------------------------------------------------------------ */
  function hull(points) {
    var pts = points.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    var lower = [], upper = [], i;
    for (i = 0; i < pts.length; i++) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 0) lower.pop(); lower.push(pts[i]); }
    for (i = pts.length - 1; i >= 0; i--) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0) upper.pop(); upper.push(pts[i]); }
    upper.pop(); lower.pop();
    return lower.concat(upper);
  }
  var beamPts = [];
  (function () {
    [[SUN.wx0, SUN.wz1], [SUN.wx1, SUN.wz1], [SUN.wx1, SUN.wz0], [SUN.wx0, SUN.wz0]].forEach(function (w) {
      beamPts.push(proj(w[0], 0, w[1]));
      var y = w[1] / SUN.b;
      beamPts.push(proj(w[0] + SUN.a * y, y, 0));
    });
  })();
  var beamHull = hull(beamPts);

  var motes = [];
  for (var mi = 0; mi < 16; mi++) {
    motes.push({ xw: SUN.wx0 + h2(mi, 1) * 4.2, zw: SUN.wz0 + h2(mi, 2) * 26, s: h2(mi, 3), sp: 0.015 + h2(mi, 4) * 0.02, ph: h2(mi, 5) * 6 });
  }

  function drawBeam(t) {
    ctx.save();
    ctx.beginPath();
    beamHull.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
    ctx.closePath();
    ctx.fillStyle = "rgba(255,238,188,0.15)";
    ctx.fill();
    ctx.restore();
    if (reduceMotion) return;
    var ts = t / 1000;
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      var s = (m.s + ts * m.sp) % 1;
      var y = s * (m.zw / SUN.b);
      var x = m.xw + SUN.a * y + Math.sin(ts * 0.8 + m.ph) * 0.12;
      var z = m.zw - SUN.b * y;
      var p = proj(x, y, z);
      var a = 0.25 + 0.55 * Math.abs(Math.sin(ts * 1.4 + m.ph));
      ctx.fillStyle = "rgba(255,250,232," + a.toFixed(2) + ")";
      ctx.fillRect(Math.round(p[0]), Math.round(p[1]), 1, 1);
    }
  }

  var lanternC = proj(10.65, 9.65, 10);
  function drawAtmosphere(t) {
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    // warm lantern glow
    var fl = reduceMotion ? 0 : Math.sin(t / 380) * 0.015 + Math.sin(t / 130) * 0.01;
    var g = ctx.createRadialGradient(lanternC[0], lanternC[1], 2, lanternC[0], lanternC[1], 34);
    g.addColorStop(0, "rgba(255,196,120," + (0.32 + fl).toFixed(3) + ")");
    g.addColorStop(1, "rgba(255,196,120,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // slightly darkened room: vignette
    var v = ctx.createRadialGradient(OX, 96, 36, OX, 96, 122);
    v.addColorStop(0, "rgba(34,8,26,0)");
    v.addColorStop(1, "rgba(34,8,26,0.34)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(40,12,30,0.08)";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /* ------------------------------------------------------------------ *
   *  frame loop
   * ------------------------------------------------------------------ */
  function render(t) {
    ctx.clearRect(0, 0, W, H);
    renderWindow(t);
    ctx.drawImage(windowView.c, 0, 0);
    ctx.drawImage(baseCanvas, 0, 0);
    charObj.box = [state.x - 0.3, state.y - 0.3, state.x + 0.3, state.y + 0.3];
    var list = order(objects.concat([charObj]));
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o.layer) ctx.drawImage(o.layer, 0, 0);
      if (o.post) o.post(t);
      if (o.draw) o.draw(t);
    }
    drawBeam(t);
    drawAtmosphere(t);
    screenCtx.imageSmoothingEnabled = false;
    screenCtx.clearRect(0, 0, canvas.width, canvas.height);
    screenCtx.drawImage(buf, 0, 0, canvas.width, canvas.height);
    positionBubble();
  }

  /* ------------------------------------------------------------------ *
   *  path finding (grid 0.5)
   * ------------------------------------------------------------------ */
  var OBST = [
    [-0.45, 0.05, 2.45, 5.45],   // desk
    [1.65, 1.65, 3.55, 3.55],    // chair
    [3.15, -0.25, 9.65, 3.65],   // bed
    [9.25, -0.25, 12.25, 2.45],  // cabinet
    [-0.15, 5.75, 1.95, 7.85],   // bonsai
    [-0.15, 8.55, 1.95, 12.25],  // screen
    [9.85, 8.85, 11.45, 10.45],  // lantern
  ];
  var CELL = 0.5, GN = 24;
  function blocked(x, y) {
    if (x < 0.55 || y < 0.55 || x > 11.45 || y > 11.45) return true;
    for (var i = 0; i < OBST.length; i++) {
      var o = OBST[i];
      if (x > o[0] && x < o[2] && y > o[1] && y < o[3]) return true;
    }
    return false;
  }
  function nearestFree(x, y) {
    var best = null, bd = 1e9;
    for (var gy = 0; gy < GN; gy++) for (var gx = 0; gx < GN; gx++) {
      var cx = (gx + 0.5) * CELL, cy = (gy + 0.5) * CELL;
      if (blocked(cx, cy)) continue;
      var d = (cx - x) * (cx - x) + (cy - y) * (cy - y);
      if (d < bd) { bd = d; best = [gx, gy]; }
    }
    return best;
  }
  function lineClear(a, b) {
    var d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.ceil(d / 0.1));
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      if (blocked(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false;
    }
    return true;
  }
  function findPath(from, to) {
    var s = nearestFree(from[0], from[1]), g = nearestFree(to[0], to[1]);
    var dist = {}, prev = {}, open = [[0, s[0], s[1]]];
    dist[s[0] + "," + s[1]] = 0;
    var dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.41], [1, -1, 1.41], [-1, 1, 1.41], [-1, -1, 1.41]];
    while (open.length) {
      open.sort(function (a, b) { return a[0] - b[0]; });
      var cur = open.shift();
      var ck = cur[1] + "," + cur[2];
      if (cur[1] === g[0] && cur[2] === g[1]) break;
      if (cur[0] > dist[ck]) continue;
      for (var i = 0; i < dirs.length; i++) {
        var nx = cur[1] + dirs[i][0], ny = cur[2] + dirs[i][1];
        if (nx < 0 || ny < 0 || nx >= GN || ny >= GN) continue;
        var wx = (nx + 0.5) * CELL, wy = (ny + 0.5) * CELL;
        if (blocked(wx, wy)) continue;
        if (dirs[i][2] > 1 && (blocked((cur[1] + 0.5) * CELL + dirs[i][0] * CELL, (cur[2] + 0.5) * CELL) || blocked((cur[1] + 0.5) * CELL, (cur[2] + 0.5) * CELL + dirs[i][1] * CELL))) continue;
        var nd = cur[0] + dirs[i][2], nk = nx + "," + ny;
        if (dist[nk] === undefined || nd < dist[nk]) {
          dist[nk] = nd; prev[nk] = ck; open.push([nd, nx, ny]);
        }
      }
    }
    var cells = [], k = g[0] + "," + g[1];
    if (dist[k] === undefined) return [from, to];
    while (k) { var pr = k.split(","); cells.unshift([(+pr[0] + 0.5) * CELL, (+pr[1] + 0.5) * CELL]); k = prev[k]; }
    var pts = [from].concat(cells, [to]);
    // string-pull smoothing
    var out = [pts[0]], i2 = 0;
    while (i2 < pts.length - 1) {
      var j = pts.length - 1;
      while (j > i2 + 1 && !lineClear(pts[i2], pts[j])) j--;
      out.push(pts[j]); i2 = j;
    }
    return out;
  }

  /* walking */
  var walker = null;
  var SPEED = 4.2;
  function walk(path, token) {
    return new Promise(function (resolve) {
      if (reduceMotion) {
        var last = path[path.length - 1];
        state.x = last[0]; state.y = last[1]; state.moving = false;
        resolve(); return;
      }
      walker = { path: path, i: 1, token: token, resolve: resolve };
      state.moving = true;
    });
  }
  function stepWalker(dt) {
    if (!walker) return;
    var w = walker, tgt = w.path[w.i];
    if (!tgt) { finishWalk(); return; }
    var dx = tgt[0] - state.x, dy = tgt[1] - state.y, d = Math.hypot(dx, dy);
    var move = SPEED * dt;
    if (d <= move) {
      state.x = tgt[0]; state.y = tgt[1]; w.i++;
      if (w.i >= w.path.length) finishWalk();
    } else {
      state.x += (dx / d) * move; state.y += (dy / d) * move;
      var sdx = dx - dy;
      if (Math.abs(sdx) > 0.01) state.flip = sdx < 0;
    }
  }
  function finishWalk() {
    var w = walker; walker = null; state.moving = false; state.flip = false;
    if (w) w.resolve();
  }
  function cancelWalk() {
    if (walker) { var w = walker; walker = null; state.moving = false; w.resolve(); }
  }

  /* ------------------------------------------------------------------ *
   *  bubble
   * ------------------------------------------------------------------ */
  var lang = document.documentElement.lang === "en" ? "en" : "ru";
  var currentKey = null, typeTimer = null;
  function texts() { var d = window.PORTFOLIO_I18N && window.PORTFOLIO_I18N[lang]; return (d && d.room) || { bubbles: {}, spots: {} }; }

  function showBubble(key) {
    currentKey = key;
    var text = texts().bubbles[key] || "";
    clearInterval(typeTimer);
    bubble.hidden = false;
    liveEl.textContent = text;
    var i = 0;
    function put(n) { bubbleShown.textContent = text.slice(0, n); bubbleRest.textContent = text.slice(n); }
    if (reduceMotion) { put(text.length); } else {
      put(0);
      typeTimer = setInterval(function () {
        i += 1; put(i);
        if (i >= text.length) clearInterval(typeTimer);
      }, 24);
    }
    bubble.classList.remove("is-in");
    void bubble.offsetWidth;
    bubble.classList.add("is-in");
    positionBubble();
  }
  function hideBubble() {
    clearInterval(typeTimer);
    currentKey = null;
    bubble.hidden = true;
  }
  function positionBubble() {
    if (bubble.hidden) return;
    var sw = stage.clientWidth, k = sw / W;
    var maxW = Math.min(300, sw * 0.7);
    bubble.style.maxWidth = maxW + "px";
    var ax = charScreen.x * k, ay = (charScreen.y - CHAR_H - 2) * k;
    var bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    var sh = stage.clientHeight;
    var topAbove = Math.max(4, ay - bh - 14);
    var topBelow = Math.min(sh - bh - 4, charScreen.y * k + 16);
    var xs = [ax - bw / 2, ax - bw + 34, ax - 34];
    // try above the head, then below the feet, at a few offsets; keep the one that hides the fewest hotspots
    var tries = [];
    xs.forEach(function (x) { tries.push({ x: x, top: topAbove, below: false }); });
    xs.forEach(function (x) { tries.push({ x: x, top: topBelow, below: true }); });
    var pick = null, best = 999;
    for (var ci = 0; ci < tries.length && best > 0; ci++) {
      var tr = tries[ci], cl = clamp(tr.x, 6, sw - bw - 6), hits = tr.below ? 0.5 : 0;
      if (ax < cl + 20 || ax > cl + bw - 20) hits += 50;
      for (var si = 0; si < SPOTS.length; si++) {
        var sp = SPOTS[si];
        if (!sp.p) continue;
        var spx = sp.p[0] * k, spy = sp.p[1] * k;
        if (spx > cl - 16 && spx < cl + bw + 16 && spy > tr.top - 16 && spy < tr.top + bh + 16) hits += 1;
      }
      if (hits < best) { best = hits; pick = { left: cl, top: tr.top, below: tr.below }; }
    }
    bubble.classList.toggle("is-below", pick.below);
    bubble.style.left = Math.round(pick.left) + "px";
    bubble.style.top = Math.round(pick.top) + "px";
    bubbleTail.style.left = Math.round(clamp(ax - pick.left, 22, bw - 22)) + "px";
  }

  /* ------------------------------------------------------------------ *
   *  hotspots + story
   * ------------------------------------------------------------------ */
  var SPOTS = [
    { id: "pc", at: [1.0, 3.4, 22], stand: [3.0, 3.95], arrive: arrivePc },
    { id: "pets", at: [6.4, 2.0, 32], stand: [5.1, 4.7], arrive: arrivePets },
    { id: "window", at: [6.3, 0, 41], stand: [5.5, 4.5] },
    { id: "games", at: [10.75, 2.0, 25], stand: [10.9, 3.3] },
    { id: "poster", at: [0, 7.55, 40], stand: [2.7, 7.6] },
  ];
  var spotEls = {};
  SPOTS.forEach(function (s) {
    var p = proj(s.at[0], s.at[1], s.at[2]);
    s.p = p;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "spot";
    b.dataset.spot = s.id;
    b.style.left = (p[0] / W * 100).toFixed(3) + "%";
    b.style.top = (p[1] / H * 100).toFixed(3) + "%";
    b.innerHTML = '<span class="spot__ring"></span><span class="spot__dot"></span>';
    b.addEventListener("click", function () { visit(s); });
    spotsEl.appendChild(b);
    spotEls[s.id] = b;
  });
  function labelSpots() {
    var t = texts();
    SPOTS.forEach(function (s) { spotEls[s.id].setAttribute("aria-label", (t.spots && t.spots[s.id]) || s.id); });
  }

  var seq = 0, petTimer = null;
  function wait(ms, token) {
    return new Promise(function (res) { setTimeout(res, reduceMotion ? Math.min(ms, 60) : ms); }).then(function () { return token === seq; });
  }
  function arrivePc(token) {
    state.pcFlashUntil = performance.now() + (reduceMotion ? 0 : 1000);
    return wait(reduceMotion ? 0 : 1000, token);
  }
  function arrivePets(token) {
    state.pets = "awake"; state.petsSince = performance.now();
    clearTimeout(petTimer);
    petTimer = setTimeout(function () { state.pets = "sleep"; }, 16000);
    return wait(900, token);
  }
  function visit(spot) {
    var token = ++seq;
    cancelWalk();
    hideBubble();
    if (spot.id !== "pets" && state.pets === "awake") { state.pets = "sleep"; clearTimeout(petTimer); }
    spotEls[spot.id].classList.add("is-active");
    Object.keys(spotEls).forEach(function (k) { if (k !== spot.id) spotEls[k].classList.remove("is-active"); });
    var path = findPath([state.x, state.y], spot.stand);
    walk(path, token).then(function () {
      if (token !== seq) return;
      return spot.arrive ? spot.arrive(token) : wait(250, token);
    }).then(function (ok) {
      if (ok === false || token !== seq) return;
      showBubble(spot.id === "games" ? "games" : spot.id);
      spotEls[spot.id].classList.remove("is-active");
      spotEls[spot.id].classList.add("is-done");
    });
  }

  /* ------------------------------------------------------------------ *
   *  sizing, loop, language
   * ------------------------------------------------------------------ */
  function fit() {
    var avail = host.clientWidth || W * 2;
    var scale = Math.max(1, Math.min(4, avail / W));
    var k = Math.ceil(scale - 0.001);
    canvas.width = W * k;
    canvas.height = H * k;
    var w = Math.round(W * scale), h = Math.round(H * scale);
    stage.style.width = w + "px";
    stage.style.height = h + "px";
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
  }

  var running = false, last = 0, raf = 0, visible = true;
  function loop(now) {
    if (!running) return;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    stepWalker(dt);
    if (!reduceMotion && !state.moving && state.blinkUntil < now && Math.random() < dt * 0.3) state.blinkUntil = now + 140;
    render(now);
    raf = requestAnimationFrame(loop);
  }
  function start() { if (running || !visible || document.hidden) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; visible ? start() : stop(); }, { threshold: 0.01 }).observe(host);
  }
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  window.addEventListener("resize", function () { fit(); render(performance.now()); });

  // clicking the empty stage closes the bubble
  stage.addEventListener("click", function (e) { if (e.target === canvas) hideBubble(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") hideBubble(); });

  window.RoomGame = {
    setLang: function (l) {
      lang = l === "en" ? "en" : "ru";
      labelSpots();
      if (currentKey && !bubble.hidden) {
        var tx = texts().bubbles[currentKey] || "";
        clearInterval(typeTimer);
        bubbleShown.textContent = tx; bubbleRest.textContent = "";
        liveEl.textContent = tx;
      }
    },
    say: showBubble,
  };

  fit();
  labelSpots();
  render(performance.now());
  start();
  // first greeting
  setTimeout(function () { if (!currentKey) showBubble("hint"); }, reduceMotion ? 0 : 900);
})();
