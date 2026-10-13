const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} }
};
const body = document.body;

/* 8-bit bunny, drawn from a pixel map (mid-leap, side view: O outline, W fur, S shade/far limbs, P inner ear, T tail, E eye, X eye shine, B blush, N nose) */
(() => {
  const map = [
    '............................',
    '..........OOOOO.............',
    '.........OWWPWWOOO..........',
    '.........OWWWPPPWWOOOO......',
    '..........OOSWWWPPWWWWO.....',
    '...........OSSSSSWWWWWWO....',
    '............OOOOOWWWXEWO....',
    '......OOO..OOWWWWWWWEEWWO...',
    '.....OTTTOOWWWWWWWWWWWWWNO..',
    '.....OTTTWWWWWWWWWWWWWBBO...',
    '.....OTTTWWWWWWWWWWWWOOO....',
    '......OOWWWWWWWWWWWWWO......',
    '.....OOWWWWWWWWWWWSWWWOO....',
    '....OWWWWWWWWWWWOOSSWWWWO...',
    '...OWWWWWWWWWWOO..OSSSWWO...',
    '..OWWWWOOOOOOO.....OSSOO....',
    '.OWWWWO.............OO......',
    '..OOSO......................',
    '....O.......................'
  ];
  const colours = { O: '#2a0610', W: '#fff1f4', S: '#e3b8c2', P: '#ff9fb8', T: '#ffffff', E: '#2a0610', X: '#ffffff', B: '#ffaabe', N: '#ff5c85' };
  let rects = '';
  map.forEach((row, y) => [...row].forEach((c, x) => {
    if (colours[c]) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${colours[c]}"/>`;
  }));
  document.getElementById('bunny').innerHTML =
    `<svg viewBox="0 0 28 19" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;

  // highlighting (selecting) any part of the heading also brings the bunny out
  const nameEl = document.getElementById('hi-title');
  document.addEventListener('selectionchange', () => {
    const sel = getSelection();
    const on = !!sel && !sel.isCollapsed && sel.rangeCount > 0 && sel.getRangeAt(0).intersectsNode(nameEl);
    nameEl.classList.toggle('selected', on);
  });
})();

/* in-page links (menu, rack planner pointer): scroll with JS so they also work in
   previews that block jumping to #anchors, e.g. pages opened as data: or file: URLs */
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const id = a.getAttribute('href').slice(1);
  const target = id && document.getElementById(id);
  if (!target) return;
  e.preventDefault();
  (target.closest('.reveal') || target).classList.add('in');
  // measure the layout position (offsetTop ignores the fade-in slide), and leave room for the sticky menu
  let y = 0;
  for (let el = target; el; el = el.offsetParent) y += el.offsetTop;
  const pad = document.querySelector('.navbar').offsetHeight + 10;
  window.scrollTo({ top: Math.max(0, y - pad), behavior: body.classList.contains('still') ? 'instant' : 'smooth' });
  try { if (location.protocol.startsWith('http')) history.pushState(null, '', '#' + id); } catch {}
});

/* contact form: send with fetch so visitors stay on the page and see a confirmation */
(() => {
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');
  if (!form) return;
  const say = (msg, kind) => { status.textContent = msg; status.className = 'form-status ' + (kind || ''); };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; say('Sending…');
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (res.ok) { form.reset(); say("Thanks! Your message is on its way.", 'ok'); }
      else {
        // Formspree explains what went wrong (e.g. an invalid email) in an "errors" list
        const data = await res.json().catch(() => ({}));
        const detail = (data.errors || []).map(x => x.message).filter(Boolean).join(' ');
        say(detail || 'Something went wrong sending that. Please try again in a moment.', 'err');
      }
    } catch {
      say("Couldn't reach the form service. Please check your connection and try again.", 'err');
    } finally { btn.disabled = false; }
  });
})();

/* reveal on scroll */
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px' });
  reveals.forEach(el => io.observe(el));
} else {
  reveals.forEach(el => el.classList.add('in'));
}

/* ── light ribbons ── */
const cv = document.getElementById('void');
const ctx = cv.getContext('2d');
const COLORS = [[196, 25, 63], [255, 143, 171], [150, 20, 50], [255, 211, 221], [220, 60, 95]];
let W = 0, H = 0, ribbons = [], sparks = [], raf = 0, last = 0, running = false;

function rand(a, b) { return a + Math.random() * (b - a); }
function makeSpark(fresh) {
  return {
    x: fresh ? rand(0, W) : rand(-200, W * .6), y: fresh ? rand(0, H) : rand(-100, H * .4),
    v: rand(.04, .12), len: rand(60, 180), c: COLORS[(Math.random() * COLORS.length) | 0], a: rand(.15, .45)
  };
}
function seed() {
  ribbons = COLORS.map((c, i) => ({
    y: .15 + i * .17 + rand(-.04, .04), amp: rand(30, 90), f: rand(.0012, .0028),
    sp: rand(.00012, .00028) * (i % 2 ? -1 : 1), ph: rand(0, 6.28), tilt: rand(-.18, .18),
    c, w: rand(.8, 1.8), a: rand(.4, .7)
  }));
  const n = W < 640 ? 7 : 14;
  sparks = Array.from({ length: n }, () => makeSpark(true));
}
function resize() {
  sizeRing();
  const w = innerWidth, h = innerHeight;
  // ignore small height changes from mobile URL bars
  if (w === W && Math.abs(h - H) < 120) return;
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  W = w; H = h;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  seed();
  if (!running) draw(14000, 0);
}

function ribbonPath(r, t) {
  ctx.beginPath();
  for (let x = -40; x <= W + 40; x += 18) {
    const y = H * r.y + (x - W / 2) * r.tilt
      + Math.sin(x * r.f + t * r.sp + r.ph) * r.amp
      + Math.sin(x * r.f * 2.3 - t * r.sp * 1.6) * r.amp * .3;
    x === -40 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
}
function draw(t, dt) {
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const r of ribbons) {
    const [R, G, B] = r.c;
    // fade the ribbon in and out along its length
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, `rgba(${R},${G},${B},0)`);
    g.addColorStop(.3 + .2 * Math.sin(t * .00005 + r.ph), `rgba(${R},${G},${B},1)`);
    g.addColorStop(1, `rgba(${R},${G},${B},0)`);
    ctx.strokeStyle = g;
    ribbonPath(r, t);
    // three passes = soft bloom without shadowBlur
    ctx.globalAlpha = r.a * .07; ctx.lineWidth = r.w * 26; ctx.stroke();
    ctx.globalAlpha = r.a * .2;  ctx.lineWidth = r.w * 7;  ctx.stroke();
    ctx.globalAlpha = r.a * .9;  ctx.lineWidth = r.w;      ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const s of sparks) {
    s.x += s.v * dt * 1.6; s.y += s.v * dt * .55;
    if (s.x - s.len > W || s.y - s.len > H) Object.assign(s, makeSpark(false));
    const tx = s.x - s.len, ty = s.y - s.len * .34;
    const [R, G, B] = s.c;
    const g = ctx.createLinearGradient(tx, ty, s.x, s.y);
    g.addColorStop(0, `rgba(${R},${G},${B},0)`);
    g.addColorStop(1, `rgba(${R},${G},${B},${s.a})`);
    ctx.strokeStyle = g; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(s.x, s.y); ctx.stroke();
  }
  drawRing(t);
}
function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = now - last;
  if (dt < 33) return;           // ~30fps is plenty for slow drift
  last = now;
  draw(now, Math.min(dt, 100));
}
/* ── hero emblem: low-poly hollow ring with a line-drawn triangle glyph floating in front ── */
const rc = document.getElementById('ring');
const rctx = rc.getContext('2d');
let RS = 0;
// build a ring lying in the XZ plane: seg = facets around, r = centre radius, hw = wall half-thickness, hh = half-height
function buildRing(seg, r, hw, hh) {
  const xs = [[r + hw, hh], [r - hw, hh], [r - hw, -hh], [r + hw, -hh]];   // cross-section (radius, y)
  const faces = [];
  for (let i = 0; i < seg; i++) {
    const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2, am = (a0 + a1) / 2;
    for (let k = 0; k < 4; k++) {
      const p = xs[k], q = xs[(k + 1) % 4];
      const pt = (rr, y, a) => [rr * Math.cos(a), y, rr * Math.sin(a)];
      // object-space normal: top, inner wall, bottom, outer wall
      const n = [[0, 1, 0], [-Math.cos(am), 0, -Math.sin(am)], [0, -1, 0], [Math.cos(am), 0, Math.sin(am)]][k];
      faces.push({ v: [pt(p[0], p[1], a0), pt(p[0], p[1], a1), pt(q[0], q[1], a1), pt(q[0], q[1], a0)], n });
    }
  }
  return faces;
}
const ringFaces = buildRing(14, 1, .14, .34);

// line-drawn triangle with a small circle at each tip (original glyph, drawn in its own flat plane)
const TRI_R = .92, TIP_R = .15, GLYPH_Z = 1.25;
const triTips = [0, 1, 2].map(i => { const a = Math.PI / 2 + i * Math.PI * 2 / 3; return [TRI_R * Math.cos(a), TRI_R * Math.sin(a)]; });
const circlePts = (cx, cy, r, n = 24) => Array.from({ length: n }, (_, i) => {
  const a = i / n * Math.PI * 2; return [cx + r * Math.cos(a), cy + r * Math.sin(a), 0];
});
const glyphLines = [];                                           // triangle sides, stopping at each tip's circle
for (let i = 0; i < 3; i++) {
  const [ax, ay] = triTips[i], [bx, by] = triTips[(i + 1) % 3];
  const len = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / len, uy = (by - ay) / len;
  glyphLines.push([[ax + ux * TIP_R, ay + uy * TIP_R, 0], [bx - ux * TIP_R, by - uy * TIP_R, 0]]);
}
const glyphCircles = triTips.map(([x, y]) => circlePts(x, y, TIP_R));

function sizeRing() {
  const b = rc.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  if (!b.width || b.width === RS) return;
  RS = b.width;
  rc.width = Math.round(RS * dpr); rc.height = Math.round(RS * dpr);
  rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function drawRing(t) {
  if (!RS) return;
  const D = 4.2, F = RS * .27 * D, C = RS / 2;
  const proj = ([x, y, z]) => { const s = F / (D - z); return [C + x * s, C - y * s]; };
  const L = [-.75, .55, .35], Lm = Math.hypot(...L); L.forEach((v, i) => L[i] = v / Lm);
  const Hv = [L[0], L[1], L[2] + 1], Hm = Math.hypot(...Hv); Hv.forEach((v, i) => Hv[i] = v / Hm);
  const light = n => [
    Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]),
    Math.pow(Math.max(0, n[0] * Hv[0] + n[1] * Hv[1] + n[2] * Hv[2]), 22)
  ];
  const path = pts => {
    rctx.beginPath();
    pts.forEach((p, i) => { const [x, y] = proj(p); i ? rctx.lineTo(x, y) : rctx.moveTo(x, y); });
    rctx.closePath();
  };
  rctx.clearRect(0, 0, RS, RS);
  rctx.lineJoin = 'round';

  // ── ring ──
  const spin = t * .00028, tilt = 1.05 + .18 * Math.sin(t * .00017), roll = .28 * Math.sin(t * .00011);
  const cy = Math.cos(spin), sy = Math.sin(spin), cx = Math.cos(tilt), sx = Math.sin(tilt), cz = Math.cos(roll), sz = Math.sin(roll);
  const rot = ([x, y, z]) => {
    let X = x * cy + z * sy, Z = -x * sy + z * cy;            // spin about Y
    let Y = y * cx - Z * sx; Z = y * sx + Z * cx;               // tilt about X
    return [X * cz - Y * sz, X * sz + Y * cz, Z];               // roll about Z
  };
  const vis = [];
  for (const f of ringFaces) {
    const v = f.v.map(rot), n = rot(f.n);
    const c = v.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4, s[2] + p[2] / 4], [0, 0, 0]);
    const toCam = [-c[0], -c[1], D - c[2]], tm = Math.hypot(...toCam);
    const facing = (n[0] * toCam[0] + n[1] * toCam[1] + n[2] * toCam[2]) / tm;
    if (facing <= 0) continue;                                  // back-face cull
    vis.push({ v, n, z: c[2], facing });
  }
  vis.sort((a, b) => a.z - b.z);                                // painter's order: far → near
  for (const f of vis) {
    const [diff, spec] = light(f.n), rim = Math.pow(1 - f.facing, 3);
    const r = 22 + 120 * diff * diff + 235 * spec + 90 * rim;
    const g = 3 + 12 * diff * diff + 195 * spec + 30 * rim;
    const b = 8 + 32 * diff * diff + 205 * spec + 50 * rim;
    path(f.v);
    rctx.fillStyle = `rgba(${Math.min(255, r) | 0},${Math.min(255, g) | 0},${Math.min(255, b) | 0},.95)`;
    rctx.fill();
    rctx.strokeStyle = `rgba(255,180,198,${.18 + .45 * diff + .4 * spec})`;
    rctx.lineWidth = .8;
    rctx.stroke();
  }

  // ── glyph: always in front of the ring; spins in its own plane and sways so it reads as a flat drawing ──
  const a = t * .0003, ya = .6 * Math.sin(t * .00042), xa = .3 * Math.sin(t * .00029);
  const ca = Math.cos(a), sa = Math.sin(a), cyy = Math.cos(ya), syy = Math.sin(ya), cxx = Math.cos(xa), sxx = Math.sin(xa);
  const orient = ([x, y, z]) => {
    let X = x * ca - y * sa, Y = x * sa + y * ca, Z = z;      // spin in plane
    const X2 = X * cyy + Z * syy; Z = -X * syy + Z * cyy;       // sway about Y
    return [X2, Y * cxx - Z * sxx, Y * sxx + Z * cxx];          // sway about X
  };
  const place = p => { const q = orient(p); return [q[0], q[1], q[2] + GLYPH_Z]; };
  const strokeGlyph = (width, style) => {
    rctx.lineWidth = width; rctx.strokeStyle = style;
    for (const [p, q] of glyphLines) {
      const [x0, y0] = proj(place(p)), [x1, y1] = proj(place(q));
      rctx.beginPath(); rctx.moveTo(x0, y0); rctx.lineTo(x1, y1); rctx.stroke();
    }
    for (const c of glyphCircles) { path(c.map(place)); rctx.stroke(); }
  };
  rctx.lineCap = 'round';
  rctx.shadowColor = 'rgba(255,143,171,.9)'; rctx.shadowBlur = 14;
  strokeGlyph(3, 'rgba(255,143,171,.35)');                      // soft glow pass
  rctx.shadowBlur = 0;
  strokeGlyph(1.4, 'rgba(255,238,243,.95)');                    // crisp line
}

function start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
function stop() { running = false; cancelAnimationFrame(raf); }

/* ── motion toggle (defaults to the OS reduced-motion setting) ── */
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const motionBtn = document.getElementById('motionToggle');
function motionOn() { const p = store.get('motion'); return p ? p === 'on' : !reduce.matches; }
function applyMotion() {
  const on = motionOn();
  body.classList.toggle('still', !on);
  motionBtn.textContent = on ? 'motion: on' : 'motion: off';
  motionBtn.setAttribute('aria-pressed', String(on));
  on && !document.hidden ? start() : (stop(), draw(14000, 0));
}
motionBtn.onclick = () => { store.set('motion', motionOn() ? 'off' : 'on'); applyMotion(); };
reduce.addEventListener?.('change', applyMotion);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stop(); else if (motionOn()) start();
});
addEventListener('resize', resize);

resize();
applyMotion();
