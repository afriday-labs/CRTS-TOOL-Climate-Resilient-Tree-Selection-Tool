import { ChevronDown, ChevronRight, Download, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BiogeographicMap, type GbifMapOverlay } from './components/BiogeographicMap';
import { ClimateMatrixView } from './components/ClimateMatrixView';
import {
  CLIMATE_SCENARIOS,
  ClimateScenarioSelector,
  type ClimateScenarioId,
} from './components/ClimateScenarioSelector';
import {
  ExternalDataIntegrations,
  INITIAL_GBIF_CATALOG_STATE,
  type GbifCatalogBrowserState,
} from './components/ExternalDataIntegrations';
import { SpeciesDetailPanel } from './components/SpeciesDetailPanel';
import { SpeciesExplorerList } from './components/SpeciesExplorerList';
import { ThermalEnvelopeChart } from './components/ThermalEnvelopeChart';
import { UkLocationBar } from './components/UkLocationBar';
import {
  CLIMATE_PRESETS,
  evaluateSpeciesResilience,
  exportSpeciesToCsv,
  TREE_SPECIES_DATA,
  type DroughtStressIndex,
  type DroughtTolerance,
  type FoliageType,
  type TreeSpecies,
} from './data/treeSpecies';
import type {
  GbifSpeciesResult,
  SiteClimateCalibration,
} from './utils/openApis';
import type { UkSiteSoilData } from './utils/ukSoilApi';

type MainTab = 'explorer' | 'matrix' | 'map';

const ALL_DROUGHT_LEVELS: DroughtTolerance[] = ['Low', 'Med', 'High'];
const ALL_FOLIAGE_TYPES: FoliageType[] = ['Deciduous', 'Evergreen', 'Conifer'];
const DEFAULT_SOIL_TYPES = Array.from(
  new Set(TREE_SPECIES_DATA.map((s) => s.soilPreference))
).sort();
const DEFAULT_SPECIES_ID_SET = new Set(TREE_SPECIES_DATA.map((s) => s.id));

const STORAGE_ADDED_SPECIES_KEY = 'crts_tool_added_species_v1';
const STORAGE_REMOVED_DEFAULT_IDS_KEY = 'crts_tool_removed_default_ids_v1';
const STORAGE_SELECTED_SPECIES_KEY = 'crts_tool_selected_species_v1';

function isValidStoredSpecies(item: unknown): item is TreeSpecies {
  if (!item || typeof item !== 'object') return false;
  const sp = item as Partial<TreeSpecies>;
  return (
    typeof sp.id === 'string' &&
    sp.id.length > 0 &&
    typeof sp.speciesName === 'string' &&
    sp.speciesName.length > 0 &&
    typeof sp.soilPreference === 'string' &&
    typeof sp.maxTempC === 'number' &&
    typeof sp.matMedianC === 'number' &&
    typeof sp.recordsCount === 'number'
  );
}

function loadStoredAddedSpecies(): TreeSpecies[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(STORAGE_ADDED_SPECIES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidStoredSpecies);
  } catch {
    return [];
  }
}

function loadStoredRemovedDefaultIds(): Set<string> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return new Set();
    const raw = window.localStorage.getItem(STORAGE_REMOVED_DEFAULT_IDS_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((id): id is string => typeof id === 'string' && DEFAULT_SPECIES_ID_SET.has(id))
    );
  } catch {
    return new Set();
  }
}

function buildInitialSpeciesDb(): TreeSpecies[] {
  const added = loadStoredAddedSpecies();
  const removedDefaults = loadStoredRemovedDefaultIds();
  const seenNames = new Set<string>();
  const combined: TreeSpecies[] = [];

  for (const sp of added) {
    const key = sp.speciesName.toLowerCase();
    if (!seenNames.has(key)) {
      seenNames.add(key);
      combined.push(sp);
    }
  }

  for (const sp of TREE_SPECIES_DATA) {
    if (removedDefaults.has(sp.id)) continue;
    const key = sp.speciesName.toLowerCase();
    if (!seenNames.has(key)) {
      seenNames.add(key);
      combined.push(sp);
    }
  }

  return combined;
}

