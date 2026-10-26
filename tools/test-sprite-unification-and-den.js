#!/usr/bin/env node
// Comprehensive automated verification test for Project Echo Deliverables 1–5:
//   1. PIXEL.poseSheet() & all 5 Pose/Fluff/Aura/Origin fixes
//   2. Mini-games sprite & animation fixes (stackGame, catchGame, runGame, echoBackGame, linesGame)
//   3. window.DEN (PIXEL.den) 5-layer gyroscope parallax & ToD presets aligned with parallax_dens_config.json
//   4. Interactive Environment Hotspots (SCENE_HOTSPOTS v2.0.0 & ENV_HOTSPOTS)
//   5. Dialogue v2 Smart Engine (DialogueEngine, S.chatHistory 64-ring buffer, >5,000 lines, 20 looks, 3 age bands, 2-3 turn convs, EDZ1)

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const cp = require('child_process');

const ROOT = path.join(__dirname, '..');
let total = 0, passed = 0, failed = [];

function check(cond, msg) {
  total++;
  if (cond) {
    passed++;
  } else {
    failed.push(msg);
    console.error('  FAIL:', msg);
  }
}

// Minimal DOM harness for headless Node testing of pixel.js, scenes.js, dialogue_engine.js, and game.js
function makeEl(tag, html) {
  const children = [];
  const classes = new Set();
  const dataset = {};
  const attrs = {};
  const styleProps = {};
  const style = new Proxy(styleProps, {
    get(t, k) {
      if (k === 'setProperty') return (p, v) => { t[p] = String(v); };
      if (k === 'removeProperty') return (p) => { delete t[p]; };
      if (k === 'getPropertyValue') return (p) => t[p] || '';
      return t[k] || '';
    },
    set(t, k, v) {
      t[k] = String(v);
      return true;
    }
  });
  const el = {
    tagName: (tag || 'DIV').toUpperCase(),
    id: '',
    className: '',
    dataset,
    style,
    children,
    parentNode: null,
    isConnected: true,
    offsetWidth: 48,
    offsetHeight: 48,
    clientWidth: 180,
    clientHeight: 263,
    scrollWidth: 100,
    scrollHeight: 20,
    textContent: '',
    _innerHTML: html || '',
    get innerHTML() { return this._innerHTML; },
    set innerHTML(v) {
      this._innerHTML = String(v || '');
      parseChildren(this, this._innerHTML);
    },
    get outerHTML() { return `<${tag} class="${this.className}" data-expr="${dataset.expr||attrs['data-expr']||''}" style="background-image:${style.backgroundImage||''}">${this._innerHTML}</${tag}>`; },
    classList: {
      add(...cs) { cs.forEach(c => c && classes.add(c)); el.className = [...classes].join(' '); },
      remove(...cs) { cs.forEach(c => classes.delete(c)); el.className = [...classes].join(' '); },
      toggle(c, force) {
        const on = force !== undefined ? !!force : !classes.has(c);
        if (on) classes.add(c); else classes.delete(c);
        el.className = [...classes].join(' ');
        return on;
      },
      contains(c) { return classes.has(c); }
    },
    setAttribute(k, v) {
      attrs[k] = String(v);
      if (k === 'id') el.id = String(v);
      if (k === 'class') { classes.clear(); String(v).split(/\s+/).filter(Boolean).forEach(x => classes.add(x)); el.className = String(v); }
      if (k.startsWith('data-')) {
        const dk = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        dataset[dk] = String(v);
      }
    },
    getAttribute(k) {
      if (k === 'style') {
        return Object.entries(styleProps).map(([ a, b ]) => `${a}:${b}`).join(';') || attrs.style || '';
      }
      if (k.startsWith('data-')) {
        const dk = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        if (dataset[dk] !== undefined) return String(dataset[dk]);
      }
      return attrs[k] || null;
    },
    appendChild(ch) {
      if (!ch) return ch;
      ch.parentNode = el;
      children.push(ch);
      return ch;
    },
    remove() {
      if (el.parentNode) {
        const idx = el.parentNode.children.indexOf(el);
        if (idx >= 0) el.parentNode.children.splice(idx, 1);
      }
    },
    insertAdjacentHTML(pos, str) {
      this._innerHTML += str;
      parseChildren(this, str, true);
    },
    querySelector(sel) {
      return this.querySelectorAll(sel)[0] || null;
    },
    querySelectorAll(sel) {
      const out = [];
      function visit(node) {
        for (const ch of node.children || []) {
          if (matches(ch, sel)) out.push(ch);
          visit(ch);
        }
      }
      visit(this);
      return out;
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, right: 180, bottom: 320, width: 180, height: 320, x: 0, y: 0 };
    },
    getContext() {
      return {
        imageSmoothingEnabled: false,
        fillStyle: '',
        globalAlpha: 1,
        clearRect() {},
        fillRect() {},
        drawImage() { el._drawCalls = (el._drawCalls || 0) + 1; },
        getImageData(x, y, w, h) {
          const d = new Uint8ClampedArray(w * h * 4);
          // Populate a central 24x24 opaque block so aura dilation has a silhouette
          for (let py = 12; py < Math.min(h, 36); py++) {
            for (let px = 12; px < Math.min(w, 36); px++) {
              const i = (py * w + px) * 4;
              d[i] = 0xE8; d[i+1] = 0x77; d[i+2] = 0x2E; d[i+3] = 255;
            }
          }
          return { data: d, width: w, height: h };
        },
        createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h }; },
        putImageData() {},
        save() {},
        restore() {},
        translate() {},
        scale() {},
        rotate() {},
        beginPath() {},
        ellipse() {},
        fill() {},
        moveTo() {},
        lineTo() {},
        fillText() {}
      };
    },
    toDataURL() { return 'data:image/png;base64,AA=='; },
    addEventListener() {},
    removeEventListener() {},
    closest() { return null; }
  };
  return el;
}

