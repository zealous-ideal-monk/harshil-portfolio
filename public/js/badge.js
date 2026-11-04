/* 3D lanyard badge: a vanilla Three.js port of Vercel's Ship '24 badge
   (rope joints + spherical joint + kinematic drag + tilt-to-front + lerped band). */
(() => {
  const canvas = document.getElementById('badge'), hero = document.getElementById('hero');
  if (!window.THREE || !canvas) return;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { return; }
  if (!renderer.getContext()) return;
  const root = document.documentElement;
  root.classList.add('badge-3d');

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(25, 1, 0.1, 100);
  camera.position.set(0, 0, 13);

  /* Environment built from "lightformers", as in the original */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x000000);
  const lightformer = (intensity, color, pos, rot, scl) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...pos); m.rotation.set(...rot); m.scale.set(...scl); envScene.add(m);
  };
  lightformer(2, '#ffffff', [0, -1, 5], [0, 0, Math.PI / 3], [100, 0.1, 1]);
  lightformer(3, '#ffffff', [-1, -1, 1], [0, 0, Math.PI / 3], [100, 0.1, 1]);
  lightformer(3, '#ffffff', [1, 1, 1], [0, 0, Math.PI / 3], [100, 0.1, 1]);
  lightformer(6, '#ffffff', [-10, 0, 14], [0, Math.PI / 2, Math.PI / 3], [100, 10, 1]);
  lightformer(2, '#FF5EA9', [10, 2, 8], [0, -Math.PI / 2, 0], [100, 6, 1]);
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;
  scene.add(new THREE.AmbientLight(0xffffff, 1.15));
  const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(-3, 4, 6); scene.add(dl);

  /* ---------- textures drawn in canvas (stand-in for RenderTexture + Text3D) ---------- */
  const A = '"Poppins",Arial,sans-serif', M = 'italic 600 "Poppins",Arial,sans-serif'.replace(/^italic 600 /, '');
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const frontC = mk(1024, 1440), backC = mk(1024, 1440), bandC = mk(1024, 256);
  const tex = c => { const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; };
  const frontT = tex(frontC), backT = tex(backC), bandT = tex(bandC);
  bandT.wrapS = bandT.wrapT = THREE.RepeatWrapping;

  function setFont(ctx, weight, size, fam, stretch) {
    ctx.font = weight + ' ' + size + 'px ' + fam;
    if ('fontStretch' in ctx) ctx.fontStretch = stretch || 'normal';
  }
  function fit(ctx, text, maxW, weight, size, fam, stretch) {
    let s = size; setFont(ctx, weight, s, fam, stretch);
    while (ctx.measureText(text).width > maxW && s > 20) { s -= 4; setFont(ctx, weight, s, fam, stretch); }
    return s;
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function slot(ctx, W) { ctx.fillStyle = '#2a2a2a'; rr(ctx, W / 2 - 120, 48, 240, 46, 23); ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#8a8a8a'; ctx.stroke(); }

  function drawFront() {
    const ctx = frontC.getContext('2d'), W = 1024, H = 1440;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#F4F4EE'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 380);
    slot(ctx, W);
    ctx.fillStyle = '#FFC21A'; fit(ctx, 'BACKSTAGE', W - 112, 900, 170, A, 'condensed'); ctx.fillText('BACKSTAGE', 56, 262);
    ctx.fillStyle = '#fff'; setFont(ctx, 800, 44, A, 'expanded'); ctx.fillText('ALL ACCESS ✺ ALL AREAS', 58, 336);
    ctx.fillStyle = '#000'; fit(ctx, 'HARSHIL', W - 112, 900, 330, A, 'condensed'); ctx.fillText('HARSHIL', 56, 690);
    fit(ctx, 'SRIVASTAV', W - 112, 900, 210, A, 'condensed'); ctx.lineWidth = 6; ctx.strokeStyle = '#000'; ctx.strokeText('SRIVASTAV', 56, 870);
    ctx.save(); ctx.translate(600, 960); ctx.rotate(-0.08);
    ctx.fillStyle = '#000'; ctx.fillRect(-312, -50, 624, 108);
    ctx.fillStyle = '#FF5EA9'; ctx.fillRect(-320, -58, 624, 108);
    ctx.lineWidth = 6; ctx.strokeStyle = '#000'; ctx.strokeRect(-320, -58, 624, 108);
    ctx.fillStyle = '#000'; ctx.textAlign = 'center'; setFont(ctx, 400, 50, M); ctx.fillText('GTM ✺ community ✺ chaos', -8, 12);
    ctx.restore(); ctx.textAlign = 'left';
    const rows = [['ROLE', 'Builder, organiser, occasional comedian'], ['CLEARANCE', 'Signing authority (and the Excel sheet)']];
    rows.forEach(([k, v], i) => {
      const y = 1080 + i * 110;
      ctx.fillStyle = '#000'; ctx.fillRect(56, y - 50, W - 112, 5);
      setFont(ctx, 800, 28, A, 'expanded'); ctx.fillStyle = '#2B2BF0'; ctx.fillText(k, 56, y - 8);
      fit(ctx, v, W - 112, 600, 42, A); ctx.fillStyle = '#000'; ctx.fillText(v, 56, y + 40);
    });
    let x = 56; ctx.fillStyle = '#000';
    const bars = [3, 1, 2, 1, 4, 1, 1, 3, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 4, 2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 4, 1, 2];
    for (let i = 0; x < W - 56 && i < 400; i++) { const b = bars[i % bars.length] * 5; if (i % 2 === 0) ctx.fillRect(x, 1262, b, 50); x += b + 4; }
    ctx.fillStyle = '#2B2BF0'; ctx.fillRect(0, 1330, W, 110);
    ctx.fillStyle = '#fff'; fit(ctx, 'I DON’T WAIT FOR THE PLAYBOOK.', W - 112, 900, 60, A, 'condensed'); ctx.fillText('I DON’T WAIT FOR THE PLAYBOOK.', 56, 1405);
    ctx.lineWidth = 14; ctx.strokeStyle = '#000'; ctx.strokeRect(7, 7, W - 14, H - 14);
  }

  function drawBack() {
    const ctx = backC.getContext('2d'), W = 1024, H = 1440;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#2B2BF0'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.rotate(-0.35); ctx.fillStyle = 'rgba(255,194,26,.32)'; setFont(ctx, 900, 92, A, 'condensed');
    for (let y = -300, k = 0; y < 2000; y += 112, k++) ctx.fillText('TRY KARTE HAIN ✺ TRY KARTE HAIN ✺ TRY KARTE HAIN ✺', -700 + (k % 2) * -160, y);
    ctx.restore();
    slot(ctx, W);
    ctx.fillStyle = '#000'; ctx.fillRect(110, 440, W - 200, 560);
    ctx.fillStyle = '#fff'; ctx.fillRect(90, 420, W - 200, 560);
    ctx.lineWidth = 8; ctx.strokeStyle = '#000'; ctx.strokeRect(90, 420, W - 200, 560);
    ctx.fillStyle = '#000'; setFont(ctx, 400, 64, M);
    ['If found, please', 'return to the', 'nearest hackathon.'].forEach((l, i) => ctx.fillText(l, 140, 540 + i * 100));
    ctx.fillStyle = '#FF5EA9'; setFont(ctx, 400, 50, M); ctx.fillText('He’s probably running it.', 140, 900);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 1210, W, 230);
    ctx.fillStyle = '#FFC21A'; fit(ctx, 'GENESIS ✺ HACKERS OCCUPIED', W - 112, 900, 70, A, 'condensed'); ctx.fillText('GENESIS ✺ HACKERS OCCUPIED', 56, 1300);
    ctx.fillStyle = '#fff'; fit(ctx, 'GENERALLY CRITICAL ✺ FOUNDER’S FIND', W - 112, 800, 46, A, 'expanded'); ctx.fillText('GENERALLY CRITICAL ✺ FOUNDER’S FIND', 56, 1380);
    ctx.lineWidth = 14; ctx.strokeStyle = '#000'; ctx.strokeRect(7, 7, W - 14, H - 14);
  }

  function drawBand() {
    const ctx = bandC.getContext('2d'), W = 1024, H = 256;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#FF5EA9'; ctx.fillRect(0, 0, W, 22); ctx.fillRect(0, H - 22, W, 22);
    const t = 'HARSHIL ✺ BACKSTAGE ✺ ';
    setFont(ctx, 900, 150, A, 'condensed');
    const tw = ctx.measureText(t).width;
    ctx.save(); ctx.scale(W / tw, 1); ctx.fillStyle = '#FFC21A'; ctx.fillText(t, 0, H / 2 + 54); ctx.restore();
  }
  function drawAll() { drawFront(); drawBack(); drawBand(); frontT.needsUpdate = backT.needsUpdate = bandT.needsUpdate = true; }
  drawAll();
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('900 100px Poppins'), document.fonts.load('600 40px Poppins'), document.fonts.load('italic 600 40px Poppins')]).then(drawAll).catch(() => {});
  }

  /* ---------- card model (stand-in for the Blender tag.glb) ---------- */
  const CW = 1.6, CH = 2.25, CD = 0.02;
  function roundRect(w, h, r) {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  }
  const shape = roundRect(CW, CH, 0.09);
  const edgeGeo = new THREE.ExtrudeGeometry(shape, { depth: CD, bevelEnabled: false, curveSegments: 18 });
  edgeGeo.translate(0, 0, -CD / 2);
  const faceGeo = new THREE.ShapeGeometry(shape, 18);
  const fp = faceGeo.attributes.position, fu = faceGeo.attributes.uv;
  for (let i = 0; i < fp.count; i++) fu.setXY(i, (fp.getX(i) + CW / 2) / CW, (fp.getY(i) + CH / 2) / CH);
  const faceMat = map => new THREE.MeshPhysicalMaterial({ map, clearcoat: 1, clearcoatRoughness: 0.15, roughness: 0.35, metalness: 0.25 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xcfd2d6, metalness: 1, roughness: 0.3 });

  const card = new THREE.Group();
  const edge = new THREE.Mesh(edgeGeo, new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }));
  const front = new THREE.Mesh(faceGeo, faceMat(frontT)); front.position.z = CD / 2 + 0.0008;
  const back = new THREE.Mesh(faceGeo, faceMat(backT)); back.rotation.y = Math.PI; back.position.z = -CD / 2 - 0.0008;
  const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.15, 0.06), metal); clamp.position.y = CH / 2 + 0.02;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.14, 24), metal); stem.position.y = CH / 2 + 0.15;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.024, 20, 64), metal); ring.position.y = 1.34; ring.rotation.y = Math.PI / 2;
  card.add(edge, front, back, clamp, stem, ring);
  scene.add(card);
  const pickables = [edge, front, back, clamp];

  /* ---------- band (stand-in for MeshLine: camera-facing ribbon) ---------- */
  const N = 32, HALF = 0.24, TILE = HALF * 2 * 4;
  const bandGeo = new THREE.BufferGeometry();
  const bPos = new Float32Array((N + 1) * 6), bUv = new Float32Array((N + 1) * 4), bIdx = [];
  for (let i = 0; i < N; i++) { const a = i * 2; bIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  bandGeo.setIndex(bIdx);
  bandGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3));
  bandGeo.setAttribute('uv', new THREE.BufferAttribute(bUv, 2));
  const band = new THREE.Mesh(bandGeo, new THREE.MeshBasicMaterial({ map: bandT, side: THREE.DoubleSide }));
  band.frustumCulled = false;
  scene.add(band);

  /* ---------- physics: fixed -> j1 -> j2 -> j3 (rope joints, length 1) -> card (spherical joint at [0,1.45,0]) ---------- */
  const GRAV = -40, STEP = 1 / 60, SUB = 12, LIN_DAMP = 2, ANG_DAMP = 2, ROPE = 1;
  const PW = 1 / 0.06;                    // rope segment inverse mass (card mass = 1)
  const INV_I = new THREE.Vector3(1 / ((CH * CH + CD * CD) / 12), 1 / ((CW * CW + CD * CD) / 12), 1 / ((CW * CW + CH * CH) / 12));
  const R_LOCAL = new THREE.Vector3(0, 1.45, 0);
  const V3 = () => new THREE.Vector3();
  const x = [V3(), V3(), V3(), V3()], v = [V3(), V3(), V3(), V3()], prev = [V3(), V3(), V3(), V3()], w = [0, PW, PW, PW];
  const lerped = [null, V3(), V3()];
  const cp = V3(), cv = V3(), cw = V3(), cPrev = V3(), cq = new THREE.Quaternion(), qPrev = new THREE.Quaternion();
  const anchor = V3(), dragFrom = V3(), dragTarget = V3(), dragOffset = V3();
  const tA = V3(), tB = V3(), tC = V3(), tD = V3(), tQ = new THREE.Quaternion(), tQ2 = new THREE.Quaternion();
  let dragged = false, started = false, visible = true, hovered = false;

  function reset() {
    x[0].copy(anchor);
    for (let i = 1; i < 4; i++) { x[i].copy(anchor).add(tA.set(0.5 * i, 0, 0)); v[i].set(0, 0, 0); }
    lerped[1].copy(x[1]); lerped[2].copy(x[2]);
    cp.copy(anchor).add(tA.set(2, 0, 0)); cv.set(0, 0, 0); cw.set(0, 0, 0); cq.identity();
  }
  function invIWorld(vec, out) {
    tQ2.copy(cq).invert(); out.copy(vec).applyQuaternion(tQ2);
    out.set(out.x * INV_I.x, out.y * INV_I.y, out.z * INV_I.z).applyQuaternion(cq); return out;
  }
  function addRot(dTheta, scale) {
    tQ.set(dTheta.x * scale, dTheta.y * scale, dTheta.z * scale, 0).multiply(cq);
    cq.set(cq.x + 0.5 * tQ.x, cq.y + 0.5 * tQ.y, cq.z + 0.5 * tQ.z, cq.w + 0.5 * tQ.w).normalize();
  }
  function rope(a, b) {
    tA.subVectors(x[b], x[a]); const len = tA.length(); if (len <= ROPE) return;
    const ws = w[a] + w[b]; if (!ws) return;
    tA.divideScalar(len); const C = len - ROPE;
    x[a].addScaledVector(tA, (w[a] / ws) * C); x[b].addScaledVector(tA, -(w[b] / ws) * C);
  }
  function attach() {
    const r = tA.copy(R_LOCAL).applyQuaternion(cq);
    const n = tB.copy(cp).add(r).negate().add(x[3]);            // particle - attachment point
    const C = n.length(); if (C < 1e-7) return; n.divideScalar(C);
    let wB = 0;
    if (!dragged) { const rn = tC.crossVectors(r, n); wB = 1 + rn.dot(invIWorld(rn, tD)); }
    const lam = C / (w[3] + wB);
    x[3].addScaledVector(n, -w[3] * lam);
    if (!dragged) {
      cp.addScaledVector(n, lam);
      const tq = tC.crossVectors(r, n).multiplyScalar(lam);
      addRot(invIWorld(tq, tD), 1);
    }
  }
  function step() {
    const h = STEP / SUB;
    dragFrom.copy(cp);
    for (let s = 0; s < SUB; s++) {
      for (let i = 1; i < 4; i++) { v[i].y += GRAV * h; prev[i].copy(x[i]); x[i].addScaledVector(v[i], h); }
      cPrev.copy(cp); qPrev.copy(cq);
      if (dragged) cp.lerpVectors(dragFrom, dragTarget, (s + 1) / SUB);
      else { cv.y += GRAV * h; cp.addScaledVector(cv, h); addRot(cw, h); }
      x[0].copy(anchor);
      for (let it = 0; it < 2; it++) { rope(0, 1); rope(1, 2); rope(2, 3); attach(); }
      const ld = 1 / (1 + h * LIN_DAMP);
      for (let i = 1; i < 4; i++) v[i].subVectors(x[i], prev[i]).divideScalar(h).multiplyScalar(ld);
      cv.subVectors(cp, cPrev).divideScalar(h);
      if (dragged) cw.set(0, 0, 0);
      else {
        cv.multiplyScalar(ld);
        tQ.copy(qPrev).invert(); tQ.premultiply(cq);
        cw.set(tQ.x, tQ.y, tQ.z).multiplyScalar(2 / h); if (tQ.w < 0) cw.negate();
        cw.multiplyScalar(1 / (1 + h * ANG_DAMP));
      }
    }
    // Tilt it back towards the screen (same trick as the original)
    if (!dragged) cw.y -= cq.y * 0.25;
    if (!isFinite(cp.x + cp.y + cq.w)) reset();
  }
  function smooth(delta) {   // fix most of the jitter when over-pulling the card
    for (let i = 1; i <= 2; i++) {
      const d = Math.max(0.1, Math.min(1, lerped[i].distanceTo(x[i])));
      lerped[i].lerp(x[i], Math.min(1, delta * (10 + d * (50 - 10))));
    }
  }

  const curve = new THREE.CatmullRomCurve3([V3(), V3(), V3(), V3()]);
  curve.curveType = 'chordal';
  function updateBand() {
    curve.points[0].copy(x[3]); curve.points[1].copy(lerped[2]); curve.points[2].copy(lerped[1]); curve.points[3].copy(x[0]);
    const pts = curve.getPoints(N); let s = 0;
    for (let i = 0; i <= N; i++) {
      const p = pts[i];
      tA.subVectors(pts[Math.min(i + 1, N)], pts[Math.max(i - 1, 0)]).normalize();
      tB.subVectors(camera.position, p).normalize();
      tC.crossVectors(tA, tB).normalize().multiplyScalar(HALF);
      if (i) s += p.distanceTo(pts[i - 1]);
      bPos.set([p.x + tC.x, p.y + tC.y, p.z + tC.z, p.x - tC.x, p.y - tC.y, p.z - tC.z], i * 6);
      bUv.set([s / TILE, 1, s / TILE, 0], i * 4);
    }
    bandGeo.attributes.position.needsUpdate = true; bandGeo.attributes.uv.needsUpdate = true;
  }

  /* ---------- layout ---------- */
  let firstLayout = true;
  function layout() {
    const W = hero.clientWidth, H = hero.clientHeight; if (!W || !H) return;
    renderer.setSize(W, H, false);
    const aspect = W / H, mobile = aspect < 1;
    camera.aspect = aspect;
    camera.position.z = mobile ? Math.max(13, 13 / (aspect * 1.35)) : 13;
    camera.updateProjectionMatrix();
    const halfH = camera.position.z * Math.tan(THREE.MathUtils.degToRad(12.5)), halfW = halfH * aspect;
    // hang the card in the hero's free space (rightmost spot that clears the name and copy).
    // At rest the card centre sits 4.45 units below the anchor (three rope segments + the clip joint).
    const wpp = (2 * halfH) / H, clipU = 0.34;
    const sag = 0.12;                    // the ropes stretch a touch under the card's weight
    const spot = window.heroSpot && window.heroSpot(CW / wpp, (CH + clipU + sag) / wpp);
    if (spot) anchor.set((spot.x - W / 2) * wpp, (H / 2 - spot.y) * wpp + (sag - clipU) / 2 + 4.45, 0);   // box = clip + card + sag
    else { const cy = mobile ? halfH * 0.3 : halfH * 0.08; anchor.set(mobile ? halfW * 0.4 : halfW * 0.5, cy + 4.45, 0); }
    if (firstLayout) { firstLayout = false; reset(); }
  }
  layout();
  if (window.ResizeObserver) new ResizeObserver(layout).observe(hero); else addEventListener('resize', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  addEventListener('hero:ready', () => setTimeout(layout, 50));
  // QA hook: the card's on-screen box, in page pixels
  window.__badgeBox = () => { const r = canvas.getBoundingClientRect(), v = new THREE.Vector3(), xs = [], ys = [];
    [[-CW / 2, -CH / 2], [CW / 2, -CH / 2], [-CW / 2, CH / 2], [CW / 2, CH / 2]].forEach(([a, b]) => { v.set(a, b, 0); card.localToWorld(v); v.project(camera); xs.push(r.left + (v.x + 1) / 2 * r.width); ys.push(r.top + (1 - v.y) / 2 * r.height); });
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(Math.round); };
  if (window.IntersectionObserver) new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(hero);

  /* ---------- interaction: raycast grab, kinematic drag, grab cursor ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const cursorEl = document.getElementById('cursor'), cursorLab = document.getElementById('cursorLabel'), tip = document.getElementById('badgeTip');
  function toRay(cx, cy) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera); return r;
  }
  function pick(cx, cy) {
    const r = toRay(cx, cy);
    if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return null;
    return ray.intersectObjects(pickables, false)[0] || null;
  }
  function setHover(on) {
    hovered = on;
    document.body.style.cursor = dragged ? 'grabbing' : on ? 'grab' : '';
    if (cursorEl && root.classList.contains('has-cursor')) {
      if (on || dragged) { cursorLab.textContent = dragged ? 'wheee' : 'drag me'; cursorEl.classList.add('big'); }
    }
  }
  function startDrag(cx, cy) {
    const hit = pick(cx, cy); if (!hit || !started) return false;
    dragged = true; plane.constant = -hit.point.z;
    dragOffset.copy(hit.point).sub(cp); dragTarget.copy(cp);
    if (tip) tip.classList.add('gone');
    setHover(true); return true;
  }
  function moveDrag(cx, cy) {
    toRay(cx, cy);
    if (ray.ray.intersectPlane(plane, tA)) dragTarget.copy(tA).sub(dragOffset);
  }
  function endDrag() { if (!dragged) return; dragged = false; setHover(hovered); }

  addEventListener('pointerdown', e => {
    if (e.button > 0 || e.target.closest('a,button')) return;
    if (startDrag(e.clientX, e.clientY)) e.preventDefault();
  });
  addEventListener('pointermove', e => {
    if (dragged) { moveDrag(e.clientX, e.clientY); return; }
    if (e.pointerType === 'mouse' && visible && started) {
      const on = !!pick(e.clientX, e.clientY);
      if (on !== hovered || on) setHover(on);
    }
  }, { passive: true });
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', endDrag);
  hero.addEventListener('touchstart', e => {
    const t = e.touches[0]; if (t && pick(t.clientX, t.clientY) && started) e.preventDefault();
  }, { passive: false });
  hero.addEventListener('touchmove', e => { if (dragged) e.preventDefault(); }, { passive: false });

  const swingBtn = document.getElementById('swingBtn');
  if (swingBtn) swingBtn.addEventListener('click', () => {
    if (!started) return;
    cw.y += 9; cv.x -= 6; cw.z += 1.5;
    if (tip) tip.classList.add('gone');
  });

  /* ---------- start: drop in with the hero intro (or settle instantly for reduced motion) ---------- */
  function start() { if (started) return; started = true; }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!root.classList.contains('motion') || reduce) {
    for (let i = 0; i < 360; i++) step();
    lerped[1].copy(x[1]); lerped[2].copy(x[2]);
    start();
  } else {
    addEventListener('hero:ready', start, { once: true });
    setTimeout(start, 7000);
  }

  let last = performance.now(), acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const delta = Math.min((now - last) / 1000, 0.05); last = now;
    if (!visible) return;
    if (started) {
      acc += delta;
      while (acc >= STEP) { step(); acc -= STEP; }
      smooth(delta);
    }
    updateBand();
    card.position.copy(cp); card.quaternion.copy(cq);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
})();
