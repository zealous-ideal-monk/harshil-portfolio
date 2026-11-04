/* THE AFTER PARTY: an isolated, opt-in playground that only exists while it is open.
   It builds its own DOM, its own WebGL scene and its own audio graph, and tears all of it down on exit. */
(() => {
  if (window.AfterParty) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const lowPower = coarse || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;

  const PLANETS = [
    { id: 'genesis', name: 'Planet Genesis', jokes: ['85 moons. All volunteers. Zero paid staff.', 'College said no. So I built a planet.', 'Population: 20,000+ builders and one tired founder.'] },
    { id: 'mic', name: 'The Open Mic Moon', jokes: ['Is this thing on?', '15 minutes of stand-up. Somehow, people laughed.', 'Tough crowd. It’s literally space.'] },
    { id: 'chai', name: 'Planet Chass', jokes: ['Chass is on me. That’s a promise.', 'Gujarat’s answer to every lunch.', 'Served cold. Like my rejection emails.'] },
    { id: 'board', name: 'The Extension Board', jokes: ['Extension board kaun laaya? Me. It was me.', 'Every event’s real MVP.', 'Three sockets. Forty laptops. Good luck.'] },
    { id: 'element', name: 'Element No. 1', jokes: ['Say my name.', 'Hydrogen. Lightest element, heaviest workload.', 'Sulfur. Smells like deadlines.'] },
    { id: 'hack', name: 'Hackathon Hive', jokes: ['3 a.m. The demo works. Nobody touch it.', '“Please don’t register.” They registered.', 'Registrations ≠ results. Bugs ≠ features. Usually.'] },
    { id: 'kindly', name: 'Planet Kindly', jokes: ['Kindly hire me, sir.', 'Kindly do the needful and click again.', 'Population: one very polite email.'] },
    { id: 'disco', name: 'The Disco Ball', jokes: ['Every after-party needs one.', 'Turn on the music. I dare you.', 'Mirror, mirror: who ships the best hackathon?'] }
  ];
  const MICRO = ['Planet Deadline', 'Planet Sponsor Reply', 'Planet Wi-Fi Password', 'Planet “Demo Works”', 'Planet Free Pizza', 'Planet Judge’s Feedback', 'Planet Last Commit', 'Planet One More Slide'];
  const COLORS = { pink: 0xF27FE0, lav: 0xA99FF6, gold: 0xF4EE8E, sky: 0x8FB0EE, green: 0x3DDC84, orange: 0xFF7A45, cream: 0xF8F3E8, acid: 0xB8FF3C, ink: 0x111111 };

  let st = null; // all live state for one open session

  /* ---------------- DOM shell ---------------- */
  function buildShell() {
    const el = document.createElement('div');
    el.id = 'ap';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'The after party, an interactive playground');
    el.innerHTML = `
      <div class="ap-bg" aria-hidden="true">
        <svg class="ap-svg" width="0" height="0"><filter id="apWobble"><feTurbulence id="apTurb" type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="2" seed="4"/><feDisplacementMap id="apDisp" in="SourceGraphic" scale="14"/></filter></svg>
        <p class="ap-giant"><span>Planet</span><span>Harshil</span></p>
      </div>
      <div class="ap-stage" id="apStage"></div>
      <div class="ap-labels" id="apLabels"></div>
      <div class="ap-bubble" id="apBubble" role="status" aria-live="polite"></div>
      <div class="ap-ui">
        <button type="button" class="ap-back" id="apBack">← Back to the portfolio</button>
        <p class="ap-secrets" id="apSecrets" aria-live="polite">Secrets <b>0</b>/3</p>
        <p class="ap-hint" id="apHint">Click a planet · Drag to throw it · Double-tap the void · Type my name</p>
        <button type="button" class="ap-music" id="apMusic" aria-pressed="false"><span class="ap-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="ap-music-l">Turn on the music!</span></button>
        <p class="ap-toast" id="apToast" role="status" aria-live="polite"></p>
        <p class="ap-loading" id="apLoading">Warming up the dance floor…</p>
      </div>`;
    document.body.appendChild(el);
    return el;
  }

  /* ---------------- generative music (original, made live with WebAudio) ---------------- */
  function makeMusic() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    const analyser = ctx.createAnalyser(); analyser.fftSize = 256;
    master.connect(comp); comp.connect(analyser); analyser.connect(ctx.destination);
    const delay = ctx.createDelay(1); delay.delayTime.value = 60 / 116 * .75;
    const fb = ctx.createGain(); fb.gain.value = .32; const dl = ctx.createGain(); dl.gain.value = .35;
    delay.connect(fb); fb.connect(delay); delay.connect(dl); dl.connect(master);
    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const BPM = 116, S16 = 60 / BPM / 4;
    // A minor, F, C, G: midi roots and chord tones
    const prog = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 52, 55, 60], [55, 59, 62, 67]];
    const hz = m => 440 * Math.pow(2, (m - 69) / 12);
    const beats = []; // timestamps of kicks, read by the visuals
    function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
    function kick(t) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + .18); env(g, t, .004, .9, .32); o.connect(g); g.connect(master); o.start(t); o.stop(t + .4); beats.push(t); }
    function hat(t, v) { const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7500; const g = ctx.createGain(); env(g, t, .002, v, .05); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + .08); }
    function clap(t) { const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = .8; const g = ctx.createGain(); env(g, t, .003, .45, .16); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + .22); }
    function bass(t, m) { const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = hz(m - 12); f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(180, t + .18); env(g, t, .005, .32, .2); o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + .26); }
    function arp(t, m) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = hz(m + 12); env(g, t, .004, .07, .13); o.connect(g); g.connect(master); g.connect(delay); o.start(t); o.stop(t + .2); }
    function pad(t, chord, len) { chord.forEach(m => { [-6, 6].forEach(det => { const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = det; f.type = 'lowpass'; f.frequency.value = 1100; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.018, t + .4); g.gain.setValueAtTime(.018, t + len - .3); g.gain.exponentialRampToValueAtTime(0.0001, t + len); o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + len + .05); }); }); }
    let step = 0, next = 0, timer = 0, on = false;
    const ARP = [0, 2, 1, 3, 2, 1, 3, 0];
    function schedule() {
      while (next < ctx.currentTime + .12) {
        const bar = Math.floor(step / 16) % 4, s = step % 16, chord = prog[bar];
        if (s % 4 === 0) kick(next);
        if (s === 4 || s === 12) clap(next);
        if (s % 2 === 1) hat(next, s % 4 === 3 ? .12 : .06);
        if (s % 2 === 0) bass(next, chord[s % 8 === 6 ? 2 : 0]);
        if (step >= 32) arp(next, chord[ARP[s % 8]]);
        if (s === 0) pad(next, chord, S16 * 16);
        next += S16; step++;
      }
    }
    const data = new Uint8Array(analyser.frequencyBinCount);
    let onState = null; ctx.onstatechange = () => { if (onState) onState(); };
    return {
      get on() { return on; },
      get running() { return ctx.state === 'running'; },
      onstate(f) { onState = f; },
      start() {
        if (on) { ctx.resume(); return; } on = true;
        ctx.resume();
        next = ctx.currentTime + .06;
        master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(master.gain.value, ctx.currentTime); master.gain.linearRampToValueAtTime(.8, ctx.currentTime + .25);
        timer = setInterval(schedule, 25); schedule();
      },
      stop() {
        if (!on) return; on = false; clearInterval(timer);
        master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(master.gain.value, ctx.currentTime); master.gain.linearRampToValueAtTime(0, ctx.currentTime + .12);
        setTimeout(() => { if (!on) ctx.suspend(); }, 200);
      },
      energy() { if (!on) return 0; analyser.getByteFrequencyData(data); let s = 0; for (let i = 0; i < 24; i++) s += data[i]; return s / (24 * 255); },
      takeBeat() { // true once per kick, close to when it is heard
        const now = ctx.currentTime; let hit = false;
        while (beats.length && beats[0] <= now) { beats.shift(); hit = true; }
        return hit;
      },
      close() { clearInterval(timer); on = false; try { ctx.close(); } catch (e) {} },
      ctx
    };
  }

  /* ---------------- WebGL world ---------------- */
  function hasWebGL() {
    try { const c = document.createElement('canvas'); const g = c.getContext('webgl') || c.getContext('experimental-webgl'); if (!g) return false; const l = g.getExtension('WEBGL_lose_context'); if (l) l.loseContext(); return true; } catch (e) { return false; }
  }

  function buildWorld(s) {
    const T = window.THREE;
    const renderer = new T.WebGLRenderer({ antialias: !lowPower, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lowPower ? 1.5 : 2));
    renderer.setClearColor(0x000000, 0);
    s.stage.appendChild(renderer.domElement);
    renderer.domElement.className = 'ap-canvas';
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(45, 1, .1, 200);
    scene.add(new T.AmbientLight(0xffffff, .55));
    const sun = new T.DirectionalLight(0xffffff, .85); sun.position.set(5, 8, 10); scene.add(sun);
    const gm = new T.DataTexture(new Uint8Array([70, 150, 255]), 3, 1, T.LuminanceFormat);
    gm.minFilter = gm.magFilter = T.NearestFilter; gm.generateMipmaps = false; gm.needsUpdate = true;
    const disposables = [gm];
    const toon = (color, extra) => { const m = new T.MeshToonMaterial(Object.assign({ color, gradientMap: gm }, extra || {})); disposables.push(m); return m; };
    const outlineMat = new T.MeshBasicMaterial({ color: 0x000000, side: T.BackSide }); disposables.push(outlineMat);
    const geo = g => { disposables.push(g); return g; };
    function outlined(g, mat, k) { const grp = new T.Group(); const m = new T.Mesh(g, mat); const o = new T.Mesh(g, outlineMat); o.scale.setScalar(k || 1.07); grp.add(o, m); grp.userData.main = m; return grp; }

    const world = new T.Group(); scene.add(world);

    // stars
    const N = lowPower ? 700 : 1600, sp = new Float32Array(N * 3), sc = new Float32Array(N * 3);
    const pal = [COLORS.cream, COLORS.pink, COLORS.lav, COLORS.gold, COLORS.sky].map(h => new T.Color(h));
    for (let i = 0; i < N; i++) {
      const r = 22 + Math.random() * 40, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      sp[i * 3] = r * Math.sin(ph) * Math.cos(th); sp[i * 3 + 1] = r * Math.cos(ph); sp[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) - 10;
      const c = pal[i % pal.length]; sc[i * 3] = c.r; sc[i * 3 + 1] = c.g; sc[i * 3 + 2] = c.b;
    }
    const sg = geo(new T.BufferGeometry()); sg.setAttribute('position', new T.BufferAttribute(sp, 3)); sg.setAttribute('color', new T.BufferAttribute(sc, 3));
    const smat = new T.PointsMaterial({ size: .16, vertexColors: true, transparent: true, opacity: .9, depthWrite: false }); disposables.push(smat);
    const stars = new T.Points(sg, smat); scene.add(stars);

    // burst particles (pooled)
    const BN = 420, bp = new Float32Array(BN * 3), bc = new Float32Array(BN * 3), bv = new Float32Array(BN * 3), bl = new Float32Array(BN);
    const bg = geo(new T.BufferGeometry()); bg.setAttribute('position', new T.BufferAttribute(bp, 3)); bg.setAttribute('color', new T.BufferAttribute(bc, 3));
    const bmat = new T.PointsMaterial({ size: .22, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending }); disposables.push(bmat);
    const burst = new T.Points(bg, bmat); burst.frustumCulled = false; scene.add(burst);
    for (let i = 0; i < BN; i++) bp[i * 3 + 1] = -999;
    let bi = 0;
    function spray(pos, hexes, n, speed) {
      n = reduce ? Math.min(n, 12) : n;
      for (let k = 0; k < n; k++) {
        const i = bi = (bi + 1) % BN, c = new T.Color(hexes[k % hexes.length]);
        bp[i * 3] = pos.x; bp[i * 3 + 1] = pos.y; bp[i * 3 + 2] = pos.z;
        const th = Math.random() * 6.283, ph = Math.acos(2 * Math.random() - 1), v = (speed || 6) * (.4 + Math.random() * .8);
        bv[i * 3] = v * Math.sin(ph) * Math.cos(th); bv[i * 3 + 1] = v * Math.cos(ph); bv[i * 3 + 2] = v * Math.sin(ph) * Math.sin(th);
        bc[i * 3] = c.r; bc[i * 3 + 1] = c.g; bc[i * 3 + 2] = c.b; bl[i] = 1;
      }
    }

    // planets
    const P = {};
    function add(id, obj, r, color) { const g = new T.Group(); g.add(obj); world.add(g); P[id] = { id, g, r, color, base: 1, hover: 0, react: 0, home: new T.Vector3(), vel: new T.Vector3(), held: false, seed: Math.random() * 6.28, mats: [], hits: [] }; return P[id]; }

    { // Genesis: pink world with 85 volunteer moons
      const m = toon(COLORS.pink), o = outlined(geo(new T.SphereGeometry(1.7, 40, 28)), m, 1.05);
      const band = new T.Mesh(geo(new T.TorusGeometry(1.74, .09, 10, 60)), toon(COLORS.lav)); band.rotation.x = Math.PI / 2.3; o.add(band);
      const p = add('genesis', o, 1.7, COLORS.pink); p.mats.push(m); p.hits.push(o.userData.main);
      const mg = geo(new T.SphereGeometry(.075, 8, 6)), mm = toon(COLORS.gold);
      const moons = new T.InstancedMesh(mg, mm, 85); moons.frustumCulled = false; p.g.add(moons);
      p.moons = moons; p.moonData = Array.from({ length: 85 }, (_, i) => ({ r: 2.35 + Math.random() * .75, a: i / 85 * 6.283, s: .25 + Math.random() * .25, y: (Math.random() - .5) * .35 }));
      p.spread = 0; p.ringTilt = .42;
    }
    { // Open mic moon: lavender with a microphone stuck in it, and its own tiny moon
      const m = toon(COLORS.lav), o = outlined(geo(new T.SphereGeometry(.95, 32, 22)), m);
      const mic = new T.Group();
      const handle = outlined(geo(new T.CylinderGeometry(.08, .12, .95, 14)), toon(0x2a2a2a), 1.12); handle.position.y = .45;
      const head = outlined(geo(new T.SphereGeometry(.27, 18, 14)), toon(0xbdbdc6)); head.position.y = 1.02;
      mic.add(handle, head); mic.position.y = .78; mic.rotation.z = -.35; o.add(mic);
      const p = add('mic', o, .95, COLORS.lav); p.mats.push(m); p.hits.push(o.userData.main, head.userData.main);
      const moon = outlined(geo(new T.SphereGeometry(.2, 16, 12)), toon(COLORS.gold)); p.g.add(moon); p.moon = moon;
    }
    { // Planet Chass: a glass of buttermilk
      const glassM = toon(COLORS.cream), o = outlined(geo(new T.CylinderGeometry(.78, .58, 1.3, 30, 1, true)), glassM, 1.06);
      glassM.side = T.DoubleSide;
      const tea = new T.Mesh(geo(new T.CircleGeometry(.74, 30)), toon(0xFBF9EF)); tea.rotation.x = -Math.PI / 2; tea.position.y = .5; o.add(tea);
      const bottom = new T.Mesh(geo(new T.CylinderGeometry(.58, .58, .1, 30)), toon(0xE9E6D6)); bottom.position.y = -.62; o.add(bottom);
      const body = new T.Mesh(geo(new T.CylinderGeometry(.75, .58, 1.08, 30)), toon(0xF2EFE2)); body.position.y = -.06; o.add(body);
      const steam = []; for (let i = 0; i < 3; i++) { const sm = new T.Mesh(geo(new T.SphereGeometry(.12, 10, 8)), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); disposables.push(sm.material); sm.position.set((i - 1) * .3, 1, 0); o.add(sm); steam.push(sm); }
      const p = add('chai', o, .95, COLORS.gold); p.mats.push(glassM); p.hits.push(o.userData.main, body); p.steam = steam;
    }
    { // The extension board
      const m = toon(COLORS.cream), o = outlined(geo(new T.BoxGeometry(2.3, .44, .85)), m, 1.06);
      const sock = geo(new T.BoxGeometry(.32, .06, .32)), sm = toon(0x222222);
      [-.7, 0, .7].forEach(x => { const s = new T.Mesh(sock, sm); s.position.set(x, .23, 0); o.add(s); });
      const led = new T.Mesh(geo(new T.BoxGeometry(.12, .07, .12)), new T.MeshBasicMaterial({ color: 0xff3b3b })); disposables.push(led.material); led.position.set(1.0, .24, .28); o.add(led);
      const curve = new T.CatmullRomCurve3([new T.Vector3(-1.15, 0, 0), new T.Vector3(-1.8, -.4, .3), new T.Vector3(-2.3, .2, -.2), new T.Vector3(-2.9, -.3, .1)]);
      const cable = outlined(geo(new T.TubeGeometry(curve, 30, .07, 8, false)), toon(COLORS.orange), 1.25); o.add(cable);
      o.rotation.set(.4, -.5, .15);
      const p = add('board', o, 1.2, COLORS.cream); p.mats.push(m); p.hits.push(o.userData.main, cable.userData.main); p.led = led;
    }
    { // Element No. 1: Hydrogen tile that flips to Sulfur
      const tile = (sym, num, mass, name) => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
        const gr = x.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, '#5BEA9F'); gr.addColorStop(1, '#1A7A45'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
        x.strokeStyle = '#DCFFE6'; x.lineWidth = 10; x.strokeRect(10, 10, 236, 236); x.fillStyle = '#F2FFF7';
        x.font = '700 30px Poppins, Arial, sans-serif'; x.textAlign = 'left'; x.fillText(num, 26, 52); x.textAlign = 'right'; x.fillText(mass, 230, 52);
        x.textAlign = 'center'; x.font = '900 140px Poppins, Arial, sans-serif'; x.fillText(sym, 128, 180); x.font = '700 22px Poppins, Arial, sans-serif'; x.fillText(name.toUpperCase(), 128, 226);
        const t = new T.CanvasTexture(c); disposables.push(t); return t; };
      const texH = tile('H', '1', '1.008', 'Hydrogen'), texS = tile('S', '16', '32.06', 'Sulfur');
      const face = toon(0xffffff, { map: texH }), back = toon(0xffffff, { map: texS }), side = toon(COLORS.green);
      const o = outlined(geo(new T.BoxGeometry(1.6, 1.6, .34)), [side, side, side, side, face, back], 1.06);
      const p = add('element', o, 1, COLORS.green); p.mats.push(side); p.hits.push(o.userData.main); p.flip = 0; p.flipTarget = 0;
    }
    { // Hackathon hive: faceted acid-green rock with orbiting bugs
      const m = toon(COLORS.acid), o = outlined(geo(new T.IcosahedronGeometry(1.05, 0)), m, 1.07);
      const p = add('hack', o, 1.05, COLORS.acid); p.mats.push(m); p.hits.push(o.userData.main);
      const bugG = geo(new T.BoxGeometry(.2, .2, .2)), bugM = toon(0xff4f4f);
      p.bugs = [0, 1, 2].map(i => { const b = outlined(bugG, bugM, 1.2); p.g.add(b); return b; });
    }
    { // Planet Kindly: sky blue with a pink ring
      const m = toon(COLORS.sky), o = outlined(geo(new T.SphereGeometry(.85, 30, 22)), m);
      const ring = new T.Mesh(geo(new T.RingGeometry(1.15, 1.6, 56)), toon(COLORS.pink, { side: T.DoubleSide }));
      const ringO = new T.Mesh(geo(new T.RingGeometry(1.1, 1.65, 56)), new T.MeshBasicMaterial({ color: 0x000000, side: T.DoubleSide })); disposables.push(ringO.material);
      ringO.position.z = -.01; const rg = new T.Group(); rg.add(ringO, ring); rg.rotation.x = 1.15; rg.rotation.y = .3; o.add(rg);
      const p = add('kindly', o, .85, COLORS.sky); p.mats.push(m); p.hits.push(o.userData.main, ring); p.ring = rg;
    }
    { // Disco ball with light beams
      const m = new T.MeshPhongMaterial({ color: 0xd8d8ee, specular: 0xffffff, shininess: 140, flatShading: true }); disposables.push(m);
      const o = outlined(geo(new T.IcosahedronGeometry(1.05, 1)), m, 1.05);
      const str = new T.Mesh(geo(new T.CylinderGeometry(.025, .025, 12, 6)), new T.MeshBasicMaterial({ color: 0x777777 })); disposables.push(str.material); str.position.y = 7; o.add(str);
      const beams = new T.Group(), bgeo = geo(new T.ConeGeometry(.9, 10, 24, 1, true)); bgeo.translate(0, -5, 0);
      [COLORS.pink, COLORS.lav, COLORS.gold, COLORS.sky, COLORS.green, COLORS.orange].forEach((c, i) => {
        const bm = new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }); disposables.push(bm);
        const b = new T.Mesh(bgeo, bm); b.rotation.z = (i % 2 ? 1 : -1) * (.45 + (i % 3) * .18); b.rotation.y = i * 1.05; beams.add(b);
      });
      o.add(beams);
      const pl = [COLORS.pink, COLORS.sky, COLORS.gold].map(c => { const l = new T.PointLight(c, 0, 9); scene.add(l); return l; });
      const p = add('disco', o, 1.05, 0xd8d8ee); p.hits.push(o.userData.main); p.beams = beams; p.lights = pl; p.party = 0;
    }

    const micro = [];
    function spawnMicro(at) {
      if (micro.length >= 6) { const old = micro.shift(); world.remove(old.g); }
      const c = [COLORS.pink, COLORS.lav, COLORS.gold, COLORS.sky, COLORS.orange, COLORS.acid][Math.floor(Math.random() * 6)];
      const o = outlined(geo(new T.SphereGeometry(.32, 18, 14)), toon(c), 1.1); const g = new T.Group(); g.add(o); world.add(g);
      const m = { g, r: 3.4 + Math.random() * 1.8, a: Math.atan2(at.y, at.x), sp: (.25 + Math.random() * .35) * (Math.random() < .5 ? -1 : 1), tilt: (Math.random() - .5) * .8, born: 0 };
      micro.push(m); spray(at, [c, COLORS.cream], 30, 4);
      return m;
    }

    // layout: landscape and portrait sets
    const L = {
      wide: { cam: 16, s: 1, genesis: [-.2, -.3, 0], mic: [-6.2, 2.1, -1], chai: [5.8, 2.0, .4], board: [-5.4, -3.3, 1], element: [5.9, -3.1, .5], hack: [-9.3, -.4, -3], kindly: [9.4, -.1, -2.5], disco: [0, 4.7, -2] },
      tall: { cam: 20, s: .8, genesis: [0, .9, 0], mic: [-2.0, 4.1, -1], chai: [2.1, 3.8, 0], board: [-1.5, -3.6, 0], element: [1.8, -3.5, 0], hack: [-2.3, -1.4, -1.2], kindly: [2.4, -1.2, -1.2], disco: [0, 6.5, -2] }
    };
    let layout = 'wide';
    function applyLayout(w, h) {
      layout = w / h < .95 ? 'tall' : 'wide';
      const l = L[layout];
      camera.position.set(0, 0, l.cam); camera.lookAt(0, 0, 0);
      Object.values(P).forEach(p => { p.home.set(...l[p.id]); if (!p.placed) { p.g.position.copy(p.home); p.placed = true; } p.base = l.s; });
    }
    function resize() {
      const w = innerWidth, h = innerHeight;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); applyLayout(w, h);
    }
    resize();

    // projection helper for DOM labels and bubbles
    const v = new T.Vector3(), up = new T.Vector3();
    function screenOf(p) {
      p.g.getWorldPosition(v); const cx = v.clone().project(camera);
      up.copy(v).add(new T.Vector3(0, p.r * p.base * 1.15, 0)).project(camera);
      return { x: (cx.x + 1) / 2 * innerWidth, y: (1 - cx.y) / 2 * innerHeight, top: (1 - up.y) / 2 * innerHeight, vis: cx.z < 1 };
    }

    // picking
    const ray = new T.Raycaster(), ndc = new T.Vector2(), plane = new T.Plane(new T.Vector3(0, 0, 1), 0), hitPt = new T.Vector3();
    const allHits = () => Object.values(P).flatMap(p => p.hits.map(h => ({ h, p })));
    function pick(x, y) {
      ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
      const list = allHits(); const res = ray.intersectObjects(list.map(o => o.h), false);
      if (!res.length) return null; const f = list.find(o => o.h === res[0].object); return f ? f.p : null;
    }
    function pointOnPlane(x, y, z) {
      ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
      plane.constant = -z; return ray.ray.intersectPlane(plane, hitPt) ? hitPt.clone() : null;
    }

    function setHeisenberg(on) { Object.values(P).forEach(p => p.mats.forEach(m => m.color.setHex(on ? COLORS.green : p.color))); }

    function react(p) {
      p.react = 1;
      const w = new T.Vector3(); p.g.getWorldPosition(w);
      if (p.id === 'genesis') { p.spread = 1; spray(w, [COLORS.gold, COLORS.pink], 60, 7); }
      else if (p.id === 'mic') { p.jump = 1; spray(w, [COLORS.cream, COLORS.lav], 30, 5); }
      else if (p.id === 'chai') { p.spin = 1; spray(w, [0xC98A3E, 0xD9A25A, COLORS.cream], 50, 6); }
      else if (p.id === 'board') { p.jitter = 1; spray(w, [COLORS.gold, 0xffffff, COLORS.orange], 70, 8); }
      else if (p.id === 'element') { p.flipTarget += Math.PI; spray(w, [COLORS.green, 0xDCFFE6], 40, 5); }
      else if (p.id === 'hack') { p.cycle = 1; spray(w, [COLORS.acid, 0xff4f4f, COLORS.sky], 50, 6); }
      else if (p.id === 'kindly') { p.ringSpin = 1; spray(w, [COLORS.pink, COLORS.sky], 40, 5); }
      else if (p.id === 'disco') { p.flash = 1; spray(w, [COLORS.pink, COLORS.lav, COLORS.gold, COLORS.sky, COLORS.green], 90, 9); }
    }

    let held = null, downAt = null, moved = false, lastPt = null, worldVel = { x: 0, y: 0 }, worldRot = { x: 0, y: 0 }, pointer = { x: 0, y: 0 };
    const clock = new T.Clock();
    let raf = 0, alive = true, lastTap = 0;

    function frame() {
      if (!alive) return; raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
      const e = s.music ? s.music.energy() : 0, beat = s.music && s.music.on ? s.music.takeBeat() : false;
      s.onEnergy(e, beat);
      // camera drift toward the pointer
      if (!reduce) { camera.position.x += (pointer.x * 1.2 - camera.position.x) * .04; camera.position.y += (pointer.y * .8 - camera.position.y) * .04; camera.lookAt(0, 0, 0); }
      // world spin from dragging the void
      worldRot.y += worldVel.x; worldRot.x += worldVel.y; worldVel.x *= .92; worldVel.y *= .92;
      worldRot.x = Math.max(-.5, Math.min(.5, worldRot.x)); worldRot.y *= .985; worldRot.x *= .985;
      world.rotation.set(worldRot.x, worldRot.y, 0);
      stars.rotation.y += dt * (.01 + e * .25); stars.rotation.x = Math.sin(t * .05) * .1;
      smat.size = .16 + e * .25;
      const motion = reduce ? .15 : 1;
      Object.values(P).forEach(p => {
        // spring home unless held
        if (!p.held) {
          const bob = reduce ? 0 : Math.sin(t * .9 + p.seed) * .18;
          const target = p.home.clone(); target.y += bob;
          target.x += pointer.x * .25 * (p.home.z + 3) * .2; target.y += pointer.y * .2 * (p.home.z + 3) * .2;
          p.vel.add(target.sub(p.g.position).multiplyScalar(.045)); p.vel.multiplyScalar(.86); p.g.position.add(p.vel);
        }
        p.hover += ((p.isHover ? 1 : 0) - p.hover) * .2;
        p.react = Math.max(0, p.react - dt * 1.6);
        const pulse = beat ? .1 : 0; p.beatK = Math.max(p.beatK || 0, pulse); p.beatK *= .88;
        const wob = p.react * Math.sin(p.react * 18) * .22;
        const sc = p.base * (1 + p.hover * .1 + p.beatK);
        const o = p.g.children[0];
        o.scale.set(sc * (1 - wob * .5), sc * (1 + wob), sc * (1 - wob * .5));
        o.rotation.y += dt * .25 * motion;
        if (p.id === 'genesis') {
          p.spread = Math.max(0, p.spread - dt * .9); const sp = 1 + p.spread * 1.6 * (reduce ? .3 : 1);
          const M = new T.Matrix4(), q = new T.Quaternion(), pos = new T.Vector3(), one = new T.Vector3(1, 1, 1);
          p.moonData.forEach((d, i) => { const a = d.a + t * d.s * motion; pos.set(Math.cos(a) * d.r * sp, d.y * sp + Math.sin(a) * d.r * sp * Math.sin(p.ringTilt) * .3, Math.sin(a) * d.r * sp * Math.cos(p.ringTilt)); M.compose(pos, q, one); p.moons.setMatrixAt(i, M); });
          p.moons.instanceMatrix.needsUpdate = true; p.moons.scale.setScalar(p.base);
        }
        if (p.id === 'mic') { const a = t * 1.1 * motion; p.moon.position.set(Math.cos(a) * 1.7 * p.base, Math.sin(a * .7) * .4, Math.sin(a) * 1.7 * p.base); p.jump = Math.max(0, (p.jump || 0) - dt * 1.5); o.position.y = Math.abs(Math.sin(p.jump * Math.PI * 3)) * p.jump * 1.2; }
        if (p.id === 'chai') { p.spin = Math.max(0, (p.spin || 0) - dt * 1.1); o.rotation.x = .42 + p.spin * Math.PI * 2 * (reduce ? 0 : 1); p.steam.forEach((m, i) => { const k = ((t * .5 + i / 3) % 1); m.position.y = .9 + k * 1.3; m.material.opacity = .55 * (1 - k); m.scale.setScalar(.6 + k); }); }
        if (p.id === 'board') { p.jitter = Math.max(0, (p.jitter || 0) - dt * 1.4); o.position.x = (Math.random() - .5) * .25 * p.jitter; p.led.material.color.setHex(Math.sin(t * 6) > 0 || p.jitter > 0 ? 0xff3b3b : 0x551111); }
        if (p.id === 'element') { p.flip += (p.flipTarget - p.flip) * .1; o.rotation.y = p.flip + Math.sin(t * .6) * .25 * motion; }
        if (p.id === 'hack') { p.cycle = Math.max(0, (p.cycle || 0) - dt * .7); if (p.cycle > 0 && !s.heisenberg) p.mats[0].color.setHSL((t * 2) % 1, .9, .62); else if (p.cycle === 0 && !s.heisenberg) p.mats[0].color.setHex(p.color); p.bugs.forEach((b, i) => { const a = t * (1.4 + i * .3) * motion + i * 2.1; b.position.set(Math.cos(a) * 1.6 * p.base, Math.sin(a * 1.3) * .8, Math.sin(a) * 1.6 * p.base); b.rotation.x += dt * 2; b.rotation.y += dt * 3; }); }
        if (p.id === 'kindly') { p.ringSpin = Math.max(0, (p.ringSpin || 0) - dt * .8); p.ring.rotation.z += dt * (.3 + p.ringSpin * 10) * motion; }
        if (p.id === 'disco') {
          p.flash = Math.max(0, (p.flash || 0) - dt * 1.2);
          const party = s.music && s.music.on ? 1 : 0; p.party += (party - p.party) * .05;
          p.beams.rotation.y += dt * (.4 + p.party * 1.2) * motion;
          p.beams.children.forEach((b, i) => { b.material.opacity = Math.min(.5, p.party * (.14 + p.beatK * 1.4) + p.flash * .35); });
          p.lights.forEach((l, i) => { const a = t * (.8 + i * .2) + i * 2; l.position.set(Math.cos(a) * 3, p.g.position.y - 1 + Math.sin(a * 1.3), Math.sin(a) * 3 + 2); l.intensity = p.party * 1.6 + p.flash * 2; });
        }
      });
      micro.forEach(m => { m.a += dt * m.sp * motion; m.born = Math.min(1, m.born + dt * 2); const gp = P.genesis.g.position; m.g.position.set(gp.x + Math.cos(m.a) * m.r * P.genesis.base, gp.y + Math.sin(m.a) * m.r * .55 * P.genesis.base + m.tilt, gp.z + Math.sin(m.a) * m.r * .4); m.g.scale.setScalar(m.born * P.genesis.base); });
      // particles
      for (let i = 0; i < BN; i++) { if (bl[i] <= 0) continue; bl[i] -= dt * .9; bv[i * 3 + 1] -= dt * 4; bp[i * 3] += bv[i * 3] * dt; bp[i * 3 + 1] += bv[i * 3 + 1] * dt; bp[i * 3 + 2] += bv[i * 3 + 2] * dt; if (bl[i] <= 0) bp[i * 3 + 1] = -999; }
      bg.attributes.position.needsUpdate = true;
      bmat.opacity = .95;
      renderer.render(scene, camera);
      s.afterRender(screenOf);
    }

    // pointer
    const cvs = renderer.domElement;
    function onDown(ev) {
      if (ev.button > 0) return;
      cvs.setPointerCapture && cvs.setPointerCapture(ev.pointerId);
      downAt = { x: ev.clientX, y: ev.clientY, t: performance.now() }; moved = false; lastPt = { x: ev.clientX, y: ev.clientY, t: performance.now() };
      held = pick(ev.clientX, ev.clientY);
      if (held) { held.held = true; held.vel.set(0, 0, 0); cvs.style.cursor = 'grabbing'; }
    }
    function onMove(ev) {
      pointer.x = ev.clientX / innerWidth * 2 - 1; pointer.y = -(ev.clientY / innerHeight * 2 - 1);
      if (downAt) {
        if (Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y) > 6) moved = true;
        const now = performance.now(), dx = ev.clientX - lastPt.x, dy = ev.clientY - lastPt.y, dtm = Math.max(1, now - lastPt.t);
        if (held && moved) {
          const w = pointOnPlane(ev.clientX, ev.clientY, held.home.z);
          if (w) { world.worldToLocal(w); held.vel.set(dx / dtm * .35, -dy / dtm * .35, 0); held.g.position.lerp(w, .55); }
        } else if (moved) { worldVel.x = dx / innerWidth * 1.6; worldVel.y = dy / innerHeight * 1.2; }
        lastPt = { x: ev.clientX, y: ev.clientY, t: now };
      } else {
        const p = pick(ev.clientX, ev.clientY);
        Object.values(P).forEach(q => q.isHover = q === p);
        cvs.style.cursor = p ? 'grab' : 'default';
        s.hoverLabel(p ? p.id : null);
      }
    }
    function onUp(ev) {
      if (!downAt) return;
      const wasHeld = held;
      if (held) { held.held = false; if (moved) { held.vel.multiplyScalar(1.4); s.thrown(held.id); } held = null; cvs.style.cursor = 'default'; }
      if (!moved) {
        if (wasHeld) s.clicked(wasHeld.id);
        else {
          const now = performance.now();
          if (now - lastTap < 350) { const w = pointOnPlane(ev.clientX, ev.clientY, 0); if (w) { world.worldToLocal(w); spawnMicro(w); s.spawned(); } lastTap = 0; }
          else lastTap = now;
        }
      }
      downAt = null;
    }
    cvs.addEventListener('pointerdown', onDown);
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('pointerup', onUp);
    addEventListener('pointercancel', onUp);
    addEventListener('resize', resize);
    raf = requestAnimationFrame(frame);

    return {
      react: id => { if (P[id]) react(P[id]); },
      heisenberg: setHeisenberg,
      screen: id => P[id] ? screenOf(P[id]) : null,
      ids: () => Object.keys(P),
      destroy() {
        alive = false; cancelAnimationFrame(raf);
        removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp); removeEventListener('resize', resize);
        scene.traverse(o => { if (o.isPointLight) o.intensity = 0; });
        disposables.forEach(d => { try { d.dispose(); } catch (e) {} });
        renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) {}
        cvs.remove();
      }
    };
  }

  /* ---------------- fallback world (no WebGL): the same planets as buttons ---------------- */
  function buildFallback(s) {
    s.root.classList.add('ap-flat', 'ap-calm');
    const hint = s.root.querySelector('#apHint'); if (hint) hint.textContent = 'Click a planet · Double-tap the void · Type my name';
    const wrap = document.createElement('div'); wrap.className = 'ap-flat-world';
    wrap.innerHTML = PLANETS.map(p => `<span class="ap-fp ap-fp-${p.id}" data-id="${p.id}" aria-hidden="true"></span>`).join('');
    s.stage.appendChild(wrap);
    const els = {}; wrap.querySelectorAll('.ap-fp').forEach(el => { els[el.dataset.id] = el; el.addEventListener('click', () => s.clicked(el.dataset.id)); });
    let lastTap = 0, minis = [];
    wrap.addEventListener('pointerup', e => {
      if (e.target.closest('.ap-fp')) return;
      const now = performance.now();
      if (now - lastTap < 350) {
        lastTap = 0;
        const m = document.createElement('span'); m.className = 'ap-fp ap-fp-mini'; m.setAttribute('aria-hidden', 'true');
        m.style.left = e.clientX + 'px'; m.style.top = e.clientY + 'px';
        m.style.background = ['#F27FE0', '#A99FF6', '#F4EE8E', '#8FB0EE', '#FF7A45'][Math.floor(Math.random() * 5)];
        wrap.appendChild(m); minis.push(m); if (minis.length > 6) minis.shift().remove();
        s.spawned();
      } else lastTap = now;
    });
    return {
      react: id => { const el = els[id]; if (!el) return; el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); },
      heisenberg: on => wrap.classList.toggle('heis', on),
      screen: id => { const r = els[id].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top, vis: true }; },
      ids: () => Object.keys(els),
      destroy() { wrap.remove(); }
    };
  }

  /* ---------------- session ---------------- */
  function loadThree(loader) {
    if (window.THREE) return Promise.resolve();
    return loader ? loader() : Promise.reject(new Error('no loader'));
  }

  function open(opts) {
    if (st) return;
    opts = opts || {};
    const root = buildShell();
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const from = opts.from && opts.from.getBoundingClientRect ? opts.from.getBoundingClientRect() : null;
    root.style.setProperty('--ox', from ? (from.left + from.width / 2) + 'px' : '50%');
    root.style.setProperty('--oy', from ? (from.top + from.height / 2) + 'px' : '50%');
    requestAnimationFrame(() => root.classList.add('is-open'));

    const $ = id => root.querySelector('#' + id);
    const s = st = {
      root, stage: $('apStage'), labels: $('apLabels'), bubble: $('apBubble'), music: null, world: null,
      clickedSet: new Set(), counts: {}, secrets: new Set(), heisenberg: false, keybuf: '', bubbleFor: null, bubbleT: 0,
      prevOverflow, opener: opts.from || null, labelEls: {}
    };

    // accessible planet buttons (also the visible labels)
    PLANETS.forEach(p => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'ap-label'; b.dataset.id = p.id; b.textContent = p.name;
      b.addEventListener('click', () => s.clicked(p.id));
      s.labels.appendChild(b); s.labelEls[p.id] = b;
    });

    function secret(key, msg) {
      if (s.secrets.has(key)) return;
      s.secrets.add(key);
      $('apSecrets').innerHTML = `Secrets <b>${s.secrets.size}</b>/3`;
      toast(msg + (s.secrets.size === 3 ? ' All three found. You’re officially crew.' : ''));
      if (s.world && s.world.react) s.world.react('disco');
    }
    function toast(msg) { const t = $('apToast'); t.textContent = msg; t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); clearTimeout(s.toastT); s.toastT = setTimeout(() => t.classList.remove('on'), 3400); }
    function say(id, text) { s.bubble.textContent = text; s.bubbleFor = id; s.bubble.classList.remove('on'); void s.bubble.offsetWidth; s.bubble.classList.add('on'); clearTimeout(s.bubbleT); s.bubbleT = setTimeout(() => { s.bubble.classList.remove('on'); s.bubbleFor = null; }, 3600); placeBubble(); }
    function placeBubble() {
      if (!s.bubbleFor || !s.world) return; const sc = s.world.screen(s.bubbleFor); if (!sc) return;
      const w = s.bubble.offsetWidth, x = Math.max(12 + w / 2, Math.min(innerWidth - 12 - w / 2, sc.x));
      s.bubble.style.transform = `translate(${(x - w / 2).toFixed(0)}px, ${Math.max(70, sc.top - s.bubble.offsetHeight - 14).toFixed(0)}px)`;
    }

    const hideHint = () => { if (innerWidth < 700) $('apHint').classList.add('off'); };
    setTimeout(hideHint, 9000);
    s.clicked = id => {
      const p = PLANETS.find(q => q.id === id); if (!p) return;
      hideHint();
      const n = s.counts[id] = (s.counts[id] || 0) + 1;
      say(id, p.jokes[(n - 1) % p.jokes.length]);
      if (s.world) s.world.react(id);
      if (id === 'disco' && !(s.music && s.music.on)) setTimeout(() => { if (s.bubbleFor === 'disco') say('disco', 'Needs music. The big button. Go on.'); }, 1800);
      s.clickedSet.add(id);
      if (s.clickedSet.size === PLANETS.length) secret('explorer', 'Secret: you visited every planet.');
    };
    s.thrown = id => { const lines = ['Wheee.', 'Rude. But fair.', 'It’ll come back. They always do.']; say(id, lines[Math.floor(Math.random() * lines.length)]); };
    s.spawned = () => { const name = MICRO[Math.floor(Math.random() * MICRO.length)]; if (s.secrets.has('void')) toast('New moon discovered: ' + name + '.'); else secret('void', 'Secret: the void makes moons. Meet ' + name + '.'); };
    s.hoverLabel = id => Object.entries(s.labelEls).forEach(([k, b]) => b.classList.toggle('hot', k === id));
    s.onEnergy = (e, beat) => {
      root.style.setProperty('--e', e.toFixed(3));
      if (beat) { root.classList.remove('beat'); void root.offsetWidth; root.classList.add('beat'); }
      if (!reduce && s.disp && !root.classList.contains('ap-calm')) { const sc = Math.round(12 + e * 60); if (sc !== s.lastScale) { s.lastScale = sc; s.disp.setAttribute('scale', sc); } }
    };
    s.afterRender = () => {
      PLANETS.forEach(p => {
        const sc = s.world.screen(p.id), b = s.labelEls[p.id]; if (!sc || !b) return;
        b.style.transform = `translate(${sc.x.toFixed(0)}px, ${(sc.y + (sc.y - sc.top) + 12).toFixed(0)}px) translate(-50%, 0)`;
      });
      if (s.bubbleFor) placeBubble();
    };
    s.disp = root.querySelector('#apDisp');
    if (reduce || lowPower) root.classList.add('ap-calm');

    // music: follows the site-wide sound setting (on by default); the label shows what is really playing
    const SS = window.SiteSound, musicBtn = $('apMusic'), musicL = musicBtn.querySelector('.ap-music-l');
    const syncMusic = () => {
      if (st !== s) return;
      const playing = !!(s.music && s.music.on && s.music.running), waiting = !playing && !!(SS && SS.on && s.music && s.music.on);
      musicBtn.setAttribute('aria-pressed', String(playing));
      musicL.textContent = playing ? 'Music on · tap to mute' : waiting ? 'Tap for music' : 'Turn on the music!';
      root.classList.toggle('party', playing);
    };
    const startMusic = () => {
      if (!s.music) { s.music = makeMusic(); if (s.music) s.music.onstate(syncMusic); }
      if (!s.music) { toast('This browser can’t play the music. The planets still dance.'); return; }
      s.music.start(); syncMusic();
    };
    musicBtn.addEventListener('click', () => {
      const playing = !!(s.music && s.music.on && s.music.running);
      if (playing) { s.music.stop(); if (SS) SS.set(false); } else { if (SS) SS.set(true); startMusic(); }
      syncMusic();
    });
    if (!SS || SS.on) startMusic(); else syncMusic();

    // keys: Esc leaves, typing my name flips the world
    s.onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key.length === 1 && /[a-z]/i.test(e.key)) {
        s.keybuf = (s.keybuf + e.key.toLowerCase()).slice(-12);
        if (s.keybuf.endsWith('harshil') || s.keybuf.endsWith('heisenberg')) {
          s.keybuf = ''; s.heisenberg = !s.heisenberg; if (s.world) s.world.heisenberg(s.heisenberg);
          root.classList.toggle('heis', s.heisenberg);
          if (s.heisenberg) secret('name', 'Secret: you said my name. You’re goddamn right.'); else toast('Back to normal. Mostly.');
        }
      }
      if (e.key === 'Tab') { // keep focus inside the dialog
        const f = [...root.querySelectorAll('button')].filter(b => b.offsetParent !== null);
        if (!f.length) return; const i = f.indexOf(document.activeElement);
        if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener('keydown', s.onKey);
    // nothing behind the dialog scrolls while it is open
    s.block = e => { e.preventDefault(); e.stopPropagation(); };
    root.addEventListener('wheel', s.block, { passive: false });
    root.addEventListener('touchmove', s.block, { passive: false });
    $('apBack').addEventListener('click', close);

    const startWorld = () => {
      if (st !== s) return; // visitor already left while three.js was loading
      let w = null;
      if (window.THREE && hasWebGL()) {
        try { w = buildWorld(s); } catch (err) { w = null; s.stage.textContent = ''; }
      }
      s.world = w || buildFallback(s);
      root.classList.add('ready');
      const ld = $('apLoading'); if (ld) ld.remove();
      setTimeout(() => { if (st === s) $('apBack').focus({ preventScroll: true }); }, 50);
    };
    if (hasWebGL()) loadThree(opts.loadThree).then(startWorld, startWorld); else startWorld();
  }

  function close() {
    const s = st; if (!s) return;
    st = null;
    document.removeEventListener('keydown', s.onKey);
    clearTimeout(s.bubbleT); clearTimeout(s.toastT);
    if (s.music) s.music.close();
    s.root.classList.remove('is-open'); s.root.classList.add('is-closing');
    const done = () => {
      if (s.world) s.world.destroy();
      s.root.remove();
      document.documentElement.style.overflow = s.prevOverflow;
      if (s.opener && s.opener.focus) s.opener.focus({ preventScroll: true });
    };
    if (reduce) done(); else setTimeout(done, 620);
  }

  window.AfterParty = { open, close, get isOpen() { return !!st; }, _state: () => st };
})();
