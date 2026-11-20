// Infinite pan-anywhere field of tiles (DOM + CSS transforms). The idea and layout approach follow
// reframehk.com: one "world" of tiles packed into columns, wrapped on both axes around the camera,
// so it repeats seamlessly. Drag, wheel, touch and arrow keys move the camera with inertia; at rest it drifts.

const CFG = {
  colWidth: 420,
  gap: 36,
  columns: 7,
  zoomRef: 1840,
  minZoom: 0.46,
  heroFill: 0.9,
  heroFillBelow: 700,
  friction: 0.925,
  wheel: 7,
  keySpeed: 1500,
  drift: 20,
  idleDelay: 1.8,
  speedTau: 0.12,
  flingWindow: 80,
  speedZoom: 0.045,
  flyDuration: 1.5,
  flyMaxDuration: 2.4,
  cullMargin: 0.25,
};

const C = CFG.colWidth;
const G = CFG.gap;
const C2 = C * 2 + G;
const MARKETPLACE = "https://github.com/marketplace/actions/termcard-profile-svg-generator";
const REPO = "https://github.com/bagasadh/termcard";

export const SPECS = [
  { key: "typing-dark", n: "01", title: "Typing banner", tag: "dashed-dark", preset: "dashed-dark", stage: "dark" },
  { key: "info-dark", n: "02", title: "Info specs", tag: "dashed-dark", preset: "dashed-dark", stage: "dark" },
  { key: "streak-green", n: "03", title: "Live streak", tag: "terminal-green", preset: "terminal-green", stage: "dark" },
  { key: "light-pair", n: "04", title: "Light theme", tag: "dashed-light", preset: "dashed-light", stage: "light" },
  { key: "solid-dark-streak", n: "05", title: "Solid dark", tag: "solid-dark", preset: "solid-dark", stage: "dark" },
  { key: "solid-light-link", n: "06", title: "Clickable links", tag: "solid-light", preset: "solid-light", stage: "light" },
];
const LIVE_SPEC = { key: "live", n: "LIVE", title: "Your README stack", tag: "your config", preset: null, stage: "dark" };
const SPEC_BY_KEY = Object.fromEntries([...SPECS, LIVE_SPEC].map((s) => [s.key, s]));

const STEPS = [
  { n: "01", dark: true, h: "Open your profile repo", p: "Go to github.com/username/username. Create a public repo named exactly like your username if you do not have one." },
  { n: "02", dark: true, h: "Add termcard.json", p: "Click Add file, then Create new file. Name it termcard.json, paste the config from the builder, and commit." },
  { n: "03", dark: false, h: "Add workflow and markers", p: "Create .github/workflows/termcard.yml from the second tab, then paste the two TERMCARD comment lines into README.md." },
  { n: "04", dark: false, h: "Run the Action once", p: "Open the Actions tab, pick Update termcard, and click Run workflow. Your SVGs refresh daily after that." },
];

const wrapD = (d, size) => d - size * Math.round(d / size);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function buildUnits() {
  const one = (kind, h, cols = 1, extra = {}) => ({
    cols,
    items: [{ kind, x: 0, y: 0, w: cols === 2 ? C2 : C, h, ...extra }],
  });
  const spec = (key, cols, h) => {
    const w = cols === 2 ? C2 : C;
    const sh = h ?? (cols === 2 ? Math.round((w * 9) / 16) : 420);
    const s = SPEC_BY_KEY[key];
    return {
      cols,
      items: [
        { kind: "specimen", spec: s, x: 0, y: 0, w, h: sh },
        { kind: "caption", spec: s, x: 0, y: sh + 6, w, h: 58 },
      ],
    };
  };
  const setupBlock = {
    cols: 2,
    anchor: "setup",
    items: [
      { kind: "setupHead", x: 0, y: 0, w: C, h: 240 },
      { kind: "step", step: STEPS[0], x: 0, y: 240 + G, w: C, h: 430 },
      { kind: "step", step: STEPS[2], x: 0, y: 670 + G * 2, w: C, h: 430 },
      { kind: "step", step: STEPS[1], x: C + G, y: 0, w: C, h: 600 },
      { kind: "step", step: STEPS[3], x: C + G, y: 600 + G, w: C, h: 500 + G },
    ],
  };
  const pin = (u, col) => ({ ...u, col });
  return [
    pin({ ...one("hero", 600, 2), anchor: "hero" }, 0),
    pin(one("intro", 557), 2),
    pin(spec("streak-green", 2), 3),
    pin(one("clock", 230), 5),
    pin(spec("info-dark", 1, 540), 6),
    pin(spec("typing-dark", 2), 0),
    setupBlock,
    one("presetsHead", 291),
    { ...one("cta", 440, 2), anchor: "cta" },
    spec("light-pair", 2),
    spec("solid-dark-streak", 2),
    spec("solid-light-link", 1, 500),
    spec("live", 1, 560),
    spec("typing-dark", 1),
    one("hello", 200),
    spec("streak-green", 1),
    spec("solid-light-link", 2),
    spec("info-dark", 1),
    spec("light-pair", 1),
    spec("solid-dark-streak", 1),
  ];
}

