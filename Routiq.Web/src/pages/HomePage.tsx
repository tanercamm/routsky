import { useRef, useState, useEffect, useCallback, useMemo, memo, startTransition } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Shield, DollarSign, Calendar, X } from 'lucide-react';
import {
  SUPPORTED_CITIES,
  ALL_CITIES,
  formatBestMonths,
  getSafetyColor,
  getSafetyLabel,
  type CityPoint,
} from '../data/globeData';

const GLOBE_IMAGE = '//unpkg.com/three-globe/example/img/earth-night.jpg';
const BUMP_IMAGE = '//unpkg.com/three-globe/example/img/earth-topology.png';

type ZoomTier = 'far' | 'mid' | 'close';

const HUB_CITIES = [
  { lat: 41.0082, lng: 28.9784 },
  { lat: 25.2048, lng: 55.2708 },
  { lat: 1.3521, lng: 103.8198 },
  { lat: 51.5074, lng: -0.1278 },
];

const STATIC_ARCS = (() => {
  const tier1 = SUPPORTED_CITIES.filter(c => c.tier === 1);
  const arcs: { startLat: number; startLng: number; endLat: number; endLng: number; color: string[] }[] = [];
  const seen = new Set<string>();
  for (const hub of HUB_CITIES) {
    const sorted = tier1
      .filter(c => Math.abs(c.lat - hub.lat) + Math.abs(c.lng - hub.lng) > 5)
      .sort((a, b) => (Math.abs(a.lat - hub.lat) + Math.abs(a.lng - hub.lng)) - (Math.abs(b.lat - hub.lat) + Math.abs(b.lng - hub.lng)))
      .slice(0, 8);
    for (const dest of sorted) {
      const key = `${hub.lat},${hub.lng},${dest.lat},${dest.lng}`;
      if (!seen.has(key)) {
        seen.add(key);
        arcs.push({ startLat: hub.lat, startLng: hub.lng, endLat: dest.lat, endLng: dest.lng, color: ['rgba(94, 173, 184, 0.2)', 'rgba(100, 120, 160, 0.06)'] });
      }
    }
  }
  return arcs.slice(0, 30);
})();

const STATIC_RINGS = SUPPORTED_CITIES
  .filter(c => c.tier === 1)
  .map(c => ({ ...c, maxR: 2.5, propagationSpeed: 1.5, repeatPeriod: 1800 }));

const getPointColor = (d: object) => (d as CityPoint).isSupported ? '#5eadb8' : 'rgba(100, 130, 170, 0.3)';
const getPointRadius = (d: object) => (d as CityPoint).isSupported ? 0.45 : 0.18;
const getLabelColor = () => 'rgba(160, 170, 190, 0.18)';
const getRingColor = () => (t: number) => `rgba(94, 173, 184, ${(1 - t) * 0.7})`;

interface GlobeSceneProps {
  width: number;
  height: number;
  labelsData: CityPoint[];
  onPointClick: (point: object | null) => void;
  globeRef: React.MutableRefObject<GlobeMethods | undefined>;
}

const GlobeScene = memo(function GlobeScene({ width, height, labelsData, onPointClick, globeRef }: GlobeSceneProps) {
  return (
    <Globe
      ref={globeRef}
      width={width}
      height={height}
      globeImageUrl={GLOBE_IMAGE}
      bumpImageUrl={BUMP_IMAGE}
      backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
      atmosphereColor="#4a7a9b"
      atmosphereAltitude={0.16}

      pointsData={ALL_CITIES}
      pointLat="lat"
      pointLng="lng"
      pointColor={getPointColor}
      pointAltitude={0.01}
      pointRadius={getPointRadius}
      pointsMerge={true}
      onPointClick={onPointClick}

      labelsData={labelsData}
      labelLat="lat"
      labelLng="lng"
      labelText="name"
      labelSize={0.4}
      labelDotRadius={0.15}
      labelColor={getLabelColor}
      labelResolution={2}
      labelAltitude={0.005}

      ringsData={STATIC_RINGS}
      ringLat="lat"
      ringLng="lng"
      ringColor={getRingColor}
      ringMaxRadius="maxR"
      ringPropagationSpeed="propagationSpeed"
      ringRepeatPeriod="repeatPeriod"

      arcsData={STATIC_ARCS}
      arcStartLat="startLat"
      arcStartLng="startLng"
      arcEndLat="endLat"
      arcEndLng="endLng"
      arcColor="color"
      arcDashLength={0.4}
      arcDashGap={0.2}
      arcDashAnimateTime={4500}
      arcStroke={0.25}

      animateIn={true}
    />
  );
});

