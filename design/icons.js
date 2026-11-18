/* Pixel icons — same language as the heart from Figma (node 78:112):
   pale pink pixels (#e6c9cb) on a burgundy tile (#793133).
   Sprites follow the character reference (node 79:212). */
(function () {
  "use strict";

  var ICONS = {
    heart: [
      ".XX..XX.",
      "XXXXXXXX",
      "XXXXXXXX",
      "XXXXXXXX",
      ".XXXXXX.",
      "..XXXX..",
      "...XX...",
    ],
    clock: [
      "..XXXX..",
      ".XX..XX.",
      "XX..X..X",
      "X...X..X",
      "X...XXXX",
      "X......X",
      ".XX..XX.",
      "..XXXX..",
    ],
    bolt: [
      "....XXX.",
      "...XXX..",
      "..XXX...",
      ".XXXXXX.",
      "...XXX..",
      "..XXX...",
      ".XXX....",
      ".XX.....",
    ],
    bulb: [
      "..XXXX..",
      ".XXXXXX.",
      "XXX..XXX",
      "XXX..XXX",
      ".XXXXXX.",
      "..XXXX..",
      "..X..X..",
      "...XX...",
    ],
    spark: [
      "...XX...",
      "...XX...",
      "..XXXX..",
      "XXXXXXXX",
      "XXXXXXXX",
      "..XXXX..",
      "...XX...",
      "...XX...",
    ],
    book: [
      "XXX..XXX",
      "XXXXXXXX",
      "XX.XX.XX",
      "XXXXXXXX",
      "XX.XX.XX",
      "XXXXXXXX",
      ".XXXXXX.",
    ],
    trophy: [
      "XXXXXXXX",
      "X.XXXX.X",
      "X.XXXX.X",
      ".XXXXXX.",
      "..XXXX..",
      "...XX...",
      "..XXXX..",
      ".XXXXXX.",
    ],
    chat: [
      ".XXXXXX.",
      "XXXXXXXX",
      "X.X.X.XX",
      "XXXXXXXX",
      ".XXXXXX.",
      "..XX....",
      ".X......",
    ],
    star: [
      "...XX...",
      "...XX...",
      "XXXXXXXX",
      ".XXXXXX.",
      "..XXXX..",
      ".XXXXXX.",
      ".XX..XX.",
      ".X....X.",
    ],
    cap: [
      "...XX...",
      ".XXXXXX.",
      "XXXXXXXX",
      ".XXXXXXX",
      "..XXXX.X",
      "..XXXX.X",
      ".......X",
    ],
    mail: [
      "XXXXXXXX",
      "XXX..XXX",
      "XX.XX.XX",
      "X.XXXX.X",
      "X......X",
      "XXXXXXXX",
    ],
    phone: [
      ".XXXXXX.",
      ".X....X.",
      ".X....X.",
      ".X....X.",
      ".X....X.",
      ".X....X.",
      ".XXXXXX.",
      ".XX..XX.",
    ],
    plane: [
      ".......X",
      ".....XXX",
      "...XXXXX",
      ".XXXXXXX",
      "XXXXXXX.",
      "..XXXX..",
      "...XXX..",
      "....XX..",
    ],
    camera: [
      ".XXXXXX.",
      "X......X",
      "X..XX..X",
      "X.X..X.X",
      "X.X..X.X",
      "X..XX..X",
      "X......X",
      ".XXXXXX.",
    ],
    link: [
      ".X......",
      "........",
      ".X.XXX..",
      ".X.X..X.",
      ".X.X..X.",
      ".X.X..X.",
      ".X.X..X.",
    ],
    /* outlined chevron from the reference */
    arrow: [
      ".XX.....",
      "X..X....",
      ".X..X...",
      "..X..X..",
      "...X..X.",
      "....X..X",
      "...X..X.",
      "..X..X..",
      ".X..X...",
      "X..X....",
      ".XX.....",
    ],
    plus: [
      "...XX...",
      "...XX...",
      "XXXXXXXX",
      "XXXXXXXX",
      "...XX...",
      "...XX...",
    ],
  };

  /* colour sprites: one char per pixel, "." is transparent */
  var PALETTE = {
    o: "#3b1a1b",
    h: "#7b4a2f",
    p: "#f29db4",
    w: "#fff4f2",
    s: "#ffdccb",
    b: "#f59aa6",
    e: "#3f6fb5",
    r: "#c9566b",
    t: "#f7bfd0",
    m: "#9fd8bf",
    k: "#521617",
    c: "#2a1c22",
    y: "#ffd95a",
    g: "#c9c2b8",
    v: "#7b4a2f",
    R: "#d9434f",
    L: "#e8577a",
  };

  var DASHA_TOP = [
    "....oooooo....",
    "...opwpwpwo...",
    "..opwpwpwpwo..",
    "..ohhhhhhhho..",
    ".ohhsssssshho.",
    ".ohseesseesho.",
    ".ohsbssssbsho.",
    ".ohhssrrsshho.",
    ".ohhhossohhho.",
    "ohhottttttohho",
    "ohottttttttoho",
    "osottttttttoso",
    "osottttttttoso",
    ".oommmmmmmmoo.",
    ".ommmmmmmmmmo.",
    ".oooooooooooo.",
  ];

  var SPRITES = {
    dasha: DASHA_TOP.concat([
      "...oso..oso...",
      "...oso..oso...",
      "..okko..okko..",
      "..oooo..oooo..",
    ]),
    dashaWalk: DASHA_TOP.concat([
      "...oso..oso...",
      "..okko..oso...",
      "..oooo.okko...",
      ".......oooo...",
    ]),
    cat: [
      "c.....c..",
      "cc...cc..",
      "ccccccc.c",
      "cyccycc.c",
      "ccccccccc",
      ".ccccccc.",
      ".c.c.c.c.",
    ],
    idea: [
      "..ooooo..",
      ".oyyyyyo.",
      "oywyyyyyo",
      "oyyyyyyyo",
      ".oyyyyyo.",
      "..oyyyo..",
      "..ogggo..",
      "..ogggo..",
      "...ooo...",
    ],
    coffee: [
      ".........",
      "..w.w....",
      "...w.w...",
      "ooooooo..",
      "ovvvvvoo.",
      "owwwwwo.o",
      "owwwwwoo.",
      ".owwwo...",
      "..ooo....",
    ],
    like: [
      ".oo...oo.",
      "oLLo.oLLo",
      "oLwLoLLLo",
      "oLLLLLLLo",
      ".oLLLLLo.",
      "..oLLLo..",
      "...oLo...",
      "....o....",
    ],
    bug: [
      "ooooooooo",
      "oRRRwRRRo",
      "oRRRwRRRo",
      "oRRRwRRRo",
      "oRRRRRRRo",
      "oRRRwRRRo",
      "ooooooooo",
      ".oRo.....",
      ".oo......",
    ],
  };

  function pathFor(rows, ox, oy) {
    var d = "";
    for (var y = 0; y < rows.length; y++) {
      for (var x = 0; x < rows[y].length; x++) {
        if (rows[y][x] === "X") d += "M" + (x + ox) + " " + (y + oy) + "h1v1h-1z";
      }
    }
    return d;
  }

  /* burgundy tile + pale pink pixels (the Figma icon look) */
  function tile(name, extraClass) {
    var rows = ICONS[name];
    if (!rows) return "";
    var w = rows[0].length;
    var h = rows.length;
    var ox = Math.floor((12 - w) / 2);
    var oy = Math.floor((12 - h) / 2);
    return (
      '<svg class="pxicon ' + (extraClass || "") + '" viewBox="0 0 12 12" aria-hidden="true" focusable="false" shape-rendering="crispEdges">' +
      '<rect width="12" height="12" rx="0.7" fill="#793133"/>' +
      '<path fill="#e6c9cb" d="' + pathFor(rows, ox, oy) + '"/></svg>'
    );
  }

  /* bare glyph, colored by currentColor */
  function glyph(name, extraClass) {
    var rows = ICONS[name];
    if (!rows) return "";
    return (
      '<svg class="pxglyph ' + (extraClass || "") + '" viewBox="0 0 ' + rows[0].length + " " + rows.length +
      '" aria-hidden="true" focusable="false" shape-rendering="crispEdges">' +
      '<path fill="currentColor" d="' + pathFor(rows, 0, 0) + '"/></svg>'
    );
  }

  /* colour sprite as inline svg */
  function sprite(name, extraClass) {
    var rows = SPRITES[name];
    if (!rows) return "";
    var byColor = {};
    rows.forEach(function (r, y) {
      for (var x = 0; x < r.length; x++) {
        var col = PALETTE[r[x]];
        if (col) byColor[col] = (byColor[col] || "") + "M" + x + " " + y + "h1v1h-1z";
      }
    });
    var paths = Object.keys(byColor).map(function (c) { return '<path fill="' + c + '" d="' + byColor[c] + '"/>'; }).join("");
    return (
      '<svg class="pxsprite ' + (extraClass || "") + '" viewBox="0 0 ' + rows[0].length + " " + rows.length +
      '" aria-hidden="true" focusable="false" shape-rendering="crispEdges">' + paths + "</svg>"
    );
  }

  /* heart cursors (default + pointer), built from the same bitmap with a 1px outline */
  function cursorURL(fill, scale) {
    var rows = ICONS.heart;
    var w = rows[0].length + 2;
    var h = rows.length + 2;
    var on = {};
    rows.forEach(function (r, y) {
      for (var x = 0; x < r.length; x++) if (r[x] === "X") on[x + 1 + "," + (y + 1)] = 1;
    });
    var outline = "";
    var inner = "";
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        if (on[x + "," + y]) {
          inner += "M" + x + " " + y + "h1v1h-1z";
        } else if (
          on[x - 1 + "," + y] || on[x + 1 + "," + y] || on[x + "," + (y - 1)] || on[x + "," + (y + 1)]
        ) {
          outline += "M" + x + " " + y + "h1v1h-1z";
        }
      }
    }
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + w * scale + '" height="' + h * scale +
      '" viewBox="0 0 ' + w + " " + h + '" shape-rendering="crispEdges">' +
      '<path fill="#521617" d="' + outline + '"/><path fill="' + fill + '" d="' + inner + '"/></svg>';
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  }

  function installCursors() {
    if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    var root = document.documentElement;
    root.style.setProperty("--cursor-default", cursorURL("#f2c7da", 3) + " 3 3, auto");
    root.style.setProperty("--cursor-pointer", cursorURL("#f7f4e2", 4) + " 4 4, pointer");
    root.classList.add("has-heart-cursor");
  }

  window.PixelIcons = {
    ICONS: ICONS,
    SPRITES: SPRITES,
    PALETTE: PALETTE,
    tile: tile,
    glyph: glyph,
    sprite: sprite,
    installCursors: installCursors,
  };
})();
