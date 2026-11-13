import { Download, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { BiogeographicMap, type GbifMapOverlay } from './components/BiogeographicMap';
import { ClimateMatrixView } from './components/ClimateMatrixView';
import {
  CLIMATE_SCENARIOS,
  ClimateScenarioSelector,
  type ClimateScenarioId,
} from './components/ClimateScenarioSelector';
import { ExternalDataIntegrations } from './components/ExternalDataIntegrations';
import { PythonExportView } from './components/PythonExportView';
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

type MainTab = 'explorer' | 'map' | 'matrix' | 'integrations' | 'python';

const ALL_DROUGHT_LEVELS: DroughtTolerance[] = ['Low', 'Med', 'High'];
const ALL_FOLIAGE_TYPES: FoliageType[] = ['Deciduous', 'Evergreen', 'Conifer'];
const ALL_SOIL_TYPES = Array.from(new Set(TREE_SPECIES_DATA.map((s) => s.soilPreference))).sort();

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('explorer');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Active species database (52 curated species + live GBIF catalog additions)
  const [speciesDb, setSpeciesDb] = useState<TreeSpecies[]>(TREE_SPECIES_DATA);

  // Live Open-Meteo & GBIF state
  const [liveClimate, setLiveClimate] = useState<SiteClimateCalibration | null>(null);
  const [gbifOverlay, setGbifOverlay] = useState<GbifMapOverlay | null>(null);

  // Climate & Site State (Default: London SE Urban)
  const [climateScenario, setClimateScenario] = useState<ClimateScenarioId>('current');
  const [presetId, setPresetId] = useState<string>('london-uk');
  const [summerMinC, setSummerMinC] = useState<number>(24);
  const [summerMaxC, setSummerMaxC] = useState<number>(35);
  const [droughtStress, setDroughtStress] = useState<DroughtStressIndex>('Moderate');

  // Species Characteristic Filters
  const [droughtFilter, setDroughtFilter] = useState<DroughtTolerance[]>(ALL_DROUGHT_LEVELS);
  const [foliageFilter, setFoliageFilter] = useState<FoliageType[]>(ALL_FOLIAGE_TYPES);
  const [soilFilter, setSoilFilter] = useState<string[]>(ALL_SOIL_TYPES);
  const [regionFilter, setRegionFilter] = useState<string>('All');

  // Selected Species Dossier
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);

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
    setSelectedSpeciesId(newSpecies.id);
    setActiveTab('explorer');
  };

  const handleAddMultipleGbifSpecies = (newList: TreeSpecies[]) => {
    setSpeciesDb((prev) => {
      const existing = new Set(prev.map((s) => s.speciesName.toLowerCase()));
      const filtered = newList.filter((s) => !existing.has(s.speciesName.toLowerCase()));
      return [...filtered, ...prev];
    });
    setActiveTab('explorer');
  };

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
    setSoilFilter(ALL_SOIL_TYPES);
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
    link.download = `sylvaclime-palette-${presetId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFA] text-[#141A16]">
      {/* Top Bar Contract: [Brand wordmark] — [5 concise single-line nav links] — [1 primary action] */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-[#E2E7E2]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('explorer');
            }}
            className="text-lg font-bold tracking-tight text-[#141A16] whitespace-nowrap shrink-0"
          >
            SylvaClime
          </a>

          <nav
            aria-label="Primary sections"
            className="hidden md:flex items-center gap-6 text-sm font-medium"
          >
            {(
              [
                { id: 'explorer', label: 'Explorer' },
                { id: 'matrix', label: 'Risk Matrix' },
                { id: 'map', label: 'Distribution Map' },
                { id: 'integrations', label: 'GBIF Catalog' },
                { id: 'python', label: 'Python Code' },
              ] as const
            ).map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                    active
                      ? 'text-[#1B5E3F] border-[#1B5E3F]'
                      : 'text-[#5A655D] border-transparent hover:text-[#141A16]'
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
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1B5E3F] rounded-md hover:bg-[#154A31] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Mobile navigation row */}
        <div className="md:hidden border-t border-[#EAEFEA] px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-2.5">
            {(
              [
                { id: 'explorer', label: 'Explorer' },
                { id: 'matrix', label: 'Matrix' },
                { id: 'map', label: 'Map' },
                { id: 'integrations', label: 'GBIF' },
                { id: 'python', label: 'Python' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === item.id
                    ? 'bg-[#1B5E3F] text-white'
                    : 'text-[#5A655D] hover:text-[#141A16]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border border-[#DCE2DD] rounded bg-white text-[#141A16] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Split */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Sidebar Controls */}
        <aside
          className={`${
            mobileSidebarOpen
              ? 'fixed inset-0 z-40 bg-white overflow-y-auto p-5'
              : 'hidden lg:block lg:w-[320px] xl:w-[336px] shrink-0 bg-white border border-[#E2E7E2] rounded-lg p-5'
          }`}
          aria-label="Climate and species filters"
        >
          <div className="flex items-center justify-between pb-3.5 border-b border-[#EAEFEA]">
            <h1 className="text-sm font-semibold text-[#141A16]">Site Climate Parameters</h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-xs text-[#5A655D] hover:text-[#141A16] cursor-pointer"
                title="Reset climate and species filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
              {mobileSidebarOpen && (
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="lg:hidden p-1 text-[#5A655D] hover:text-[#141A16] cursor-pointer"
                  aria-label="Close filters"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-5 pt-4">
            {/* Location Preset */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="climate-preset"
                  className="text-xs font-medium text-[#3E4841]"
                >
                  Location / Climate Preset
                </label>
                <button
                  type="button"
                  onClick={() => setActiveTab('integrations')}
                  className="text-[11px] font-medium text-[#1B5E3F] hover:underline cursor-pointer"
                >
                  Search any city
                </button>
              </div>
              <select
                id="climate-preset"
                value={presetId}
                onChange={(e) => handleApplyPreset(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FAFBFA] border border-[#DCE2DD] rounded-md text-[#141A16] focus:outline-none focus:border-[#1B5E3F]"
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
                <p className="mt-1.5 text-[11px] text-[#1B5E3F]">
                  {liveClimate.sourceLabel} · {liveClimate.annualPrecipMm} mm/yr rain
                </p>
              ) : (
                activePreset && (
                  <p className="mt-1.5 text-[11px] text-[#5A655D]">{activePreset.regionDetail}</p>
                )
              )}
            </div>

            {/* Expected Summer Temperature Sliders */}
            <div className="space-y-3 pt-1 border-t border-[#EAEFEA]">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label htmlFor="summer-max-slider" className="font-medium text-[#3E4841]">
                    Expected Summer Peak
                  </label>
                  <span className="font-mono tabular-nums font-semibold text-[#141A16]">
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
                <div className="flex justify-between text-[10px] font-mono text-[#78857C] mt-1">
                  <span>22°C</span>
                  <span>34°C</span>
                  <span>46°C</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label htmlFor="summer-min-slider" className="font-medium text-[#3E4841]">
                    Typical Summer Mean High
                  </label>
                  <span className="font-mono tabular-nums font-semibold text-[#141A16]">
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

            {/* Drought Index */}
            <div className="pt-1 border-t border-[#EAEFEA]">
              <span className="block text-xs font-medium text-[#3E4841] mb-2">
                Projected Summer Drought Index
              </span>
              <div className="grid grid-cols-3 gap-1 bg-[#F2F4F2] p-1 rounded-md border border-[#E2E7E2]">
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
                        ? 'bg-white text-[#141A16] shadow-xs'
                        : 'text-[#5A655D] hover:text-[#141A16]'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Species Characteristic Filters */}
            <div className="pt-3 border-t border-[#EAEFEA] space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-[#141A16]">Species Characteristics</h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('integrations')}
                  className="text-[11px] font-medium text-[#1B5E3F] hover:underline cursor-pointer"
                >
                  + Add from GBIF
                </button>
              </div>

              <div>
                <span className="block text-xs text-[#5A655D] mb-1.5">Drought Tolerance</span>
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
                            ? 'bg-[#1B5E3F]/10 text-[#1B5E3F] border-[#1B5E3F]/40'
                            : 'bg-[#FAFBFA] text-[#5A655D] border-[#DCE2DD]'
                        }`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="block text-xs text-[#5A655D] mb-1.5">Foliage Type</span>
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
                            ? 'bg-[#1B5E3F]/10 text-[#1B5E3F] border-[#1B5E3F]/40'
                            : 'bg-[#FAFBFA] text-[#5A655D] border-[#DCE2DD]'
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="block text-xs text-[#5A655D] mb-1.5">Soil Preference</span>
                <div className="space-y-1.5">
                  {ALL_SOIL_TYPES.map((soil) => {
                    const checked = soilFilter.includes(soil);
                    return (
                      <label
                        key={soil}
                        className="flex items-center gap-2 text-xs text-[#2A332D] cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSoilFilter(soil)}
                          className="rounded border-[#C5D1C8] text-[#1B5E3F] focus:ring-[#1B5E3F]"
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
                  className="block text-xs text-[#5A655D] mb-1.5"
                >
                  Native Range / Region
                </label>
                <select
                  id="native-region-select"
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#FAFBFA] border border-[#DCE2DD] rounded-md text-[#141A16] focus:outline-none focus:border-[#1B5E3F]"
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
          </div>

          {mobileSidebarOpen && (
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="mt-6 w-full py-2.5 text-xs font-medium text-white bg-[#1B5E3F] rounded-md cursor-pointer lg:hidden"
            >
              Apply Filters ({evaluatedSpecies.length} species)
            </button>
          )}
        </aside>

        {/* Main Panel Output */}
        <main className="flex-1 min-w-0 space-y-5">
          {activeTab === 'explorer' && (
            <UkLocationBar
              activePresetId={presetId}
              liveClimate={liveClimate}
              onSelectLocation={handleApplyPreset}
              onApplyCustomCoordinates={handleApplyLiveClimate}
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
            className="bg-white border border-[#E2E7E2] rounded-lg grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#EAEFEA]"
          >
            <div className="px-5 py-4">
              <div className="text-xs text-[#5A655D]">Species Evaluated</div>
              <div className="text-2xl font-mono tabular-nums font-semibold text-[#141A16] mt-1">
                {counts.total}
              </div>
              <div className="text-[11px] text-[#647068] mt-0.5">
                {activeScenarioConfig.title} ({activeScenarioConfig.horizon}) · {scenarioSummerMaxC}°C peak
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="text-xs text-[#166534] font-medium">Fully Resilient</div>
              <div className="text-2xl font-mono tabular-nums font-semibold text-[#166534] mt-1">
                {counts.resilient}
              </div>
              <div className="text-[11px] text-[#647068] mt-0.5">
                Meets MAT, heat &amp; drought targets
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="text-xs text-[#B45309] font-medium">Borderline</div>
              <div className="text-2xl font-mono tabular-nums font-semibold text-[#B45309] mt-1">
                {counts.borderline}
              </div>
              <div className="text-[11px] text-[#647068] mt-0.5">
                Requires microclimate or irrigation
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="text-xs text-[#B91C1C] font-medium">Unsuited</div>
              <div className="text-2xl font-mono tabular-nums font-semibold text-[#B91C1C] mt-1">
                {counts.unsuited}
              </div>
              <div className="text-[11px] text-[#647068] mt-0.5">
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

              <SpeciesExplorerList
                speciesList={evaluatedSpecies}
                selectedSpeciesId={selectedSpeciesId}
                activeScenario={climateScenario}
                baseMatC={baseSiteMatC}
                onSelectSpecies={(id) =>
                  setSelectedSpeciesId((prev) => (prev === id ? null : id))
                }
                onResetFilters={handleResetFilters}
              />
            </>
          )}

          {activeTab === 'map' && (
            <>
              <BiogeographicMap
                speciesList={evaluatedSpecies}
                siteLocation={activeSiteLocation}
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

          {activeTab === 'integrations' && (
            <ExternalDataIntegrations
              speciesDb={speciesDb}
              onBatchUpdateGbifCounts={handleBatchUpdateGbifCounts}
              liveClimate={liveClimate}
              onApplyLiveClimate={handleApplyLiveClimate}
              onPlotGbifResult={handlePlotGbifResult}
              onAddGbifSpeciesToPalette={handleAddGbifSpeciesToPalette}
              onAddMultipleGbifSpecies={handleAddMultipleGbifSpecies}
            />
          )}

          {activeTab === 'python' && <PythonExportView />}
        </main>
      </div>
    </div>
  );
}
