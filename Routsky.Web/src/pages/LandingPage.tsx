// @ts-nocheck
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { OrbitControls, Effects } from '@react-three/drei';
import { UnrealBloomPass } from 'three-stdlib';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import * as THREE from 'three';

extend({ UnrealBloomPass });

// ─── Particle Swarm (Hooke's Law Field — Routsky green palette) ──────────────
const ParticleSwarm = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count   = 20000;
  const dummy   = useMemo(() => new THREE.Object3D(), []);
  const target  = useMemo(() => new THREE.Vector3(), []);
  const pColor  = useMemo(() => new THREE.Color(), []);

  const positions = useMemo(() => {
    const pos: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++)
      pos.push(new THREE.Vector3(
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
      ));
    return pos;
  }, []);

  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xffffff }), []);
  const geometry = useMemo(() => new THREE.TetrahedronGeometry(0.18), []);

  const K      = 1.2;
  const AMP    = 22;
  const SPREAD = 2.0;
  const FREQ   = 1.0;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const time = clock.getElapsedTime();
    const n    = Math.cbrt(count) | 0;

    for (let i = 0; i < count; i++) {
      const ix = i % n;
      const iy = ((i / n) | 0) % n;
      const iz = ((i / (n * n)) | 0);

      const cx = ix - n * 0.5;
      const cy = iy - n * 0.5;
      const cz = iz - n * 0.5;
      const r  = Math.sqrt(cx * cx + cy * cy + cz * cz) + 0.0001;

      const omega        = Math.sqrt(K);
      const phase        = omega * time * FREQ - r * 0.15;
      const displacement = Math.sin(phase) * AMP / (1.0 + 0.05 * r);

      target.set(
        cx * SPREAD + (cx / r) * displacement,
        cy * SPREAD + (cy / r) * displacement,
        cz * SPREAD + (cz / r) * displacement,
      );

      // Routsky green palette: #00ff88 → deep teal
      const energy    = displacement * displacement * K * 0.5;
      const hue       = 0.38 - Math.min(energy * 0.008, 0.12);
      const lightness = 0.35 + Math.sin(phase) * 0.12;
      pColor.setHSL(hue, 1.0, Math.max(lightness, 0.18));

      positions[i].lerp(target, 0.08);
      dummy.position.copy(positions[i]);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, pColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor)
      meshRef.current.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={meshRef} args={[geometry, material, count]} />;
};

// ─── Landing Page ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated) navigate('/home', { replace: true });
  }, [isAuthenticated, navigate]);

  const fadeUp = (delay = 0) => ({
    initial:    { opacity: 0, y: 24 },
    animate:    { opacity: 1, y: 0  },
    transition: { duration: 0.6, delay, ease: 'easeOut' },
  });

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">

      {/* Particle canvas — full background */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 90], fov: 60 }}>
          <fog attach="fog" args={['#000000', 80, 200]} />
          <ParticleSwarm />
          <OrbitControls
            autoRotate
            autoRotateSpeed={0.25}
            enableZoom={false}
            enablePan={false}
            enableRotate={false}
          />
          <Effects disableGamma>
            <unrealBloomPass threshold={0} strength={1.4} radius={0.5} />
          </Effects>
        </Canvas>
      </div>

      {/* Radial vignette — draws eye to center */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.92) 100%)',
        }}
      />

      {/* NAV */}
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#00ff88] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-black">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <span className="text-white font-semibold tracking-tight text-[15px]">
              Rout<span className="text-[#00ff88]">sky</span>
            </span>
            <p className="text-[9px] tracking-[0.16em] text-white/25 uppercase leading-none">
              Orchestrating the world
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="text-white/40 hover:text-white text-sm transition-colors"
        >
          Sign In
        </button>
      </nav>

      {/* HERO */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-6 pointer-events-none">

        <motion.div {...fadeUp(0)} className="flex items-center gap-2 mb-8 pointer-events-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
          <span className="text-[#00ff88] text-[11px] tracking-[0.18em] uppercase">
            System Online — 320 Active Nodes
          </span>
        </motion.div>

        <motion.h1
          {...fadeUp(0.1)}
          className="text-[clamp(3rem,7vw,6rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-white mb-5"
        >
          Orchestrate the
          <br />
          <span className="text-[#00ff88]">World.</span>
        </motion.h1>

        <motion.p
          {...fadeUp(0.2)}
          className="text-white/40 text-[clamp(0.9rem,1.4vw,1.05rem)] leading-relaxed max-w-[460px] mb-10 font-light"
        >
          Deterministic route generation across 150 countries.
          Visa intelligence, cost analysis, and real-time safety
          in one decision engine.
        </motion.p>

        <motion.div
          {...fadeUp(0.3)}
          className="flex items-center gap-3 pointer-events-auto"
        >
          <button
            onClick={() => navigate('/register')}
            className="px-7 py-2.5 bg-[#00ff88] text-black text-sm font-bold rounded-full hover:bg-[#00e07a] transition-all active:scale-95"
          >
            Get Started
          </button>
          <button
            onClick={() => navigate('/login')}
            className="px-7 py-2.5 border border-white/15 text-white/60 text-sm rounded-full hover:border-white/30 hover:text-white transition-all"
          >
            Sign In →
          </button>
        </motion.div>
      </div>

      {/* FOOTER */}
      <motion.div
        {...fadeUp(0.5)}
        className="absolute bottom-0 left-0 right-0 z-20 flex justify-between items-end px-8 pb-6 pointer-events-none"
      >
        <p className="text-white/20 text-[11px] tracking-widest uppercase">
          © 2026 Routsky Inc.
        </p>
        <div className="flex gap-8">
          {[
            { num: '320+', label: 'Active Nodes'       },
            { num: '150',  label: 'Global Coverage'    },
          ].map((s) => (
            <div key={s.label} className="text-right">
              <p className="text-[10px] tracking-[0.12em] uppercase text-white/25">{s.label}</p>
              <p className="text-white text-lg font-bold leading-tight">{s.num}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