function loadInitialSelectedSpeciesId(initialDb: TreeSpecies[]): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const savedId = window.localStorage.getItem(STORAGE_SELECTED_SPECIES_KEY);
    if (!savedId) return null;
    return initialDb.some((s) => s.id === savedId) ? savedId : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('explorer');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Active species database (UK native baseline + persisted user additions)
  const [speciesDb, setSpeciesDb] = useState<TreeSpecies[]>(() => buildInitialSpeciesDb());

  // Live Open-Meteo, GBIF & UK Soil state
  const [liveClimate, setLiveClimate] = useState<SiteClimateCalibration | null>(null);
  const [siteSoil, setSiteSoil] = useState<UkSiteSoilData | null>(null);
  const [gbifOverlay, setGbifOverlay] = useState<GbifMapOverlay | null>(null);
  const [gbifCatalogState, setGbifCatalogState] = useState<GbifCatalogBrowserState>(
    INITIAL_GBIF_CATALOG_STATE
  );

  // Collapsible sidebar climate parameter sections (start condensed by default)
  const [presetSectionOpen, setPresetSectionOpen] = useState(false);
  const [tempSectionOpen, setTempSectionOpen] = useState(false);
  const [droughtSectionOpen, setDroughtSectionOpen] = useState(false);
  const [characteristicsSectionOpen, setCharacteristicsSectionOpen] = useState(false);

  // Climate & Site State (Default: London SE Urban)
  const [climateScenario, setClimateScenario] = useState<ClimateScenarioId>('current');
  const [presetId, setPresetId] = useState<string>('london-uk');
  const [summerMinC, setSummerMinC] = useState<number>(24);
  const [summerMaxC, setSummerMaxC] = useState<number>(35);
  const [droughtStress, setDroughtStress] = useState<DroughtStressIndex>('Moderate');

  // Species Characteristic Filters
  const [droughtFilter, setDroughtFilter] = useState<DroughtTolerance[]>(ALL_DROUGHT_LEVELS);
  const [foliageFilter, setFoliageFilter] = useState<FoliageType[]>(ALL_FOLIAGE_TYPES);
  const [soilFilter, setSoilFilter] = useState<string[]>(() =>
    Array.from(
      new Set([...DEFAULT_SOIL_TYPES, ...loadStoredAddedSpecies().map((s) => s.soilPreference)])
    ).sort()
  );
  const [regionFilter, setRegionFilter] = useState<string>('All');

  // Selected Species Dossier (persisted across reloads)
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(() =>
    loadInitialSelectedSpeciesId(speciesDb)
  );

  // Persist user-added trees, removed default IDs, and selected tree dossier across reloads
  useEffect(() => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const addedSpecies = speciesDb.filter((s) => !DEFAULT_SPECIES_ID_SET.has(s.id));
      const presentIds = new Set(speciesDb.map((s) => s.id));
      const removedDefaultIds = TREE_SPECIES_DATA.filter((s) => !presentIds.has(s.id)).map(
        (s) => s.id
      );

      window.localStorage.setItem(STORAGE_ADDED_SPECIES_KEY, JSON.stringify(addedSpecies));
      window.localStorage.setItem(
        STORAGE_REMOVED_DEFAULT_IDS_KEY,
        JSON.stringify(removedDefaultIds)
      );
    } catch {
      // Ignore storage quota or private browsing errors
    }
  }, [speciesDb]);

  useEffect(() => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      if (selectedSpeciesId) {
        window.localStorage.setItem(STORAGE_SELECTED_SPECIES_KEY, selectedSpeciesId);
      } else {
        window.localStorage.removeItem(STORAGE_SELECTED_SPECIES_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, [selectedSpeciesId]);

  const availableSoilTypes = useMemo(
    () =>
      Array.from(
        new Set([...DEFAULT_SOIL_TYPES, ...speciesDb.map((s) => s.soilPreference)])
      ).sort(),
    [speciesDb]
  );

  const availableRegions = useMemo(
    () => Array.from(new Set(speciesDb.map((s) => s.nativeRegion))).sort(),
    [speciesDb]
  );

  const activePreset = useMemo(
    () => CLIMATE_PRESETS.find((p) => p.id === presetId) ?? null,
    [presetId]
  );

  const activeSiteLocation = useMemo(() => {
    if (liveClimate && presetId === 'live-api') {
      return {
        label: liveClimate.locationLabel,
        lat: liveClimate.latitude,
        lng: liveClimate.longitude,
      };
    }
    if (activePreset) {
      return {
        label: activePreset.label,
        lat: activePreset.lat,
        lng: activePreset.lng,
      };
    }
    return null;
  }, [liveClimate, presetId, activePreset]);

  const handleApplyPreset = (id: string) => {
    setPresetId(id);
    const preset = CLIMATE_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setSummerMinC(preset.summerMinC);
    setSummerMaxC(preset.summerMaxC);
    setDroughtStress(preset.droughtStress);
  };

  const handleApplyLiveClimate = (calibration: SiteClimateCalibration) => {
    setLiveClimate(calibration);
    setPresetId('live-api');
    setSummerMaxC(calibration.projectedSummerPeakC);
    setSummerMinC(calibration.projectedSummerMeanHighC);
    setDroughtStress(calibration.derivedDroughtStress);
  };

  const handleGbifRecordsSynced = useCallback(
    (speciesName: string, totalOccurrences: number, ukOccurrences: number) => {
      const norm = speciesName.toLowerCase().replace(/×/g, 'x').trim();
      setSpeciesDb((prev) =>
        prev.map((sp) =>
          sp.speciesName.toLowerCase().replace(/×/g, 'x').trim() === norm
            ? {
                ...sp,
                recordsCount: totalOccurrences,
                ukRecordsCount: ukOccurrences,
                gbifSynced: true,
              }
            : sp
        )
      );
    },
    []
  );

  const handleBatchUpdateGbifCounts = useCallback((updates: Map<string, number>) => {
    setSpeciesDb((prev) =>
      prev.map((sp) => {
        const nextCount = updates.get(sp.id);
        return nextCount !== undefined
          ? { ...sp, recordsCount: nextCount, gbifSynced: true }
          : sp;
      })
    );
  }, []);

  const handlePlotGbifResult = (result: GbifSpeciesResult) => {
    setGbifOverlay({
      taxonKey: result.taxonKey,
      speciesName: result.canonicalName,
      totalOccurrences: result.totalOccurrences,
      ukOccurrences: result.ukOccurrences,
      points: result.points,
    });
    handleGbifRecordsSynced(result.canonicalName, result.totalOccurrences, result.ukOccurrences);
  };

  const handlePlotGbifOnMap = (result: GbifSpeciesResult) => {
    handlePlotGbifResult(result);
    setActiveTab('map');
  };

  const handleAddGbifSpeciesToPalette = (newSpecies: TreeSpecies) => {
    setSpeciesDb((prev) => {
      const exists = prev.some(
        (s) => s.speciesName.toLowerCase() === newSpecies.speciesName.toLowerCase()
      );
      if (exists) return prev;
      return [newSpecies, ...prev];
    });
    setSoilFilter((prev) =>
      prev.includes(newSpecies.soilPreference) ? prev : [...prev, newSpecies.soilPreference]
    );
  };

  const handleAddMultipleGbifSpecies = (newList: TreeSpecies[]) => {
    setSpeciesDb((prev) => {
      const existing = new Set(prev.map((s) => s.speciesName.toLowerCase()));
      const filtered = newList.filter((s) => !existing.has(s.speciesName.toLowerCase()));
      return [...filtered, ...prev];
    });
    setSoilFilter((prev) => {
      const next = new Set(prev);
      for (const sp of newList) {
        next.add(sp.soilPreference);
      }
      return Array.from(next);
    });
  };

  const handleRemoveSpecies = useCallback((id: string) => {
    setSpeciesDb((prev) => prev.filter((s) => s.id !== id));
    setSelectedSpeciesId((prev) => (prev === id ? null : prev));
  }, []);

  const handleRemoveAllSpecies = useCallback(() => {
    setSpeciesDb([]);
    setSelectedSpeciesId(null);
  }, []);

  const handleRestoreDefaultCatalog = useCallback(() => {
    setSpeciesDb((prev) => {
      const existingNames = new Set(prev.map((s) => s.speciesName.toLowerCase()));
      const missingDefaults = TREE_SPECIES_DATA.filter(
        (s) => !existingNames.has(s.speciesName.toLowerCase())
      );
      return [...prev, ...missingDefaults];
    });
  }, []);

  const handleFilterBySoilPreference = useCallback((soilPreference: string) => {
    setSoilFilter([soilPreference]);
  }, []);

  const toggleDroughtFilter = (level: DroughtTolerance) => {
    setDroughtFilter((prev) =>
      prev.includes(level) ? prev.filter((x) => x !== level) : [...prev, level]
    );
  };

  const toggleFoliageFilter = (type: FoliageType) => {
    setFoliageFilter((prev) =>
      prev.includes(type) ? prev.filter((x) => x !== type) : [...prev, type]
    );
  };

  const toggleSoilFilter = (soil: string) => {
    setSoilFilter((prev) =>
      prev.includes(soil) ? prev.filter((x) => x !== soil) : [...prev, soil]
    );
  };

  const handleResetFilters = () => {
    handleApplyPreset('london-uk');
    setDroughtFilter(ALL_DROUGHT_LEVELS);
    setFoliageFilter(ALL_FOLIAGE_TYPES);
    setSoilFilter(availableSoilTypes);
    setRegionFilter('All');
  };

  const activeScenarioConfig = useMemo(
    () => CLIMATE_SCENARIOS.find((s) => s.id === climateScenario) ?? CLIMATE_SCENARIOS[0],
    [climateScenario]
  );

  const scenarioSummerMaxC = useMemo(
    () => Math.min(48, summerMaxC + activeScenarioConfig.tempDeltaC),
    [summerMaxC, activeScenarioConfig]
  );

  const scenarioSummerMinC = useMemo(
    () => Math.min(42, summerMinC + Math.max(0, activeScenarioConfig.tempDeltaC - 1)),
    [summerMinC, activeScenarioConfig]
  );

  const scenarioDroughtStress: DroughtStressIndex = useMemo(() => {
    if (climateScenario === 'current') return droughtStress;
    if (climateScenario === 'ssp2_2050') {
      return droughtStress === 'Low' ? 'Moderate' : droughtStress;
    }
    return droughtStress === 'Low' ? 'Moderate' : 'Severe';
  }, [climateScenario, droughtStress]);

  const baseSiteMatC = useMemo(() => {
    if (liveClimate && presetId === 'live-api') {
      return liveClimate.annualMeanTempC;
    }
    if (activePreset) {
      return activePreset.matC;
    }
    return Number((8 + (summerMinC - 17) * 0.65).toFixed(1));
  }, [liveClimate, presetId, activePreset, summerMinC]);

  const effectiveSiteMatC = useMemo(
    () => Number((baseSiteMatC + activeScenarioConfig.tempDeltaC).toFixed(1)),
    [baseSiteMatC, activeScenarioConfig]
  );

  const evaluatedSpecies = useMemo(() => {
    return speciesDb
      .filter((s) => {
        if (!droughtFilter.includes(s.droughtTolerance)) return false;
        if (!foliageFilter.includes(s.foliageType)) return false;
        if (!soilFilter.includes(s.soilPreference)) return false;
        if (regionFilter !== 'All' && s.nativeRegion !== regionFilter) return false;
        return true;
      })
      .map((s) =>
        evaluateSpeciesResilience(
          s,
          scenarioSummerMaxC,
          scenarioSummerMinC,
          scenarioDroughtStress,
          baseSiteMatC,
          effectiveSiteMatC
        )
      );
  }, [
    speciesDb,
    droughtFilter,
    foliageFilter,
    soilFilter,
    regionFilter,
    scenarioSummerMaxC,
    scenarioSummerMinC,
    scenarioDroughtStress,
    baseSiteMatC,
    effectiveSiteMatC,
  ]);

  const counts = useMemo(() => {
    let resilient = 0;
    let borderline = 0;
    let unsuited = 0;
    for (const s of evaluatedSpecies) {
      if (s.status === 'Fully Resilient') resilient++;
      else if (s.status === 'Borderline') borderline++;
      else unsuited++;
    }
    return {
      total: evaluatedSpecies.length,
      resilient,
      borderline,
      unsuited,
    };
  }, [evaluatedSpecies]);

  const selectedSpecies = useMemo(
    () => evaluatedSpecies.find((s) => s.id === selectedSpeciesId) ?? null,
    [evaluatedSpecies, selectedSpeciesId]
  );

  const handleExportCsv = () => {
    const csv = exportSpeciesToCsv(evaluatedSpecies);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `crts-tool-palette-${presetId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F2] text-[#1A1A1A]">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-[#FFFFFF]/95 backdrop-blur-xs border-b border-[#E2DFD7]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('explorer');
            }}
            title="CRTS Tool – Climate Resilient Tree Selection Tool"
            className="flex items-baseline gap-2.5 whitespace-nowrap shrink-0"
          >
            <span className="text-base sm:text-lg font-semibold tracking-tight text-[#1A1A1A]">
              CRTS Tool
            </span>
            <span className="hidden lg:inline text-xs font-normal text-[#5C5C58] border-l border-[#E2DFD7] pl-2.5">
              Climate Resilient Tree Selection Tool
            </span>
          </a>

          <nav
            aria-label="Primary sections"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            {(
              [
                { id: 'explorer', label: 'Species & Site' },
                { id: 'matrix', label: 'Risk Matrix' },
                { id: 'map', label: 'Maps' },
              ] as const
            ).map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                    active
                      ? 'text-[#2F4F3E] border-[#2F4F3E]'
                      : 'text-[#5C5C58] border-transparent hover:text-[#1A1A1A]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#2F4F3E] rounded-md hover:bg-[#243D30] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Mobile navigation row */}
        <div className="md:hidden border-t border-[#EAE7DF] px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto bg-[#FFFFFF]">
          <div className="flex items-center gap-2">
            {(
              [
                { id: 'explorer', label: 'Species & Site' },
                { id: 'matrix', label: 'Risk Matrix' },
                { id: 'map', label: 'Maps' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === item.id
                    ? 'bg-[#2F4F3E] text-white'
                    : 'text-[#5C5C58] hover:text-[#1A1A1A]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border border-[#E2DFD7] rounded bg-[#F7F6F2] text-[#1A1A1A] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Split */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-7 flex flex-col lg:flex-row gap-7 items-start">
        {/* Left Sidebar Controls */}
        <aside
          className={`${
            mobileSidebarOpen
              ? 'fixed inset-0 z-40 bg-[#FFFFFF] overflow-y-auto p-6'
              : 'hidden lg:block lg:w-[320px] xl:w-[336px] shrink-0 bg-[#FFFFFF] border border-[#E2DFD7] rounded-lg p-6'
          }`}
          aria-label="Climate and species filters"
        >
          <div className="flex items-center justify-between pb-4 border-b border-[#E2DFD7]">
            <h1 className="text-sm font-semibold text-[#1A1A1A]">Site Climate Parameters</h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-xs text-[#5C5C58] hover:text-[#1A1A1A] cursor-pointer"
                title="Reset climate and species filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
              {mobileSidebarOpen && (
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="lg:hidden p-1 text-[#5C5C58] hover:text-[#1A1A1A] cursor-pointer"
                  aria-label="Close filters"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="divide-y divide-[#EAE7DF] pt-2">
            {/* Location Preset (collapsed by default) */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => setPresetSectionOpen((prev) => !prev)}
                aria-expanded={presetSectionOpen}
                className="w-full flex items-center justify-between gap-2 text-left cursor-pointer group"
              >
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1A1A1A] group-hover:text-[#2F4F3E]">
                  {presetSectionOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#5C5C58]" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-[#5C5C58]" aria-hidden="true" />
                  )}
                  <span>Location / Climate Preset</span>
                </span>
                <span className="text-[11px] font-mono text-[#5C5C58] truncate max-w-[125px]">
                  {presetId === 'live-api' && liveClimate
                    ? liveClimate.locationLabel
                    : activePreset?.shortLabel ?? activePreset?.label ?? 'Custom'}
                </span>
              </button>

              {presetSectionOpen && (
                <div className="mt-3 pl-5 space-y-2">
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('explorer');
                        window.setTimeout(() => {
                          document
                            .getElementById('open-meteo-section')
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 50);
                        setMobileSidebarOpen(false);
                      }}
                      className="text-[11px] font-medium text-[#2F4F3E] hover:underline cursor-pointer"
                    >
                      Search any city
                    </button>
                  </div>
                  <select
                    id="climate-preset"
                    aria-label="Location / Climate Preset"
                    value={presetId}
                    onChange={(e) => handleApplyPreset(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F7F6F2] border border-[#E2DFD7] rounded-md text-[#1A1A1A] focus:outline-none focus:border-[#2F4F3E]"
                  >
                    {CLIMATE_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                    {liveClimate && (
                      <option value="live-api">
                        Live CMIP6: {liveClimate.locationLabel}
                      </option>
                    )}
                    <option value="custom">Custom Climate Envelope</option>
                  </select>
                  {presetId === 'live-api' && liveClimate ? (
                    <p className="text-[11px] text-[#2F4F3E]">
                      {liveClimate.sourceLabel} · {liveClimate.annualPrecipMm} mm/yr rain
                    </p>
                  ) : (
                    activePreset && (
                      <p className="text-[11px] text-[#5C5C58]">{activePreset.regionDetail}</p>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Expected Summer Temperature Sliders (collapsed by default) */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => setTempSectionOpen((prev) => !prev)}
                aria-expanded={tempSectionOpen}
                className="w-full flex items-center justify-between gap-2 text-left cursor-pointer group"
              >
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1A1A1A] group-hover:text-[#2F4F3E]">
                  {tempSectionOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#5C5C58]" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-[#5C5C58]" aria-hidden="true" />
                  )}
                  <span>Summer Temperature</span>
                </span>
                <span className="text-[11px] font-mono tabular-nums text-[#5C5C58]">
                  {summerMaxC}°C peak / {summerMinC}°C mean
                </span>
              </button>

              {tempSectionOpen && (
                <div className="mt-3 pl-5 space-y-3.5">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <label htmlFor="summer-max-slider" className="font-medium text-[#454541]">
                        Expected Summer Peak
                      </label>
                      <span className="font-mono tabular-nums font-semibold text-[#1A1A1A]">
                        {summerMaxC}°C ({Math.round((summerMaxC * 9) / 5 + 32)}°F)
                      </span>
                    </div>
                    <input
                      id="summer-max-slider"
                      type="range"
                      min={22}
                      max={46}
                      step={1}
                      value={summerMaxC}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setPresetId('custom');
                        setSummerMaxC(val);
                        if (val < summerMinC) setSummerMinC(val);
                      }}
                      className="w-full sc-slider"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-[#7A7A74] mt-1">
                      <span>22°C</span>
                      <span>34°C</span>
                      <span>46°C</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <label htmlFor="summer-min-slider" className="font-medium text-[#454541]">
                        Typical Summer Mean High
                      </label>
                      <span className="font-mono tabular-nums font-semibold text-[#1A1A1A]">
                        {summerMinC}°C ({Math.round((summerMinC * 9) / 5 + 32)}°F)
                      </span>
                    </div>
                    <input
                      id="summer-min-slider"
                      type="range"
                      min={15}
                      max={38}
                      step={1}
                      value={summerMinC}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setPresetId('custom');
                        setSummerMinC(val);
                        if (val > summerMaxC) setSummerMaxC(val);
                      }}
                      className="w-full sc-slider"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Drought Index (collapsed by default) */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => setDroughtSectionOpen((prev) => !prev)}
                aria-expanded={droughtSectionOpen}
                className="w-full flex items-center justify-between gap-2 text-left cursor-pointer group"
              >
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1A1A1A] group-hover:text-[#2F4F3E]">
                  {droughtSectionOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#5C5C58]" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-[#5C5C58]" aria-hidden="true" />
                  )}
                  <span>Summer Drought Index</span>
                </span>
                <span className="text-[11px] font-mono text-[#5C5C58]">{droughtStress}</span>
              </button>

              {droughtSectionOpen && (
                <div className="mt-3 pl-5">
                  <div className="grid grid-cols-3 gap-1 bg-[#F2F0EA] p-1 rounded-md border border-[#E2DFD7]">
                    {(['Low', 'Moderate', 'Severe'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => {
                          setPresetId('custom');
                          setDroughtStress(level);
                        }}
                        className={`py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                          droughtStress === level
                            ? 'bg-white text-[#1A1A1A] border border-[#E2DFD7]'
                            : 'text-[#5C5C58] hover:text-[#1A1A1A]'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Species Characteristic Filters (collapsed by default) */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => setCharacteristicsSectionOpen((prev) => !prev)}
                aria-expanded={characteristicsSectionOpen}
                className="w-full flex items-center justify-between gap-2 text-left cursor-pointer group"
              >
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1A1A1A] group-hover:text-[#2F4F3E]">
                  {characteristicsSectionOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#5C5C58]" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-[#5C5C58]" aria-hidden="true" />
                  )}
                  <span>Species Characteristics</span>
                </span>
                <span className="text-[11px] font-mono tabular-nums text-[#5C5C58]">
                  {soilFilter.length}/{availableSoilTypes.length} soils
                </span>
              </button>

              {characteristicsSectionOpen && (
                <div className="mt-3 pl-5 space-y-4">
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('explorer');
                        window.setTimeout(() => {
                          document
                            .getElementById('gbif-catalog-section')
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 50);
                        setMobileSidebarOpen(false);
                      }}
                      className="text-[11px] font-medium text-[#2F4F3E] hover:underline cursor-pointer"
                    >
                      + Add from GBIF
                    </button>
                  </div>

                  <div>
                    <span className="block text-xs text-[#5C5C58] mb-1.5">Drought Tolerance</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {ALL_DROUGHT_LEVELS.map((level) => {
                        const active = droughtFilter.includes(level);
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => toggleDroughtFilter(level)}
                            className={`py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer ${
                              active
                                ? 'bg-[#ECEFE9] text-[#2F4F3E] border-[#2F4F3E]/40'
                                : 'bg-[#F7F6F2] text-[#5C5C58] border-[#E2DFD7]'
                            }`}
                          >
                            {level}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs text-[#5C5C58] mb-1.5">Foliage Type</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {ALL_FOLIAGE_TYPES.map((type) => {
                        const active = foliageFilter.includes(type);
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => toggleFoliageFilter(type)}
                            className={`py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer truncate px-1 ${
                              active
                                ? 'bg-[#ECEFE9] text-[#2F4F3E] border-[#2F4F3E]/40'
                                : 'bg-[#F7F6F2] text-[#5C5C58] border-[#E2DFD7]'
                            }`}
                          >
                            {type}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs text-[#5C5C58] mb-1.5">Soil Preference</span>
                    <div className="space-y-1.5">
                      {availableSoilTypes.map((soil) => {
                        const checked = soilFilter.includes(soil);
                        return (
                          <label
                            key={soil}
                            className="flex items-center gap-2 text-xs text-[#1A1A1A] cursor-pointer select-none"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSoilFilter(soil)}
                              className="rounded border-[#C8C4BA] text-[#2F4F3E] focus:ring-[#2F4F3E]"
                            />
                            <span>{soil}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="native-region-select"
                      className="block text-xs text-[#5C5C58] mb-1.5"
                    >
                      Native Range / Region
                    </label>
                    <select
                      id="native-region-select"
                      value={regionFilter}
                      onChange={(e) => setRegionFilter(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[#F7F6F2] border border-[#E2DFD7] rounded-md text-[#1A1A1A] focus:outline-none focus:border-[#2F4F3E]"
                    >
                      <option value="All">All Biogeographic Regions</option>
                      {availableRegions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {mobileSidebarOpen && (
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="mt-6 w-full py-2.5 text-xs font-medium text-white bg-[#2F4F3E] rounded-md cursor-pointer lg:hidden"
            >
              Apply Filters ({evaluatedSpecies.length} species)
            </button>
          )}
        </aside>

        {/* Main Panel Output */}
        <main className="flex-1 min-w-0 space-y-6">
          {activeTab === 'explorer' && (
            <UkLocationBar
              activePresetId={presetId}
              liveClimate={liveClimate}
              siteSoil={siteSoil}
              onSelectLocation={handleApplyPreset}
              onApplyCustomCoordinates={handleApplyLiveClimate}
              onUpdateSiteSoil={setSiteSoil}
              onFilterBySoilPreference={handleFilterBySoilPreference}
            />
          )}

          {(activeTab === 'explorer' || activeTab === 'map' || activeTab === 'matrix') && (
            <ClimateScenarioSelector
              activeScenario={climateScenario}
              onSelectScenario={setClimateScenario}
              effectiveSummerMaxC={scenarioSummerMaxC}
              effectiveMatC={effectiveSiteMatC}
              effectiveDrought={scenarioDroughtStress}
            />
          )}

          {/* Summary Strip */}
          <section
            aria-label="Climate resilience summary"
            className="bg-[#FFFFFF] border border-[#E2DFD7] rounded-lg grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E2DFD7]"
          >
            <div className="px-5 py-4">
              <div className="text-xs text-[#5C5C58]">Species Evaluated</div>
              <div className="text-2xl font-mono tabular-nums font-semibold text-[#1A1A1A] mt-1">
                {counts.total}
              </div>
              <div className="text-[11px] text-[#5C5C58] mt-0.5">
                {activeScenarioConfig.title} ({activeScenarioConfig.horizon}) · {scenarioSummerMaxC}°C peak
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="text-xs text-[#2F4F3E] font-medium">Fully Resilient</div>
              <div className="text-2xl font-mono tabular-nums font-semibold text-[#2F4F3E] mt-1">
                {counts.resilient}
              </div>
              <div className="text-[11px] text-[#5C5C58] mt-0.5">
                Meets MAT, heat &amp; drought targets
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="text-xs text-[#9A5B13] font-medium">Borderline</div>
              <div className="text-2xl font-mono tabular-nums font-semibold text-[#9A5B13] mt-1">
                {counts.borderline}
              </div>
              <div className="text-[11px] text-[#5C5C58] mt-0.5">
                Requires microclimate or irrigation
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="text-xs text-[#9E2A2B] font-medium">Unsuited</div>
              <div className="text-2xl font-mono tabular-nums font-semibold text-[#9E2A2B] mt-1">
                {counts.unsuited}
              </div>
              <div className="text-[11px] text-[#5C5C58] mt-0.5">
                Exceeds MAT, heat, or drought limits
              </div>
            </div>
          </section>

          {activeTab === 'explorer' && (
            <>
              <ThermalEnvelopeChart
                speciesList={evaluatedSpecies}
                droughtStress={scenarioDroughtStress}
                summerMaxC={scenarioSummerMaxC}
                selectedSpeciesId={selectedSpeciesId}
                onSelectSpecies={(id) =>
                  setSelectedSpeciesId((prev) => (prev === id ? null : id))
                }
              />

              <SpeciesExplorerList
                speciesList={evaluatedSpecies}
                totalCatalogCount={speciesDb.length}
                selectedSpeciesId={selectedSpeciesId}
                activeScenario={climateScenario}
                baseMatC={baseSiteMatC}
                onSelectSpecies={(id) =>
                  setSelectedSpeciesId((prev) => (prev === id ? null : id))
                }
                onRemoveSpecies={handleRemoveSpecies}
                onRemoveAllSpecies={handleRemoveAllSpecies}
                onRestoreDefaultCatalog={handleRestoreDefaultCatalog}
                onResetFilters={handleResetFilters}
              />

              {selectedSpecies && (
                <SpeciesDetailPanel
                  species={selectedSpecies}
                  summerMaxC={scenarioSummerMaxC}
                  effectiveMatC={effectiveSiteMatC}
                  onClose={() => setSelectedSpeciesId(null)}
                  onPlotGbifOnMap={handlePlotGbifOnMap}
                  onGbifRecordsSynced={handleGbifRecordsSynced}
                />
              )}

              <div id="gbif-catalog-section">
                <ExternalDataIntegrations
                  speciesDb={speciesDb}
                  onBatchUpdateGbifCounts={handleBatchUpdateGbifCounts}
                  liveClimate={liveClimate}
                  onApplyLiveClimate={handleApplyLiveClimate}
                  onPlotGbifResult={handlePlotGbifResult}
                  onAddGbifSpeciesToPalette={handleAddGbifSpeciesToPalette}
                  onAddMultipleGbifSpecies={handleAddMultipleGbifSpecies}
                  catalogState={gbifCatalogState}
                  onCatalogStateChange={setGbifCatalogState}
                />
              </div>
            </>
          )}

          {activeTab === 'map' && (
            <>
              <BiogeographicMap
                speciesList={evaluatedSpecies}
                siteLocation={activeSiteLocation}
                siteSoil={siteSoil}
                onUpdateSiteSoil={setSiteSoil}
                selectedSpeciesId={selectedSpeciesId}
                onSelectSpecies={(id) =>
                  setSelectedSpeciesId((prev) => (prev === id ? null : id))
                }
                gbifOverlay={gbifOverlay}
                onSetGbifOverlay={handlePlotGbifResult}
                onClearGbifOverlay={() => setGbifOverlay(null)}
              />

              {selectedSpecies && (
                <SpeciesDetailPanel
                  species={selectedSpecies}
                  summerMaxC={scenarioSummerMaxC}
                  effectiveMatC={effectiveSiteMatC}
                  onClose={() => setSelectedSpeciesId(null)}
                  onPlotGbifOnMap={handlePlotGbifOnMap}
                  onGbifRecordsSynced={handleGbifRecordsSynced}
                />
              )}
            </>
          )}

          {activeTab === 'matrix' && (
            <>
              <ClimateMatrixView
                speciesList={evaluatedSpecies}
                effectiveMatC={effectiveSiteMatC}
                siteLabel={activeSiteLocation?.label ?? 'Custom Site'}
                onSelectSpecies={(id) =>
                  setSelectedSpeciesId((prev) => (prev === id ? null : id))
                }
              />

              {selectedSpecies && (
                <SpeciesDetailPanel
                  species={selectedSpecies}
                  summerMaxC={scenarioSummerMaxC}
                  effectiveMatC={effectiveSiteMatC}
                  onClose={() => setSelectedSpeciesId(null)}
                  onPlotGbifOnMap={handlePlotGbifOnMap}
                  onGbifRecordsSynced={handleGbifRecordsSynced}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
