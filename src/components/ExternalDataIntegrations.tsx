import {
  Check,
  ChevronLeft,
  ChevronRight,
  Globe,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { useState } from 'react';
import type { TreeSpecies } from '../data/treeSpecies';
import {
  fetchGbifDistribution,
  fetchGbifOccurrenceCountFast,
  fetchSiteClimateProjection,
  searchCitiesOpenMeteo,
  searchGbifTreeSpeciesPage,
  type GbifCatalogSearchItem,
  type GbifSpeciesResult,
  type GeocodedCity,
  type SiteClimateCalibration,
} from '../utils/openApis';

export interface GbifCatalogBrowserState {
  query: string;
  results: GbifCatalogSearchItem[];
  offset: number;
  limit: number;
  totalCount: number;
  endOfRecords: boolean;
  selectedItems: Record<number, GbifCatalogSearchItem>;
}

export const INITIAL_GBIF_CATALOG_STATE: GbifCatalogBrowserState = {
  query: '',
  results: [],
  offset: 0,
  limit: 20,
  totalCount: 0,
  endOfRecords: true,
  selectedItems: {},
};

interface ExternalDataIntegrationsProps {
  speciesDb: TreeSpecies[];
  onBatchUpdateGbifCounts: (updates: Map<string, number>) => void;
  liveClimate: SiteClimateCalibration | null;
  onApplyLiveClimate: (calibration: SiteClimateCalibration) => void;
  onPlotGbifResult: (result: GbifSpeciesResult) => void;
  onAddGbifSpeciesToPalette: (species: TreeSpecies) => void;
  onAddMultipleGbifSpecies: (speciesList: TreeSpecies[]) => void;
  catalogState?: GbifCatalogBrowserState;
  onCatalogStateChange?: React.Dispatch<React.SetStateAction<GbifCatalogBrowserState>>;
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
    designNotes: `Imported from api.gbif.org (${item.occurrenceCount.toLocaleString()} georeferenced records). Select this species in Species & Site to inspect individual observation dates, localities, and coordinates.`,
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
  catalogState: controlledCatalogState,
  onCatalogStateChange,
}: ExternalDataIntegrationsProps) {
  // Batch GBIF sync across existing palette
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);

  // GBIF genus/species catalog search + pagination + multi-select (supports lifted or local state)
  const [localCatalogState, setLocalCatalogState] = useState<GbifCatalogBrowserState>(
    INITIAL_GBIF_CATALOG_STATE
  );
  const catalogState = controlledCatalogState ?? localCatalogState;
  const setCatalogState = onCatalogStateChange ?? setLocalCatalogState;

  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);

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

  const runCatalogSearch = async (queryText: string, offset = 0) => {
    const q = queryText.trim();
    if (q.length < 2) return;
    setCatalogState((prev) => ({ ...prev, query: q }));
    setCatalogLoading(true);
    setCatalogError(null);
    setImportNotice(null);
    try {
      const page = await searchGbifTreeSpeciesPage(q, offset, catalogState.limit);
      setCatalogState((prev) => ({
        ...prev,
        query: q,
        results: page.items,
        offset: page.offset,
        totalCount: page.totalCount,
        endOfRecords: page.endOfRecords,
      }));
      if (page.items.length === 0 && offset === 0) {
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
    runCatalogSearch(catalogState.query, 0);
  };

  const selectedList = Object.values(catalogState.selectedItems);
  const selectedCount = selectedList.length;

  const toggleSelectItem = (item: GbifCatalogSearchItem) => {
    setImportNotice(null);
    setCatalogState((prev) => {
      const next = { ...prev.selectedItems };
      if (next[item.taxonKey]) {
        delete next[item.taxonKey];
      } else {
        next[item.taxonKey] = item;
      }
      return { ...prev, selectedItems: next };
    });
  };

  const pageSelectableItems = catalogState.results.filter(
    (item) => !existingNames.has(item.canonicalName.toLowerCase())
  );
  const allPageSelected =
    pageSelectableItems.length > 0 &&
    pageSelectableItems.every((item) => Boolean(catalogState.selectedItems[item.taxonKey]));

  const handleToggleSelectPage = () => {
    setImportNotice(null);
    setCatalogState((prev) => {
      const next = { ...prev.selectedItems };
      if (allPageSelected) {
        for (const item of pageSelectableItems) {
          delete next[item.taxonKey];
        }
      } else {
        for (const item of pageSelectableItems) {
          next[item.taxonKey] = item;
        }
      }
      return { ...prev, selectedItems: next };
    });
  };

  const handleClearSelection = () => {
    setCatalogState((prev) => ({ ...prev, selectedItems: {} }));
  };

  const handleAddSelectedToList = () => {
    if (selectedList.length === 0) return;
    const toAdd = selectedList
      .filter((item) => !existingNames.has(item.canonicalName.toLowerCase()))
      .map((item) => buildSpeciesFromGbif(item));
    if (toAdd.length > 0) {
      onAddMultipleGbifSpecies(toAdd);
      setImportNotice(`Added ${toAdd.length} selected species to your tree list.`);
    }
    setCatalogState((prev) => ({ ...prev, selectedItems: {} }));
  };

  const handleQuickAddSingle = (item: GbifCatalogSearchItem) => {
    onAddGbifSpeciesToPalette(buildSpeciesFromGbif(item));
    setCatalogState((prev) => {
      if (!prev.selectedItems[item.taxonKey]) return prev;
      const next = { ...prev.selectedItems };
      delete next[item.taxonKey];
      return { ...prev, selectedItems: next };
    });
    setImportNotice(`Added ${item.canonicalName} to your tree list.`);
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
      <section className="bg-white border border-[#E2DFD7] rounded-lg p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#EAE7DF]">
          <div>
            <h2 className="text-base font-semibold text-[#1A1A1A] tracking-tight">
              Live GBIF Tree Catalog &amp; Genus Importer (api.gbif.org)
            </h2>
            <p className="text-xs text-[#5C5C58] mt-1 max-w-2xl">
              Search any tree genus or species on <span className="font-medium text-[#1A1A1A]">api.gbif.org</span> to add more trees to your selection palette, or refresh live global occurrence counts across all {speciesDb.length} active species.
            </p>
          </div>

          <button
            type="button"
            disabled={syncingAll}
            onClick={handleSyncAllPalette}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#2F4F3E] bg-[#ECEFE9] border border-[#C9D3C8] rounded-md hover:bg-[#E4E8E0] transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
            <span>{syncingAll ? 'Syncing Palette...' : `Refresh Live GBIF Counts (${speciesDb.length})`}</span>
          </button>
        </div>

        {syncProgress && (
          <div className="mt-3 px-3.5 py-2 bg-[#ECEFE9] border border-[#C9D3C8] rounded-md text-xs text-[#2F4F3E]">
            {syncProgress}
          </div>
        )}

        <form onSubmit={handleCatalogSubmit} className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search
              className="w-3.5 h-3.5 text-[#7A7A74] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={catalogState.query}
              onChange={(e) =>
                setCatalogState((prev) => ({ ...prev, query: e.target.value }))
              }
              placeholder="Search GBIF genus or species (e.g. Quercus, Acer, Magnolia, Fraxinus)..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-[#F7F6F2] border border-[#E2DFD7] rounded-md text-[#1A1A1A] placeholder:text-[#7A7A74] focus:outline-none focus:border-[#2F4F3E]"
            />
          </div>
          <button
            type="submit"
            disabled={catalogLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#2F4F3E] rounded-md hover:bg-[#243D30] transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
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
          <span className="text-[11px] text-[#5C5C58] mr-1">Quick genera:</span>
          {QUICK_GENERA.map((genus) => (
            <button
              key={genus}
              type="button"
              disabled={catalogLoading}
              onClick={() => runCatalogSearch(genus, 0)}
              className="px-2.5 py-1 text-xs italic bg-[#F7F6F2] border border-[#E2DFD7] rounded text-[#1A1A1A] hover:border-[#2F4F3E] hover:text-[#2F4F3E] transition-colors cursor-pointer"
            >
              {genus}
            </button>
          ))}
        </div>

        {catalogError && (
          <div className="mt-3 p-2.5 bg-[#FDF2F2] border border-[#E7C6C6] rounded text-xs text-[#9E2A2B]">
            {catalogError}
          </div>
        )}

        {importNotice && (
          <div className="mt-3 px-3.5 py-2 bg-[#ECEFE9] border border-[#C9D3C8] rounded-md text-xs text-[#2F4F3E] flex items-center justify-between gap-2">
            <span>{importNotice}</span>
            <button
              type="button"
              onClick={() => setImportNotice(null)}
              className="text-[#5C5C58] hover:text-[#1A1A1A] cursor-pointer"
              aria-label="Dismiss notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Persistent Multi-Select Staging Bar across pages & searches */}
        {selectedCount > 0 && (
          <div className="mt-4 px-3.5 py-2.5 bg-[#ECEFE9] border border-[#C9D3C8] rounded-md flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-[#1A1A1A]">
              <span className="font-semibold text-[#2F4F3E]">
                {selectedCount} {selectedCount === 1 ? 'species' : 'species'} selected
              </span>
              <span className="text-[#7A7A74]" aria-hidden="true">·</span>
              <span className="text-[#454541] italic truncate max-w-[460px]">
                {selectedList
                  .slice(0, 4)
                  .map((s) => s.canonicalName)
                  .join(', ')}
                {selectedCount > 4 ? ` +${selectedCount - 4} more` : ''}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-2.5 py-1 text-xs font-medium text-[#5C5C58] bg-white border border-[#E2DFD7] rounded hover:text-[#1A1A1A] transition-colors cursor-pointer"
              >
                Clear selection
              </button>
              <button
                type="button"
                onClick={handleAddSelectedToList}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-[#2F4F3E] rounded hover:bg-[#243D30] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add selected to list ({selectedCount})</span>
              </button>
            </div>
          </div>
        )}

        {catalogState.results.length > 0 && (
          <div className="mt-4 border border-[#E2DFD7] rounded-md overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-[#F2F0EA] border-b border-[#E2DFD7] text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none font-medium text-[#1A1A1A]">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    disabled={pageSelectableItems.length === 0}
                    onChange={handleToggleSelectPage}
                    className="rounded border-[#C8C4BA] accent-[#2F4F3E]"
                  />
                  <span>Select page</span>
                </label>
                <span className="text-[#7A7A74]" aria-hidden="true">·</span>
                <span className="font-semibold text-[#1A1A1A]">
                  Showing {catalogState.offset + 1}–{catalogState.offset + catalogState.results.length}
                  {catalogState.totalCount > 0 ? ` of ${catalogState.totalCount.toLocaleString()}` : ''} accepted species
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={catalogLoading || catalogState.offset === 0}
                  onClick={() =>
                    runCatalogSearch(
                      catalogState.query,
                      Math.max(0, catalogState.offset - catalogState.limit)
                    )
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white border border-[#E2DFD7] rounded text-[#1A1A1A] hover:border-[#2F4F3E] disabled:opacity-45 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <span className="text-[11px] font-mono tabular-nums text-[#5C5C58]">
                  Page {Math.floor(catalogState.offset / catalogState.limit) + 1}
                </span>
                <button
                  type="button"
                  disabled={catalogLoading || catalogState.endOfRecords}
                  onClick={() =>
                    runCatalogSearch(
                      catalogState.query,
                      catalogState.offset + catalogState.limit
                    )
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white border border-[#E2DFD7] rounded text-[#1A1A1A] hover:border-[#2F4F3E] disabled:opacity-45 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="max-h-[340px] overflow-y-auto divide-y divide-[#EAE7DF]">
              {catalogState.results.map((item) => {
                const alreadyIn = existingNames.has(item.canonicalName.toLowerCase());
                const isChecked = Boolean(catalogState.selectedItems[item.taxonKey]);
                return (
                  <div
                    key={item.taxonKey}
                    className={`px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs transition-colors ${
                      isChecked ? 'bg-[#ECEFE9]/70' : 'hover:bg-[#F7F6F2]'
                    }`}
                  >
                    <label
                      className={`flex items-center gap-2.5 flex-1 min-w-0 ${
                        alreadyIn ? 'cursor-default' : 'cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={alreadyIn || isChecked}
                        disabled={alreadyIn}
                        onChange={() => toggleSelectItem(item)}
                        aria-label={`Select ${item.canonicalName}`}
                        className="rounded border-[#C8C4BA] accent-[#2F4F3E] shrink-0"
                      />
                      <span className="truncate">
                        <span className="font-semibold italic text-[#1A1A1A]">
                          {item.canonicalName}
                        </span>
                        <span className="text-[#5C5C58] ml-2">
                          {item.family ?? ''} ·{' '}
                          <span className="font-mono tabular-nums">
                            {item.occurrenceCount.toLocaleString()} GBIF records
                          </span>
                        </span>
                      </span>
                    </label>

                    {alreadyIn ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2F4F3E] shrink-0">
                        <Check className="w-3.5 h-3.5" />
                        <span>In List</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleQuickAddSingle(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#2F4F3E] bg-[#ECEFE9] border border-[#C9D3C8] rounded hover:bg-[#E4E8E0] cursor-pointer shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
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
      <div id="open-meteo-section" className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-white border border-[#E2DFD7] rounded-lg p-5">
          <div className="pb-3.5 border-b border-[#EAE7DF]">
            <h2 className="text-base font-semibold text-[#1A1A1A] tracking-tight">
              Live Site Climate Calibration (Open-Meteo CMIP6)
            </h2>
            <p className="text-xs text-[#5C5C58] mt-1">
              Query baseline summer extremes, winter lows, MAT, and annual precipitation for any city worldwide to auto-calibrate your site MAT, peak temperature, and drought sliders.
            </p>
          </div>

          <form onSubmit={handleCitySearch} className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <MapPin
                className="w-3.5 h-3.5 text-[#7A7A74] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                placeholder="Enter city (e.g. Bristol, Cardiff, York, Paris, Tokyo)..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-[#F7F6F2] border border-[#E2DFD7] rounded-md text-[#1A1A1A] placeholder:text-[#7A7A74] focus:outline-none focus:border-[#2F4F3E]"
              />
            </div>
            <button
              type="submit"
              disabled={citySearching || climateLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#2F4F3E] rounded-md hover:bg-[#243D30] transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
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
            <div className="mt-3 p-2.5 bg-[#FDF2F2] border border-[#E7C6C6] rounded text-xs text-[#9E2A2B]">
              {climateError}
            </div>
          )}

          {cityResults.length > 0 && (
            <ul className="mt-3 border border-[#E2DFD7] rounded-md divide-y divide-[#EAE7DF]">
              {cityResults.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectCity(c)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-[#F7F6F2] flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="font-medium text-[#1A1A1A]">
                      {c.name}
                      {c.admin1 ? `, ${c.admin1}` : ''} · {c.country}
                    </span>
                    <span className="font-mono tabular-nums text-[#5C5C58]">
                      {c.latitude.toFixed(2)}°, {c.longitude.toFixed(2)}°
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {liveClimate && (
            <div className="mt-4 pt-4 border-t border-[#EAE7DF] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#1A1A1A]">{liveClimate.locationLabel}</span>
                <span className="font-mono text-[11px] text-[#2F4F3E]">{liveClimate.sourceLabel}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <div className="text-[#5C5C58]">Baseline MAT</div>
                  <div className="font-mono tabular-nums font-semibold text-[#1A1A1A]">
                    {liveClimate.annualMeanTempC}°C
                  </div>
                </div>
                <div>
                  <div className="text-[#5C5C58]">Summer Peak</div>
                  <div className="font-mono tabular-nums font-semibold text-[#1A1A1A]">
                    {liveClimate.projectedSummerPeakC}°C
                  </div>
                </div>
                <div>
                  <div className="text-[#5C5C58]">Winter Min</div>
                  <div className="font-mono tabular-nums font-semibold text-[#1A1A1A]">
                    {liveClimate.projectedWinterMinC}°C
                  </div>
                </div>
                <div>
                  <div className="text-[#5C5C58]">Annual Rain</div>
                  <div className="font-mono tabular-nums font-semibold text-[#1A1A1A]">
                    {liveClimate.annualPrecipMm} mm
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="bg-white border border-[#E2DFD7] rounded-lg p-5">
          <div className="pb-3.5 border-b border-[#EAE7DF]">
            <h2 className="text-base font-semibold text-[#1A1A1A] tracking-tight">
              Individual Tree Occurrence Lookup (api.gbif.org)
            </h2>
            <p className="text-xs text-[#5C5C58] mt-1">
              Query any botanical species name directly from <span className="font-medium text-[#1A1A1A]">api.gbif.org</span> to inspect real global &amp; UK record counts, plot individual dated occurrences on the map, or add it to your palette.
            </p>
          </div>

          <form onSubmit={handleGbifSearch} className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Globe
                className="w-3.5 h-3.5 text-[#7A7A74] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={gbifQuery}
                onChange={(e) => setGbifQuery(e.target.value)}
                placeholder="Botanical name (e.g. Quercus robur, Acer rubrum)..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-[#F7F6F2] border border-[#E2DFD7] rounded-md text-[#1A1A1A] placeholder:text-[#7A7A74] focus:outline-none focus:border-[#2F4F3E]"
              />
            </div>
            <button
              type="submit"
              disabled={gbifLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#2F4F3E] rounded-md hover:bg-[#243D30] transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
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
            <div className="mt-3 p-2.5 bg-[#FDF2F2] border border-[#E7C6C6] rounded text-xs text-[#9E2A2B]">
              {gbifError}
            </div>
          )}

          {gbifResult && (
            <div className="mt-4 pt-4 border-t border-[#EAE7DF] space-y-3 text-xs">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold italic text-[#1A1A1A]">
                    {gbifResult.canonicalName}
                  </div>
                  <div className="text-[#5C5C58] mt-0.5">
                    {gbifResult.family ? `Family: ${gbifResult.family} · ` : ''}
                    <span className="font-mono tabular-nums">
                      {gbifResult.totalOccurrences.toLocaleString()} global · {gbifResult.ukOccurrences.toLocaleString()} UK records
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddSingleGbifToPalette}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#2F4F3E] bg-[#ECEFE9] border border-[#C9D3C8] rounded-md hover:bg-[#E4E8E0] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Palette</span>
                </button>
              </div>
              <p className="text-[11px] text-[#5C5C58]">
                Plotted {gbifResult.points.length} individual dated tree occurrences onto the <span className="font-medium text-[#1A1A1A]">Maps</span> tab.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