function pack(units) {
  const n = CFG.columns;
  const heights = new Array(n).fill(0);
  const placed = [];
  const holes = [];
  units.forEach((u, unitId) => {
    const uh = Math.max(...u.items.map((i) => i.y + i.h)) + G;
    const yAt = (c) => (u.cols === 2 ? Math.max(heights[c], heights[(c + 1) % n]) : heights[c]);
    let best = 0;
    let bestY = Infinity;
    if (u.col !== undefined) {
      best = u.col % n;
      bestY = yAt(best);
    } else {
      for (let c = 0; c < n; c += 1) {
        const y = yAt(c);
        if (y < bestY - 1) {
          bestY = y;
          best = c;
        }
      }
    }
    for (let k = 0; k < u.cols; k += 1) {
      const c = (best + k) % n;
      if (bestY - heights[c] >= 140 + G) holes.push({ c, y: heights[c], h: bestY - heights[c] - G });
      heights[c] = bestY + uh;
    }
    for (const it of u.items) {
      placed.push({ ...it, x: best * (C + G) + it.x, y: bestY + it.y, anchor: u.anchor, unit: unitId });
    }
  });
  const H = Math.max(...heights);
  const W = n * (C + G);
  for (let c = 0; c < n; c += 1) {
    const rest = H - heights[c] - G;
    if (rest >= 140) holes.push({ c, y: heights[c], h: rest });
  }
  let f = 0;
  for (const hole of holes) {
    placed.push({ kind: "filler", n: f, x: hole.c * (C + G), y: hole.y, w: C, h: hole.h, unit: null });
    f += 1;
  }
  return { placed, W, H };
}

const clockFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
const clockSecFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
const fmtCoord = (v) => (v < 0 ? "\u2212" : "+") + String(Math.abs(Math.round(v)) % 10000).padStart(4, "0");

