import { ArrowUpDown, LayoutGrid, Search, Table as TableIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { EvaluatedSpecies, ResilienceStatus } from '../data/treeSpecies';
import type { ClimateScenarioId } from './ClimateScenarioSelector';
import { RecordsCell, RiskAssessmentLegend, RiskScoreCell } from './RiskVisuals';
import { StatusIndicator } from './StatusIndicator';

interface SpeciesExplorerListProps {
  speciesList: EvaluatedSpecies[];
  selectedSpeciesId: string | null;
  activeScenario: ClimateScenarioId;
  baseMatC: number;
  onSelectSpecies: (id: string) => void;
  onResetFilters: () => void;
}

type ViewMode = 'table' | 'grid';
type SortKey =
  | 'status'
  | 'speciesName'
  | 'records'
  | 'mat'
  | 'maxTempC'
  | 'droughtTolerance';

const STATUS_WEIGHT: Record<ResilienceStatus, number> = {
  'Fully Resilient': 0,
  Borderline: 1,
  Unsuited: 2,
};

const DROUGHT_WEIGHT = { High: 3, Med: 2, Low: 1 };

export function SpeciesExplorerList({
  speciesList,
  selectedSpeciesId,
  activeScenario,
  baseMatC,
  onSelectSpecies,
  onResetFilters,
}: SpeciesExplorerListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [statusFilter, setStatusFilter] = useState<'All' | ResilienceStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortAsc, setSortAsc] = useState(true);

  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = speciesList.filter((s) => {
      if (statusFilter !== 'All' && s.status !== statusFilter) return false;
      if (!q) return true;
      return (
        s.speciesName.toLowerCase().includes(q) ||
        s.nativeRegion.toLowerCase().includes(q) ||
        s.soilPreference.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'status') {
        cmp = STATUS_WEIGHT[a.status] - STATUS_WEIGHT[b.status];
        if (cmp === 0) cmp = b.thermalMarginC - a.thermalMarginC;
      } else if (sortKey === 'speciesName') {
        cmp = a.speciesName.localeCompare(b.speciesName);
      } else if (sortKey === 'records') {
        cmp = a.effectiveRecords - b.effectiveRecords;
      } else if (sortKey === 'mat') {
        cmp = a.effectiveMatC - b.effectiveMatC;
      } else if (sortKey === 'maxTempC') {
        cmp = a.maxTempC - b.maxTempC;
      } else if (sortKey === 'droughtTolerance') {
        cmp = DROUGHT_WEIGHT[a.droughtTolerance] - DROUGHT_WEIGHT[b.droughtTolerance];
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [speciesList, statusFilter, searchQuery, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'speciesName' || key === 'status' || key === 'mat');
    }
  };

  const mat2020 = Math.round(baseMatC);
  const mat2050 = Math.round(baseMatC + 2);
  const mat2090 = Math.round(baseMatC + 4);

  return (
    <div className="bg-white border border-[#E2E7E2] rounded-lg overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[#EAEFEA]">
        <div className="flex flex-wrap items-center gap-1.5 bg-[#F2F4F2] p-1 rounded-md border border-[#E2E7E2]">
          {(['All', 'Fully Resilient', 'Borderline', 'Unsuited'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === tab
                  ? 'bg-white text-[#141A16] shadow-xs'
                  : 'text-[#5A655D] hover:text-[#141A16]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search
              className="w-3.5 h-3.5 text-[#647068] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search species, range, soil..."
              aria-label="Search tree species"
              className="pl-8 pr-3 py-1.5 text-xs bg-[#FAFBFA] border border-[#DCE2DD] rounded-md text-[#141A16] placeholder:text-[#78857C] focus:outline-none focus:border-[#1B5E3F] w-52 sm:w-60"
            />
          </div>

          <div className="flex items-center bg-[#F2F4F2] p-1 rounded-md border border-[#E2E7E2]">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                viewMode === 'table'
                  ? 'bg-white text-[#141A16] shadow-xs'
                  : 'text-[#5A655D] hover:text-[#141A16]'
              }`}
              aria-label="Table view"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                viewMode === 'grid'
                  ? 'bg-white text-[#141A16] shadow-xs'
                  : 'text-[#5A655D] hover:text-[#141A16]'
              }`}
              aria-label="Card grid view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
          </div>
        </div>
      </div>

      <RiskAssessmentLegend />

      {filteredAndSorted.length === 0 ? (
        <div className="py-14 px-6 text-center">
          <p className="text-sm font-medium text-[#141A16]">
            No tree species match the active climatic and soil filters.
          </p>
          <p className="text-xs text-[#5A655D] mt-1">
            Widen the drought tolerance, soil preference, or status filter to inspect borderline candidates.
          </p>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('All');
              setSearchQuery('');
              onResetFilters();
            }}
            className="mt-4 px-4 py-2 text-xs font-medium text-white bg-[#1B5E3F] rounded-md hover:bg-[#154A31] transition-colors cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E7E2] bg-[#F7F9F7] text-[11px] font-semibold text-[#5A655D]">
                <th className="py-2 px-4 border-r border-[#EAEFEA]" rowSpan={2}>
                  <button
                    type="button"
                    onClick={() => handleSort('speciesName')}
                    className="inline-flex items-center gap-1 hover:text-[#141A16] cursor-pointer"
                  >
                    <span>Species</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th
                  className="py-2 px-3 border-r border-[#EAEFEA]"
                  rowSpan={2}
                  title="GBIF occurrence records: Red = Low (<10k), Amber = Medium (10k-50k), Green = Good (50k+)"
                >
                  <button
                    type="button"
                    onClick={() => handleSort('records')}
                    className="inline-flex items-center gap-1 hover:text-[#141A16] cursor-pointer"
                  >
                    <span>Records</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2 px-3 border-r border-[#EAEFEA]" rowSpan={2}>
                  Native Range
                </th>
                <th
                  className="py-2 px-3 border-r border-[#EAEFEA] text-right"
                  rowSpan={2}
                  title="Species median Mean Annual Temperature (°C)"
                >
                  <button
                    type="button"
                    onClick={() => handleSort('mat')}
                    className="inline-flex items-center gap-1 hover:text-[#141A16] cursor-pointer ml-auto"
                  >
                    <span>MAT</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th
                  colSpan={3}
                  className="py-1.5 px-2 text-center border-b border-r border-[#E2E7E2] text-[#141A16]"
                >
                  Site MAT Risk Assessment (0–3)
                </th>
                <th className="py-2 px-3 border-r border-[#EAEFEA]" rowSpan={2}>
                  <button
                    type="button"
                    onClick={() => handleSort('status')}
                    className="inline-flex items-center gap-1 hover:text-[#141A16] cursor-pointer"
                  >
                    <span>Resilience</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2 px-3 border-r border-[#EAEFEA] text-right" rowSpan={2}>
                  <button
                    type="button"
                    onClick={() => handleSort('maxTempC')}
                    className="inline-flex items-center gap-1 hover:text-[#141A16] cursor-pointer ml-auto"
                  >
                    <span>Hottest Month</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2 px-3 border-r border-[#EAEFEA]" rowSpan={2}>
                  <button
                    type="button"
                    onClick={() => handleSort('droughtTolerance')}
                    className="inline-flex items-center gap-1 hover:text-[#141A16] cursor-pointer"
                  >
                    <span>Drought</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2 px-3" rowSpan={2}>
                  Soil Preference
                </th>
              </tr>
              <tr className="border-b border-[#E2E7E2] bg-[#F7F9F7] text-[10px] font-mono tabular-nums text-[#4A554E]">
                <th
                  className={`py-1 px-1.5 text-center border-r border-[#EAEFEA] ${
                    activeScenario === 'current'
                      ? 'bg-[#FFF5E6] text-[#141A16] font-bold border-x-2 border-t-2 border-x-[#141A16] border-t-[#141A16]'
                      : ''
                  }`}
                >
                  2020 ({mat2020}°)
                </th>
                <th
                  className={`py-1 px-1.5 text-center border-r border-[#EAEFEA] ${
                    activeScenario === 'ssp2_2050'
                      ? 'bg-[#FFF5E6] text-[#141A16] font-bold border-x-2 border-t-2 border-x-[#141A16] border-t-[#141A16]'
                      : ''
                  }`}
                >
                  2050 ({mat2050}°)
                </th>
                <th
                  className={`py-1 px-1.5 text-center border-r border-[#E2E7E2] ${
                    activeScenario === 'ssp3_2090'
                      ? 'bg-[#FFF5E6] text-[#141A16] font-bold border-x-2 border-t-2 border-x-[#141A16] border-t-[#141A16]'
                      : ''
                  }`}
                >
                  2090 ({mat2090}°)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEFEA] text-xs">
              {filteredAndSorted.map((s) => {
                const isSelected = selectedSpeciesId === s.id;
                return (
                  <tr
                    key={s.id}
                    onClick={() => onSelectSpecies(s.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#1B5E3F]/[0.06]' : 'hover:bg-[#F7F9F7]'
                    }`}
                  >
                    <td className="py-2.5 px-4 border-r border-[#EAEFEA]">
                      <div className="font-semibold italic text-[#141A16]">{s.speciesName}</div>
                    </td>
                    <td className="py-2.5 px-3 border-r border-[#EAEFEA]">
                      <RecordsCell count={s.effectiveRecords} level={s.recordsLevel} />
                    </td>
                    <td className="py-2.5 px-3 border-r border-[#EAEFEA] text-[#3E4841] max-w-[190px]">
                      {s.nativeRegion}
                    </td>
                    <td className="py-2.5 px-3 border-r border-[#EAEFEA] text-right font-mono tabular-nums text-[#141A16] whitespace-nowrap">
                      {s.effectiveMatC.toFixed(1)} °C
                    </td>
                    <td
                      className={`py-1.5 px-1 text-center border-r border-[#EAEFEA] ${
                        activeScenario === 'current' ? 'border-x-2 border-x-[#141A16] bg-[#FFFDF8]' : ''
                      }`}
                    >
                      <RiskScoreCell
                        score={s.matRiskNow}
                        isHighlighted={activeScenario === 'current'}
                        titleSuffix={`2020 · ${mat2020}°C MAT`}
                      />
                    </td>
                    <td
                      className={`py-1.5 px-1 text-center border-r border-[#EAEFEA] ${
                        activeScenario === 'ssp2_2050' ? 'border-x-2 border-x-[#141A16] bg-[#FFFDF8]' : ''
                      }`}
                    >
                      <RiskScoreCell
                        score={s.matRisk2050}
                        isHighlighted={activeScenario === 'ssp2_2050'}
                        titleSuffix={`2050 SSP2 · ${mat2050}°C MAT`}
                      />
                    </td>
                    <td
                      className={`py-1.5 px-1 text-center border-r border-[#E2E7E2] ${
                        activeScenario === 'ssp3_2090' ? 'border-x-2 border-x-[#141A16] bg-[#FFFDF8]' : ''
                      }`}
                    >
                      <RiskScoreCell
                        score={s.matRisk2090}
                        isHighlighted={activeScenario === 'ssp3_2090'}
                        titleSuffix={`2090 SSP3 · ${mat2090}°C MAT`}
                      />
                    </td>
                    <td className="py-2.5 px-3 border-r border-[#EAEFEA]">
                      <StatusIndicator status={s.status} compact />
                    </td>
                    <td className="py-2.5 px-3 border-r border-[#EAEFEA] text-right font-mono tabular-nums whitespace-nowrap">
                      <span className="font-semibold text-[#141A16]">{s.maxTempC}°C</span>
                      <span
                        className={`ml-1 text-[11px] ${
                          s.thermalMarginC >= 2
                            ? 'text-[#166534]'
                            : s.thermalMarginC >= -2
                            ? 'text-[#B45309]'
                            : 'text-[#B91C1C]'
                        }`}
                      >
                        ({s.thermalMarginC >= 0 ? `+${s.thermalMarginC}` : s.thermalMarginC}°)
                      </span>
                    </td>
                    <td className="py-2.5 px-3 border-r border-[#EAEFEA] font-medium text-[#2A332D]">
                      {s.droughtTolerance}
                    </td>
                    <td className="py-2.5 px-3 text-[#3E4841] whitespace-nowrap">
                      {s.soilPreference}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-5">
          {filteredAndSorted.map((s) => {
            const isSelected = selectedSpeciesId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectSpecies(s.id)}
                className={`text-left p-4 rounded-md border transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-[#1B5E3F] bg-[#1B5E3F]/[0.04]'
                    : 'border-[#E2E7E2] bg-white hover:border-[#B8C4BA]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold italic text-[#141A16]">{s.speciesName}</h3>
                  <StatusIndicator status={s.status} compact />
                </div>

                <div className="mt-3 pt-3 border-t border-[#EAEFEA] space-y-2 text-xs text-[#3E4841]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#647068]">Records</span>
                    <RecordsCell count={s.effectiveRecords} level={s.recordsLevel} compact />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#647068]">MAT Risk (2020 / 50 / 90)</span>
                    <div className="inline-flex items-center gap-1">
                      <RiskScoreCell
                        score={s.matRiskNow}
                        size="sm"
                        isHighlighted={activeScenario === 'current'}
                      />
                      <RiskScoreCell
                        score={s.matRisk2050}
                        size="sm"
                        isHighlighted={activeScenario === 'ssp2_2050'}
                      />
                      <RiskScoreCell
                        score={s.matRisk2090}
                        size="sm"
                        isHighlighted={activeScenario === 'ssp3_2090'}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#647068]">Species MAT / Max</span>
                    <span className="font-mono tabular-nums text-[#141A16]">
                      {s.effectiveMatC.toFixed(1)}°C / {s.maxTempC}°C
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#647068]">Drought / Soil</span>
                    <span className="text-[#141A16] text-right">
                      {s.droughtTolerance} · {s.soilPreference}
                    </span>
                  </div>
                </div>

                <p className="mt-2.5 text-[11px] text-[#5A655D] line-clamp-2">
                  {s.nativeRegion} — {s.reasons[0]}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