function matches(el, sel) {
  if (!el) return false;
  sel = sel.replace(':scope>', '').trim();
  if (sel.includes(',')) return sel.split(',').some(s => matches(el, s.trim()));
  if (sel.includes(' ')) {
    const parts = sel.split(/\s+/);
    return matches(el, parts[parts.length - 1]);
  }
  if (sel.startsWith('#')) return el.id === sel.slice(1);
  if (sel.startsWith('[data-spot-id="')) {
    const id = sel.slice(15, -2);
    return el.dataset && el.dataset.spotId === id;
  }
  if (sel.startsWith('.')) {
    const cls = sel.slice(1).split('.');
    return cls.every(c => el.classList.contains(c));
  }
  if (sel === 'canvas.aura') return el.tagName === 'CANVAS' && el.classList.contains('aura');
  if (sel === 'canvas.den-motes') return el.tagName === 'CANVAS' && el.classList.contains('den-motes');
  if (sel.startsWith('canvas.obglow')) return el.tagName === 'CANVAS' && el.classList.contains('obglow') && (!sel.includes(':not([data-done])') || !el.dataset.done);
  return el.tagName.toLowerCase() === sel.toLowerCase();
}

function parseChildren(parent, html, append) {
  if (!append) parent.children.length = 0;
  const tagRe = /<(div|canvas|button|i|span|b|p)([^>]*)>/gi;
  let m;
  while ((m = tagRe.exec(html))) {
    const ch = makeEl(m[1], '');
    ch.parentNode = parent;
    const attrStr = m[2];
    const attrRe = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
    let am;
    while ((am = attrRe.exec(attrStr))) {
      ch.setAttribute(am[1], am[2]);
      if (am[1] === 'style') {
        const bgm = /background-image:\s*url\(([^)]+)\)/.exec(am[2]);
        if (bgm) ch.style.backgroundImage = `url(${bgm[1]})`;
        const bgg = /background:\s*([^;]+)/.exec(am[2]);
        if (bgg) ch.style.background = bgg[1];
      }
    }
    if (ch.classList.contains('px-echo')) {
      const au = makeEl('canvas', '');
      au.setAttribute('class', 'aura');
      ch.appendChild(au);
    }
    parent.children.push(ch);
  }
}

// Create VM sandbox with all Project Echo scripts
const docRoot = makeEl('body', '');
const appEl = makeEl('div', ''); appEl.id = 'app';
const ovEl = makeEl('div', ''); ovEl.id = 'overlay';
const toastEl = makeEl('div', ''); toastEl.id = 'toast';
const screenEl = makeEl('div', ''); screenEl.id = 'screen';
docRoot.appendChild(screenEl);
screenEl.appendChild(appEl);
screenEl.appendChild(ovEl);
screenEl.appendChild(toastEl);