export function initCanvas(o) {
  const { stage, world } = o;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;
  const canAim = matchMedia("(any-pointer: fine)").matches;
  o.hint.textContent = coarse ? "SWIPE TO EXPLORE" : "DRAG \u00b7 ARROWS \u00b7 \u21b5 OPEN";

  const { placed, W, H } = pack(buildUnits());

  // ---- tile content ----
  function specInner(spec) {
    const r = o.getSpecimen(spec.key);
    const label = spec.key === "live" ? '<span class="ft-live-label">YOUR README STACK / LIVE</span>' : "";
    return `${label}<div class="ft-spec-stage stage-gh-${r.stage}">${r.html}</div>`;
  }

  function fillerHtml(n) {
    const v = n % 5;
    if (v === 0) return '<p class="ft-filler-big">Ship it.</p>';
    if (v === 1) return '<p class="ft-filler-glyph">&gt;_</p>';
    if (v === 2) {
      const words = ["Typing", "Info", "Streak", "Link"];
      return `<div class="ft-filler-stack">${words
        .map((w, i) => `<span class="${i === n % 4 ? "is-lit" : ""}">${w}</span>`)
        .join("")}</div>`;
    }
    if (v === 3) {
      return '<p class="ft-mono ft-muted">termcard (n.)</p><p class="ft-title">Zero<br>server.</p>';
    }
    const arrows = ["\u2196", "\u2191", "\u2197", "\u2190", "\u00b7", "\u2192", "\u2199", "\u2193", "\u2198"];
    return `<p class="ft-mono ft-muted">No edges</p><div class="ft-compass">${arrows.map((a) => `<b>${a}</b>`).join("")}</div>`;
  }

  function describe(t) {
    switch (t.kind) {
      case "hero":
        return {
          cls: "ft-hero",
          html:
            '<div class="ft-top"><p class="ft-mono">Open source action</p><p class="ft-mono">MIT / Python 3</p></div>' +
            '<div><div class="ft-logo"><i>term</i>card</div><p class="ft-by">by <em>bagasadh</em></p></div>' +
            '<div><p class="ft-line">Terminal-styled SVG cards for your GitHub profile. Pick a theme, type your details, copy into GitHub.</p>' +
            `<div class="ft-chips"><span class="ft-chip ft-chip-solid" data-action="builder">Build your cards</span><span class="ft-chip" data-href="${MARKETPLACE}">Marketplace \u2197</span></div></div>`,
        };
      case "intro":
        return {
          cls: "ft-dark ft-intro",
          html:
            '<p class="ft-mono ft-muted">About termcard</p>' +
            '<p class="ft-statement">No hosted server, no API quotas.<em>One JSON file and a GitHub Action.</em></p>' +
            '<p class="ft-mono ft-muted">Typing \u00b7 Info \u00b7 Streak \u00b7 Link</p>',
        };
      case "clock":
        return {
          cls: "ft-dark ft-clock",
          html:
            '<p class="ft-top ft-mono ft-muted"><span>Your local time</span><span class="ft-dot"></span></p>' +
            `<p class="ft-clock-time">${clockFmt.format(new Date())}</p>`,
        };
      case "setupHead":
        return {
          cls: "ft-bone ft-intro",
          html: '<p class="ft-mono ft-muted">No terminal needed / 04</p><p class="ft-title">Add to GitHub in 4 steps.</p>',
        };
      case "step":
        return {
          cls: `${t.step.dark ? "ft-dark" : "ft-bone"} ft-step`,
          html: `<p class="ft-mono ft-muted">Step ${t.step.n} / 04</p><div><h3>${t.step.h}</h3><p>${t.step.p}</p></div>`,
        };
      case "presetsHead":
        return {
          cls: "ft-dark ft-intro",
          html: '<p class="ft-mono ft-muted">Presets / 06</p><p class="ft-title">Pick a <span class="ft-serif">look.</span></p>',
        };
      case "specimen":
        return { cls: "ft-specimen", html: specInner(t.spec), dynamic: true };
      case "caption":
        return {
          cls: "ft-caption",
          html: `<span class="ft-cap-idx">${t.spec.n}</span><span class="ft-cap-title">${t.spec.title}</span><span class="ft-cap-tag">${t.spec.tag} \u2197</span>`,
        };
      case "cta":
        return {
          cls: "ft-bone ft-cta",
          html:
            '<div class="ft-top"><p class="ft-mono ft-muted">Interactive workbench</p><p class="ft-mono ft-muted">Free / No sign-in</p></div>' +
            '<p class="ft-cta-title">Ready to build<em>your cards?</em></p>' +
            `<div class="ft-chips"><span class="ft-chip ft-chip-solid" data-action="builder">Open the builder</span><span class="ft-chip" data-href="${REPO}">View source \u2197</span></div>`,
        };
      case "hello":
        return {
          cls: "ft-bone ft-hello",
          html:
            '<div class="ft-top"><p class="ft-mono ft-muted">Say hello</p><span class="ft-serif">\u2197</span></div>' +
            '<p class="ft-hello-link">bagasadh/termcard</p>',
        };
      default: {
        const v = t.n % 5;
        const cls = v === 0 ? "ft-filler ft-filler-ghost" : v === 1 || v === 4 ? "ft-filler ft-bone" : "ft-filler ft-dark";
        const left = v === 2 ? " ft-filler-left" : v === 3 || v === 4 ? " ft-filler-left" : "";
        return { cls: cls + left, html: fillerHtml(t.n) };
      }
    }
  }

  const ACTIONS = {
    specimen: (t) => (t.spec.preset ? { type: "preset", preset: t.spec.preset } : { type: "builder" }),
    caption: (t) => (t.spec.preset ? { type: "preset", preset: t.spec.preset } : { type: "builder" }),
    cta: () => ({ type: "builder" }),
    hello: () => ({ type: "href", url: REPO }),
  };
  const LABELS = {
    specimen: (t) => `${t.spec.title} <b>${t.spec.preset ? "\u00b7 Load preset" : "\u00b7 Edit"}</b>`,
    caption: (t) => `${t.spec.title} <b>${t.spec.preset ? "\u00b7 Load preset" : "\u00b7 Edit"}</b>`,
    cta: () => "Open builder <b>\u2197</b>",
    hello: () => "GitHub <b>\u2197</b>",
  };

  const tiles = placed.map((p) => {
    const d = describe(p);
    return {
      ...p,
      cx: p.x + p.w / 2,
      cy: p.y + p.h / 2,
      cls: d.cls,
      html: d.html,
      dynamic: Boolean(d.dynamic),
      action: ACTIONS[p.kind] ? ACTIONS[p.kind](p) : null,
      label: LABELS[p.kind] ? LABELS[p.kind](p) : null,
      els: [],
      shown: 0,
    };
  });
  const clockTile = tiles.find((t) => t.kind === "clock");

  let hotUnits = new Set();
  function makeEl(tile) {
    const el = document.createElement("div");
    el.className = `ft ${tile.cls}`;
    el.style.width = `${tile.w}px`;
    el.style.height = `${tile.h}px`;
    el.innerHTML = tile.html;
    el._tile = tile;
    if (tile.unit !== null && hotUnits.has(tile.unit)) el.classList.add("is-hot");
    world.appendChild(el);
    tile.els.push(el);
    return el;
  }

  // ---- view state ----
  let vw = 1;
  let vh = 1;
  let zoom = 1;
  let zoomEff = 1;
  const cam = { x: 0, y: 0 };
  const vel = { x: 0, y: 0 };
  const prev = { x: 0, y: 0 };
  const sv = { x: 0, y: 0 };
  let speedS = 0;
  let flight = null;
  let dragging = false;
  let lastInput = -1e9;
  let now = 0;
  let last = performance.now();
  let frame = 0;
  let raf = 0;
  let down = null;
  let ptr = null;
  let hovered = null;
  let aimed = null;
  let pulse = { units: new Set(), until: 0 };
  let presetIdx = 0;
  let lastHeading = null;
  let lastWorld = "";
  const pending = { x: 0, y: 0 };
  const samples = [];
  const keys = new Set();
  const cleanups = [];
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };

  const hero = tiles.find((t) => t.kind === "hero");
  cam.x = prev.x = hero.cx;
  cam.y = prev.y = hero.cy;

  function resize() {
    vw = stage.clientWidth;
    vh = stage.clientHeight;
    zoom = clamp(vw / CFG.zoomRef, CFG.minZoom, 1);
    if (vw < CFG.heroFillBelow) zoom = Math.min(zoom, (CFG.heroFill * vw) / C2);
  }
  resize();
  on(window, "resize", resize);

  const diag = () => Math.hypot(vw, vh) / zoom;
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - ((-2 * k + 2) ** 2) / 2);

  // ---- hover / aim / hot units ----
  const tileOf = (el) => el?.closest?.(".ft")?._tile ?? null;
  const interactive = (t, el) => Boolean(el?.closest?.("[data-action],[data-href]")) || Boolean(t?.action);

  function applyHot() {
    const next = new Set(pulse.units);
    if (hovered?.unit != null) next.add(hovered.unit);
    if (aimed?.unit != null) next.add(aimed.unit);
    const key = [...next].sort().join(",");
    if (key === lastWorld) return;
    lastWorld = key;
    hotUnits = next;
    for (const t of tiles) {
      if (t.unit === null) continue;
      const hot = next.has(t.unit);
      for (const el of t.els) el.classList.toggle("is-hot", hot);
    }
  }

  function setHover(t, el, x, y) {
    const link = interactive(t, el);
    const target = link ? t : null;
    if (target !== hovered) {
      if (target) o.sound.tick();
      hovered = target;
      stage.classList.toggle("is-link", link);
      const text = target?.label;
      o.label.classList.toggle("is-on", Boolean(text));
      if (text) o.label.innerHTML = text;
    }
    stage.classList.toggle("is-link", link);
    if (target?.label && x !== undefined) {
      o.label.style.transform = `translate(${x + 18}px, ${y + 18}px)`;
    }
    applyHot();
  }

  function updateHoverFromPoint() {
    if (!ptr || dragging || o.isSheetOpen() || fieldMoving) {
      if (hovered) setHover(null, null);
      return;
    }
    const el = document.elementFromPoint(ptr.x, ptr.y);
    const t = el && stage.contains(el) ? tileOf(el) : null;
    setHover(t, el, ptr.x, ptr.y);
  }

  function updateAim() {
    let t = null;
    if (canAim && !fieldMoving && !dragging && !o.isSheetOpen() && !hovered) {
      const el = document.elementFromPoint(vw / 2, vh / 2);
      const c = el && stage.contains(el) ? tileOf(el) : null;
      t = c?.action ? c : null;
    }
    if (t === aimed) return;
    aimed = t;
    o.aim.classList.toggle("is-on", Boolean(t));
    if (t) o.aim.innerHTML = `<b>\u21b5</b> ${t.label ?? "Open"}`.replace(/<b>[^<]*<\/b>\s*$/, "").trim();
    applyHot();
  }

  // ---- actions ----
  function run(action) {
    if (!action) return;
    if (action.type === "href") {
      window.open(action.url, "_blank", "noopener");
      return;
    }
    o.onAction(action);
  }

  function activate(t, el) {
    const chip = el?.closest?.("[data-action],[data-href]");
    if (chip?.dataset.href) return run({ type: "href", url: chip.dataset.href });
    if (chip?.dataset.action === "builder") return run({ type: "builder" });
    if (t?.action) return run(t.action);
    return undefined;
  }

  // ---- flights ----
  function flyTo(target, alignTop = false) {
    if (!target) return 0;
    let tx = target.at ? target.at[0] : cam.x + wrapD(target.cx - cam.x, W);
    let ty = target.at ? target.at[1] : cam.y + wrapD(target.cy - cam.y, H);
    if (alignTop) {
      const top = cam.y + wrapD(target.y - cam.y, H);
      ty = Math.min(ty, top + vh / zoomEff / 2 - 90 / zoom);
    }
    vel.x = vel.y = 0;
    lastInput = now;
    const dist = Math.hypot(tx - cam.x, ty - cam.y);
    if (dist > 1) lastHeading = Math.atan2(ty - cam.y, tx - cam.x);
    if (reduced) {
      cam.x = prev.x = tx;
      cam.y = prev.y = ty;
      return 0;
    }
    const dur = Math.min(CFG.flyMaxDuration, CFG.flyDuration * Math.max(1, Math.sqrt(dist / diag())));
    flight = { sx: cam.x, sy: cam.y, tx, ty, t0: now, dur };
    o.sound.sweep(dur);
    return dur;
  }

  const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  function workTarget(list) {
    const D = diag();
    const lo = 0.6 * D;
    const hi = 1.2 * D;
    const mid = (lo + hi) / 2;
    const cands = [];
    for (const t of list) {
      const bx = wrapD(t.cx - cam.x, W);
      const by = wrapD(t.cy - cam.y, H);
      for (let kx = -2; kx <= 2; kx += 1) {
        for (let ky = -2; ky <= 2; ky += 1) {
          const x = bx + kx * W;
          const y = by + ky * H;
          const d = Math.hypot(x, y);
          if (d > 1) cands.push({ t, x, y, d, a: Math.atan2(y, x) });
        }
      }
    }
    const turn = (60 * Math.PI) / 180;
    const want = lastHeading === null ? null : lastHeading + 2.39996;
    const inBand = (c) => c.d >= lo && c.d <= hi;
    const turns = (c) => lastHeading === null || angDiff(c.a, lastHeading) >= turn;
    const off = (c) => (want === null ? 0 : angDiff(c.a, want) / Math.PI) + (Math.abs(c.d - mid) / D) * 0.35;
    const best = (pool, score) => pool.reduce((b, c) => (!b || score(c) < score(b) ? c : b), null);
    return (
      best(cands.filter((c) => inBand(c) && turns(c)), off) ??
      best(cands.filter(inBand), (c) => -angDiff(c.a, lastHeading ?? 0)) ??
      best(cands, (c) => Math.abs(c.d - mid))
    );
  }

  const nearest = (list) =>
    list.reduce((best, t) => {
      const d = Math.hypot(wrapD(t.cx - cam.x, W), wrapD(t.cy - cam.y, H));
      return !best || d < best.d ? { t, d } : best;
    }, null)?.t;

  function fly(name) {
    if (name === "presets") {
      const spec = SPECS[presetIdx];
      o.presetCount.textContent = `0${presetIdx + 1}/0${SPECS.length}`;
      presetIdx = (presetIdx + 1) % SPECS.length;
      const all = tiles.filter((t) => t.kind === "specimen" && t.spec === spec);
      const large = all.filter((t) => t.w > C);
      const c = workTarget(large.length ? large : all);
      flyTo({ at: [cam.x + c.x, cam.y + c.y] });
      pulse = { units: new Set(all.map((t) => t.unit)), until: now + 1.8 };
      applyHot();
      return;
    }
    if (name === "setup") {
      const head = nearest(tiles.filter((t) => t.kind === "setupHead"));
      flyTo({ cx: head.x + C + G / 2, cy: head.y + 550, y: head.y }, true);
      return;
    }
    if (name === "hero") {
      flyTo(nearest(tiles.filter((t) => t.kind === "hero")));
      return;
    }
    flyTo(nearest(tiles.filter((t) => t.anchor === name)));
  }

  // ---- input ----
  on(stage, "pointerdown", (e) => {
    if (o.isSheetOpen() || !e.isPrimary) return;
    try {
      stage.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture is optional.
    }
    down = { lx: e.clientX, ly: e.clientY, t: performance.now(), moved: 0 };
    samples.length = 0;
    samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
    dragging = true;
    flight = null;
    vel.x = vel.y = 0;
    lastInput = now;
    stage.classList.add("is-dragging");
    setHover(null, null);
  });

  on(stage, "pointermove", (e) => {
    if (e.pointerType === "mouse") ptr = { x: e.clientX, y: e.clientY };
    if (!down || !dragging) {
      updateHoverFromPoint();
      return;
    }
    const dx = e.clientX - down.lx;
    const dy = e.clientY - down.ly;
    down.lx = e.clientX;
    down.ly = e.clientY;
    down.moved += Math.abs(dx) + Math.abs(dy);
    pending.x += dx;
    pending.y += dy;
    for (const c of e.getCoalescedEvents?.() ?? []) samples.push({ t: c.timeStamp, x: c.clientX, y: c.clientY });
    if (!samples.length || samples[samples.length - 1].t < e.timeStamp) {
      samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
    }
    while (samples.length > 2 && e.timeStamp - samples[0].t > CFG.flingWindow) samples.shift();
    lastInput = now;
  });

  function pointerVel(at) {
    if (samples.length < 2) return { x: 0, y: 0 };
    const a = samples[0];
    const b = samples[samples.length - 1];
    const dt = (b.t - a.t) / 1000;
    if (dt < 0.008 || at - b.t > 100) return { x: 0, y: 0 };
    return { x: -(b.x - a.x) / dt / zoomEff, y: -(b.y - a.y) / dt / zoomEff };
  }

  function endDrag(e) {
    if (!down) return;
    const quick = down.moved < 8 && performance.now() - down.t < 500;
    if (!reduced) {
      const v = pointerVel(e.timeStamp);
      vel.x = clamp(v.x, -6000, 6000);
      vel.y = clamp(v.y, -6000, 6000);
    }
    down = null;
    dragging = false;
    stage.classList.remove("is-dragging");
    if (quick && e.type === "pointerup") {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const t = el && stage.contains(el) ? tileOf(el) : null;
      if (t && interactive(t, el)) {
        o.sound.tap();
        activate(t, el);
      }
    }
  }
  on(stage, "pointerup", endDrag);
  on(stage, "pointercancel", endDrag);
  on(stage, "pointerleave", () => {
    ptr = null;
    setHover(null, null);
  });

  on(
    stage,
    "wheel",
    (e) => {
      if (o.isSheetOpen()) return;
      e.preventDefault();
      const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vh : 1;
      let dx = e.deltaX * k;
      let dy = e.deltaY * k;
      if (e.shiftKey && !dx) {
        dx = dy;
        dy = 0;
      }
      flight = null;
      lastInput = now;
      if (reduced) {
        cam.x += dx / zoomEff;
        cam.y += dy / zoomEff;
        return;
      }
      vel.x += (dx * CFG.wheel) / zoomEff;
      vel.y += (dy * CFG.wheel) / zoomEff;
    },
    { passive: false }
  );

  const DIRS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const ownsKey = (e) => e.target.closest?.("button, a, input, textarea, select, summary, dialog, [contenteditable]");
  on(window, "keydown", (e) => {
    if (o.isSheetOpen() || document.querySelector("dialog[open]")) return;
    if (e.key === "Enter" || e.key === " ") {
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey || ownsKey(e)) return;
      if (!aimed) return;
      e.preventDefault();
      o.sound.tap();
      run(aimed.action);
      return;
    }
    if (!DIRS[e.key] || ownsKey(e)) return;
    e.preventDefault();
    flight = null;
    lastInput = now;
    if (reduced) {
      const [dx, dy] = DIRS[e.key];
      cam.x += (dx * vw) / zoomEff / 3;
      cam.y += (dy * vh) / zoomEff / 3;
      return;
    }
    keys.add(e.key);
  });
  on(window, "keyup", (e) => keys.delete(e.key));
  on(window, "blur", () => keys.clear());

  // ---- loop ----
  let fieldMoving = false;

  function placeTiles() {
    const zMin = zoom * 0.9;
    const hw = (vw / zMin) * (0.5 + CFG.cullMargin) + C2;
    const hh = (vh / zMin) * (0.5 + CFG.cullMargin) + C2;
    for (const tile of tiles) {
      const dx = tile.cx - cam.x;
      const dy = tile.cy - cam.y;
      const ax = hw + tile.w / 2;
      const ay = hh + tile.h / 2;
      let n = 0;
      for (let kx = Math.ceil((-ax - dx) / W); kx <= Math.floor((ax - dx) / W); kx += 1) {
        for (let ky = Math.ceil((-ay - dy) / H); ky <= Math.floor((ay - dy) / H); ky += 1) {
          const el = tile.els[n] ?? makeEl(tile);
          if (n >= tile.shown) el.style.display = "";
          el.style.transform = `translate3d(${(dx + kx * W - tile.w / 2).toFixed(1)}px, ${(dy + ky * H - tile.h / 2).toFixed(1)}px, 0)`;
          n += 1;
        }
      }
      for (let i = n; i < tile.shown; i += 1) tile.els[i].style.display = "none";
      tile.shown = n;
    }
  }

  function tick(ts) {
    raf = requestAnimationFrame(tick);
    const dt = clamp((ts - last) / 1000, 0, 0.05);
    last = ts;
    now += dt;
    frame += 1;
    const frozen = o.isSheetOpen();

    if (frozen) {
      pending.x = pending.y = 0;
      vel.x = vel.y = 0;
    } else {
      if (pending.x || pending.y) {
        cam.x -= pending.x / zoomEff;
        cam.y -= pending.y / zoomEff;
        pending.x = pending.y = 0;
      }
      if (flight) {
        const k = Math.min(1, (now - flight.t0) / flight.dur);
        const e = ease(k);
        cam.x = flight.sx + (flight.tx - flight.sx) * e;
        cam.y = flight.sy + (flight.ty - flight.sy) * e;
        lastInput = now;
        if (k >= 1) flight = null;
      } else if (!dragging && !reduced) {
        if (keys.size) {
          let kx = 0;
          let ky = 0;
          for (const k of keys) {
            kx += DIRS[k][0];
            ky += DIRS[k][1];
          }
          const a = 1 - 0.0025 ** dt;
          vel.x += (kx * CFG.keySpeed - vel.x) * a;
          vel.y += (ky * CFG.keySpeed - vel.y) * a;
          lastInput = now;
        } else {
          const f = CFG.friction ** (dt * 60);
          vel.x *= f;
          vel.y *= f;
        }
        if (now - lastInput > CFG.idleDelay && !o.isPaused()) {
          const a = 1 - 0.985 ** (dt * 60);
          const dx = Math.cos(now * 0.05) * CFG.drift;
          const dy = Math.sin(now * 0.037 + 1) * CFG.drift * 0.7;
          vel.x += (dx - vel.x) * a;
          vel.y += (dy - vel.y) * a;
        }
        vel.x = clamp(vel.x, -8000, 8000);
        vel.y = clamp(vel.y, -8000, 8000);
        cam.x += vel.x * dt;
        cam.y += vel.y * dt;
      }
    }

    if (dt > 0) {
      let mx = (cam.x - prev.x) / dt;
      let my = (cam.y - prev.y) / dt;
      if (dragging) ({ x: mx, y: my } = pointerVel(performance.now()));
      const a = 1 - Math.exp(-dt / CFG.speedTau);
      sv.x += (mx - sv.x) * a;
      sv.y += (my - sv.y) * a;
    }
    prev.x = cam.x;
    prev.y = cam.y;
    speedS = (Math.hypot(sv.x, sv.y) * zoom) / Math.max(vw, vh);
    const speed = reduced ? 0 : speedS;
    zoomEff = zoom * (1 - Math.min(speed * CFG.speedZoom, 0.1));
    world.style.transform = `scale(${zoomEff.toFixed(4)})`;

    placeTiles();

    fieldMoving = Boolean(flight) || dragging || speedS > 0.05;
    if (pulse.units.size && now > pulse.until) {
      pulse = { units: new Set(), until: 0 };
      applyHot();
    }
    if (frame % 6 === 0) {
      updateHoverFromPoint();
      updateAim();
    }
    if (frame % 10 === 0) {
      updateHudReadout();
    }
  }

  function start() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  on(document, "visibilitychange", () => {
    if (document.hidden) {
      stop();
      keys.clear();
    } else {
      start();
    }
  });
  function updateHudReadout() {
    const d = new Date();
    o.hudClock.textContent = clockSecFmt.format(d);
    const txt = clockFmt.format(d);
    if (clockTile) {
      for (const el of clockTile.els) {
        const node = el.querySelector(".ft-clock-time");
        if (node && node.textContent !== txt) node.textContent = txt;
      }
    }
    o.hudX.textContent = fmtCoord(cam.x / 10);
    o.hudY.textContent = fmtCoord(-cam.y / 10);
  }

  if (o.hudTz) {
    try {
      const tz = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")?.value;
      if (tz) o.hudTz.textContent = tz;
    } catch {
      // Keep default label.
    }
  }
  updateHudReadout();
  start();

  function refreshTiles(onlyLive) {
    for (const t of tiles) {
      if (!t.dynamic || (onlyLive && t.spec.key !== "live")) continue;
      t.html = specInner(t.spec);
      for (const el of t.els) el.innerHTML = t.html;
    }
  }

  return {
    fly,
    refresh: () => refreshTiles(false),
    refreshLive: () => refreshTiles(true),
    destroy() {
      stop();
      for (const fn of cleanups) fn();
      world.replaceChildren();
    },
  };
}

