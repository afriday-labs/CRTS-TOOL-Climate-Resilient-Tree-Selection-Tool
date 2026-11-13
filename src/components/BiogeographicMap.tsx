import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Layers, Loader2, LocateFixed, MapPin, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { feature } from 'topojson-client';
import countries50m from 'world-atlas/countries-50m.json';
import type { EvaluatedSpecies } from '../data/treeSpecies';
import {
  fetchGbifDistribution,
  getCachedGbifDistribution,
  type GbifOccurrencePoint,
  type GbifSpeciesResult,
} from '../utils/openApis';
import { StatusIndicator } from './StatusIndicator';

export interface GbifMapOverlay {
  taxonKey?: number;
  speciesName: string;
  totalOccurrences: number;
  ukOccurrences?: number;
  points: GbifOccurrencePoint[];
}

interface BiogeographicMapProps {
  speciesList: EvaluatedSpecies[];
  siteLocation: { label: string; lat: number; lng: number } | null;
  selectedSpeciesId: string | null;
  onSelectSpecies: (id: string) => void;
  gbifOverlay?: GbifMapOverlay | null;
  onSetGbifOverlay?: (result: GbifSpeciesResult) => void;
  onClearGbifOverlay?: () => void;
}

type MapRegion = 'uk' | 'europe' | 'global' | 'north-america' | 'east-asia';
type BasemapId = 'osm' | 'opentopo' | 'vector';
type GbifTileStyle = 'fire.point' | 'purpleYellow.point' | 'greenHeat.point';

const REGION_BOUNDS: Record<
  MapRegion,
  { label: string; center: [number, number]; zoom: number }
> = {
  uk: { label: 'UK & Ireland', center: [54.4, -2.8], zoom: 6 },
  europe: { label: 'Europe & Med', center: [47.8, 9.5], zoom: 4 },
  global: { label: 'Global', center: [28.0, 8.0], zoom: 2 },
  'north-america': { label: 'North America', center: [39.5, -93.0], zoom: 4 },
  'east-asia': { label: 'East Asia', center: [34.5, 118.0], zoom: 4 },
};

const BASEMAP_OPTIONS: Array<{
  id: BasemapId;
  label: string;
  url?: string;
  attribution: string;
  maxZoom: number;
}> = [
  {
    id: 'osm',
    label: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors (ODbL)',
    maxZoom: 19,
  },
  {
    id: 'opentopo',
    label: 'OpenTopoMap',
    url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; OpenStreetMap, SRTM | Style: OpenTopoMap (CC-BY-SA)',
    maxZoom: 17,
  },
  {
    id: 'vector',
    label: 'Natural Earth Vector',
    attribution: 'Natural Earth 1:50m (Public Domain · Offline)',
    maxZoom: 18,
  },
];

let cachedWorldGeoJson: ReturnType<typeof feature> | null = null;
function getWorldGeoJson() {
  if (!cachedWorldGeoJson) {
    const topo = countries50m as unknown as Parameters<typeof feature>[0] & {
      objects: { countries: Parameters<typeof feature>[1] };
    };
    cachedWorldGeoJson = feature(topo, topo.objects.countries);
  }
  return cachedWorldGeoJson;
}

