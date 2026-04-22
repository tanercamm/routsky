import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import type { GlobalVisaCountryStatus, VisaMapStatus } from '../types';

/**
 * Low-res Natural Earth (Admin 0) GeoJSON.
 * ~300 KB, cached by the CDN, has both ISO alpha-2 and alpha-3 in properties.
 * Properties of interest: ISO_A2_EH, ISO_A2, ISO_A3_EH, ISO_A3, NAME, ADMIN.
 */
const GEOJSON_URL =
  'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson';

const STATUS_COLORS: Record<VisaMapStatus, string> = {
  VisaFree: '#00E676',
  EVisaOrOnArrival: '#FFEA00',
  ConditionalOrTimeLimited: '#FF9100',
  VisaRequired: '#FF1744',
  BannedOrRefused: '#111111',
  Unknown: '#2E3A52',
};

/** Distinct color applied to the active passport's home country. */
const HOME_FILL = '#38BDF8';

const STATUS_LABELS: Record<VisaMapStatus, string> = {
  VisaFree: 'Visa-Free',
  EVisaOrOnArrival: 'e-Visa / On Arrival',
  ConditionalOrTimeLimited: 'Conditional',
  VisaRequired: 'Visa Required',
  BannedOrRefused: 'Banned / Refused',
  Unknown: 'Unknown',
};

type CountryFeature = Feature<Geometry, GeoJsonProperties>;

interface TooltipState {
  x: number;
  y: number;
  countryName: string;
  status: VisaMapStatus;
}

/** Minimal alpha-3 → alpha-2 fallback for countries where Natural Earth's ISO_A2 is missing/"-99". */
const ISO_A3_TO_A2_FALLBACK: Record<string, string> = {
  FRA: 'FR',
  NOR: 'NO',
  KOS: 'XK',
  SOL: 'SO',
  CYN: 'CY',
  SAH: 'EH',
};

/** Extract an uppercase ISO alpha-2 code from a GeoJSON feature, trying every known property shape. */
function getCountryCode(feature: CountryFeature): string {
  const p = (feature.properties ?? {}) as Record<string, unknown>;

  const directA2 = [
    p.ISO_A2_EH,
    p.ISO_A2,
    p.iso_a2,
    p.iso_a2_eh,
    p['ISO3166-1-Alpha-2'],
  ];
  for (const v of directA2) {
    if (typeof v === 'string') {
      const code = v.trim().toUpperCase();
      if (code.length === 2 && code !== '-9' && code !== '-99' && code !== 'NA') {
        return code;
      }
    }
  }

  const directA3 = [p.ISO_A3_EH, p.ISO_A3, p.iso_a3, p.iso_a3_eh, p['ISO3166-1-Alpha-3']];
  for (const v of directA3) {
    if (typeof v === 'string') {
      const code = v.trim().toUpperCase();
      if (code.length === 3 && code !== '-99' && ISO_A3_TO_A2_FALLBACK[code]) {
        return ISO_A3_TO_A2_FALLBACK[code];
      }
    }
  }
  return '';
}

function getCountryName(feature: CountryFeature): string {
  const p = (feature.properties ?? {}) as Record<string, unknown>;
  const candidates = [p.NAME, p.NAME_LONG, p.ADMIN, p.name, p.admin];
  for (const v of candidates) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return 'Unknown';
}

/* ─── Re-export helpers for the page-level sidebar ─── */
export { STATUS_COLORS, STATUS_LABELS, HOME_FILL };
export type { CountryFeature };
export { getCountryCode };

/* ─── Props accepted from the parent page ─── */
export interface VisaWorldMapProps {
  passportCode: string;
  visaMap: Record<string, GlobalVisaCountryStatus>;
  loading: boolean;
  geoLoading: boolean;
  worldFeatures: CountryFeature[];
  setWorldFeatures: (features: CountryFeature[]) => void;
  setGeoLoading: (v: boolean) => void;
  setError: (msg: string | null) => void;
  reloadKey: number;
}

/**
 * Fixed SVG coordinate space.
 * 960×490 closely matches the Natural Earth projection's natural ~2:1
 * aspect ratio, eliminating horizontal pillarboxing.
 */
const SVG_W = 960;
const SVG_H = 490;

/** Inset the viewBox to crop the transparent margins the projection leaves. */
const VB_INSET = 15;
const VB_X = VB_INSET;
const VB_Y = 5;
const VB_W = SVG_W - VB_INSET * 2;
const VB_H = SVG_H - 10;

