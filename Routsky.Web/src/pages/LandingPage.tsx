import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Globe from "react-globe.gl";
import { useAuth } from "../context/AuthContext";

// Minimal arc data — same format as your existing GlobeArcs component
const ARCS = [
  { startLat: 41.0, startLng: 28.9, endLat: 51.5, endLng: -0.1, color: "#00ff88" },
  { startLat: 41.0, startLng: 28.9, endLat: 48.8, endLng: 2.3, color: "#00ff88" },
  { startLat: 41.0, startLng: 28.9, endLat: 40.7, endLng: -74.0, color: "#00cc6a" },
  { startLat: 35.6, startLng: 139.6, endLat: 1.3, endLng: 103.8, color: "#00ff88" },
  { startLat: -33.8, startLng: 151.2, endLat: 22.3, endLng: 114.1, color: "#00cc6a" },
  { startLat: 19.0, startLng: 72.8, endLat: 25.2, endLng: 55.2, color: "#00ff88" },
  { startLat: 52.5, startLng: 13.4, endLat: 55.7, endLng: 12.5, color: "#00cc6a" },
  { startLat: 37.7, startLng: -122.4, endLat: 34.0, endLng: -118.2, color: "#00ff88" },
];

const POINTS = [
  { lat: 41.0, lng: 28.9, label: "Istanbul", size: 0.6, color: "#00ff88" },
  { lat: 51.5, lng: -0.1, label: "London", size: 0.5, color: "#00ff88" },
  { lat: 48.8, lng: 2.3, label: "Paris", size: 0.5, color: "#00ff88" },
  { lat: 40.7, lng: -74.0, label: "New York", size: 0.5, color: "#00cc6a" },
  { lat: 35.6, lng: 139.6, label: "Tokyo", size: 0.5, color: "#00ff88" },
  { lat: -33.8, lng: 151.2, label: "Sydney", size: 0.4, color: "#00cc6a" },
  { lat: 19.0, lng: 72.8, label: "Mumbai", size: 0.4, color: "#00ff88" },
  { lat: 52.5, lng: 13.4, label: "Berlin", size: 0.4, color: "#00cc6a" },
  { lat: 37.7, lng: -122.4, label: "San Francisco", size: 0.4, color: "#00ff88" },
  { lat: 1.3, lng: 103.8, label: "Singapore", size: 0.4, color: "#00cc6a" },
];