const storage = {};
const W = {
  console,
  Math,
  Date,
  Uint8Array,
  Uint8ClampedArray,
  Float32Array,
  ArrayBuffer,
  Set,
  Map,
  Promise,
  Proxy,
  JSON,
  Number,
  String,
  Object,
  Array,
  RegExp,
  Error,
  parseInt,
  parseFloat,
  isNaN,
  innerWidth: 360,
  innerHeight: 640,
  devicePixelRatio: 2,
  performance: { now: () => Date.now() },
  localStorage: {
    getItem: k => storage[k] ?? null,
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: k => { delete storage[k]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
  },
  matchMedia: () => ({ matches: false }),
  setInterval: () => 1,
  clearInterval: () => {},
  setTimeout: (fn, ms) => { if (ms === 0) try { fn(); } catch(e){} return 1; },
  clearTimeout: () => {},
  requestAnimationFrame: () => 1,
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {},
  CustomEvent: function(name, o) { this.type = name; this.detail = o && o.detail; },
  Image: function() {
    this.complete = true;
    this.naturalWidth = 48;
    this.naturalHeight = 48;
    this.width = 48;
    this.height = 48;
    let _src = '';
    Object.defineProperty(this, 'src', {
      get() { return _src; },
      set(v) {
        _src = String(v || '');
        if (this.onload) { try { this.onload(); } catch(e){} }
      }
    });
  },
  fetch: (url) => {
    const clean = String(url).split('?')[0];
    const fp = path.join(ROOT, clean);
    if (fs.existsSync(fp)) {
      const txt = fs.readFileSync(fp, 'utf8');
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(txt)) });
    }
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.reject(new Error('404')) });
  },
  document: {
    readyState: 'complete',
    hidden: false,
    body: docRoot,
    documentElement: makeEl('html', ''),
    createElement: tag => makeEl(tag, ''),
    getElementById: id => {
      if (id === 'app') return appEl;
      if (id === 'overlay') return ovEl;
      if (id === 'toast') return toastEl;
      if (id === 'screen') return screenEl;
      return docRoot.querySelector('#' + id);
    },
    querySelector: sel => docRoot.querySelector(sel),
    querySelectorAll: sel => docRoot.querySelectorAll(sel),
    addEventListener: () => {},
    removeEventListener: () => {}
  }
};
W.window = W;
W.self = W;
W.globalThis = W;
vm.createContext(W);

const SCRIPTS = [
  'families.js', 'config.js', 'games_tuning.js', 'difficulty.js', 'needs.js',
  'affection.js', 'pixel.js', 'sound.js', 'musicfx.js', 'echoback.js',
  'art.js', 'dialogue.js', 'dialogue_engine.js', 'lines.js', 'memory.js',
  'runner.js', 'catch.js', 'stack.js', 'notes.js', 'bondup.js',
  'scenes.js', 'postcards.js', 'foods.js', 'need_tags.js', 'need_select.js',
  'alive.js', 'game.js'
];
for (const s of SCRIPTS) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, s), 'utf8'), W, { filename: s });
}

const PIXEL = W.PIXEL;
const FAM = W.FAMILIES;
const DEN = W.DEN;
const ENV = W.ENV_HOTSPOTS;
const DE = W.DialogueEngine;

// Load aura.json synchronously into PIXEL
const auraJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'px/aura.json'), 'utf8'));

