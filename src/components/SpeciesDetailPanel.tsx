import { ExternalLink, Globe, Loader2, MapPin, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  classifyRecordConfidence,
  getMatRiskScore,
  type EvaluatedSpecies,
} from '../data/treeSpecies';
import {
  fetchGbifDistribution,
  getCachedGbifDistribution,
  type GbifSpeciesResult,
} from '../utils/openApis';
import { RecordsCell, RiskScoreCell } from './RiskVisuals';
import { StatusIndicator } from './StatusIndicator';

interface SpeciesDetailPanelProps {
  species: EvaluatedSpecies;
  summerMaxC: number;
  effectiveMatC: number;
  onClose: () => void;
  onPlotGbifOnMap?: (result: GbifSpeciesResult) => void;
  onGbifRecordsSynced?: (speciesName: string, totalOccurrences: number, ukOccurrences: number) => void;
}

const DOSSIER_TEMPS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

export function SpeciesDetailPanel({
  species,
  summerMaxC,
  effectiveMatC,
  onClose,
  onPlotGbifOnMap,
  onGbifRecordsSynced,
}: SpeciesDetailPanelProps) {
  const activeMatRounded = Math.round(effectiveMatC);

  const [gbifData, setGbifData] = useState<GbifSpeciesResult | null>(() =>
    getCachedGbifDistribution(species.speciesName)
  );
  const [gbifLoading, setGbifLoading] = useState(false);
  const [gbifError, setGbifError] = useState<string | null>(null);
  const [showAllOccurrences, setShowAllOccurrences] = useState(false);

  // Auto-load real individual tree occurrences & dates from api.gbif.org when selecting a species
  useEffect(() => {
    let cancelled = false;
    const cached = getCachedGbifDistribution(species.speciesName);
    if (cached) {
      setGbifData(cached);
      setGbifError(null);
      setGbifLoading(false);
      return;
    }

    setGbifData(null);
    setGbifError(null);
    setGbifLoading(true);
    setShowAllOccurrences(false);

    fetchGbifDistribution(species.speciesName, 100)
      .then((res) => {
        if (cancelled) return;
        setGbifData(res);
        onGbifRecordsSynced?.(species.speciesName, res.totalOccurrences, res.ukOccurrences);
      })
      .catch((err) => {
        if (cancelled) return;
        setGbifError(err instanceof Error ? err.message : 'Unable to load GBIF records.');
      })
      .finally(() => {
        if (!cancelled) setGbifLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [species.speciesName]);

  const liveRecordCount = gbifData?.totalOccurrences ?? species.effectiveRecords;
  const liveRecordLevel = classifyRecordConfidence(liveRecordCount);

  const datedPoints = gbifData?.points.filter((p) => p.eventDate || p.year) ?? [];
  const years = datedPoints
    .map((p) => p.year)
    .filter((y): y is number => typeof y === 'number');
  const minYear = years.length > 0 ? Math.min(...years) : null;
  const maxYear = years.length > 0 ? Math.max(...years) : null;

  const visibleOccurrences = showAllOccurrences
    ? gbifData?.points ?? []
    : (gbifData?.points ?? []).slice(0, 10);

  return (
    <aside
      className="bg-white border border-[#E2E7E2] rounded-lg p-5"
      aria-label={`Details for ${species.speciesName}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#EAEFEA]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold italic text-[#141A16]">{species.speciesName}</h3>
            <StatusIndicator status={species.status} />
          </div>
          <p className="text-xs text-[#5A655D] mt-0.5">
            Native range: {species.nativeRegion}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {gbifData && onPlotGbifOnMap && (
            <button
              type="button"
              onClick={() => onPlotGbifOnMap(gbifData)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1B5E3F] bg-[#EEF5F0] border border-[#C6DBC9] rounded-md hover:bg-[#E1EFE5] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Plot {gbifData.points.length} Trees on Map</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#5A655D] hover:text-[#141A16] rounded-md hover:bg-[#F2F4F2] transition-colors cursor-pointer"
            aria-label="Close species dossier"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* BGCI Climate Risk Assessment Strip */}
      <div className="py-4 border-b border-[#EAEFEA]">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-[#141A16]">
            Climate Risk Assessment Profile (MAT 4°–20°C)
          </h4>
          <span className="text-[11px] font-mono tabular-nums text-[#5A655D]">
            Active Site MAT: {activeMatRounded}°C outlined
          </span>
        </div>

        <div className="overflow-x-auto border border-[#E2E7E2] rounded-md">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#F7F8F7] border-b border-[#E2E7E2] text-[10px] font-semibold text-[#5A655D]">
                <th className="py-1.5 px-3 text-left border-r border-[#EAEFEA]">Source</th>
                <th className="py-1.5 px-2.5 text-left border-r border-[#EAEFEA]">Records</th>
                <th className="py-1.5 px-2 text-right border-r border-[#E2E7E2]">MAT</th>
                {DOSSIER_TEMPS.map((t) => (
                  <th
                    key={t}
                    className={`py-1.5 px-0.5 text-center font-mono w-7 border-r border-[#EAEFEA] ${
                      t === activeMatRounded
                        ? 'bg-[#FFF5E6] text-[#141A16] font-bold border-x-2 border-t-2 border-x-[#141A16] border-t-[#141A16]'
                        : ''
                    }`}
                  >
                    {t}°
                  </th>
                ))}
                <th className="py-1.5 px-2.5 text-right border-r border-[#EAEFEA]">Hottest</th>
                <th className="py-1.5 px-2.5 text-right border-r border-[#EAEFEA]">Coldest</th>
                <th className="py-1.5 px-2.5 text-right">Annual Precip.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEFEA]">
              <tr>
                <td className="py-2 px-3 font-semibold text-[#141A16] border-r border-[#EAEFEA] whitespace-nowrap">
                  GBIF + Climate
                </td>
                <td className="py-2 px-2.5 border-r border-[#EAEFEA]">
                  <RecordsCell count={liveRecordCount} level={liveRecordLevel} compact />
                </td>
                <td className="py-2 px-2 text-right font-mono tabular-nums text-[#141A16] border-r border-[#E2E7E2] whitespace-nowrap">
                  {species.effectiveMatC.toFixed(1)} °C
                </td>
                {DOSSIER_TEMPS.map((t) => {
                  const score = getMatRiskScore(species, t);
                  const isTarget = t === activeMatRounded;
                  return (
                    <td
                      key={t}
                      className={`p-0 text-center border-r border-white ${
                        isTarget ? 'border-x-2 border-x-[#141A16]' : ''
                      }`}
                    >
                      <RiskScoreCell score={score} size="sm" isHighlighted={isTarget} />
                    </td>
                  );
                })}
                <td className="py-2 px-2.5 text-right font-mono tabular-nums text-[#141A16] border-r border-[#EAEFEA] whitespace-nowrap">
                  {species.maxTempC}.0 °C
                </td>
                <td className="py-2 px-2.5 text-right font-mono tabular-nums text-[#3E4841] border-r border-[#EAEFEA] whitespace-nowrap">
                  {species.minWinterTempC}.0 °C
                </td>
                <td className="py-2 px-2.5 text-right font-mono tabular-nums text-[#3E4841] whitespace-nowrap">
                  {species.annualPrecipMm} mm/yr
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-[#EAEFEA]">
        <div>
          <div className="text-xs text-[#647068]">Species MAT Niche</div>
          <div className="text-sm font-mono tabular-nums font-medium text-[#141A16] mt-0.5">
            {species.effectiveMatC.toFixed(1)}°C (opt {species.matOptimalMinC}–{species.matOptimalMaxC}°C)
          </div>
          <div className="text-[11px] font-mono text-[#647068]">
            Envelope {species.matMinC}–{species.matMaxC}°C · Min {species.minWinterTempC}°C
          </div>
        </div>
        <div>
          <div className="text-xs text-[#647068]">Max Temp Ceiling</div>
          <div className="text-sm font-mono tabular-nums font-medium text-[#141A16] mt-0.5">
            {species.maxTempC}°C ({species.thermalMarginC >= 0 ? `+${species.thermalMarginC}` : species.thermalMarginC}°C vs {summerMaxC}°C)
          </div>
        </div>
        <div>
          <div className="text-xs text-[#647068]">Drought &amp; Soil</div>
          <div className="text-sm font-medium text-[#141A16] mt-0.5">
            {species.droughtTolerance} · {species.soilPreference}
          </div>
        </div>
        <div>
          <div className="text-xs text-[#647068]">Mature Canopy</div>
          <div className="text-sm font-mono tabular-nums font-medium text-[#141A16] mt-0.5">
            {species.canopyHeightM}m H × {species.canopySpreadM}m W
          </div>
        </div>
      </div>

      {/* Live Individual Tree Occurrences from api.gbif.org */}
      <div className="py-4 border-b border-[#EAEFEA]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#1B5E3F]" aria-hidden="true" />
            <h4 className="text-xs font-semibold text-[#141A16]">
              Individual Tree Occurrence Records (api.gbif.org)
            </h4>
          </div>

          {gbifData && (
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono tabular-nums text-[#3E4841]">
              <span>Global: {gbifData.totalOccurrences.toLocaleString()}</span>
              <span aria-hidden="true">·</span>
              <span>UK (GB): {gbifData.ukOccurrences.toLocaleString()}</span>
              {minYear && maxYear && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Dates: {minYear}–{maxYear}</span>
                </>
              )}
              {gbifData.topCountries.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    Top: {gbifData.topCountries.slice(0, 4).map((c) => `${c.countryCode} (${c.count.toLocaleString()})`).join(', ')}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {gbifLoading ? (
          <div className="py-6 flex items-center justify-center gap-2 text-xs text-[#5A655D] bg-[#FAFBFA] border border-[#EAEFEA] rounded-md">
            <Loader2 className="w-4 h-4 animate-spin text-[#1B5E3F]" />
            <span>Loading individual tree observations and dates from api.gbif.org...</span>
          </div>
        ) : gbifError ? (
          <div className="py-3 px-4 text-xs text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-md">
            {gbifError}
          </div>
        ) : gbifData && gbifData.points.length > 0 ? (
          <>
            <div className="overflow-x-auto border border-[#E2E7E2] rounded-md max-h-[300px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-[#F7F8F7] border-b border-[#E2E7E2] text-[10px] font-semibold text-[#5A655D]">
                  <tr>
                    <th className="py-2 px-3">GBIF ID</th>
                    <th className="py-2 px-3">Observation Date</th>
                    <th className="py-2 px-3">Country</th>
                    <th className="py-2 px-3">Locality / Site</th>
                    <th className="py-2 px-3 text-right">Lat / Lon</th>
                    <th className="py-2 px-3 text-right">Elev.</th>
                    <th className="py-2 px-3">Record Type</th>
                    <th className="py-2 px-3">Institution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEFEA]">
                  {visibleOccurrences.map((occ) => (
                    <tr key={occ.key} className="hover:bg-[#FAFBFA]">
                      <td className="py-1.5 px-3 font-mono tabular-nums">
                        <a
                          href={`https://www.gbif.org/occurrence/${occ.key}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#1B5E3F] hover:underline"
                        >
                          <span>{occ.key}</span>
                          <ExternalLink className="w-2.5 h-2.5" aria-hidden="true" />
                        </a>
                      </td>
                      <td className="py-1.5 px-3 font-mono tabular-nums text-[#141A16] whitespace-nowrap">
                        {occ.eventDate ?? (occ.year ? String(occ.year) : '—')}
                      </td>
                      <td className="py-1.5 px-3 text-[#2A332D] whitespace-nowrap">
                        {occ.country ?? occ.countryCode ?? '—'}
                      </td>
                      <td className="py-1.5 px-3 text-[#3E4841] max-w-[210px] truncate" title={occ.locality ?? occ.stateProvince ?? ''}>
                        {occ.locality || occ.stateProvince || '—'}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono tabular-nums text-[#3E4841] whitespace-nowrap">
                        {occ.lat.toFixed(3)}, {occ.lng.toFixed(3)}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono tabular-nums text-[#5A655D] whitespace-nowrap">
                        {occ.elevation !== undefined ? `${occ.elevation}m` : '—'}
                      </td>
                      <td className="py-1.5 px-3 text-[#4A554E] whitespace-nowrap">
                        {occ.basisOfRecord ? occ.basisOfRecord.replace(/_/g, ' ').toLowerCase() : '—'}
                      </td>
                      <td className="py-1.5 px-3 text-[#5A655D] max-w-[140px] truncate">
                        {occ.institutionCode ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {gbifData.points.length > 10 && (
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-[#5A655D]">
                  Showing {visibleOccurrences.length} of {gbifData.points.length} sampled individual tree occurrences
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllOccurrences((v) => !v)}
                  className="font-medium text-[#1B5E3F] hover:underline cursor-pointer"
                >
                  {showAllOccurrences ? 'Show Top 10' : `Show All ${gbifData.points.length} Records`}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="py-3 px-4 text-xs text-[#5A655D] bg-[#FAFBFA] border border-[#EAEFEA] rounded-md">
            No georeferenced individual records returned for this taxon.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <div>
          <h4 className="text-xs font-semibold text-[#4A554E] mb-2">
            Climatic Fit Assessment
          </h4>
          <ul className="space-y-1.5 text-xs text-[#3E4841]">
            {species.reasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-[#88948B] select-none" aria-hidden="true">—</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-[#4A554E] mb-2">
            Landscape Architecture Notes
          </h4>
          <p className="text-xs leading-relaxed text-[#3E4841]">
            {species.designNotes}
          </p>
          <div className="mt-2 text-xs text-[#5A655D]">
            Foliage: {species.foliageType}
            <span className="mx-2 text-[#9AA39C]" aria-hidden="true">·</span>
            Urban Tolerance: {species.urbanTolerance}
            <span className="mx-2 text-[#9AA39C]" aria-hidden="true">·</span>
            Winter Min: <span className="font-mono tabular-nums">{species.minWinterTempC}°C</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