const fadeUp: any = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay, ease: "easeOut" },
  }),
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const globeRef = useRef<any>(null);

  // If logged in, skip landing entirely
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Auto-rotate globe
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.4;
    globe.controls().enableZoom = false;
    globe.pointOfView({ lat: 30, lng: 20, altitude: 2.2 });
  }, []);

  return (
    <div className="relative min-h-screen bg-[#050a0f] text-white overflow-hidden">

      {/* Globe — fills right half */}
      <div className="absolute inset-0 flex items-center justify-end pointer-events-none select-none">
        <div className="w-[55vw] h-screen opacity-90" style={{ pointerEvents: "none" }}>
          <Globe
            ref={globeRef}
            width={typeof window !== "undefined" ? window.innerWidth * 0.55 : 800}
            height={typeof window !== "undefined" ? window.innerHeight : 800}
            backgroundColor="rgba(0,0,0,0)"
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
            atmosphereColor="#00ff88"
            atmosphereAltitude={0.12}
            arcsData={ARCS}
            arcColor="color"
            arcDashLength={0.4}
            arcDashGap={0.2}
            arcDashAnimateTime={2000}
            arcStroke={0.4}
            pointsData={POINTS}
            pointColor="color"
            pointAltitude={0.01}
            pointRadius="size"
            pointLabel="label"
          />
        </div>
        {/* Gradient fade — left edge of globe bleeds into content */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#050a0f] via-[#050a0f]/80 to-transparent" />
      </div>

      {/* NAV */}
      <nav className="relative z-20 flex items-center justify-between px-10 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#00ff88] flex items-center justify-center">
            {/* Reuse your existing SVG logo icon */}
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#050a0f]">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight">
              Rout<span className="text-[#00ff88]">sky</span>
            </span>
            <p className="text-[10px] tracking-[0.16em] text-white/30 uppercase leading-none">
              Orchestrating the world
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 text-sm text-white/60 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-all"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate("/register")}
            className="px-4 py-2 text-sm font-semibold bg-[#00ff88] text-[#050a0f] rounded-lg hover:bg-[#00cc6a] transition-all"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* HERO */}
      <div className="relative z-10 flex flex-col justify-center min-h-[calc(100vh-73px)] px-10 max-w-2xl">

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          className="flex items-center gap-2 mb-6"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
          <span className="text-[11px] tracking-[0.14em] uppercase text-[#00ff88]">
            System Online — 320 Active Nodes
          </span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.1}
          className="text-6xl font-extrabold leading-[1.05] tracking-tight mb-5"
        >
          Global Route
          <br />
          <span className="text-[#00ff88]">Intelligence</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.2}
          className="text-white/40 text-lg leading-relaxed mb-10 max-w-md font-light"
        >
          Deterministic route generation across 150 countries. Visa intelligence,
          cost analysis, and real-time safety — in one decision engine.
        </motion.p>

        {/* CTA Cards */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.3}
          className="grid grid-cols-3 gap-3 max-w-xl"
        >
          {[
            {
              label: "Find a Route",
              desc: "AI-driven route generation",
              sub: "Decision Engine",
              href: "/find-route",
              icon: (
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[#00ff88] fill-none stroke-[1.5] stroke-linecap-round stroke-linejoin-round">
                  <path d="M3 12h18M3 12l4-4m-4 4 4 4" />
                </svg>
              ),
            },
            {
              label: "Country Intel",
              desc: "Visa maps & safety scores",
              sub: "Visa Intelligence",
              href: "/visa-intel",
              icon: (
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[#00ff88] fill-none stroke-[1.5] stroke-linecap-round stroke-linejoin-round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 3a14.5 14.5 0 010 18M3 12h18" />
                </svg>
              ),
            },
            {
              label: "Team Dashboard",
              desc: "Group routes & analytics",
              sub: "Travel Groups",
              href: "/groups",
              icon: (
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[#00ff88] fill-none stroke-[1.5] stroke-linecap-round stroke-linejoin-round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
              ),
            },
          ].map((card) => (
            <button
              key={card.href}
              onClick={() => navigate("/login")}
              className="group text-left bg-white/[0.03] border border-white/[0.08] hover:border-[#00ff88]/30 hover:bg-[#00ff88]/[0.04] rounded-xl p-4 transition-all duration-200"
            >
              <div className="w-8 h-8 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center mb-3">
                {card.icon}
              </div>
              <p className="text-[10px] uppercase tracking-[0.1em] text-[#00ff88] mb-1">{card.sub}</p>
              <p className="text-sm font-semibold text-white mb-1">{card.label}</p>
              <p className="text-xs text-white/30 leading-relaxed">{card.desc}</p>
            </button>
          ))}
        </motion.div>
      </div>

      {/* STATS */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0.5}
        className="relative z-10 flex border-t border-white/[0.06] bg-[#050a0f]/60 backdrop-blur-sm"
      >
        {[
          { num: "320", label: "Active Nodes" },
          { num: "150", label: "Countries" },
          { num: "7", label: "Regions" },
          { num: "168", label: "Routes Today" },
        ].map((s, i) => (
          <div
            key={i}
            className="flex-1 text-center py-4 border-r border-white/[0.06] last:border-r-0"
          >
            <p className="text-xl font-bold text-[#00ff88] tracking-tight">{s.num}</p>
            <p className="text-[10px] uppercase tracking-[0.1em] text-white/30 mt-0.5">{s.label}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
