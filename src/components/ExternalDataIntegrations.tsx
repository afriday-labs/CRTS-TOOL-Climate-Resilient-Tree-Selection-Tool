import {
  Check,
  Globe,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useState } from 'react';
import type { TreeSpecies } from '../data/treeSpecies';
import {
  fetchGbifDistribution,
  fetchGbifOccurrenceCountFast,
  fetchSiteClimateProjection,
  searchCitiesOpenMeteo,
  searchGbifTreeSpecies,
  type GbifCatalogSearchItem,
  type GbifSpeciesResult,
  type GeocodedCity,
  type SiteClimateCalibration,
} from '../utils/openApis';

interface ExternalDataIntegrationsProps {
  speciesDb: TreeSpecies[];
  onBatchUpdateGbifCounts: (updates: Map<string, number>) => void;
  liveClimate: SiteClimateCalibration | null;
  onApplyLiveClimate: (calibration: SiteClimateCalibration) => void;
  onPlotGbifResult: (result: GbifSpeciesResult) => void;
  onAddGbifSpeciesToPalette: (species: TreeSpecies) => void;
  onAddMultipleGbifSpecies: (speciesList: TreeSpecies[]) => void;
}

const QUICK_GENERA = [
  'Quercus',
  'Acer',
  'Betula',
  'Pinus',
  'Tilia',
  'Sorbus',
  'Fraxinus',
  'Prunus',
  'Ulmus',
  'Alnus',
  'Salix',
  'Magnolia',
];

function buildSpeciesFromGbif(
  item: {
    taxonKey: number;
    canonicalName: string;
    commonName?: string;
    family?: string;
    occurrenceCount: number;
  },
  avgLat = 48,
  avgLng = 10
): TreeSpecies {
  const absLat = Math.abs(avgLat);
  const estZoneMin = absLat > 54 ? 4 : absLat > 44 ? 5 : absLat > 34 ? 7 : 9;
  const estZoneMax = Math.min(11, estZoneMin + 4);
  const estMaxTemp = absLat > 54 ? 32 : absLat > 44 ? 37 : absLat > 34 ? 42 : 45;
  const estMatMed = absLat > 54 ? 7.6 : absLat > 44 ? 11.2 : absLat > 34 ? 15.2 : 18.4;

  return {
    id: `gbif-${item.taxonKey}`,
    speciesName: item.canonicalName,
    commonName: item.commonName || item.canonicalName,
    nativeRegion: item.family ? `${item.family} · GBIF Catalog` : 'GBIF Global Catalog',
    usdaZoneMin: estZoneMin,
    usdaZoneMax: estZoneMax,
    ukHardiness: estZoneMin <= 4 ? 'H7' : estZoneMin <= 6 ? 'H6' : estZoneMin <= 8 ? 'H5' : 'H4',
    droughtTolerance: absLat < 38 ? 'High' : 'Med',
    maxTempC: estMaxTemp,
    minWinterTempC: estZoneMin <= 4 ? -30 : estZoneMin <= 6 ? -22 : -12,
    soilPreference: 'Well-drained Loam',
    foliageType:
      item.family === 'Pinaceae' || item.family === 'Cupressaceae' ? 'Conifer' : 'Deciduous',
    canopyHeightM: 18,
    canopySpreadM: 12,
    urbanTolerance: 'Moderate',
    lat: +avgLat.toFixed(2),
    lng: +avgLng.toFixed(2),
    recordsCount: item.occurrenceCount,
    matMinC: Math.max(2, Math.round(estMatMed - 5)),
    matOptimalMinC: Math.max(4, Math.round(estMatMed - 2.5)),
    matOptimalMaxC: Math.round(estMatMed + 2.5),
    matMaxC: Math.round(estMatMed + 5.5),
    matMedianC: estMatMed,
    annualPrecipMm: absLat < 38 ? 650 : 950,
    gbifSynced: true,
    designNotes: `Imported from api.gbif.org (${item.occurrenceCount.toLocaleString()} georeferenced records). Select this species in Explorer to inspect individual observation dates, localities, and coordinates.`,
  };
}

