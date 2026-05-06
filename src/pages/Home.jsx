import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/clerk-react";
import * as THREE from "three";

// ─── Physics constants ───────────────────────────────────────────────────────
const SPACING = 0.38; // world-unit gap between dots
const CAM_Z = 22; // camera z distance
const FOV = 50; // camera field of view
const REPEL_RADIUS = 3.8; // how far the cursor pushes
const REPEL_FORCE = 0.32; // push strength
const SPRING_K = 0.045; // spring pull back to rest
const DAMPING = 0.87; // velocity damping (< 1 = friction)
const Z_LIFT = 1.8; // how far dots pop toward camera on repulsion

// Ripple wave
const RIPPLE_SPEED = 24; // world units / second
const RIPPLE_WIDTH = 1.75; // thick ring band
const RIPPLE_MAX_AGE = 8.0; // seconds before expiry
// #a22d31 hue normalised to base-dot brightness level
const WAVE_R = 0.9,
  WAVE_G = 0.25,
  WAVE_B = 0.272;

function Home() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const ripples = []; // { x, y, born: ms }

    // ── Renderer ──────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // ── Scene & Camera ────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      50,
      mount.clientWidth / mount.clientHeight,
      0.1,
      200,
    );
    // Straight on — perfectly flat grid, no tilt
    camera.position.set(0, 0, CAM_Z);
    camera.lookAt(0, 0, 0);

    // ── Compute grid size to exactly fill the camera frustum ─────────────
    const W = mount.clientWidth;
    const H = mount.clientHeight;
    const fovRad = (FOV * Math.PI) / 180;
    const visibleH = 2 * Math.tan(fovRad / 2) * CAM_Z; // world units tall
    const visibleW = visibleH * (W / H); // world units wide
    const COLS = Math.ceil(visibleW / SPACING) + 4; // +4 buffer
    const ROWS = Math.ceil(visibleH / SPACING) + 4;

    // ── Circular dot texture ──────────────────────────────────────────────
    const texCanvas = document.createElement("canvas");
    texCanvas.width = texCanvas.height = 64;
    const tCtx = texCanvas.getContext("2d");
    const grad = tCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.4, "rgba(255,255,255,0.9)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    tCtx.fillStyle = grad;
    tCtx.fillRect(0, 0, 64, 64);
    const dotTexture = new THREE.CanvasTexture(texCanvas);

    // ── Build dot grid ────────────────────────────────────────────────────
    const total = COLS * ROWS;
    const positions = new Float32Array(total * 3); // x, y, z per dot
    const colors = new Float32Array(total * 3); // r, g, b per dot

    // Dot state for physics (parallel arrays — fast)
    const ox = new Float32Array(total); // rest X
    const oy = new Float32Array(total); // rest Y
    const vx = new Float32Array(total); // velocity X
    const vy = new Float32Array(total); // velocity Y
    const vz = new Float32Array(total); // velocity Z

    const gridW = (COLS - 1) * SPACING;
    const gridH = (ROWS - 1) * SPACING;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c;
        const x = c * SPACING - gridW / 2;
        const y = r * SPACING - gridH / 2;

        ox[i] = x;
        oy[i] = y;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = 0;

        // Subtle color gradient across the grid (cool blue-white tones)
        colors[i * 3] = 0.72 + (c / COLS) * 0.1;
        colors[i * 3 + 1] = 0.78 + (r / ROWS) * 0.08;
        colors[i * 3 + 2] = 0.92;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.18,
      map: dotTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // ── Glow layer: larger dots, only visible on ripple ───────────────────
    // Color encodes alpha (premultiplied): (0,0,0) = invisible, (R,G,B) = glow
    const glowColors = new Float32Array(total * 3); // starts black = invisible
    const glowGeometry = new THREE.BufferGeometry();
    glowGeometry.setAttribute("position", geometry.attributes.position); // shared
    glowGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(glowColors, 3),
    );
    const glowMaterial = new THREE.PointsMaterial({
      size: 0.65, // much larger than the 0.18 main dot
      map: dotTexture,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });
    const glowPoints = new THREE.Points(glowGeometry, glowMaterial);
    scene.add(glowPoints);

    // ── Mouse → 3D world position ─────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2(-9999, -9999);
    const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const mouse3D = new THREE.Vector3();

    // ── Helper: update NDC from any clientX/Y ─────────────────────────────
    const updateNDC = (clientX, clientY) => {
      const rect = mount.getBoundingClientRect();
      mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    // Mouse
    const onMouseMove = (e) => updateNDC(e.clientX, e.clientY);
    const onMouseLeave = () => {
      mouseNDC.set(-9999, -9999);
      mouse3D.set(-9999, -9999, 0);
    };

    // Touch — use first touch point; preventDefault stops page scroll
    const onTouchMove = (e) => {
      e.preventDefault();
      updateNDC(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchStart = (e) => {
      updateNDC(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => {
      mouseNDC.set(-9999, -9999);
      mouse3D.set(-9999, -9999, 0);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);
    // { passive: false } required so preventDefault works on touchmove
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    // ── Click / tap → spawn ripple ────────────────────────────────────────
    const spawnRipple = (clientX, clientY) => {
      const rect = mount.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const p = new THREE.Vector3();
      raycaster.ray.intersectPlane(planeZ, p);
      ripples.push({ x: p.x, y: p.y, born: performance.now() });
    };
    const onClick = (e) => spawnRipple(e.clientX, e.clientY);
    const onTapEnd = (e) => {
      if (e.changedTouches.length) {
        spawnRipple(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      }
    };
    window.addEventListener("click", onClick);
    window.addEventListener("touchend", onTapEnd);

    // ── Animation loop ────────────────────────────────────────────────────
    let animId;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Unproject mouse to z=0 plane
      raycaster.setFromCamera(mouseNDC, camera);
      raycaster.ray.intersectPlane(planeZ, mouse3D);

      const pos = geometry.attributes.position.array;
      const now = performance.now();

      // Expire old ripples
      for (let ri = ripples.length - 1; ri >= 0; ri--) {
        if ((now - ripples[ri].born) / 1000 > RIPPLE_MAX_AGE)
          ripples.splice(ri, 1);
      }

      for (let i = 0; i < total; i++) {
        const i3 = i * 3;
        const px = pos[i3];
        const py = pos[i3 + 1];
        const pz = pos[i3 + 2];

        // Distance from dot to mouse (in XY only for repulsion dir)
        const dx = px - mouse3D.x;
        const dy = py - mouse3D.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // ── Repulsion ──
        if (dist < REPEL_RADIUS && dist > 0.001) {
          const t = 1 - dist / REPEL_RADIUS; // 0..1 (stronger at center)
          const force = t * t * REPEL_FORCE;
          vx[i] += (dx / dist) * force;
          vy[i] += (dy / dist) * force;
          vz[i] += t * Z_LIFT * 0.06; // pop toward camera
        }

        // ── Spring back to rest ──
        vx[i] += (ox[i] - px) * SPRING_K;
        vy[i] += (oy[i] - py) * SPRING_K;
        vz[i] += (0 - pz) * SPRING_K * 1.4; // faster Z restore

        // ── Damping ──
        vx[i] *= DAMPING;
        vy[i] *= DAMPING;
        vz[i] *= DAMPING;

        // ── Integrate ──
        pos[i3] += vx[i];
        pos[i3 + 1] += vy[i];
        pos[i3 + 2] += vz[i];

        // ── Color: cursor glow ──
        const distToCursor = Math.sqrt(
          (px - mouse3D.x) ** 2 + (py - mouse3D.y) ** 2,
        );
        const glow = Math.max(0, 1 - distToCursor / (REPEL_RADIUS * 1.5));
        const baseR = 0.72 + glow * 0.28;
        const baseG = 0.78 + glow * 0.15;
        const baseB = 0.92 + glow * 0.08;

        // ── Color: ripple wave ──
        let ripS = 0;
        for (let ri = 0; ri < ripples.length; ri++) {
          const rip = ripples[ri];
          const elapsed = (now - rip.born) / 1000;
          const waveFront = elapsed * RIPPLE_SPEED;
          const rdx = ox[i] - rip.x;
          const rdy = oy[i] - rip.y;
          const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
          const distToWave = Math.abs(rdist - waveFront);
          if (distToWave < RIPPLE_WIDTH) {
            const band = 1 - distToWave / RIPPLE_WIDTH; // linear falloff
            const ageFade = 1 - elapsed / RIPPLE_MAX_AGE;
            const s = band * ageFade; // no squaring = stronger
            if (s > ripS) ripS = s;
          }
        }

        // ── Apply colors ──
        // Main dot: push toward bright warm white at ring peak (star core)
        colors[i * 3] = baseR + ripS * (1.0 - baseR);
        colors[i * 3 + 1] = baseG + ripS * (0.82 - baseG);
        colors[i * 3 + 2] = baseB + ripS * (0.82 - baseB);

        // Glow dot: WAVE colour × ripS (black when no ripple → invisible)
        glowColors[i * 3] = WAVE_R * ripS * 1.4;
        glowColors[i * 3 + 1] = WAVE_G * ripS * 1.4;
        glowColors[i * 3 + 2] = WAVE_B * ripS * 1.4;
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      glowGeometry.attributes.color.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // ── Resize handler ────────────────────────────────────────────────────
    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("click", onClick);
      window.removeEventListener("touchend", onTapEnd);
      renderer.dispose();
      geometry.dispose();
      glowGeometry.dispose();
      material.dispose();
      glowMaterial.dispose();
      dotTexture.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="page">
      {/* Three.js mounts here — fills the background */}
      <div ref={mountRef} className="three-mount" />

      <header className="top-nav">
        <div className="brand">
          <img src="/favicon.png" alt="" className="logo-icon" aria-hidden="true" />
          <span className="brand-name">GIGA CRACKED</span>
        </div>
        <SignedOut>
          <SignInButton mode="redirect">
            <button type="button" className="nav-cta">
              Sign In
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </header>

      <main className="hero">
        <div className="hero-inner">
          <h1 className="reveal" style={{ "--delay": "80ms" }}>
            Get Cracked.
          </h1>
          <p className="subhead reveal" style={{ "--delay": "180ms" }}>
            Your shortcut to the best AI/ML courses, roadmaps, and tools.
          </p>
          <div className="cta-row reveal" style={{ "--delay": "260ms" }}>
            <Link to="/explore" className="primary">
              Start Exploring
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;