export function HomePage() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const navigate = useNavigate();
  const [selected, setSelected] = useState<CityPoint | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomTier, setZoomTier] = useState<ZoomTier>('far');
  const zoomTierRef = useRef<ZoomTier>('far');

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    update();
    let timer: ReturnType<typeof setTimeout>;
    const debouncedUpdate = () => {
      clearTimeout(timer);
      timer = setTimeout(update, 200);
    };
    window.addEventListener('resize', debouncedUpdate);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', debouncedUpdate);
    };
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4;
      controls.enableZoom = true;
      controls.minDistance = 180;
      controls.maxDistance = 600;

      let rafId = 0;
      const handleChange = () => {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          const cam = globeRef.current?.camera();
          if (!cam) return;
          const dist = cam.position.length();
          let tier: ZoomTier = 'far';
          if (dist < 280) tier = 'close';
          else if (dist < 420) tier = 'mid';
          if (tier !== zoomTierRef.current) {
            zoomTierRef.current = tier;
            setZoomTier(tier);
          }
        });
      };
      controls.addEventListener('change', handleChange);
      return () => {
        cancelAnimationFrame(rafId);
        controls.removeEventListener('change', handleChange);
      };
    }
    globeRef.current.pointOfView({ lat: 35, lng: 30, altitude: 2.2 }, 0);
  }, [dimensions]);

  const handlePointClick = useCallback((point: object | null) => {
    if (!point) return;
    const city = point as CityPoint;
    const controls = globeRef.current?.controls();
    if (controls) controls.autoRotate = false;

    // Fix: Defer state update to avoid blocking Three.js raycasting cycle
    setTimeout(() => {
      startTransition(() => {
        setSelected(city);
      });
    }, 0);
  }, []);

  const handleDismiss = useCallback(() => {
    setSelected(null);
    const controls = globeRef.current?.controls();
    if (controls) controls.autoRotate = true;
  }, []);

  const visibleLabels = useMemo(() => {
    if (zoomTier === 'far') return ALL_CITIES.filter(c => c.tier === 1);
    if (zoomTier === 'mid') return ALL_CITIES.filter(c => c.tier === 1 || c.tier === 2);
    return ALL_CITIES;
  }, [zoomTier]);

  return (
    <div ref={containerRef} className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#050a18]">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[700px] h-[700px] rounded-full bg-slate-500/[0.015]" />
      </div>

      <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.02]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.04) 2px, rgba(255,255,255,0.04) 4px)' }}
      />

      <div className="absolute inset-0 pointer-events-none z-[1] bg-[#050a18]/40" />

      {dimensions.width > 0 && (
        <GlobeScene
          globeRef={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          labelsData={visibleLabels}
          onPointClick={handlePointClick}
        />
      )}

      {/* Top-left HUD */}
      <div className="absolute top-6 left-6 z-20 pointer-events-none">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-teal-500/70 animate-pulse" />
            <span className="text-[10px] font-bold tracking-[0.25em] text-slate-400 uppercase">
              Navisio Mission Control
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
            Global Route
            <br />
            <span className="bg-gradient-to-r from-teal-400/80 to-slate-400 bg-clip-text text-transparent">
              Intelligence
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-3 max-w-xs leading-relaxed">
            Real-time agentic route analysis across {ALL_CITIES.length} global nodes.
            Click any node for live intel.
          </p>
        </motion.div>
      </div>

      {/* Bottom-left stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="absolute bottom-6 left-6 z-20 pointer-events-none"
      >
        <div className="flex gap-4">
          {[
            { label: 'ACTIVE NODES', value: ALL_CITIES.length.toString(), color: 'text-teal-500/60' },
            { label: 'COUNTRIES', value: new Set(ALL_CITIES.map(c => c.country)).size.toString(), color: 'text-slate-500' },
            { label: 'REGIONS', value: '7', color: 'text-gray-500' },
          ].map(s => (
            <div key={s.label} className="border border-slate-800/80 bg-[#0a1628] rounded-lg px-4 py-2.5">
              <div className={`text-xl font-black ${s.color} tabular-nums`}>{s.value}</div>
              <div className="text-[9px] font-bold tracking-[0.2em] text-gray-600 uppercase">{s.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Top-right network status — matte flat panel */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        className="absolute top-6 right-6 z-20 pointer-events-none"
      >
        <div className="border border-slate-800/80 bg-[#0a1628] rounded-lg px-4 py-3 min-w-[180px]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
            <span className="text-[10px] font-bold tracking-[0.2em] text-green-500/50 uppercase">System Online</span>
          </div>
          <div className="space-y-1">
            {['Visa Engine', 'Cost Analyzer', 'Flight Scanner', 'Safety Monitor'].map((s, i) => (
              <div key={s} className="flex items-center justify-between">
                <span className="text-[10px] text-gray-600">{s}</span>
                <span className={`text-[10px] font-bold ${i < 3 ? 'text-green-600/50' : 'text-slate-500'}`}>
                  {i < 3 ? 'READY' : 'ACTIVE'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Center CTA — matte flat NASA-style button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, type: 'spring', stiffness: 100 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
      >
        <button
          onClick={() => navigate('/find-route')}
          className="group relative cursor-pointer"
        >
          <div className="relative flex items-center gap-3 bg-[#0c1424] border border-slate-700/60 group-hover:border-slate-600/80 rounded-xl px-8 py-4 transition-colors duration-200">
            <Zap size={20} className="text-slate-500 group-hover:text-slate-400" />
            <div className="text-left">
              <div className="text-sm font-black text-gray-200 tracking-wide group-hover:text-white transition-colors">
                Initialize Agentic Search
              </div>
              <div className="text-[10px] text-gray-600 tracking-wider uppercase">
                Launch Decision Engine
              </div>
            </div>
            <div className="ml-2 w-px h-8 bg-slate-800" />
            <div className="text-slate-500 group-hover:translate-x-1 transition-transform">→</div>
          </div>
        </button>
      </motion.div>

      {/* Mobile bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#050a18] to-transparent pointer-events-none z-10 sm:hidden" />

      {/* Intelligence Card — portal so Three.js canvas keeps running */}
      {createPortal(
        <AnimatePresence>
          {selected && (
            <motion.div
              key={selected.name}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="fixed bottom-6 right-6 z-[9999] w-[320px]"
            >
              <div className="bg-[#0c1a30]/95 border border-slate-700/60 backdrop-blur-xl rounded-xl p-4">
                {/* Header + Close */}
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-teal-400/70 animate-pulse shrink-0" />
                      <h3 className="text-sm font-black text-white tracking-tight truncate">{selected.name}</h3>
                      {selected.isSupported && (
                        <span className="text-[9px] font-black tracking-widest bg-teal-500/15 text-teal-300/80 px-2 py-0.5 rounded-md border border-teal-500/20 uppercase shrink-0">
                          Live
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 ml-4 uppercase tracking-wider">{selected.country}</p>
                  </div>
                  <button
                    onClick={handleDismiss}
                    className="p-1 -m-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors shrink-0 ml-2"
                    aria-label="Close intelligence card"
                  >
                    <X size={16} />
                  </button>
                </div>

                {selected.isSupported ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Shield size={13} className="text-gray-500" />
                        <span className="text-[11px] text-gray-400">Safety</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-16 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${selected.safetyIndex}%`,
                              backgroundColor: getSafetyColor(selected.safetyIndex),
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-bold" style={{ color: getSafetyColor(selected.safetyIndex) }}>
                          {getSafetyLabel(selected.safetyIndex)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <DollarSign size={13} className="text-gray-500" />
                        <span className="text-[11px] text-gray-400">Avg Meal</span>
                      </div>
                      <span className="text-[11px] font-bold text-green-400">${selected.avgMealCost}</span>
                    </div>

                    <div className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-gray-500" />
                        <span className="text-[11px] text-gray-400">Best Months</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-400">{formatBestMonths(selected.bestMonths)}</span>
                    </div>

                    <div className="pt-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Cost of Living Index</span>
                        <span className="text-[11px] font-bold text-gray-300">{selected.costOfLivingIndex}/120</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full transition-all"
                          style={{ width: `${Math.min((selected.costOfLivingIndex || 0) / 1.2, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-[11px] text-gray-500">Capital city — not yet in Navisio network</p>
                    <p className="text-[10px] text-gray-600 mt-1">Coming soon to Mission Control</p>
                  </div>
                )}

                <div className="mt-3 pt-2 border-t border-white/[0.05]">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-gray-600 tracking-wider">
                      {selected.lat.toFixed(2)}°{selected.lat >= 0 ? 'N' : 'S'}, {Math.abs(selected.lng).toFixed(2)}°{selected.lng >= 0 ? 'E' : 'W'}
                    </span>
                    <span className="text-[9px] text-teal-500/40 tracking-wider uppercase">Navisio Intel</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
