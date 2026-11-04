/* CINEMATIC STORY INTRO: Take 1. Scene: me.  Scroll-driven.
   Scroll progress is the only clock: p (0..1) maps to a scene position t, and every camera move,
   object, light, material and letter is a pure function of t. Scrolling up runs it backwards.
   Nothing renders unless the scroll position changes. Nothing here touches the rest of the page. */
(() => {
  if (window.CineIntro) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const lowPower = coarse || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  const T_END = 12.2;                          // length of the scene axis (t units)
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const k = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const eOut = x => 1 - Math.pow(1 - x, 3), eIn = x => x * x * x, eIO = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const eExpo = x => x === 1 ? 1 : 1 - Math.pow(2, -10 * x);

  function hasWebGL() { try { const c = document.createElement('canvas'); const g = c.getContext('webgl'); if (!g) return false; const l = g.getExtension('WEBGL_lose_context'); if (l) l.loseContext(); return true; } catch (e) { return false; } }

  /* ---------- sound: on by default, started by the visitor's first tap, click or key (browser rule) ---------- */
  function makeAudio() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    const ctx = new AC();
    const master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
    master.connect(comp); comp.connect(ctx.destination);
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const loopNoise = () => { const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true; s.start(); return s; };
    // continuous layers whose levels follow the timeline
    const droneG = ctx.createGain(); droneG.gain.value = 0; droneG.connect(master);
    [55, 82.41, 110.2].forEach((f, i) => { const o = ctx.createOscillator(); o.type = i === 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = i * 4; const g = ctx.createGain(); g.gain.value = i === 2 ? .05 : .16; o.connect(g); g.connect(droneG); o.start(); });
    const dn = loopNoise(), dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 220; const dng = ctx.createGain(); dng.gain.value = .08; dn.connect(dlp); dlp.connect(dng); dng.connect(droneG);
    const padG = ctx.createGain(); padG.gain.value = 0; const plp = ctx.createBiquadFilter(); plp.type = 'lowpass'; plp.frequency.value = 1100; plp.connect(padG); padG.connect(master);
    [110, 164.81, 220, 277.18, 329.63].forEach((f, i) => { [-5, 5].forEach(d => { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.detune.value = d; const g = ctx.createGain(); g.gain.value = .035 - i * .004; o.connect(g); g.connect(plp); o.start(); }); });
    const riserG = ctx.createGain(); riserG.gain.value = 0; const rbp = ctx.createBiquadFilter(); rbp.type = 'bandpass'; rbp.Q.value = 1.2; rbp.frequency.value = 400;
    const rn = loopNoise(); rn.connect(rbp); rbp.connect(riserG); riserG.connect(master);
    const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
    const one = {
      impact(big) { const t = ctx.currentTime + .01; const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(big ? 110 : 160, t); o.frequency.exponentialRampToValueAtTime(38, t + .35); env(g, t, .006, big ? .9 : .55, big ? 1.1 : .45); o.connect(g); g.connect(master); o.start(t); o.stop(t + 1.3);
        const s = ctx.createBufferSource(); s.buffer = nb; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = big ? 2400 : 3800; const ng = ctx.createGain(); env(ng, t, .003, big ? .35 : .22, big ? .6 : .12); s.connect(f); f.connect(ng); ng.connect(master); s.start(t); s.stop(t + .8); },
      whoosh(pan) { const t = ctx.currentTime + .01, dur = 1.1; const s = ctx.createBufferSource(); s.buffer = nb; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2.2;
        f.frequency.setValueAtTime(320, t); f.frequency.exponentialRampToValueAtTime(2600, t + dur * .55); f.frequency.exponentialRampToValueAtTime(700, t + dur);
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.32, t + dur * .5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        let last = g; if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.setValueAtTime(-pan, t); p.pan.linearRampToValueAtTime(pan, t + dur); g.connect(p); last = p; }
        s.connect(f); f.connect(g); last.connect(master); s.start(t); s.stop(t + dur + .05); },
      shimmer() { const t = ctx.currentTime + .01; [1180, 1730, 2410, 3320].forEach((fr, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = fr; env(g, t + i * .05, .01, .06 - i * .01, 2.2); o.connect(g); g.connect(master); o.start(t); o.stop(t + 2.6); }); }
    };
    let on = false, onState = null;
    ctx.onstatechange = () => { if (onState) onState(); };
    return {
      get on() { return on; },
      get running() { return ctx.state === 'running'; },
      onstate(f) { onState = f; },
      enable() { on = true; master.gain.setTargetAtTime(.85, ctx.currentTime, .08); return ctx.resume(); },
      disable() { on = false; master.gain.setTargetAtTime(0, ctx.currentTime, .05); setTimeout(() => { if (!on) ctx.suspend(); }, 300); },
      levels(l) { if (!on) return; const n = ctx.currentTime; droneG.gain.setTargetAtTime(l.drone, n, .15); padG.gain.setTargetAtTime(l.pad, n, .3); riserG.gain.setTargetAtTime(l.riser, n, .08); rbp.frequency.setTargetAtTime(l.riserF, n, .08); },
      cue(name, arg) { if (on) one[name](arg); },
      close() { on = false; try { ctx.close(); } catch (e) {} }
    };
  }

  /* ---------- the 3D world ---------- */
  function buildWorld(host, photoSrc) {
    const T = window.THREE;
    // quality tiers: phones/low-power get a 1.1 MP budget (up to 1.5x), desktops 3.6 MP (up to 2x). MSAA on both:
    // on phones' tiled GPUs it is cheap, and it is what removes the stair-stepping on thin chrome edges.
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    const aniso = Math.min(renderer.capabilities.getMaxAnisotropy(), lowPower ? 4 : 8);
    let prScale = 1;   // lowered automatically if this device can't hold the frame rate (see apply)
    const setPR = () => renderer.setPixelRatio(Math.max(1, Math.min(devicePixelRatio || 1, lowPower ? 1.5 : 2, Math.sqrt((lowPower ? 1.1e6 : 3.6e6) / Math.max(1, W * H))) * prScale));
    renderer.setClearColor(0x030303, 1);
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0;
    const cvs = renderer.domElement; cvs.className = 'cine-canvas'; host.appendChild(cvs);
    const scene = new T.Scene(); scene.fog = new T.FogExp2(0x030303, .013);
    const camera = new T.PerspectiveCamera(45, 1, .1, 260);
    const bin = [];
    const keep = x => { bin.push(x); return x; };
    let W = 1, H = 1, lastT2 = 0;

    // studio environment for the chrome: dark room, coloured softboxes
    const pm = new T.PMREMGenerator(renderer);
    const env = new T.Scene();
    env.add(new T.Mesh(keep(new T.SphereGeometry(50, 24, 16)), keep(new T.MeshBasicMaterial({ color: 0x040404, side: T.BackSide }))));
    const box = (w, h, rgb, pos, look) => { const m = keep(new T.MeshBasicMaterial({ side: T.DoubleSide })); m.color.setRGB(rgb[0], rgb[1], rgb[2]); const p = new T.Mesh(keep(new T.PlaneGeometry(w, h)), m); p.position.set(...pos); p.lookAt(...look); env.add(p); };
    box(30, 6, [7, 7, 7.2], [0, 22, -6], [0, 0, 0]);
    box(26, 3, [5, 5, 5], [0, -20, -10], [0, 0, 0]);
    box(6, 26, [3.2, 1.6, 5.4], [-24, 0, 4], [0, 0, 0]);
    box(6, 26, [.6, 1.3, 5.5], [24, 2, -6], [0, 0, 0]);
    box(20, 4, [4.5, .9, 3.6], [0, -18, 10], [0, 0, 0]);
    box(3, 18, [6, 6, 6], [10, 4, 24], [0, 0, 0]);
    box(3, 18, [5, 5, 5.5], [-12, 2, -26], [0, 0, 0]);
    const envTex = pm.fromScene(env, .035).texture; bin.push(envTex);
    env.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    pm.dispose();
    scene.environment = envTex;

    const key = new T.DirectionalLight(0xffffff, 2.2); key.position.set(4, 7, 6); scene.add(key);
    const lights = [0x8a4dff, 0x2f6bff, 0xff4fd8].map(c => { const l = new T.PointLight(c, 0, 26, 2); scene.add(l); return l; });
    scene.add(new T.AmbientLight(0xffffff, .05));

    // camera path through the structures
    const path = new T.CatmullRomCurve3([[0, 0, 14], [.8, .4, 2], [-1, -.5, -10], [1.2, .5, -22], [-.6, -.4, -34], [.4, .3, -46], [-.2, 0, -58], [0, 0, -70]].map(p => new T.Vector3(...p)));
    const PS = path.getSpacedPoints(400);
    const onPath = z => { let best = PS[0]; for (const q of PS) if (Math.abs(q.z - z) < Math.abs(best.z - z)) best = q; return best; };

    // A. chrome rods and glassy plates
    const chrome = keep(new T.MeshStandardMaterial({ color: 0xeceef4, metalness: 1, roughness: .1, envMapIntensity: 1.9 }));
    const glass = keep(new T.MeshStandardMaterial({ color: 0xb9c4ff, metalness: .95, roughness: .04, transparent: true, opacity: .55, envMapIntensity: 1.6 }));
    const unit = keep(new T.BoxGeometry(1, 1, 1));
    // rods are round: a smooth-shaded cylinder along z (radius .5, so the same scale gives the same thickness as the old box)
    const rodG = keep(new T.CylinderGeometry(.5, .5, 1, lowPower ? 14 : 24, 1)); rodG.rotateX(Math.PI / 2);
    const M = new T.Matrix4(), q = new T.Quaternion(), e3 = new T.Euler(), sv = new T.Vector3(), pv = new T.Vector3();
    function scatter(mesh, n, zA, zB, kind) {
      let i = 0, guard = 0; const base = [];
      while (i < n && guard++ < n * 20) {
        const z = zA + Math.random() * (zB - zA), c = onPath(z);
        const x = (Math.random() - .5) * 15, y = (Math.random() - .5) * 10;
        if (Math.abs(x - c.x) < 1.1 && Math.abs(y - c.y) < .8) continue; // keep a corridor for the camera
        const len = kind === 'rod' ? 3 + Math.random() * 11 : 2 + Math.random() * 5;
        if (kind === 'rod') sv.set(.04 + Math.random() * .09, .04 + Math.random() * .09, len); else sv.set(.35 + Math.random() * 1.1, .018, len);
        e3.set((Math.random() - .5) * 2.4, (Math.random() - .5) * 2.4, Math.random() * 6.28); q.setFromEuler(e3);
        pv.set(x, y, z); M.compose(pv, q, sv); mesh.setMatrixAt(i++, M);
        base.push({ x, y, z, cx: c.x, cy: c.y, q: q.clone(), s: sv.clone(), d: Math.random() });
      }
      mesh.count = i; mesh.instanceMatrix.needsUpdate = true; mesh.userData.base = base;
    }
    // per-instance pose from t: each piece grows into place (form), then everything slides away from the path (part)
    function pose(mesh, t, part) {
      t = Math.min(t, 4.35); const sig = t.toFixed(3) + '|' + part.toFixed(4); if (mesh.userData.sig === sig) return; mesh.userData.sig = sig;
      const b = mesh.userData.base, f = 1 + part * 2.3;
      for (let i = 0; i < b.length; i++) {
        const o = b[i], g = eOut(k(t, 1.5 + o.d * 1.6, 2.7 + o.d * 1.6));
        pv.set(o.cx + (o.x - o.cx) * f, o.cy + (o.y - o.cy) * f, o.z + (1 - g) * 3); sv.set(o.s.x * Math.max(g, .001), o.s.y * Math.max(g, .001), o.s.z * Math.max(g, .001));
        M.compose(pv, o.q, sv); mesh.setMatrixAt(i, M);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
    const rodsN = lowPower ? 220 : 520, platesN = lowPower ? 26 : 64;
    const rods = new T.InstancedMesh(rodG, chrome, rodsN); scatter(rods, rodsN, 8, -52, 'rod'); scene.add(rods);
    const plates = new T.InstancedMesh(unit, glass, platesN); scatter(plates, platesN, 6, -50, 'plate'); scene.add(plates);

    // B. pitted chrome spheres. The pits are a height field turned into a real normal map (and a roughness map,
    // so pits are a touch duller than the polish). Seamless around the sphere, kept off the poles, mipmapped and
    // anisotropically filtered, at twice the old resolution on desktop so close-ups stay crisp.
    const TW = lowPower ? 512 : 1024, TH = TW / 2, sc = TW / 512;
    const hC = document.createElement('canvas'); hC.width = TW; hC.height = TH; const hx = hC.getContext('2d');
    hx.fillStyle = '#808080'; hx.fillRect(0, 0, TW, TH);
    for (let i = 0; i < 260; i++) {
      const r = (2 + Math.random() * 11) * sc, x = Math.random() * TW, y = TH * (.1 + Math.random() * .8);
      for (const ox of [-TW, 0, TW]) { if (x + ox + r < 0 || x + ox - r > TW) continue;
        const g = hx.createRadialGradient(x + ox, y, 0, x + ox, y, r); g.addColorStop(0, 'rgba(20,20,20,.9)'); g.addColorStop(.75, 'rgba(70,70,70,.5)'); g.addColorStop(1, 'rgba(128,128,128,0)');
        hx.fillStyle = g; hx.beginPath(); hx.arc(x + ox, y, r, 0, 6.283); hx.fill(); }
    }
    const hd = hx.getImageData(0, 0, TW, TH).data, nC = document.createElement('canvas'), rC = document.createElement('canvas'); nC.width = rC.width = TW; nC.height = rC.height = TH;
    const nI = hx.createImageData(TW, TH), rI = hx.createImageData(TW, TH), nd = nI.data, rd = rI.data, H0 = (x, y) => hd[(clamp(y, 0, TH - 1) * TW + ((x + TW) % TW)) * 4] / 255, str = 2.6 * sc;   // subtle: polished metal with shallow pits
    for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
      const dx = (H0(x + 1, y) - H0(x - 1, y)) * str * .5, dy = (H0(x, y + 1) - H0(x, y - 1)) * str * .5, l = Math.hypot(dx, dy, 1), i = (y * TW + x) * 4;
      nd[i] = (-dx / l * .5 + .5) * 255; nd[i + 1] = (dy / l * .5 + .5) * 255; nd[i + 2] = (1 / l * .5 + .5) * 255; nd[i + 3] = 255;
      const rv = (.55 + clamp((.5 - H0(x, y)) * 1.4, 0, .45)) * 255; rd[i] = rd[i + 1] = rd[i + 2] = rv; rd[i + 3] = 255;
    }
    nC.getContext('2d').putImageData(nI, 0, 0); rC.getContext('2d').putImageData(rI, 0, 0);
    const mapT = c => { const t = keep(new T.CanvasTexture(c)); t.wrapS = T.RepeatWrapping; t.anisotropy = aniso; return t; };
    const nrm = mapT(nC), rgh = mapT(rC);
    const sphM = [keep(new T.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: .08, roughnessMap: rgh, normalMap: nrm, normalScale: new T.Vector2(1, 1), envMapIntensity: 2.2 })),
                  keep(new T.MeshStandardMaterial({ color: 0xeee8ff, metalness: 1, roughness: .16, roughnessMap: rgh, normalMap: nrm, normalScale: new T.Vector2(.72, .72), envMapIntensity: 2 }))];
    // enough segments that the silhouette stays round when a sphere fills the frame
    const sg = keep(new T.SphereGeometry(1, lowPower ? 64 : 96, lowPower ? 40 : 64));
    const spheres = new T.Group(); scene.add(spheres);
    const nS = lowPower ? 12 : 22;
    for (let i = 0; i < nS; i++) {
      const s = new T.Mesh(sg, sphM[i % 2]); const z = -66 - Math.random() * 24, c = onPath(z);
      const r = .5 + Math.random() * 2.1;
      // keep the whole sphere (not just its centre) clear of the camera's line
      let x, y, tries = 0; do { x = (Math.random() - .5) * 13; y = (Math.random() - .5) * 8; } while (Math.hypot(x - c.x, y - c.y) < r + 1.3 && ++tries < 60);
      s.scale.setScalar(r); s.position.set(x, y, z);
      s.userData = { x0: x, y, z0: z, r, seed: Math.random() * 6.28, a0: Math.atan2(y - c.y, x - c.x) };
      spheres.add(s);
    }
    // final composition: a loose ring around the camera's line. Slots follow each sphere's own angle,
    // so nothing crosses in front of the lens on the way there.
    spheres.children.slice().sort((a, b) => a.userData.a0 - b.userData.a0).forEach((s, j) => {
      const u = s.userData, ang = u.a0 + (((j / nS) * Math.PI * 2 - Math.PI) - u.a0) * .65, ringR = 2.5 + (j % 3) * .9;
      u.tx = Math.cos(ang) * ringR * 1.35; u.ty = Math.sin(ang) * ringR * .8; u.tz = -77 - (j % 4) * 1.6;
    });

    // C. the reveal: a photo card floating among the last structures
    // reuse the photo the page already has: no second download
    const tex = new T.Texture(photoSrc); tex.encoding = T.sRGBEncoding; tex.anisotropy = aniso; bin.push(tex);
    // desktop: swap in the full-resolution photo once it arrives, so the card is sharp at the end of the zoom
    if (!lowPower) { const big = new Image(); big.decoding = 'async'; big.onload = () => { tex.image = big; tex.needsUpdate = true; if (lastT2 >= 8.35) apply(lastT2); }; big.src = 'img/speaking-hd.webp'; }
    const card = new T.Group(); card.position.set(0, 0, -95); card.visible = false; scene.add(card);
    const photoM = keep(new T.MeshBasicMaterial({ map: tex, toneMapped: false, fog: false }));
    const frameM = keep(new T.MeshBasicMaterial({ color: 0xf3f0e8, toneMapped: false, fog: false }));
    const photo = new T.Mesh(keep(new T.PlaneGeometry(1, 1)), photoM), frame = new T.Mesh(keep(new T.PlaneGeometry(1, 1)), frameM);
    frame.position.z = -.02; card.add(frame, photo);
    // film-still lighting: the lower part of the card falls into shadow, where the title lands
    const shC = document.createElement('canvas'); shC.width = 8; shC.height = 256; const shx = shC.getContext('2d');
    const sgd = shx.createLinearGradient(0, 0, 0, 256); sgd.addColorStop(0, 'rgba(3,3,3,.25)'); sgd.addColorStop(.32, 'rgba(3,3,3,0)'); sgd.addColorStop(.5, 'rgba(3,3,3,.05)'); sgd.addColorStop(.72, 'rgba(3,3,3,.62)'); sgd.addColorStop(1, 'rgba(3,3,3,.9)');
    shx.fillStyle = sgd; shx.fillRect(0, 0, 8, 256);
    const shT = keep(new T.CanvasTexture(shC)); shT.encoding = T.sRGBEncoding;
    const shade = new T.Mesh(keep(new T.PlaneGeometry(1, 1)), keep(new T.MeshBasicMaterial({ map: shT, transparent: true, toneMapped: false, fog: false, depthWrite: false })));
    shade.position.z = .01; card.add(shade);
    const back = new T.InstancedMesh(rodG, chrome, lowPower ? 50 : 110); scatter(back, back.count, -98, -124, 'rod'); back.visible = false; scene.add(back);

    function layout() {
      W = host.clientWidth || 1; H = host.clientHeight || 1;
      setPR(); renderer.setSize(W, H, false); camera.aspect = W / H; camera.fov = camera.aspect < .9 ? 58 : 45; camera.updateProjectionMatrix();
      // card size: fit ~66% of the height on wide screens, ~84% of the width on tall ones
      const dist = 95 - 86.5, visH = 2 * dist * Math.tan(T.MathUtils.degToRad(camera.fov / 2)), visW = visH * camera.aspect;
      const imgA = 1100 / 733; let h = visH * .62, w = h * imgA;
      if (w > visW * .84) { w = visW * .84; h = Math.min(visH * .7, w / .72); }
      const a = w / h; photo.scale.set(w, h, 1); shade.scale.set(w, h, 1); frame.scale.set(w + .16, h + .16, 1); card.position.y = visH * .07;
      // crop the photo to the card's shape, centred on the speaker
      if (a < imgA) { tex.repeat.set(a / imgA, 1); tex.offset.set(clamp(.6 - a / imgA / 2, 0, 1 - a / imgA), 0); } else { tex.repeat.set(1, imgA / a); tex.offset.set(0, (1 - imgA / a) / 2); }
    }
    const ready = () => { tex.needsUpdate = true; layout(); };
    if (photoSrc.complete && photoSrc.naturalWidth) ready(); else { photoSrc.addEventListener('load', ready, { once: true }); layout(); }

    // compile every shader now, so the first spheres / photo frame don't stall mid-scroll
    spheres.visible = card.visible = back.visible = true;
    try { renderer.compile(scene, camera); camera.position.set(0, 0, -84); camera.lookAt(0, 0, -95); renderer.render(scene, camera); } catch (e) {}
    card.visible = back.visible = false;
    const camTarget = new T.Vector3(), tmp = new T.Vector3();
    // adaptive resolution: if consecutive scroll frames average over ~26 ms, step the pixel ratio down (never below 1x)
    let lastA = 0, acc = 0, nA = 0, steps = 0;   // at most two steps, so the picture doesn't keep changing
    function apply(t) {
      lastT2 = t;
      const now = performance.now(), dt = now - lastA; lastA = now;
      if (dt < 60) { acc += dt; if (++nA >= 24) { if (acc / nA > 26 && steps < 2 && renderer.getPixelRatio() > 1) { prScale *= .8; steps++; setPR(); renderer.setSize(W, H, false); } acc = nA = 0; } }
      // exposure: a dark breath, the dolly, the build, the flash, then the reveal
      let exp = .12 + .2 * k(t, .8, 2.6);
      exp += .95 * eOut(k(t, 3.0, 3.8));
      exp += 2.9 * eIn(k(t, 7.3, 8.35));
      if (t >= 8.35) exp = 1.0 + 2.2 * (1 - eOut(k(t, 8.35, 9.4)));
      renderer.toneMappingExposure = exp;
      const photoPhase = t >= 8.35;
      rods.visible = plates.visible = !photoPhase || t < 8.36;
      spheres.visible = !photoPhase && t > 4.85;
      card.visible = back.visible = photoPhase;
      if (!photoPhase) {
        const u = t < 3.2 ? 0 : t < 6.4 ? .62 * eIO(k(t, 3.2, 6.4)) : .62 + .3 * eOut(k(t, 6.4, 8.35));
        path.getPointAt(Math.min(u, 1), tmp); camera.position.copy(tmp);
        path.getPointAt(Math.min(u + .035, 1), camTarget); camera.lookAt(camTarget);
        camera.rotation.z += Math.sin(t * .7) * .06 + (t > 3.2 && t < 6.4 ? Math.sin(k(t, 3.2, 6.4) * Math.PI) * .12 : 0);
        if (t < 3.2) { camera.position.x += Math.sin(t * 1.3) * .08; camera.position.y += Math.cos(t * 1.1) * .05; }
      } else {
        const d = eOut(k(t, 8.35, 12.2));
        camera.position.set(Math.sin(t * .9) * .06, Math.cos(t * .7) * .04, -84 - 2.5 * d);
        camera.lookAt(0, 0, -95); camera.rotation.z = -.04 * (1 - d);
        card.rotation.y = .16 * (1 - d) + Math.sin(t * .8) * .01; card.rotation.x = -.05 * (1 - d);
      }
      // the structures part out of the camera's path as the spheres take over
      const part = eIO(k(t, 6.0, 7.9)); pose(rods, t, part); pose(plates, t, part);
      // spheres rise from their scattered places into one final composition in front of the camera
      const gather = eIO(k(t, 6.7, 8.2));
      const ax = clamp(camera.aspect / 1.6, .45, 1);
      spheres.children.forEach((s, i) => { const u = s.userData;
        const born = eOut(k(t, 4.85 + (i % 6) * .14, 5.9 + (i % 6) * .14)), bob = Math.sin(t * 1.2 + u.seed) * .25 * (1 - gather * .6);
        s.position.set(u.x0 + (u.tx * ax - u.x0) * gather, u.y + (u.ty - u.y) * gather + bob - (1 - born) * 2.5, u.z0 + (u.tz - u.z0) * gather);
        s.scale.setScalar(Math.max(.001, (u.r + (Math.min(u.r, 1.4) - u.r) * gather) * born));
        s.rotation.y = t * .35 + u.seed; s.rotation.x = t * .12; });
      const cz = camera.position.z, ph = k(t, 5.6, 8.35);
      lights.forEach((l, i) => { const a = t * (1.1 + i * .3) + i * 2.1; l.position.set(Math.cos(a) * 4.5, Math.sin(a * 1.3) * 3, cz - 9 - i * 3); l.intensity = photoPhase ? .2 : (i === 0 ? 9 : 7) * ph; });
      key.intensity = photoPhase ? .6 : 1.4;
      renderer.render(scene, camera);
    }

    const ro = 'ResizeObserver' in window ? new ResizeObserver(() => { layout(); apply(lastT2); }) : null; if (ro) ro.observe(host);
    return {
      apply, layout,
      destroy() { if (ro) ro.disconnect(); bin.forEach(d => { try { d.dispose(); } catch (e) {} }); rods.dispose && rods.dispose(); renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) {} cvs.remove(); }
    };
  }

  /* ---------- the sequence ---------- */
  function init(sec, opts) {
    const $ = s => sec.querySelector(s), $$ = s => [...sec.querySelectorAll(s)];
    const take = $$('.cine-take i'), scene = $$('.cine-scene i'), words = $$('.cine-line .cw');
    const clap = $('.cine-clap'), flash = $('.cine-flash'), glow = $('.cine-glow'), photo = $('.cine-photo'), ring = $('.cine-ring'), tc = $('.cine-tc');
    const meta = $$('.cine-meta'), nav = $('.cine-nav'), down = $('.cine-down'), snd = $('.cine-snd'), takeBox = $('.cine-take'), sceneBox = $('.cine-scene');
    const root = document.documentElement;
    let world = null, mode = 'flat', audio = null, lastT = 0, lastP = -1, currentP = () => 0;
    const prog = $('.cine-prog i'), hint = $('.cine-hint'), ringG = $('.cine-ring g');
    const CUES = [[1.0, 'impact', false], [2.05, 'impact', false], [3.55, 'whoosh', .7], [4.65, 'whoosh', -.6], [5.75, 'whoosh', .5], [6.35, 'shimmer'], [7.05, 'shimmer'], [8.35, 'impact', true]];
    // the flat cut has no flight through the structures, so its axis skips that stretch
    const KEYS = {
      // scroll:   0   title  forming  flight  spheres  light  flash  photo  line   end
      '3d':   [[0, .08, .22, .40, .60, .75, .82, .90, .97, 1], [.85, 1.9, 3.0, 5.0, 6.9, 7.9, 8.35, 9.2, 11.9, T_END]],
      // the flat cut has no flight through the structures, so it spends less scroll there
      flat:   [[0, .10, .26, .42, .46, .66, .78, .88, .97, 1], [.85, 1.9, 2.9, 4.4, 6.1, 7.6, 8.35, 9.2, 11.9, T_END]] };
    const mapP = p => { const [P, Tm] = KEYS[mode === 'flat' ? 'flat' : '3d']; p = clamp(p, 0, 1); let i = 1; while (i < P.length - 1 && p > P[i]) i++; return Tm[i - 1] + (Tm[i] - Tm[i - 1]) * (p - P[i - 1]) / (P[i] - P[i - 1]); };

    function setDOM(t) {
      const FX = mode === '3d'; // blur filters only where there is a GPU to pay for them
      // TAKE 1: a slate snaps shut, the letters rise through a mask with wide tracking that settles
      const tOut = eIO(k(t, 3.65, 4.2));
      const spread = 1.2 * (1 - eOut(k(t, .95, 2.4))), mid = (take.length - 1) / 2;
      take.forEach((el, i) => { const p = eExpo(k(t, .95 + i * .06, 1.55 + i * .06)); el.style.transform = `translate(${((i - mid) * spread).toFixed(3)}em, ${(1 - p) * 105}%)`; el.style.opacity = p; });
      takeBox.style.opacity = 1 - tOut; if (FX) takeBox.style.filter = `blur(${(tOut * 6).toFixed(2)}px)`;
      clap.style.opacity = k(t, .45, .7) * (1 - tOut);
      clap.style.setProperty('--clap', ((1 - eIn(k(t, .55, 1.0))) * -28).toFixed(2) + 'deg');
      // SCENE: ME. letters fall into place, then the whole line pushes past the camera
      const sOut = eIn(k(t, 3.7, 4.35));
      scene.forEach((el, i) => { const p = eExpo(k(t, 1.95 + i * .055, 2.65 + i * .055)); el.style.transform = `translateY(${(1 - p) * 110}%) rotate(${(1 - p) * 8}deg)`; el.style.opacity = p; if (FX) el.style.filter = `blur(${((1 - p) * 8).toFixed(2)}px)`; });
      sceneBox.style.transform = `scale(${(1 + sOut * .35).toFixed(3)})`; sceneBox.style.opacity = 1 - sOut;
      // the glow and white flash that carry us out of the structures
      const g = eIn(k(t, 6.1, 8.35)) * (t < 8.35 ? 1 : 1 - k(t, 8.35, 9.6));
      glow.style.opacity = (g * .85).toFixed(3); glow.style.transform = `scale(${(.6 + g * .9).toFixed(3)})`;
      flash.style.opacity = (t < 8.35 ? Math.pow(k(t, 7.7, 8.35), 4) * .94 : .94 * (1 - eOut(k(t, 8.35, 9.5)))).toFixed(3);
      // the reveal: photo (flat mode), ring, the sentence word by word
      const rv = k(t, 8.35, 9.2);
      if (mode === 'flat') { photo.style.opacity = rv; photo.style.transform = `scale(${(1.08 - .06 * eOut(k(t, 8.35, 12.2))).toFixed(4)})`; }
      ring.style.setProperty('--sweep', (360 * eIO(k(t, 9.0, 10.7))).toFixed(1) + 'deg');
      ring.style.opacity = k(t, 9.0, 9.6) * .6;
      if (ringG) ringG.style.transform = `rotate(${(t * 7).toFixed(2)}deg)`;
      words.forEach((el, i) => { const p = eOut(k(t, 9.45 + i * .17, 10.15 + i * .17)); el.style.opacity = p; el.style.transform = `translateY(${((1 - p) * .55).toFixed(3)}em) scale(${(1 + .14 * (1 - p)).toFixed(3)})`; if (FX) el.style.filter = `blur(${((1 - p) * 6).toFixed(2)}px)`; });
      const n = k(t, 11.2, 11.9);
      nav.style.opacity = n; nav.style.visibility = n > .02 ? 'visible' : 'hidden'; nav.style.transform = `translateY(${((1 - n) * 12).toFixed(1)}px)`; down.style.opacity = n;
      meta.forEach(m => m.style.opacity = k(t, .3, 1.3) * .75);
      const fr = Math.floor(t * 24); tc.textContent = `00:00:${String(Math.floor(fr / 24)).padStart(2, '0')}:${String(fr % 24).padStart(2, '0')}`;
    }
    function setSound(t, p) {
      if (audio && audio.on) {
        const live = p > .002 && p < .998 ? 1 : 0, photoPhase = t >= 8.35;
        audio.levels({ drone: live * .6 * k(t, 0, 1.5) * (photoPhase ? 1 - k(t, 8.35, 10) : 1), pad: live * .9 * k(t, 8.6, 10.5), riser: live && !photoPhase ? .45 * eIn(k(t, 6.9, 8.3)) : 0, riserF: 400 + 3600 * k(t, 6.9, 8.3) });
        // one-shots fire when scrolling forward across them; scrolling back re-arms them
        if (t > lastT && t - lastT < 1.5) CUES.forEach(([ct, name, arg]) => { if (lastT < ct && t >= ct) audio.cue(name, arg); });
      }
      lastT = t;
    }
    function draw(p) {
      p = clamp(p, 0, 1); if (Math.abs(p - lastP) < 1e-5) return; lastP = p;
      const t = mapP(p);
      setDOM(t); if (world) world.apply(t); setSound(t, p);
      if (prog) prog.style.transform = `scaleX(${p.toFixed(4)})`;
      if (hint) hint.style.opacity = (1 - k(p, .012, .06)).toFixed(3);
    }

    // sound: on by default (site-wide setting). Browsers only start audio after a tap, click or key,
    // so until then the button says "Tap for sound", never "Sound on".
    const SS = window.SiteSound, sndL = snd.querySelector('span');
    function syncSnd() {
      const pref = SS ? SS.pref : 'off', playing = !!(audio && audio.on && audio.running);
      const state = pref === 'off' ? 'off' : playing ? 'on' : 'wait';
      snd.dataset.state = state; snd.setAttribute('aria-pressed', String(state === 'on'));
      sndL.textContent = state === 'on' ? 'Sound on' : state === 'off' ? 'Sound off' : 'Tap for sound';
      snd.setAttribute('aria-label', state === 'on' ? 'Sound on. Press to mute.' : state === 'off' ? 'Sound off. Press to turn it on.' : 'Tap for sound. Sound is on and starts with your first tap.');
    }
    function startSound() {             // only ever runs inside a user gesture
      if (!audio) { audio = makeAudio(); if (audio) audio.onstate(syncSnd); }
      if (!audio) { sndL.textContent = 'Sound unavailable'; snd.disabled = true; return; }
      if (!audio.on || !audio.running) { const pr = audio.enable(); lastP = -1; draw(currentP()); if (pr && pr.then) pr.then(syncSnd, syncSnd); }
      syncSnd();
    }
    function stopSound() { if (audio && audio.on) audio.disable(); syncSnd(); }
    snd.addEventListener('click', () => {
      if (!SS) return;
      if (snd.dataset.state === 'wait') startSound();          // this press is the tap we were waiting for
      else SS.set(snd.dataset.state !== 'on');
    });
    if (SS) SS.sub(why => { if (SS.on) startSound(); else stopSound(); });
    // the visitor may already have tapped or clicked elsewhere on the page: then the browser lets sound start now
    if (SS && SS.on && navigator.userActivation && navigator.userActivation.hasBeenActive) startSound(); else syncSnd();

    // scroll is the clock. GSAP ScrollTrigger (already on the page) scrubs; a plain listener otherwise.
    function drive() {
      const G = window.gsap, ST = window.ScrollTrigger;
      if (G && ST) {
        G.registerPlugin(ST);
        const proxy = { p: 0 };
        const tw = G.to(proxy, { p: 1, ease: 'none', onUpdate: () => draw(proxy.p),
          scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: root.classList.contains('lenis') ? .25 : .4, invalidateOnRefresh: true } });
        const s = tw.scrollTrigger; currentP = () => proxy.p;
        const aside = ST.create({ trigger: sec, start: 'top 40%', end: 'bottom 40%', onToggle: a => root.classList.toggle('in-cine', a.isActive) });
        proxy.p = s.progress; draw(s.progress); root.classList.toggle('in-cine', aside.isActive);
      } else {
        let ticking = false;
        const read = () => { ticking = false; const r = sec.getBoundingClientRect(), total = sec.offsetHeight - innerHeight; const p = total > 0 ? -r.top / total : 0; currentP = () => clamp(p, 0, 1); draw(p); root.classList.toggle('in-cine', r.top < innerHeight * .4 && r.bottom > innerHeight * .4); };
        addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(read); } }, { passive: true });
        addEventListener('resize', () => { lastP = -1; read(); });
        read();
      }
    }

    const want3d = !reduce && hasWebGL() && location.protocol !== 'file:' && !!opts.loadThree;
    mode = want3d ? 'pending' : 'flat';
    const begin = () => {
      if (sec.dataset.cineBegun) return; sec.dataset.cineBegun = '1';
      try {
        if (want3d && window.THREE) { world = buildWorld($('.cine-stage'), photo); mode = '3d'; sec.classList.add('cine-3d'); }
        else mode = 'flat';
      } catch (err) { console.warn('[cine] 3D scene unavailable, using the flat version:', err && err.message); world = null; mode = 'flat'; $('.cine-stage').textContent = ''; }
      lastP = -1; draw(currentP());
    };
    sec.classList.add('cine-ready');
    drive();
    if (want3d) opts.loadThree().then(begin, begin); else begin();
    return { get mode() { return mode; }, get audio() { return audio; }, get p() { return currentP(); }, get t() { return mapP(currentP()); } };
  }

  window.CineIntro = {
    init(sec, opts) {
      try { return (window.CineIntro.instance = init(sec, opts || {})); }
      catch (err) { console.warn('[cine] falling back to the still frame:', err && err.message); sec.classList.remove('cine-wait', 'cine-scroll'); sec.classList.add('cine-static'); if (window.ScrollTrigger) window.ScrollTrigger.refresh(); return null; }
    }
  };
})();