export function BiogeographicMap({
  speciesList,
  siteLocation,
  selectedSpeciesId,
  onSelectSpecies,
  gbifOverlay,
  onSetGbifOverlay,
  onClearGbifOverlay,
}: BiogeographicMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const basemapLayerRef = useRef<L.Layer | null>(null);
  const gbifTileLayerRef = useRef<L.TileLayer | null>(null);
  const gbifPointsLayerRef = useRef<L.LayerGroup | null>(null);
  const centroidsLayerRef = useRef<L.LayerGroup | null>(null);
  const siteLayerRef = useRef<L.LayerGroup | null>(null);

  const [region, setRegion] = useState<MapRegion>('uk');
  const [basemap, setBasemap] = useState<BasemapId>('osm');
  const [grayscaleMap, setGrayscaleMap] = useState(true);
  const [gbifTileStyle, setGbifTileStyle] = useState<GbifTileStyle>('fire.point');
  const [showCentroids, setShowCentroids] = useState(true);
  const [showGbifDensity, setShowGbifDensity] = useState(true);
  const [showIndividualTrees, setShowIndividualTrees] = useState(true);
  const [hoveredSpecies, setHoveredSpecies] = useState<EvaluatedSpecies | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<GbifOccurrencePoint | null>(null);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingTaxon, setLoadingTaxon] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const selectedSpecies = useMemo(
    () => speciesList.find((s) => s.id === selectedSpeciesId) ?? null,
    [speciesList, selectedSpeciesId]
  );

  // Initialize Leaflet map instance once (100% open-source, no API key required)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initial = REGION_BOUNDS.uk;
    const map = L.map(mapContainerRef.current, {
      center: initial.center,
      zoom: initial.zoom,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      worldCopyJump: true,
    });

    // Dedicated full-color pane above basemap tile-pane so grayscale only affects basemap
    const gbifPane = map.createPane('gbifDensityPane');
    gbifPane.style.zIndex = '250';
    gbifPane.style.pointerEvents = 'none';

    const pointsGroup = L.layerGroup().addTo(map);
    const centroidsGroup = L.layerGroup().addTo(map);
    const siteGroup = L.layerGroup().addTo(map);

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCursorCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    map.on('mouseout', () => {
      setCursorCoords(null);
    });

    mapRef.current = map;
    gbifPointsLayerRef.current = pointsGroup;
    centroidsLayerRef.current = centroidsGroup;
    siteLayerRef.current = siteGroup;

    return () => {
      map.remove();
      mapRef.current = null;
      basemapLayerRef.current = null;
      gbifTileLayerRef.current = null;
      gbifPointsLayerRef.current = null;
      centroidsLayerRef.current = null;
      siteLayerRef.current = null;
    };
  }, []);

  // Switch between OpenStreetMap, OpenTopoMap, and offline Natural Earth Vector
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (basemapLayerRef.current) {
      map.removeLayer(basemapLayerRef.current);
      basemapLayerRef.current = null;
    }

    const cfg = BASEMAP_OPTIONS.find((b) => b.id === basemap) ?? BASEMAP_OPTIONS[0];
    let nextLayer: L.Layer;

    if (cfg.id === 'vector') {
      const worldGeoJson = getWorldGeoJson();
      nextLayer = L.geoJSON(worldGeoJson as Parameters<typeof L.geoJSON>[0], {
        style: {
          color: '#8D9890',
          weight: 0.9,
          fillColor: '#F5F6F5',
          fillOpacity: 1,
        },
        interactive: false,
      });
      nextLayer.addTo(map);
      (nextLayer as L.GeoJSON).bringToBack();
    } else if (cfg.url) {
      const tileLayer = L.tileLayer(cfg.url, {
        attribution: cfg.attribution,
        maxZoom: cfg.maxZoom,
      });
      tileLayer.addTo(map);
      tileLayer.bringToBack();
      nextLayer = tileLayer;
    } else {
      return;
    }

    basemapLayerRef.current = nextLayer;
  }, [basemap]);

  // Auto-load live GBIF distribution when a species is selected
  useEffect(() => {
    if (!selectedSpecies || !onSetGbifOverlay) return;
    const targetNorm = selectedSpecies.speciesName.toLowerCase().replace(/×/g, 'x').trim();
    const currentNorm = gbifOverlay?.speciesName.toLowerCase().replace(/×/g, 'x').trim();
    if (currentNorm === targetNorm && gbifOverlay?.taxonKey) return;

    const cached = getCachedGbifDistribution(selectedSpecies.speciesName);
    if (cached) {
      onSetGbifOverlay(cached);
      return;
    }

    let cancelled = false;
    setLoadingTaxon(true);
    setMapError(null);

    fetchGbifDistribution(selectedSpecies.speciesName, 120)
      .then((res) => {
        if (!cancelled) onSetGbifOverlay(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setMapError(err instanceof Error ? err.message : 'Unable to load GBIF map layer.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTaxon(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSpecies?.speciesName]);

  // Render GBIF v2 live density tile layer (also free & open-source)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (gbifTileLayerRef.current) {
      map.removeLayer(gbifTileLayerRef.current);
      gbifTileLayerRef.current = null;
    }

    if (showGbifDensity && gbifOverlay?.taxonKey) {
      const gbifLayer = L.tileLayer(
        `https://api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}@2x.png?taxonKey=${gbifOverlay.taxonKey}&srs=EPSG:3857&style=${gbifTileStyle}`,
        {
          pane: 'gbifDensityPane',
          opacity: 0.9,
          maxZoom: 16,
          attribution: 'Occurrences &copy; GBIF.org',
        }
      );
      gbifLayer.addTo(map);
      gbifTileLayerRef.current = gbifLayer;
    }
  }, [showGbifDensity, gbifOverlay?.taxonKey, gbifTileStyle]);

  // Render individual GBIF dated occurrence markers
  useEffect(() => {
    const group = gbifPointsLayerRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showIndividualTrees || !gbifOverlay?.points.length) return;

    for (const pt of gbifOverlay.points) {
      const marker = L.circleMarker([pt.lat, pt.lng], {
        radius: 5,
        fillColor: '#0F766E',
        color: '#FFFFFF',
        weight: 1.2,
        opacity: 0.95,
        fillOpacity: 0.85,
      });

      const dateLabel = pt.eventDate || (pt.year ? String(pt.year) : 'Undated');
      const placeLabel =
        [pt.locality, pt.stateProvince, pt.country].filter(Boolean).join(', ') || 'Recorded site';
      const typeLabel = pt.basisOfRecord
        ? pt.basisOfRecord.replace(/_/g, ' ').toLowerCase()
        : 'observation';

      marker.bindPopup(
        `<div style="font-family: ui-sans-serif, system-ui; font-size: 12px; line-height: 1.45; min-width: 190px;">
          <div style="font-weight: 700; font-style: italic; color: #141A16;">${gbifOverlay.speciesName}</div>
          <div style="color: #0F766E; font-family: ui-monospace, monospace; font-size: 11px; margin-top: 2px;">GBIF #${pt.key} · ${dateLabel}</div>
          <div style="color: #3E4841; margin-top: 4px;">${placeLabel}</div>
          <div style="color: #5A655D; font-size: 11px; margin-top: 3px;">
            ${pt.lat.toFixed(4)}°, ${pt.lng.toFixed(4)}°${pt.elevation !== undefined ? ` · ${pt.elevation}m elev.` : ''}
          </div>
          <div style="color: #5A655D; font-size: 11px; text-transform: capitalize;">
            ${typeLabel}${pt.institutionCode ? ` (${pt.institutionCode})` : ''}
          </div>
          <a href="https://www.gbif.org/occurrence/${pt.key}" target="_blank" rel="noreferrer" style="display: inline-block; margin-top: 5px; color: #1B5E3F; font-weight: 600; text-decoration: none;">View on GBIF.org &rarr;</a>
        </div>`
      );

      marker.on('mouseover', () => setHoveredPoint(pt));
      marker.on('mouseout', () => setHoveredPoint(null));
      marker.addTo(group);
    }
  }, [showIndividualTrees, gbifOverlay]);

  // Render species native centroids
  useEffect(() => {
    const group = centroidsLayerRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showCentroids) return;

    for (const s of speciesList) {
      const isSelected = selectedSpeciesId === s.id;
      const color =
        s.status === 'Fully Resilient'
          ? '#166534'
          : s.status === 'Borderline'
          ? '#D97706'
          : '#DC2626';

      const marker = L.circleMarker([s.lat, s.lng], {
        radius: isSelected ? 8.5 : 6,
        fillColor: color,
        color: isSelected ? '#141A16' : '#FFFFFF',
        weight: isSelected ? 2.5 : 1.5,
        opacity: 1,
        fillOpacity: 0.92,
      });

      marker.bindTooltip(
        `<span style="font-style: italic; font-weight: 600;">${s.speciesName}</span> — ${s.status} (MAT ${s.effectiveMatC.toFixed(1)}°C)`,
        { direction: 'top', offset: [0, -6] }
      );

      marker.on('mouseover', () => setHoveredSpecies(s));
      marker.on('mouseout', () => setHoveredSpecies(null));
      marker.on('click', () => onSelectSpecies(s.id));
      marker.addTo(group);
    }
  }, [speciesList, selectedSpeciesId, showCentroids, onSelectSpecies]);

  // Render Target Site marker
  useEffect(() => {
    const group = siteLayerRef.current;
    if (!group) return;
    group.clearLayers();
    if (!siteLocation) return;

    const halo = L.circleMarker([siteLocation.lat, siteLocation.lng], {
      radius: 15,
      fillColor: '#1B5E3F',
      color: '#1B5E3F',
      weight: 1,
      opacity: 0.45,
      fillOpacity: 0.14,
    });

    const core = L.circleMarker([siteLocation.lat, siteLocation.lng], {
      radius: 6,
      fillColor: '#FFFFFF',
      color: '#1B5E3F',
      weight: 2.5,
      opacity: 1,
      fillOpacity: 1,
    }).bindTooltip(`SITE: ${siteLocation.label}`, {
      permanent: true,
      direction: 'right',
      offset: [10, 0],
    });

    halo.addTo(group);
    core.addTo(group);
  }, [siteLocation]);

  const handleFlyToRegion = (next: MapRegion) => {
    setRegion(next);
    const cfg = REGION_BOUNDS[next];
    mapRef.current?.flyTo(cfg.center, cfg.zoom, { duration: 0.7 });
  };

  const handleSpeciesDropdownChange = (id: string) => {
    if (!id) {
      onClearGbifOverlay?.();
      return;
    }
    onSelectSpecies(id);
  };

  return (
    <div className="bg-white border border-[#E2E7E2] rounded-lg p-5">
      {/* Header & Open-Source Basemap Switcher */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-3.5">
        <div>
          <h2 className="text-base font-semibold text-[#141A16]">
            Open-Source Distribution Map (No API Key Required)
          </h2>
          <p className="text-xs text-[#5A655D] mt-0.5">
            Powered by <span className="font-medium text-[#141A16]">Leaflet</span>,{' '}
            <span className="font-medium text-[#141A16]">OpenStreetMap</span>,{' '}
            <span className="font-medium text-[#141A16]">OpenTopoMap</span>, offline{' '}
            <span className="font-medium text-[#141A16]">Natural Earth</span> vectors, and live{' '}
            <span className="font-medium text-[#141A16]">api.gbif.org</span> occurrence layers around{' '}
            {siteLocation ? siteLocation.label : 'your target site'}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center bg-[#F2F4F2] p-1 rounded-md border border-[#E2E7E2]">
            {BASEMAP_OPTIONS.map((bOpt) => (
              <button
                key={bOpt.id}
                type="button"
                onClick={() => setBasemap(bOpt.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  basemap === bOpt.id
                    ? 'bg-white text-[#141A16] shadow-xs'
                    : 'text-[#5A655D] hover:text-[#141A16]'
                }`}
              >
                {bOpt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center border border-[#E2E7E2] rounded-md bg-white">
            <button
              type="button"
              onClick={() => mapRef.current?.zoomIn()}
              className="p-1.5 text-[#4A554E] hover:text-[#141A16] cursor-pointer"
              title="Zoom in"
              aria-label="Zoom in map"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => mapRef.current?.zoomOut()}
              className="p-1.5 text-[#4A554E] hover:text-[#141A16] border-l border-[#E2E7E2] cursor-pointer"
              title="Zoom out"
              aria-label="Zoom out map"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (siteLocation) {
                  mapRef.current?.flyTo([siteLocation.lat, siteLocation.lng], 6, { duration: 0.7 });
                } else {
                  handleFlyToRegion('uk');
                }
              }}
              className="p-1.5 text-[#4A554E] hover:text-[#141A16] border-l border-[#E2E7E2] cursor-pointer"
              title="Center on target site"
              aria-label="Center on target site"
            >
              <LocateFixed className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Region Presets + Live GBIF Species Layer Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-[#EAEFEA]">
        <div className="flex flex-wrap items-center gap-1.5 bg-[#F2F4F2] p-1 rounded-md border border-[#E2E7E2]">
          {(Object.keys(REGION_BOUNDS) as MapRegion[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleFlyToRegion(key)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                region === key
                  ? 'bg-white text-[#141A16] shadow-xs'
                  : 'text-[#5A655D] hover:text-[#141A16]'
              }`}
            >
              {REGION_BOUNDS[key].label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <label htmlFor="map-species-layer" className="text-[#5A655D] font-medium">
              GBIF Layer:
            </label>
            <select
              id="map-species-layer"
              value={selectedSpeciesId ?? ''}
              onChange={(e) => handleSpeciesDropdownChange(e.target.value)}
              className="px-2.5 py-1 text-xs italic bg-[#FAFBFA] border border-[#DCE2DD] rounded-md text-[#141A16] focus:outline-none focus:border-[#1B5E3F] max-w-[220px]"
            >
              <option value="">Select a species for GBIF range...</option>
              {[...speciesList]
                .sort((a, b) => a.speciesName.localeCompare(b.speciesName))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.speciesName}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[#3E4841]">
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={grayscaleMap}
                onChange={(e) => setGrayscaleMap(e.target.checked)}
                className="rounded border-[#C5D1C8] text-[#1B5E3F] focus:ring-[#1B5E3F]"
              />
              <span>Grayscale Map</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showCentroids}
                onChange={(e) => setShowCentroids(e.target.checked)}
                className="rounded border-[#C5D1C8] text-[#1B5E3F] focus:ring-[#1B5E3F]"
              />
              <span>Centroids</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showGbifDensity}
                onChange={(e) => setShowGbifDensity(e.target.checked)}
                className="rounded border-[#C5D1C8] text-[#1B5E3F] focus:ring-[#1B5E3F]"
              />
              <span>GBIF Density</span>
            </label>
            {showGbifDensity && (
              <select
                aria-label="GBIF range color style"
                value={gbifTileStyle}
                onChange={(e) => setGbifTileStyle(e.target.value as GbifTileStyle)}
                className="px-2 py-0.5 text-[11px] bg-[#FAFBFA] border border-[#DCE2DD] rounded text-[#141A16] focus:outline-none focus:border-[#1B5E3F]"
              >
                <option value="fire.point">Amber-Red Range</option>
                <option value="purpleYellow.point">Violet-Gold Range</option>
                <option value="greenHeat.point">Emerald Range</option>
              </select>
            )}
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showIndividualTrees}
                onChange={(e) => setShowIndividualTrees(e.target.checked)}
                className="rounded border-[#C5D1C8] text-[#1B5E3F] focus:ring-[#1B5E3F]"
              />
              <span>Sample Trees</span>
            </label>
          </div>
        </div>
      </div>

      {/* Active GBIF Layer Status Strip */}
      {(loadingTaxon || gbifOverlay || mapError) && (
        <div className="mb-3 px-3.5 py-2 bg-[#EEF5F0] border border-[#C6DBC9] rounded-md flex flex-wrap items-center justify-between gap-3 text-xs">
          {loadingTaxon ? (
            <div className="inline-flex items-center gap-2 text-[#14532D]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Loading live GBIF density tiles &amp; dated tree occurrences...</span>
            </div>
          ) : mapError ? (
            <div className="text-[#991B1B]">{mapError}</div>
          ) : gbifOverlay ? (
            <div className="text-[#141A16] flex flex-wrap items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[#1B5E3F]" aria-hidden="true" />
              <span>
                Live GBIF Range: <span className="font-semibold italic">{gbifOverlay.speciesName}</span>
              </span>
              <span className="text-[#7A8A7E]" aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {gbifOverlay.totalOccurrences.toLocaleString()} global records
                {gbifOverlay.ukOccurrences !== undefined
                  ? ` · ${gbifOverlay.ukOccurrences.toLocaleString()} UK sample facet`
                  : ''}
                {` · ${gbifOverlay.points.length} clickable tree markers`}
              </span>
            </div>
          ) : null}

          {gbifOverlay && onClearGbifOverlay && (
            <button
              type="button"
              onClick={onClearGbifOverlay}
              className="text-xs font-medium text-[#1B5E3F] hover:underline cursor-pointer"
            >
              Clear GBIF Layer
            </button>
          )}
        </div>
      )}

      {/* Map Viewport */}
      <div className="border border-[#E2E7E2] rounded-md overflow-hidden">
        <div
          ref={mapContainerRef}
          className={`w-full h-[490px] z-0 ${grayscaleMap ? 'sc-map-grayscale' : ''} ${
            basemap === 'vector'
              ? grayscaleMap
                ? 'bg-[#E2E5E7]'
                : 'bg-[#DCE7EC]'
              : 'bg-[#ECEEEE]'
          }`}
          role="region"
          aria-label="Interactive open-source Leaflet world distribution map"
        />

        {/* Bottom Legend & Live Inspection HUD */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-2.5 bg-white border-t border-[#E2E7E2] text-xs">
          <div className="flex items-center gap-3 min-h-[20px]">
            {hoveredPoint ? (
              <>
                <span className="font-semibold text-[#0F766E]">GBIF #{hoveredPoint.key}</span>
                <span className="font-mono tabular-nums text-[#141A16]">
                  {hoveredPoint.eventDate || (hoveredPoint.year ? String(hoveredPoint.year) : 'Undated')}
                </span>
                <span className="text-[#9AA39C]" aria-hidden="true">·</span>
                <span className="text-[#4A554E]">
                  {[hoveredPoint.locality, hoveredPoint.stateProvince, hoveredPoint.country]
                    .filter(Boolean)
                    .join(', ') || 'Recorded coordinates'}
                </span>
                {hoveredPoint.elevation !== undefined && (
                  <>
                    <span className="text-[#9AA39C]" aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-[#5A655D]">
                      {hoveredPoint.elevation}m
                    </span>
                  </>
                )}
              </>
            ) : hoveredSpecies ? (
              <>
                <span className="font-semibold italic text-[#141A16]">
                  {hoveredSpecies.speciesName}
                </span>
                <span className="text-[#9AA39C]" aria-hidden="true">·</span>
                <span className="text-[#4A554E]">{hoveredSpecies.nativeRegion}</span>
                <span className="text-[#9AA39C]" aria-hidden="true">·</span>
                <StatusIndicator status={hoveredSpecies.status} />
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-4 text-[#5A655D]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#166534] inline-block" aria-hidden="true" />
                  Resilient
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] inline-block" aria-hidden="true" />
                  Borderline
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] inline-block" aria-hidden="true" />
                  Unsuited
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E] inline-block" aria-hidden="true" />
                  GBIF Tree Record
                </span>
                <span className="inline-flex items-center gap-1 text-[#1B5E3F]">
                  <MapPin className="w-3 h-3" aria-hidden="true" />
                  Active Site
                </span>
              </div>
            )}
          </div>

          <div className="font-mono tabular-nums text-[#5A655D]">
            {cursorCoords
              ? `${Math.abs(cursorCoords.lat).toFixed(2)}° ${cursorCoords.lat >= 0 ? 'N' : 'S'}, ${Math.abs(cursorCoords.lng).toFixed(2)}° ${cursorCoords.lng >= 0 ? 'E' : 'W'}`
              : `${speciesList.length} species mapped`}
          </div>
        </div>
      </div>
    </div>
  );
}