(async () => {
  await W.Dialogue.load('slyte');
  await new Promise(r => setImmediate(r));

  console.log('=== Deliverable 1: PIXEL.poseSheet & Pose/Fluff/Aura/Origin Fixes ===');
  // 1a. PIXEL.variant honors explicit fluff (0..3) and object g
  for (let fl = 0; fl < 4; fl++) {
    const v1 = PIXEL.variant(42, 'slyte', 'ember-russet', fl);
    check(v1.fluff === fl && v1.pal === 'ember-russet', `variant(seed, sp, pal, ${fl}) honors explicit fluff`);
    const v2 = PIXEL.variant({ seed: 42, pal: 'ember-russet', fluff: fl }, 'slyte');
    check(v2.fluff === fl && v2.pal === 'ember-russet', `variant(g_obj) honors g.fluff=${fl}`);
  }

  // 1b. PIXEL.lookOf works even when pal is omitted
  for (const animalKey of FAM.animalOrder) {
    const a = FAM.animals[animalKey], f = FAM[a.family], sp = f.sprite, lk = a.look;
    const resolved = PIXEL.lookOf(sp, { seed: 7, look: lk });
    if (lk === f.look_base) {
      check(resolved === null, `lookOf(${sp}, {look:'${lk}'}) base look returns null`);
    } else {
      check(resolved === lk, `lookOf(${sp}, {look:'${lk}'}) without pal preserves '${lk}' (got ${resolved})`);
    }
  }

  // 1c. PIXEL.poseSheet across all 5 poses (home, ev, sleep, walk, fly), all 20 animals, all 4 fluff levels (f0..f3), Stage 1 (_light) & Stage 4
  let poseCount = 0;
  for (const animalKey of FAM.animalOrder) {
    const a = FAM.animals[animalKey], f = FAM[a.family], sp = f.sprite, lk = a.look, pal = f.chips[0].ramp;
    for (let fl = 0; fl < 4; fl++) {
      for (const st of [1, 4]) {
        const base = PIXEL.sheet(sp, { seed: 7, pal, look: lk, fluff: fl }, st);
        check(base.endsWith(`_f${fl}${st === 1 ? '_light' : ''}.png`), `sheet(${animalKey}, f${fl}, st=${st}) = ${base}`);
        check(PIXEL.poseSheet(base, 'home') === base, `poseSheet home for ${base}`);
        for (const pose of ['ev', 'sleep', 'walk', 'fly']) {
          const ps = PIXEL.poseSheet(base, pose);
          check(!ps.includes('_light'), `poseSheet(${base}, ${pose}) strips _light -> ${ps}`);
          check(ps.endsWith(`_f${fl}_${pose}.png`), `poseSheet(${base}, ${pose}) preserves _f${fl} -> ${ps}`);
          poseCount++;
        }
      }
    }
  }
  check(poseCount === 20 * 4 * 2 * 4, `All ${poseCount} (20 animals x 4 fluffs x 2 stages x 4 poses) poseSheet checks verified`);

  // 1d. sleep(), wake(), fly(), walk(), and auraSync() on .px-echo
  const foxEl = makeEl('div', '');
  foxEl.setAttribute('class', 'echo-svg px-echo fox');
  foxEl.setAttribute('data-glow', '3');
  foxEl.setAttribute('data-pal', 'ember-russet');
  foxEl.style.backgroundImage = 'url(px/slyte_wolf_ember-russet_f2.png)';
  const auCv = makeEl('canvas', ''); auCv.setAttribute('class', 'aura');
  foxEl.appendChild(auCv);

  PIXEL.sleep(foxEl, true);
  check(foxEl.style.backgroundImage.includes('_f2_sleep.png'), `sleep(el, true) preserves _f2: ${foxEl.style.backgroundImage}`);
  check(foxEl._auraSheet && foxEl._auraSheet.includes('_f2_sleep.png'), `auraSync updated during sleep: ${foxEl._auraSheet}`);

  let woke = false;
  PIXEL.wake(foxEl, () => { woke = true; });
  check(foxEl.style.backgroundImage.includes('_f2_sleep.png'), `wake(el) preserves _f2 during wake sequence: ${foxEl.style.backgroundImage}`);

  PIXEL.walk(foxEl, 'trot');
  check(foxEl.style.backgroundImage.includes('_f2_walk.png'), `walk(el, 'trot') uses _f2_walk.png: ${foxEl.style.backgroundImage}`);
  check(foxEl._auraSheet && foxEl._auraSheet.includes('_f2_walk.png') && foxEl._auraCol === 6, `auraSync updated during walk col 6: ${foxEl._auraSheet} col=${foxEl._auraCol}`);
  PIXEL.walk(foxEl, null);

  const owlEl = makeEl('div', '');
  owlEl.setAttribute('class', 'echo-svg px-echo owl');
  owlEl.setAttribute('data-glow', '2');
  owlEl.setAttribute('data-pal', 'sun-finch');
  owlEl.style.backgroundImage = 'url(px/whimber_chicken_sun-finch_f3_light.png)';
  const auCv2 = makeEl('canvas', ''); auCv2.setAttribute('class', 'aura');
  owlEl.appendChild(auCv2);

  PIXEL.fly(owlEl, true);
  check(owlEl.style.backgroundImage.includes('_f3_fly.png') && !owlEl.style.backgroundImage.includes('_light'), `fly(el, true) at Stage 1 strips _light and keeps _f3: ${owlEl.style.backgroundImage}`);
  check(owlEl._auraSheet && owlEl._auraSheet.includes('_f3_fly.png'), `auraSync updated during fly: ${owlEl._auraSheet}`);

  // 1e. obGlow() / obGlowPaint() preserving data-look and data-fluff
  const glowHTML = W.__echo.obGlow('whimber', 19, 'sun-finch', 3, 'chicken', 2);
  check(glowHTML.includes('data-look="chicken"') && glowHTML.includes('data-fluff="2"'), `obGlow writes data-look and data-fluff: ${glowHTML}`);
  appEl.innerHTML = glowHTML;
  W.__echo.obGlowPaint();
  const obCv = appEl.querySelector('canvas.obglow');
  check(obCv && obCv.dataset.sheet === 'px/whimber_chicken_sun-finch_f2.png', `obGlowPaint resolves exact look+fluff sheet: ${obCv && obCv.dataset.sheet}`);

  // 1f. orFinish() persisting S.g.fluff alongside S.g.look and S.g.pal
  W.__echo.setState({
    kidId: 'k1', child: 'Mia', voice: true, music: true, vars: {}, ageBand: '7-8', oseed: 123, originIdx: 0, songs: [],
    origin: { idx: 0, animal: 'wolf', family: 'slyte', ramp: 'ember-russet', seed: 77, fluff: 3, src: 'chips' }
  });
  W.__echo.orFinish('Ramble', true);
  const stAfterOr = W.__echo.state;
  check(stAfterOr.g.look === 'wolf' && stAfterOr.g.pal === 'ember-russet' && stAfterOr.g.fluff === 3, `orFinish persists look=${stAfterOr.g.look}, pal=${stAfterOr.g.pal}, fluff=${stAfterOr.g.fluff}`);

  // 1g. svg(kind, g, expr) initial expression & stable across breathe frames
  const happyHTML = W.__echo.svg('fox', stAfterOr.g, 'happy');
  check(happyHTML.includes('data-expr="happy"'), `svg(kind, g, 'happy') sets data-expr="happy"`);

  console.log('=== Deliverable 2: Mini-Games Sprite & Animation Fixes ===');
  // 2a. stackGame animates ground Echos across BREATHE/blink/reaction columns + draws aura
  stAfterOr.bond = 250; stAfterOr.lowfx = false;
  W.__echo.stackGame();
  for (let i = 0; i < 60; i++) W.__echo.__stackStep ? W.__echo.__stackStep(1/60) : W.__stackStep(1/60);
  const stEcho1 = W.__stackEcho();
  check(stEcho1.colsSeen.length > 1 && stEcho1.colsSeen.includes(1) && stEcho1.colsSeen.includes(2), `stackGame animates ground Echo across BREATHE columns: ${JSON.stringify(stEcho1.colsSeen)}`);
  check(stEcho1.auraDraws > 0, `stackGame draws PIXEL.aura behind ground Echo (${stEcho1.auraDraws} draws)`);
  W.__stack.sx = W.__stack.top;
  W.__stackPress();
  W.__stackStep(1/60);
  const stEchoReact = W.__stackEcho();
  check(stEchoReact.react > 0 && [5, 6, 7, 8].includes(stEchoReact.col) && stEchoReact.dy === -2, `stackGame reacts on block placement: col=${stEchoReact.col}, dy=${stEchoReact.dy}`);

  // 2b. PIXEL.runFrames(sp, g) for all 20 animals & RFRAMES.delighted / RFRAMES.sing
  check(Array.isArray(PIXEL.RFRAMES.delighted) && PIXEL.RFRAMES.delighted.length === 8, `RFRAMES.delighted = ${JSON.stringify(PIXEL.RFRAMES.delighted)}`);
  check(Array.isArray(PIXEL.RFRAMES.sing) && PIXEL.RFRAMES.sing.join(',') === '5,6,5,6', `RFRAMES.sing = ${JSON.stringify(PIXEL.RFRAMES.sing)}`);
  const ebCss = fs.readFileSync(path.join(ROOT, 'echoback.css'), 'utf8');
  check(!ebCss.includes('rotate(') && ebCss.includes('steps(1,end)') && ebCss.includes('translateY(-2px)'), 'echoback.css uses whole-pixel steps(1,end) without rotate()');
  const ebJs = fs.readFileSync(path.join(ROOT, 'echoback.js'), 'utf8');
  check(ebJs.includes("PIXEL.react('sing')"), "echoback.js triggers PIXEL.react('sing') on sung notes");

  console.log('=== Deliverable 3: window.DEN (PIXEL.den) 5-Layer Parallax & ToD Presets ===');
  check(DEN && DEN.config && DEN.config._schema === 'echo-ios-parallax-dens-v1', 'DEN schema loaded synchronously');
  check(DEN.viewport.logical_width_px === 180 && DEN.viewport.logical_height_px === 320, 'DEN logical viewport 180x320');
  check(DEN.viewport.parallax_canvas_width_px === 196 && DEN.viewport.parallax_canvas_height_px === 336 && DEN.viewport.bleed_margin_px === 8, 'DEN bleed canvas 196x336 with 8px bleed');
  check(['L0', 'L1', 'L2', 'L3', 'L4'].every(l => DEN.planes[l]), 'All 5 depth planes L0..L4 present');
  check(DEN.planes.L0.invert_direction === true && DEN.planes.L3.character_locked_to_plane === true && DEN.planes.L4.pointer_events === 'none', 'Depth plane flags match spec');
  check(DEN.presetForHour(8).id === 'morning_dew' && DEN.presetForHour(14).id === 'sunny_afternoon' && DEN.presetForHour(18).id === 'cozy_dusk' && DEN.presetForHour(22).id === 'starlight_night', '4 time-of-day presets map correctly by hour');
  for (const pid of ['morning_dew', 'sunny_afternoon', 'cozy_dusk', 'starlight_night']) {
    const p = DEN.presets[pid];
    check(p.character_sprite_tint_mix === 0.0 && p.shader_uniforms.u_spriteProtect === 1.0, `Preset ${pid} preserves u_spriteProtect=1.0 and character_sprite_tint_mix=0.0`);
  }

  // Spring physics & tilt offsets
  stAfterOr.lowfx = false; stAfterOr.calm = false; stAfterOr.gyroParallax = true;
  DEN.recenter();
  DEN.setTilt(12, 12);
  for (let i = 0; i < 60; i++) DEN.stepSpring(1/60);
  const oL0 = DEN.offsetForLayer('L0');
  const oL3 = DEN.offsetForLayer('L3');
  const oL4 = DEN.offsetForLayer('L4');
  check(oL0.dx < 0 && Math.abs(oL0.dx + 1.0) < 0.05 && Math.abs(oL0.dy + 0.5) < 0.05, `L0 inverted max offset at +12 deg: ${JSON.stringify(oL0)}`);
  check(oL3.dx > 0 && Math.abs(oL3.dx - 5.5) < 0.05 && Math.abs(oL3.dy - 3.0) < 0.05, `L3 stage offset at +12 deg: ${JSON.stringify(oL3)}`);
  check(oL4.dx > 0 && Math.abs(oL4.dx - 8.0) < 0.05 && Math.abs(oL4.dy - 4.5) < 0.05, `L4 fg offset at +12 deg: ${JSON.stringify(oL4)}`);

  // lowFx / Calm effects bypass -> [0, 0]
  stAfterOr.lowfx = true;
  check(DEN.offsetForLayer('L3').dx === 0 && DEN.offsetForLayer('L4').dy === 0, 'lowFx bypass zeroes all parallax offsets to [0,0]');
  stAfterOr.lowfx = false;

  console.log('=== Deliverable 4: Interactive Environment Hotspots (SCENE_HOTSPOTS v2.0.0) ===');
  check(W.SCENE_HOTSPOTS && W.SCENE_HOTSPOTS._version === '2.0.0', 'SCENE_HOTSPOTS v2.0.0 loaded');
  for (const scId of ['clearing', 'grove', 'meadow', 'branch', 'library', 'hilltop', 'twitchel_wild_clearing', 'twitchel_sunbeam_room', 'twitchel_grove', 'twitchel_meadow', 'twitchel_garden']) {
    const spots = ENV.forScene(scId, scId.startsWith('twitchel_') ? 'twitchel' : (['branch','library','hilltop'].includes(scId) ? 'whimber' : 'slyte'));
    check(Array.isArray(spots) && spots.length >= 3 && spots.length <= 5, `Scene ${scId} has ${spots && spots.length} interactive hotspots`);
  }

  W.__echo.home();
  const scEl = W.document.getElementById('sc');
  ENV.reset();
  const spotsInClearing = ENV.forScene('clearing', 'slyte');
  const r1 = ENV.trigger(spotsInClearing[0].id, { scEl, fam: 'slyte', sceneId: 'clearing', force: true });
  const r2 = ENV.trigger(spotsInClearing[1].id, { scEl, fam: 'slyte', sceneId: 'clearing', force: true });
  const r3 = ENV.trigger(spotsInClearing[2].id, { scEl, fam: 'slyte', sceneId: 'clearing', force: true });
  check(r1 && r1.notes.length === 2 && r1.spawnedNotes >= 1 && r1.spawnedSparks >= 2, `Hotspot tap 1 plays 2 pentatonic notes and spawns notes/sparkles: ${JSON.stringify(r1)}`);
  check(r3 && r3.tapStreak === 3 && r3.hummed === true, `3rd consecutive hotspot tap triggers Echo answering hum: tapStreak=${r3 && r3.tapStreak}, hummed=${r3 && r3.hummed}`);

  const wpRes = ENV.triggerWaypoint('flower_patch', scEl, 'slyte', 'clearing');
  check(wpRes && wpRes.auto === true && wpRes.spotId === 'clearing_flower_1', `Autonomous waypoint arrival at flower_patch triggers flower hotspot: ${JSON.stringify(wpRes)}`);

  console.log('=== Deliverable 5: Dialogue v2 Smart Engine, 64-Ring Buffer & EDZ1 Export ===');
  check(DE && DE.corpusSize() >= 5000, `DialogueEngine effective corpus size >= 5,000 (got ${DE && DE.corpusSize()})`);

  // Verify 20 animals x 3 age bands produce distinct look-matched and age-matched lines
  for (const band of ['5-6', '7-8', '9-10']) {
    for (const animalKey of FAM.animalOrder) {
      const a = FAM.animals[animalKey];
      const line = DE.pick({ state: { chatHistory: [] }, look: a.look, family: a.family, ageBand: band, scene: 'clearing', time: 'morning', need: 'happy' });
      check(line && line.look === a.look && line.ageBand === band && line.score >= 80, `DialogueEngine.pick(${a.look}, ${band}) score=${line && line.score}`);
    }
  }

  // Verify 64-entry S.chatHistory ring buffer never repeats across 64 consecutive calls and caps at 64
  const mockState = { chatHistory: [] };
  const pickedIds = new Set();
  for (let i = 0; i < 64; i++) {
    const p = DE.pick({ state: mockState, look: 'wolf', family: 'slyte', ageBand: '7-8', scene: 'clearing', time: 'day', need: 'happy' });
    pickedIds.add(p.id);
  }
  check(pickedIds.size === 64 && mockState.chatHistory.length === 64, `64 consecutive picks yielded ${pickedIds.size} unique lines and chatHistory length=${mockState.chatHistory.length}`);
  DE.pick({ state: mockState, look: 'wolf', family: 'slyte', ageBand: '7-8', scene: 'clearing', time: 'day', need: 'happy' });
  check(mockState.chatHistory.length === 64, `S.chatHistory ring buffer stays capped at 64 (got ${mockState.chatHistory.length})`);

  // Verify 2-3 turn interactive mini-conversation
  let miniDone = null;
  DE.runMiniConversation(
    { state: mockState, look: 'lion', family: 'twitchel', ageBand: '7-8', scene: 'twitchel_wild_clearing', time: 'evening', need: 'happy' },
    { autoPick: 0 },
    info => { miniDone = info; }
  );
  check(miniDone && miniDone.turnsCompleted >= 2 && miniDone.log.length >= 4, `2-3 turn mini-conversation completed (${miniDone && miniDone.log.length} beats logged)`);

  // Verify Zane's EDZ1 compiler script succeeds
  const edzOut = cp.execFileSync('python3', [path.join(ROOT, 'tools/compile_dialogue_v2.py')], { encoding: 'utf8' });
  check(edzOut.includes('EDZ1 dialogue_repo.dz built:'), `EDZ1 dialogue_repo.dz built cleanly: ${edzOut.trim().split('\n').pop()}`);

  if (failed.length) {
    console.error(`\nFAILED ${failed.length}/${total} checks`);
    process.exit(1);
  }
  console.log(`\nALL ${passed}/${total} SPRITE UNIFICATION, DEN, HOTSPOTS & DIALOGUE V2 CHECKS PASSED!`);
})();