export function VisaWorldMap({
  passportCode,
  visaMap,
  loading,
  geoLoading,
  worldFeatures,
  setWorldFeatures,
  setGeoLoading,
  setError,
  reloadKey,
}: VisaWorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  // ── Load GeoJSON (re-runnable via reloadKey) ──
  useEffect(() => {
    let active = true;
    const load = async () => {
      setGeoLoading(true);
      try {
        const response = await fetch(GEOJSON_URL);
        if (!response.ok) throw new Error(`GeoJSON HTTP ${response.status}`);
        const geo = (await response.json()) as FeatureCollection<Geometry, GeoJsonProperties>;
        if (!active) return;
        if (!geo || !Array.isArray(geo.features) || geo.features.length === 0) {
          throw new Error('GeoJSON is empty or malformed');
        }
        setWorldFeatures(geo.features);
      } catch (err) {
        console.error('[VisaWorldMap] Failed to load world GeoJSON', err);
        if (active) setError('Failed to load world map geometry.');
      } finally {
        if (active) setGeoLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [reloadKey, setGeoLoading, setWorldFeatures, setError]);

  // ── Projection: aggressive fill of the 800×450 viewBox ──
  const projection = useMemo(() => {
    const proj = geoNaturalEarth1();
    if (worldFeatures.length > 0) {
      const fc: FeatureCollection = { type: 'FeatureCollection', features: worldFeatures };
      // fitSize computes the perfect scale+translate so the world fills the box
      proj.fitSize([SVG_W, SVG_H], fc);
    } else {
      proj.scale(155).translate([SVG_W / 2, SVG_H / 2]);
    }
    return proj;
  }, [worldFeatures]);
  const path = useMemo(() => geoPath(projection), [projection]);

  // ── D3 Zoom & Pan ──
  useEffect(() => {
    const svg = svgRef.current;
    const g = gRef.current;
    if (!svg || !g) return;

    const svgSel = select(svg);

    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .translateExtent([[-VB_INSET, -VB_Y], [SVG_W + VB_INSET, SVG_H + VB_Y]])
      .on('start', () => setIsPanning(true))
      .on('zoom', (event) => {
        const { x, y, k } = event.transform;
        select(g).attr('transform', `translate(${x},${y}) scale(${k})`);
      })
      .on('end', () => setIsPanning(false));

    svgSel.call(zoomBehavior);

    // Reset to identity on mount
    svgSel.call(zoomBehavior.transform, zoomIdentity);

    return () => {
      svgSel.on('.zoom', null);
    };
  }, [worldFeatures]); // re-attach when features load

  const statusForFeature = useCallback(
    (feature: CountryFeature): VisaMapStatus => {
      const code = getCountryCode(feature);
      if (!code) return 'Unknown';
      return visaMap[code]?.status ?? 'Unknown';
    },
    [visaMap],
  );

  // Sort so the home-country feature renders LAST (glow sits on top of neighbours).
  const orderedFeatures = useMemo(() => {
    if (!worldFeatures.length) return worldFeatures;
    const home: CountryFeature[] = [];
    const rest: CountryFeature[] = [];
    for (const f of worldFeatures) {
      if (getCountryCode(f) === passportCode) home.push(f);
      else rest.push(f);
    }
    return [...rest, ...home];
  }, [worldFeatures, passportCode]);

  // ── Diagnostics: how many GeoJSON features actually matched a visa entry? ──
  useEffect(() => {
    if (geoLoading || loading) return;
    if (!worldFeatures.length) return;
    const visaKeys = Object.keys(visaMap);
    if (visaKeys.length === 0) {
      console.warn(
        `[VisaWorldMap] Visa map is EMPTY for passport ${passportCode}. ` +
          `Likely the RapidAPI key is missing on the server (TRAVELBUDDY_RAPIDAPI_KEY).`,
      );
      return;
    }
    let matched = 0;
    for (const f of worldFeatures) {
      const code = getCountryCode(f);
      if (code && visaMap[code]) matched += 1;
    }
    console.info(
      `[VisaWorldMap] matched ${matched} / ${worldFeatures.length} features for passport ${passportCode} ` +
        `(${visaKeys.length} countries classified).`,
    );
  }, [geoLoading, loading, worldFeatures, visaMap, passportCode]);

  const handleMouseMove = (event: ReactMouseEvent<SVGPathElement>, feature: CountryFeature) => {
    setTooltip({
      x: event.clientX + 14,
      y: event.clientY + 14,
      countryName: getCountryName(feature),
      status: statusForFeature(feature),
    });
  };

  const busy = geoLoading || loading;

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-[#071124] shadow-2xl ${
        isPanning ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0"
      >
        <defs>
          <filter id="home-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="#071124" />

        {/* All map paths go inside this <g> — d3-zoom transforms this group */}
        <g ref={gRef}>
          {orderedFeatures.map(feature => {
            const d = path(feature);
            if (!d) return null;
            const code = getCountryCode(feature);
            const isHome = !!passportCode && code === passportCode;
            const status = statusForFeature(feature);
            const fill = isHome ? HOME_FILL : STATUS_COLORS[status];
            return (
              <path
                key={String(feature.id ?? code ?? getCountryName(feature))}
                d={d}
                fill={fill}
                stroke={isHome ? '#FFFFFF' : '#0f172a'}
                strokeWidth={isHome ? 1.4 : 0.4}
                filter={isHome ? 'url(#home-glow)' : undefined}
                onMouseMove={event => handleMouseMove(event, feature)}
                onMouseLeave={() => setTooltip(null)}
                style={{ transition: 'fill 160ms ease', cursor: 'pointer' }}
              />
            );
          })}
        </g>
      </svg>

      {/* In-map loading overlay — shown only when there's nothing to see yet */}
      {busy && worldFeatures.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#0a1628]/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#007AFF]/30 border-t-[#007AFF]" />
            <div className="text-sm font-semibold tracking-wide text-blue-200">
              Loading Visa Intelligence...
            </div>
            <div className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">
              {geoLoading ? 'Fetching world geometry' : `Passport ${passportCode}`}
            </div>
          </div>
        </div>
      )}

      {/* Tooltip: STRICTLY country name + visa status only. */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-[1100] min-w-[160px] rounded-lg border border-slate-700 bg-[#050a18]/95 px-3 py-2 text-xs text-white shadow-2xl backdrop-blur"
          style={{ top: tooltip.y, left: tooltip.x }}
        >
          <div className="font-bold">{tooltip.countryName}</div>
          <div className="flex items-center gap-2 text-gray-300">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[tooltip.status] }}
            />
            {STATUS_LABELS[tooltip.status]}
          </div>
        </div>
      )}
    </div>
  );
}
