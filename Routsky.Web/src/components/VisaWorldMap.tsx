import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import { getGlobalVisaMap } from '../api/routskyApi';
import { useAuth } from '../context/AuthContext';
import type { GlobalVisaCountryStatus, VisaMapStatus } from '../types';

const GEOJSON_URL =
  'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';

const STATUS_COLORS: Record<VisaMapStatus, string> = {
  VisaFree: '#00E676',
  EVisaOrOnArrival: '#FFEA00',
  ConditionalOrTimeLimited: '#FF9100',
  VisaRequired: '#FF1744',
  BannedOrRefused: '#111111',
  Unknown: '#424242',
};

const STATUS_LABELS: Record<VisaMapStatus, string> = {
  VisaFree: 'Visa-Free',
  EVisaOrOnArrival: 'e-Visa / Visa on Arrival',
  ConditionalOrTimeLimited: 'Time-limited / Conditional',
  VisaRequired: 'Visa Required',
  BannedOrRefused: 'Banned / Entry Refused',
  Unknown: 'Unknown',
};

type CountryFeature = Feature<Geometry, GeoJsonProperties>;

interface TooltipState {
  x: number;
  y: number;
  countryName: string;
  status: VisaMapStatus;
  rawRuleName?: string;
}

export function VisaWorldMap() {
  const { user } = useAuth();
  const passportCode = (user?.passports?.[0] ?? 'TR').toUpperCase();

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1000, height: 520 });
  const [worldFeatures, setWorldFeatures] = useState<CountryFeature[]>([]);
  const [visaMap, setVisaMap] = useState<Record<string, GlobalVisaCountryStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const width = Math.max(720, Math.floor(entries[0].contentRect.width));
      const height = Math.max(420, Math.floor(width * 0.52));
      setSize({ width, height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    const loadGeo = async () => {
      try {
        const response = await fetch(GEOJSON_URL);
        if (!response.ok) throw new Error('Could not load world map data.');
        const geo = (await response.json()) as FeatureCollection<Geometry, GeoJsonProperties>;
        if (active) setWorldFeatures(geo.features);
      } catch {
        if (active) setError('Failed to load world geometry data.');
      }
    };
    loadGeo();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadVisaData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getGlobalVisaMap(passportCode);
        if (active) setVisaMap(response.countries ?? {});
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.message ?? 'Failed to load visa intelligence map.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadVisaData();
    return () => {
      active = false;
    };
  }, [passportCode]);

  const projection = useMemo(
    () =>
      geoNaturalEarth1()
        .translate([size.width / 2, size.height / 2])
        .scale(size.width / 6.2),
    [size.height, size.width],
  );
  const path = useMemo(() => geoPath(projection), [projection]);

  const getCountryCode = (feature: CountryFeature) =>
    String(feature.properties?.['ISO3166-1-Alpha-2'] ?? '').toUpperCase();

  const getVisaStatus = (feature: CountryFeature): GlobalVisaCountryStatus => {
    const code = getCountryCode(feature);
    return visaMap[code] ?? { status: 'Unknown', source: 'default' };
  };

  const handleMouseMove = (event: ReactMouseEvent<SVGPathElement>, feature: CountryFeature) => {
    const status = getVisaStatus(feature);
    const countryName = String(feature.properties?.name ?? 'Unknown Country');
    setTooltip({
      x: event.clientX + 14,
      y: event.clientY + 14,
      countryName,
      status: status.status,
      rawRuleName: status.rawRuleName,
    });
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl border border-slate-800/80 bg-[#0a1628] p-4 shadow-2xl"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black tracking-wide text-white">Visa Intel 2D</h3>
          <p className="text-[11px] text-gray-400">
            Passport: <span className="font-semibold text-blue-300">{passportCode}</span>
          </p>
        </div>
        {loading && <span className="text-[11px] text-blue-300">Loading visa map...</span>}
      </div>

      {error && <div className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}

      <svg viewBox={`0 0 ${size.width} ${size.height}`} className="h-auto w-full rounded-xl bg-[#071124]">
        <g>
          {worldFeatures.map(feature => {
            const status = getVisaStatus(feature);
            return (
              <path
                key={String(feature.id ?? `${feature.properties?.name}`)}
                d={path(feature) ?? ''}
                fill={STATUS_COLORS[status.status]}
                stroke="#0f172a"
                strokeWidth={0.35}
                onMouseMove={event => handleMouseMove(event, feature)}
                onMouseLeave={() => setTooltip(null)}
                style={{ transition: 'fill 160ms ease', cursor: 'pointer' }}
              />
            );
          })}
        </g>
      </svg>

      {tooltip && (
        <div
          className="pointer-events-none fixed z-[1100] min-w-[180px] rounded-lg border border-slate-700 bg-[#050a18]/95 px-3 py-2 text-xs text-white shadow-2xl backdrop-blur"
          style={{ top: tooltip.y, left: tooltip.x }}
        >
          <div className="font-bold">{tooltip.countryName}</div>
          <div className="text-gray-300">{STATUS_LABELS[tooltip.status]}</div>
          {tooltip.rawRuleName && <div className="mt-1 text-[11px] text-gray-400">{tooltip.rawRuleName}</div>}
        </div>
      )}

      {/* Visa Legend */}
      <div className="mt-5 rounded-xl border border-slate-700/60 bg-[#071124]/80 p-3">
        <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
          Visa Legend
        </h4>
        <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3 lg:grid-cols-6">
          {(Object.keys(STATUS_COLORS) as VisaMapStatus[]).map(status => (
            <div
              key={status}
              className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors"
              style={{ borderColor: `${STATUS_COLORS[status]}40`, backgroundColor: `${STATUS_COLORS[status]}08` }}
            >
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-full shadow-sm"
                style={{ backgroundColor: STATUS_COLORS[status], boxShadow: `0 0 6px ${STATUS_COLORS[status]}60` }}
              />
              <span className="text-gray-200 font-medium leading-tight">{STATUS_LABELS[status]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