export function ExternalDataIntegrations({
  speciesDb,
  onBatchUpdateGbifCounts,
  liveClimate,
  onApplyLiveClimate,
  onPlotGbifResult,
  onAddGbifSpeciesToPalette,
  onAddMultipleGbifSpecies,
}: ExternalDataIntegrationsProps) {
  // Batch GBIF sync across existing palette
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);

  // GBIF genus/species catalog search
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogResults, setCatalogResults] = useState<GbifCatalogSearchItem[]>([]);

  // Open-Meteo city search state
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<GeocodedCity[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const [climateLoading, setClimateLoading] = useState(false);
  const [climateError, setClimateError] = useState<string | null>(null);

  // Direct GBIF single-species map lookup
  const [gbifQuery, setGbifQuery] = useState('');
  const [gbifLoading, setGbifLoading] = useState(false);
  const [gbifError, setGbifError] = useState<string | null>(null);
  const [gbifResult, setGbifResult] = useState<GbifSpeciesResult | null>(null);

  const existingNames = new Set(
    speciesDb.map((s) => s.speciesName.toLowerCase().replace(/×/g, 'x').trim())
  );

  const handleSyncAllPalette = async () => {
    setSyncingAll(true);
    setSyncProgress(`Syncing 0 / ${speciesDb.length} species with api.gbif.org...`);
    const updates = new Map<string, number>();

    const chunkSize = 8;
    for (let i = 0; i < speciesDb.length; i += chunkSize) {
      const batch = speciesDb.slice(i, i + chunkSize);
      const results = await Promise.all(
        batch.map(async (sp) => {
          try {
            return await fetchGbifOccurrenceCountFast(sp.speciesName);
          } catch {
            return null;
          }
        })
      );
      results.forEach((res, idx) => {
        if (res && res.totalOccurrences >= 0) {
          updates.set(batch[idx].id, res.totalOccurrences);
        }
      });
      setSyncProgress(
        `Synced ${Math.min(speciesDb.length, i + batch.length)} / ${speciesDb.length} species from api.gbif.org...`
      );
    }

    onBatchUpdateGbifCounts(updates);
    setSyncProgress(`Updated live GBIF record counts for ${updates.size} tree species.`);
    setSyncingAll(false);
  };

  const runCatalogSearch = async (queryText: string) => {
    const q = queryText.trim();
    if (q.length < 2) return;
    setCatalogQuery(q);
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const items = await searchGbifTreeSpecies(q, 18);
      setCatalogResults(items);
      if (items.length === 0) {
        setCatalogError(`No accepted vascular plant species found on GBIF for "${q}".`);
      }
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : 'GBIF catalog search failed.');
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleCatalogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runCatalogSearch(catalogQuery);
  };

  const handleAddAllCatalog = () => {
    const toAdd = catalogResults
      .filter((item) => !existingNames.has(item.canonicalName.toLowerCase()))
      .map((item) => buildSpeciesFromGbif(item));
    if (toAdd.length > 0) {
      onAddMultipleGbifSpecies(toAdd);
    }
  };

  const handleCitySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cityQuery.trim().length < 2) return;
    setCitySearching(true);
    setClimateError(null);
    try {
      const matches = await searchCitiesOpenMeteo(cityQuery);
      setCityResults(matches);
      if (matches.length === 0) {
        setClimateError('No matching locations found.');
      }
    } catch (err) {
      setClimateError(err instanceof Error ? err.message : 'City lookup failed.');
    } finally {
      setCitySearching(false);
    }
  };

  const handleSelectCity = async (city: GeocodedCity) => {
    setClimateLoading(true);
    setClimateError(null);
    try {
      const calibration = await fetchSiteClimateProjection(city);
      onApplyLiveClimate(calibration);
      setCityResults([]);
    } catch (err) {
      setClimateError(err instanceof Error ? err.message : 'Failed to load climate projections.');
    } finally {
      setClimateLoading(false);
    }
  };

  const handleGbifSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gbifQuery.trim()) return;
    setGbifLoading(true);
    setGbifError(null);
    try {
      const res = await fetchGbifDistribution(gbifQuery);
      setGbifResult(res);
      onPlotGbifResult(res);
    } catch (err) {
      setGbifError(err instanceof Error ? err.message : 'GBIF lookup failed.');
    } finally {
      setGbifLoading(false);
    }
  };

  const handleAddSingleGbifToPalette = () => {
    if (!gbifResult) return;
    const avgLat =
      gbifResult.points.length > 0
        ? gbifResult.points.reduce((a, b) => a + b.lat, 0) / gbifResult.points.length
        : 45;
    const avgLng =
      gbifResult.points.length > 0
        ? gbifResult.points.reduce((a, b) => a + b.lng, 0) / gbifResult.points.length
        : 10;

    onAddGbifSpeciesToPalette(
      buildSpeciesFromGbif(
        {
          taxonKey: gbifResult.taxonKey,
          canonicalName: gbifResult.canonicalName,
          family: gbifResult.family,
          occurrenceCount: gbifResult.totalOccurrences,
        },
        avgLat,
        avgLng
      )
    );
  };

  return (
    <div className="space-y-5">
      {/* Live GBIF Tree Discovery & Batch Import */}
      <section className="bg-white border border-[#E2E7E2] rounded-lg p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#EAEFEA]">
          <div>
            <h2 className="text-base font-semibold text-[#141A16]">
              Live GBIF Tree Catalog &amp; Genus Importer (api.gbif.org)
            </h2>
            <p className="text-xs text-[#5A655D] mt-1 max-w-2xl">
              Search any tree genus or species on <span className="font-medium text-[#141A16]">api.gbif.org</span> to add more trees to your selection palette, or refresh live global occurrence counts across all {speciesDb.length} active species.
            </p>
          </div>

          <button
            type="button"
            disabled={syncingAll}
            onClick={handleSyncAllPalette}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#1B5E3F] bg-[#EEF5F0] border border-[#C6DBC9] rounded-md hover:bg-[#E1EFE5] transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
            <span>{syncingAll ? 'Syncing Palette...' : `Refresh Live GBIF Counts (${speciesDb.length})`}</span>
          </button>
        </div>

        {syncProgress && (
          <div className="mt-3 px-3.5 py-2 bg-[#EEF5F0] border border-[#C6DBC9] rounded-md text-xs text-[#14532D]">
            {syncProgress}
          </div>
        )}

        <form onSubmit={handleCatalogSubmit} className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search
              className="w-3.5 h-3.5 text-[#647068] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={catalogQuery}
              onChange={(e) => setCatalogQuery(e.target.value)}
              placeholder="Search GBIF genus or species (e.g. Quercus, Acer, Magnolia, Fraxinus)..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-[#FAFBFA] border border-[#DCE2DD] rounded-md text-[#141A16] placeholder:text-[#78857C] focus:outline-none focus:border-[#1B5E3F]"
            />
          </div>
          <button
            type="submit"
            disabled={catalogLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1B5E3F] rounded-md hover:bg-[#154A31] transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {catalogLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Globe className="w-3.5 h-3.5" />
            )}
            <span>Search GBIF Catalog</span>
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-[#5A655D] mr-1">Quick genera:</span>
          {QUICK_GENERA.map((genus) => (
            <button
              key={genus}
              type="button"
              disabled={catalogLoading}
              onClick={() => runCatalogSearch(genus)}
              className="px-2.5 py-1 text-xs italic bg-[#FAFBFA] border border-[#DCE2DD] rounded hover:border-[#1B5E3F] hover:text-[#1B5E3F] transition-colors cursor-pointer"
            >
              {genus}
            </button>
          ))}
        </div>

        {catalogError && (
          <div className="mt-3 p-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded text-xs text-[#991B1B]">
            {catalogError}
          </div>
        )}

        {catalogResults.length > 0 && (
          <div className="mt-4 border border-[#E2E7E2] rounded-md overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-[#F7F8F7] border-b border-[#E2E7E2] text-xs">
              <span className="font-semibold text-[#141A16]">
                {catalogResults.length} Accepted Species Returned from api.gbif.org
              </span>
              <button
                type="button"
                onClick={handleAddAllCatalog}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-[#1B5E3F] rounded hover:bg-[#154A31] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add All New Species to Palette</span>
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto divide-y divide-[#EAEFEA]">
              {catalogResults.map((item) => {
                const alreadyIn = existingNames.has(item.canonicalName.toLowerCase());
                return (
                  <div
                    key={item.taxonKey}
                    className="px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs hover:bg-[#FAFBFA]"
                  >
                    <div>
                      <span className="font-semibold italic text-[#141A16]">
                        {item.canonicalName}
                      </span>
                      <span className="text-[#647068] ml-2">
                        {item.family ?? ''} ·{' '}
                        <span className="font-mono tabular-nums">
                          {item.occurrenceCount.toLocaleString()} GBIF records
                        </span>
                      </span>
                    </div>

                    {alreadyIn ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#166534]">
                        <Check className="w-3.5 h-3.5" />
                        <span>In Palette</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAddGbifSpeciesToPalette(buildSpeciesFromGbif(item))}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#1B5E3F] bg-[#EEF5F0] border border-[#C6DBC9] rounded hover:bg-[#E1EFE5] cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Species</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Secondary Row: Open-Meteo Site Calibration + Individual Species Map Lookup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-white border border-[#E2E7E2] rounded-lg p-5">
          <div className="pb-3.5 border-b border-[#EAEFEA]">
            <h2 className="text-base font-semibold text-[#141A16]">
              Live Site Climate Calibration (Open-Meteo CMIP6)
            </h2>
            <p className="text-xs text-[#5A655D] mt-1">
              Query baseline summer extremes, winter lows, MAT, and annual precipitation for any city worldwide to auto-calibrate your site MAT, peak temperature, and drought sliders.
            </p>
          </div>

          <form onSubmit={handleCitySearch} className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <MapPin
                className="w-3.5 h-3.5 text-[#647068] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                placeholder="Enter city (e.g. Bristol, Cardiff, York, Paris, Tokyo)..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-[#FAFBFA] border border-[#DCE2DD] rounded-md text-[#141A16] placeholder:text-[#78857C] focus:outline-none focus:border-[#1B5E3F]"
              />
            </div>
            <button
              type="submit"
              disabled={citySearching || climateLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#1B5E3F] rounded-md hover:bg-[#154A31] transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {citySearching || climateLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>Search City</span>
            </button>
          </form>

          {climateError && (
            <div className="mt-3 p-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded text-xs text-[#991B1B]">
              {climateError}
            </div>
          )}

          {cityResults.length > 0 && (
            <ul className="mt-3 border border-[#E2E7E2] rounded-md divide-y divide-[#EAEFEA]">
              {cityResults.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectCity(c)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-[#F7F9F7] flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="font-medium text-[#141A16]">
                      {c.name}
                      {c.admin1 ? `, ${c.admin1}` : ''} · {c.country}
                    </span>
                    <span className="font-mono tabular-nums text-[#647068]">
                      {c.latitude.toFixed(2)}°, {c.longitude.toFixed(2)}°
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {liveClimate && (
            <div className="mt-4 pt-4 border-t border-[#EAEFEA] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#141A16]">{liveClimate.locationLabel}</span>
                <span className="font-mono text-[11px] text-[#1B5E3F]">{liveClimate.sourceLabel}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <div className="text-[#647068]">Baseline MAT</div>
                  <div className="font-mono tabular-nums font-semibold text-[#141A16]">
                    {liveClimate.annualMeanTempC}°C
                  </div>
                </div>
                <div>
                  <div className="text-[#647068]">Summer Peak</div>
                  <div className="font-mono tabular-nums font-semibold text-[#141A16]">
                    {liveClimate.projectedSummerPeakC}°C
                  </div>
                </div>
                <div>
                  <div className="text-[#647068]">Winter Min</div>
                  <div className="font-mono tabular-nums font-semibold text-[#141A16]">
                    {liveClimate.projectedWinterMinC}°C
                  </div>
                </div>
                <div>
                  <div className="text-[#647068]">Annual Rain</div>
                  <div className="font-mono tabular-nums font-semibold text-[#141A16]">
                    {liveClimate.annualPrecipMm} mm
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="bg-white border border-[#E2E7E2] rounded-lg p-5">
          <div className="pb-3.5 border-b border-[#EAEFEA]">
            <h2 className="text-base font-semibold text-[#141A16]">
              Individual Tree Occurrence Lookup (api.gbif.org)
            </h2>
            <p className="text-xs text-[#5A655D] mt-1">
              Query any botanical species name directly from <span className="font-medium text-[#141A16]">api.gbif.org</span> to inspect real global &amp; UK record counts, plot individual dated occurrences on the map, or add it to your palette.
            </p>
          </div>

          <form onSubmit={handleGbifSearch} className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Globe
                className="w-3.5 h-3.5 text-[#647068] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={gbifQuery}
                onChange={(e) => setGbifQuery(e.target.value)}
                placeholder="Botanical name (e.g. Quercus robur, Acer rubrum)..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-[#FAFBFA] border border-[#DCE2DD] rounded-md text-[#141A16] placeholder:text-[#78857C] focus:outline-none focus:border-[#1B5E3F]"
              />
            </div>
            <button
              type="submit"
              disabled={gbifLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#1B5E3F] rounded-md hover:bg-[#154A31] transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {gbifLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>Query GBIF</span>
            </button>
          </form>

          {gbifError && (
            <div className="mt-3 p-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded text-xs text-[#991B1B]">
              {gbifError}
            </div>
          )}

          {gbifResult && (
            <div className="mt-4 pt-4 border-t border-[#EAEFEA] space-y-3 text-xs">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold italic text-[#141A16]">
                    {gbifResult.canonicalName}
                  </div>
                  <div className="text-[#5A655D] mt-0.5">
                    {gbifResult.family ? `Family: ${gbifResult.family} · ` : ''}
                    <span className="font-mono tabular-nums">
                      {gbifResult.totalOccurrences.toLocaleString()} global · {gbifResult.ukOccurrences.toLocaleString()} UK records
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddSingleGbifToPalette}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1B5E3F] bg-[#EEF5F0] border border-[#C6DBC9] rounded-md hover:bg-[#E1EFE5] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Palette</span>
                </button>
              </div>
              <p className="text-[11px] text-[#5A655D]">
                Plotted {gbifResult.points.length} individual dated tree occurrences onto the <span className="font-medium text-[#141A16]">Distribution Map</span> tab.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
