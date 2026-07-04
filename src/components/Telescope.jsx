import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebaseClient.js';
import { mulberry32, FALLBACK_THEMES, pickWeighted } from '../lib/procedural.js';
import MemoryViewer from './MemoryViewer.jsx';

export default function Telescope({ shareCode, universeId, isPreview, onExit }) {
  const canvasRef = useRef(null);
  const [universe, setUniverse] = useState(null);
  const [memoryStars, setMemoryStars] = useState([]);
  const [loadErr, setLoadErr] = useState('');
  const [progress, setProgress] = useState({ found: 0, total: 0 });
  const [activeMemory, setActiveMemory] = useState(null);

  // ---- fetch universe + its memory stars ----
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        let uniData, uniId;
        if (shareCode) {
          const q = query(collection(db, 'universes'), where('shareCode', '==', shareCode));
          const snap = await getDocs(q);
          if (snap.empty) throw new Error('not-found');
          uniData = snap.docs[0].data();
          uniId = snap.docs[0].id;
        } else {
          const snap = await getDoc(doc(db, 'universes', universeId));
          if (!snap.exists()) throw new Error('not-found');
          uniData = snap.data();
          uniId = snap.id;
        }
        if (cancelled) return;
        if (!isPreview && uniData.status !== 'published') throw new Error('not-published');

        const starsSnap = await getDocs(
          query(collection(db, 'universes', uniId, 'memoryStars'), orderBy('slotIndex'))
        );
        if (cancelled) return;

        setUniverse({ id: uniId, ...uniData });
        setMemoryStars(starsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setProgress({ found: 0, total: starsSnap.docs.length });
      } catch (ex) {
        if (cancelled) return;
        if (ex.message === 'not-published') setLoadErr('This universe has not been published yet.');
        else setLoadErr('This universe link is invalid or has not been published yet.');
      }
    }
    load();
    return () => { cancelled = true; };
  }, [shareCode, universeId, isPreview]);

  // ---- build the three.js scene once universe + stars are ready ----
  useEffect(() => {
    if (!universe || !memoryStars.length || !canvasRef.current) return;

    const theme = FALLBACK_THEMES[universe.themeKey] || FALLBACK_THEMES.blue_galaxy;
    const rng = mulberry32(universe.seed);
    const canvas = canvasRef.current;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(new THREE.Color(theme.bg));

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(new THREE.Color(theme.bg), 0.0018);
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 3000);
    const sky = new THREE.Group();
    scene.add(sky);
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const key = new THREE.PointLight(new THREE.Color(theme.glow), 1.2, 2000);
    key.position.set(200, 150, -300);
    scene.add(key);

    function glowTexture() {
      const s = 64, cnv = document.createElement('canvas'); cnv.width = cnv.height = s;
      const ctx = cnv.getContext('2d');
      const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
      return new THREE.CanvasTexture(cnv);
    }
    const glowTex = glowTexture();

    // ---- Milky Way band: a wide, cloudy, speckled diagonal texture behind
    // the stars, so the sky reads as a dense real night-sky photo instead
    // of an even scatter of dots. ----
    function bandTexture() {
      const w = 1024, h = 512;
      const cnv = document.createElement('canvas'); cnv.width = w; cnv.height = h;
      const ctx = cnv.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      const bandColor = theme.bandColor || theme.nebula[0];
      // soft horizontal cloud band
      const vGrad = ctx.createLinearGradient(0, 0, 0, h);
      vGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vGrad.addColorStop(0.5, bandColor + '55');
      vGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, w, h);
      // layered cloudy blobs for texture/turbulence
      for (let i = 0; i < 140; i++) {
        const x = rng() * w;
        const y = h / 2 + (rng() - 0.5) * h * 0.7;
        const r = 30 + rng() * 90;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const alpha = 0.05 + rng() * 0.08;
        g.addColorStop(0, bandColor + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      // fine speckled stars embedded in the band for density
      for (let i = 0; i < 900; i++) {
        const x = rng() * w;
        const y = h / 2 + (rng() - 0.5) * h * 0.6;
        const r = rng() * 1.1 + 0.2;
        ctx.fillStyle = `rgba(255,255,255,${0.2 + rng() * 0.5})`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      return new THREE.CanvasTexture(cnv);
    }
    const bandMat = new THREE.SpriteMaterial({
      map: bandTexture(), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const bandSprite = new THREE.Sprite(bandMat);
    bandSprite.scale.set(2600, 1100, 1);
    bandSprite.rotation.z = 0.4; // diagonal sweep across the sky, like a real Milky Way band
    bandSprite.position.set(0, 0, -200);
    sky.add(bandSprite);

    // ---- Real-photo skydome ----
    // If a matching image exists at public/textures/<themeKey>.jpg, wrap it
    // around a giant inward-facing sphere so the recipient is genuinely
    // surrounded by a real astrophotography image while dragging to look
    // around. Falls back silently to the procedural band above if missing.
    const skyDomeGeo = new THREE.SphereGeometry(1400, 48, 32);
    const skyDomeMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, color: 0xffffff, transparent: true, opacity: 0 });
    const skyDome = new THREE.Mesh(skyDomeGeo, skyDomeMat);
    sky.add(skyDome);
    const texLoader = new THREE.TextureLoader();
    const texturePath = `${import.meta.env.BASE_URL}textures/${universe.themeKey}.jpg`;
    texLoader.load(
      texturePath,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        skyDomeMat.map = tex;
        skyDomeMat.opacity = 1;
        skyDomeMat.needsUpdate = true;
        bandMat.opacity = 0.12; // dim the procedural band since a real photo is now doing the work
      },
      undefined,
      () => { /* no local image yet — procedural band + stars carry the visual */ }
    );

    // decorative stars — colored from the theme's weighted palette, sized
    // with a power-law bias (many small + dim, a few large + bright), and
    // clustered more densely near the band for a realistic night-sky feel.
    const STAR_COUNT = 1400;
    const positions = new Float32Array(STAR_COUNT * 3);
    const colors = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);
    const palette = theme.starPalette || [[theme.star, 1]];
    for (let i = 0; i < STAR_COUNT; i++) {
      const nearBand = rng() < 0.55; // roughly half cluster near the galactic band
      const r = 400 + rng() * 900;
      const theta = rng() * Math.PI * 2;
      const bandBias = nearBand ? (rng() - 0.5) * 0.25 : (rng() - 0.5) * 1.6;
      const phi = Math.acos(Math.max(-1, Math.min(1, bandBias)));
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      positions[i * 3 + 2] = r * Math.cos(phi);
      const c = new THREE.Color(pickWeighted(palette, rng));
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
      // power-law size distribution: mostly small, occasionally a bright hero star
      sizes[i] = Math.pow(rng(), 3.2) * 3.6 + 0.5;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const starMat = new THREE.PointsMaterial({ size: 2.4, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    const starPoints = new THREE.Points(starGeo, starMat);
    sky.add(starPoints);

    // nebulas
    const nebulaGroup = new THREE.Group();
    const nebColors = theme.nebula.map(h => new THREE.Color(h));
    for (let i = 0; i < 7; i++) {
      const mat = new THREE.SpriteMaterial({ map: glowTex, color: nebColors[i % nebColors.length], transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending });
      const spr = new THREE.Sprite(mat);
      const scale = 260 + rng() * 420;
      spr.scale.set(scale, scale * 0.7, 1);
      const r = 500 + rng() * 400, theta = rng() * Math.PI * 2, y = (rng() - 0.5) * 400;
      spr.position.set(Math.cos(theta) * r, y, Math.sin(theta) * r);
      nebulaGroup.add(spr);
    }
    sky.add(nebulaGroup);

    // planets
    const planetGroup = new THREE.Group();
    const planetCount = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < planetCount; i++) {
      const size = 18 + rng() * 30;
      const geo = new THREE.SphereGeometry(size, 32, 32);
      const col = new THREE.Color(theme.planet[i % theme.planet.length]);
      const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.85, metalness: 0.1, emissive: col.clone().multiplyScalar(0.06) });
      const mesh = new THREE.Mesh(geo, mat);
      const r = 550 + rng() * 500, theta = rng() * Math.PI * 2, y = (rng() - 0.5) * 300;
      mesh.position.set(Math.cos(theta) * r, y, Math.sin(theta) * r);
      mesh.userData.spin = 0.0006 + rng() * 0.001;
      planetGroup.add(mesh);
    }
    sky.add(planetGroup);

    // memory stars — deliberately distinct from decorative stars: warm
    // golden color and a soft halo ring so they read as "special" against
    // any theme, while their behavior animation still makes discovery feel
    // earned rather than obvious at a glance.
    const behaviors = ['pulse', 'colorShift', 'sparkle', 'zoomReveal', 'emergeNebula', 'trail', 'driftShy', 'shimmer'];
    const memSprites = memoryStars.map((m, i) => {
      const r = 340 + rng() * 260;
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(rng() * 1.4 - 0.7);
      const pos = new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta) * 0.5, r * Math.cos(phi));

      const haloMat = new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color('#e6c98a'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      const halo = new THREE.Sprite(haloMat);
      halo.position.copy(pos);
      halo.scale.set(22, 22, 1);
      sky.add(halo);

      const mat = new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color('#fff3d6'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      const spr = new THREE.Sprite(mat);
      spr.position.copy(pos);
      spr.scale.set(13, 13, 1);
      sky.add(spr);
      return {
        sprite: spr, halo, record: m, behavior: behaviors[i % behaviors.length],
        unlockWave: m.unlockWave ?? 0, discovered: false, seedPhase: rng() * Math.PI * 2, basePos: pos.clone(),
        isFinal: m.contentType === 'final_surprise',
      };
    });
    let waveTwoUnlocked = false;

    // drag navigation with inertia
    let dragging = false, lastX = 0, lastY = 0, velX = 0, velY = 0, rotX = 0, rotY = 0;
    canvas.style.cursor = 'grab';
    const down = (x, y) => { dragging = true; lastX = x; lastY = y; velX = 0; velY = 0; canvas.style.cursor = 'grabbing'; };
    const move = (x, y) => {
      if (!dragging) return;
      const dx = x - lastX, dy = y - lastY;
      velX = -dx * 0.0022; velY = -dy * 0.0022;
      rotY += velX; rotX = Math.max(-0.5, Math.min(0.5, rotX + velY));
      lastX = x; lastY = y;
    };
    const up = () => { dragging = false; canvas.style.cursor = 'grab'; };
    const onMouseDown = e => down(e.clientX, e.clientY);
    const onMouseMove = e => move(e.clientX, e.clientY);
    const onTouchStart = e => { const t = e.touches[0]; down(t.clientX, t.clientY); };
    const onTouchMove = e => { const t = e.touches[0]; move(t.clientX, t.clientY); };
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', up);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', up);

    // click / tap picking
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 6;
    const mouse = new THREE.Vector2();
    let downPos = null;
    const onDownPick = e => { downPos = { x: e.clientX, y: e.clientY }; };
    const onUpPick = e => {
      if (downPos && Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) < 6) tryPick(e.clientX, e.clientY);
    };
    const onTouchEndPick = e => { if (e.changedTouches?.[0]) tryPick(e.changedTouches[0].clientX, e.changedTouches[0].clientY); };
    canvas.addEventListener('mousedown', onDownPick);
    canvas.addEventListener('mouseup', onUpPick);
    canvas.addEventListener('touchend', onTouchEndPick);

    function tryPick(cx, cy) {
      mouse.x = (cx / window.innerWidth) * 2 - 1;
      mouse.y = -(cy / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const active = memSprites.filter(m => (m.unlockWave === 0 || waveTwoUnlocked) && !m.discovered && m.sprite.material.opacity > 0.15);
      const hits = raycaster.intersectObjects(active.map(m => m.sprite));
      if (hits.length) {
        const m = active.find(mm => mm.sprite === hits[0].object);
        if (m) selectMemory(m);
      }
    }

    function selectMemory(m) {
      m.discovered = true;
      const foundCount = memSprites.filter(x => x.discovered).length;
      setProgress({ found: foundCount, total: memSprites.length });
      starMat.opacity = 0.4;
      m.sprite.material.opacity = 1;
      m.sprite.scale.set(20, 20, 1);
      m.halo.material.opacity = 0.8;
      m.halo.scale.set(34, 34, 1);
      setTimeout(() => {
        starMat.opacity = 1;
        setActiveMemory(m.record);
      }, 650);
      if (foundCount === 5 && !waveTwoUnlocked) waveTwoUnlocked = true;
    }

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let raf;
    function animate() {
      const dt = clock.getDelta();
      const t = clock.elapsedTime;
      if (!dragging) { rotY += velX * 0.94; velX *= 0.94; rotX *= 0.96; }
      sky.rotation.y = rotY * 0.6 + t * 0.004;
      sky.rotation.x = rotX * 0.4;
      planetGroup.children.forEach(p => { p.rotation.y += p.userData.spin; });
      starMat.opacity += (1 - starMat.opacity) * 0.02;

      memSprites.forEach(m => {
        if (m.discovered) return;
        const active = m.unlockWave === 0 || waveTwoUnlocked;
        if (!active) { m.sprite.material.opacity = 0; m.halo.material.opacity = 0; return; }
        const ph = t * 0.6 + m.seedPhase;
        let baseOpacity;
        switch (m.behavior) {
          case 'pulse': baseOpacity = 0.55 + Math.sin(ph * 0.5) * 0.25; break;
          case 'colorShift': m.sprite.material.color.setHSL((t * 0.02 + m.seedPhase) % 1, 0.4, 0.85); baseOpacity = 0.7; break;
          case 'sparkle': baseOpacity = Math.sin(t * 2 + m.seedPhase) > 0.85 ? 1 : 0.45; break;
          case 'trail': baseOpacity = 0.65; m.sprite.position.x = m.basePos.x + Math.sin(ph * 0.2) * 8; m.halo.position.x = m.sprite.position.x; break;
          case 'driftShy': m.sprite.position.y = m.basePos.y + Math.sin(ph * 0.15) * 6; m.halo.position.y = m.sprite.position.y; baseOpacity = 0.6; break;
          default: baseOpacity = 0.65 + Math.sin(ph) * 0.2;
        }
        m.sprite.material.opacity = baseOpacity;
        m.halo.material.opacity = baseOpacity * 0.4 + Math.sin(ph * 0.3) * 0.08;
      });

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', up);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousedown', onDownPick);
      canvas.removeEventListener('mouseup', onUpPick);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', up);
      canvas.removeEventListener('touchend', onTouchEndPick);
      renderer.dispose();
    };
  }, [universe, memoryStars]);

  if (loadErr) {
    return (
      <div className="screen active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eee', padding: 24, textAlign: 'center' }}>
        {loadErr}
      </div>
    );
  }
  if (!universe) {
    return <div className="bootScreen">Opening the observatory…</div>;
  }

  return (
    <div className="screen active" id="telescopeScreen">
      <canvas ref={canvasRef} id="universeCanvas" />
      <div className="telescopeFrame">
        <div className="dustOverlay" />
        <div className="vignetteRing" />
        <div className="lensGloss" />
        <div className="lensRim" />
      </div>
      <div className="telescopeTop">
        <div className="exitBtn" onClick={onExit}>← {isPreview ? 'Dashboard' : 'Close'}</div>
        <div className="progressPill">{progress.found} / {progress.total} discovered</div>
      </div>
      <div className="plaque">
        <div className="pName">{universe.name}</div>
        <div className="pFor">Created by {universe.fromName || '—'} · For {universe.toName || '—'}</div>
      </div>
      <MemoryViewer memory={activeMemory} onClose={() => setActiveMemory(null)} />
    </div>
  );
}
