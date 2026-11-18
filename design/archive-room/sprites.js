/* Pixel sprites for the room: the character, the pets, little effects.
   "half" sprites are authored as the left half and mirrored automatically. */
(function () {
  "use strict";

  var PAL = {
    k: "#3a2024", // outline
    H: "#bf8250", // hair
    L: "#dba06c", // hair highlight
    h: "#a06a3e", // hair shade
    S: "#f7d9c6", // skin
    s: "#e7b9a2", // skin shade
    b: "#f1a1a4", // blush
    e: "#2a2530", // eyes
    m: "#c25b5f", // mouth
    P: "#f0a9bf", // jeogori pink
    p: "#d0829f", // jeogori shade
    C: "#fbf1e2", // cream trim
    R: "#a52f45", // ribbon / hem
    T: "#4fa28f", // chima
    t: "#3a7d6e", // chima shade
    U: "#7ac4b0", // chima light
    F: "#f8eedc", // shoe
    f: "#d8c5aa",
    G: "#e8b94f", // hairpin
    J: "#f6a7c1", // flower
    j: "#ffe3ec",
  };

  /* left half (10 cols) x 33 rows */
  var CHAR_HALF = [
    ".....kkkkk",
    "....kHHLLL",
    "...kHHHLLL",
    "..kHHHHLLL",
    "..kHHHHHLL",
    "..kHHHHHHS",
    "..kHHHHHSS",
    "..kHHHHSSS",
    "..kHHHSSSS",
    "..kHHHSSSS",
    "..kHHHSeSS",
    "..kHHHSeSS",
    "..kHHHbbSS",
    "..kHHHSSSm",
    "...kHHSSSS",
    "...kHHHsSS",
    "...kHHHHsS",
    ".kPPHHPPCC",
    ".kPPHHPPCP",
    ".kPpHHPPPR",
    ".kPpHHPPRR",
    ".kCCHHtTUR",
    ".kSSHHtTUR",
    ".kkkHHtTUR",
    "...kHHtTUR",
    "...ktttTUT",
    "..kttTTUTU",
    "..kttTTUTU",
    ".kttTTUTTU",
    ".kttTTUTTU",
    "kRRRRRRRRR",
    ".....FFFF.",
    ".....kkkk.",
  ];

  /* ---------- helpers ---------- */
  function mirror(rows) {
    return rows.map(function (r) {
      return r + r.split("").reverse().join("");
    });
  }

  function toCanvas(rows, pal, flip) {
    var h = rows.length;
    var w = rows[0].length;
    var c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    var x = c.getContext("2d");
    for (var y = 0; y < h; y++) {
      for (var i = 0; i < w; i++) {
        var ch = rows[y][i];
        if (ch === "." || ch === " " || !pal[ch]) continue;
        x.fillStyle = pal[ch];
        x.fillRect(flip ? w - 1 - i : i, y, 1, 1);
      }
    }
    return c;
  }

  function setPx(rows, px, py, ch) {
    var r = rows[py];
    if (!r || px < 0 || px >= r.length) return;
    rows[py] = r.slice(0, px) + ch + r.slice(px + 1);
  }

  /* ---------- character ---------- */
  function charRows(variant) {
    var rows = mirror(CHAR_HALF);
    // hairpin + little flower (asymmetric on purpose)
    [[14, 2], [15, 3], [16, 4], [17, 5]].forEach(function (p) { setPx(rows, p[0], p[1], "G"); });
    setPx(rows, 12, 1, "J"); setPx(rows, 13, 1, "J"); setPx(rows, 12, 2, "j");
    if (variant === "blink") {
      rows[10] = rows[10].replace(/e/g, "S");
    }
    return rows;
  }

  // frames: idle / blink / walkA / walkB (walk = lift one shoe)
  function charFrame(name) {
    var rows = charRows(name === "blink" ? "blink" : null);
    if (name === "walkA") {
      for (var x = 11; x <= 14; x++) { setPx(rows, x, 31, "."); setPx(rows, x, 32, "."); }
    } else if (name === "walkB") {
      for (var x2 = 5; x2 <= 8; x2++) { setPx(rows, x2, 31, "."); setPx(rows, x2, 32, "."); }
    }
    return rows;
  }

  /* ---------- pets ---------- */
  var PET_PAL = {
    k: "#4a2b2a",
    F: "#efc98e", // dog fur
    f: "#d3a566",
    E: "#a96f3f", // dog ear
    W: "#fbefd9", // cream
    n: "#2e2226", // nose / eye
    c: "#3a2528", // closed eye line
    p: "#f1a3b5", // pink (tongue, rat ears, tail)
    r: "#bdb7c4", // rat fur
    R: "#908a9c",
    w: "#ffffff",
    z: "#fff7fb",
    y: "#e8b94f",
  };

  var DOG_SLEEP = [
    "......kkkk..........",
    "....kkEEFFkk........",
    "...kEEEFFFFFkkkkk...",
    "..kEEFFFFFFFFFFFFkk.",
    "..kEFFccFFFFFFFFFFfk",
    ".knFFFFFFFFFFFFFFffk",
    ".kFFFFFFFFFFFFFFffk.",
    "..kkWWWWFFFFFFffkk..",
    "....kkkkkkkkkkkkk...",
  ];

  var RAT_SLEEP = [
    ".kkkkk...",
    "kppRRRk..",
    "kRRcRRRkk",
    "kRrrrrrRkp",
    ".kkkkkkkpp",
  ];

  // awake: dog sitting, front view (left half, mirrored)
  var DOG_AWAKE_HALF = [
    "..kkkkk",
    ".kFFFFF",
    "kEFFFFF",
    "kEEFFFF",
    "kEEFnwF",
    "kEFFFFF",
    ".kFFFFn",
    ".kFFFFp",
    "..kFFWW",
    ".kFFFWW",
    ".kFFFWW",
    ".kFFfWW",
    ".kFFkkk",
    "..kkk..",
  ];
  var DOG_AWAKE_TAIL_A = [
    ".kk",
    "kFFk",
    ".kFk",
  ];

  var RAT_AWAKE_HALF = [
    "..kk",
    ".kpR",
    ".kRR",
    "kRnw",
    "kRRR",
    "kRrr",
    ".kRr",
    ".kkk",
  ];

  var HEART_SMALL = [
    ".pp.pp.",
    "ppppppp",
    "ppppppp",
    ".ppppp.",
    "..ppp..",
    "...p...",
  ];

  var Z_SMALL = [
    "zzzz",
    "..z.",
    ".z..",
    "zzzz",
  ];

  window.RoomSprites = {
    PAL: PAL,
    PET_PAL: PET_PAL,
    mirror: mirror,
    toCanvas: toCanvas,
    charFrame: charFrame,
    DOG_SLEEP: DOG_SLEEP,
    RAT_SLEEP: RAT_SLEEP,
    DOG_AWAKE: mirror(DOG_AWAKE_HALF),
    DOG_TAIL: DOG_AWAKE_TAIL_A,
    RAT_AWAKE: mirror(RAT_AWAKE_HALF),
    HEART_SMALL: HEART_SMALL,
    Z_SMALL: Z_SMALL,
  };
})();
