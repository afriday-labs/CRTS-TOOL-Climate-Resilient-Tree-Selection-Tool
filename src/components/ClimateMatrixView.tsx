import { useMemo, useState } from 'react';
import { getMatRiskScore, type EvaluatedSpecies } from '../data/treeSpecies';
import { RecordsCell, RiskAssessmentLegend, RiskScoreCell } from './RiskVisuals';
import { StatusIndicator } from './StatusIndicator';

interface ClimateMatrixViewProps {
  speciesList: EvaluatedSpecies[];
  effectiveMatC: number;
  siteLabel: string;
  onSelectSpecies: (id: string) => void;
}

export function ClimateMatrixView({
  speciesList,
  effectiveMatC,
  siteLabel,
  onSelectSpecies,
}: ClimateMatrixViewProps) {
  const [sortByRecords, setSortByRecords] = useState<'default' | 'records-desc' | 'records-asc'>(
    'default'
  );

  const activeMatRounded = Math.round(effectiveMatC);

  const tempCols = useMemo(() => {
    const start = 4;
    const end = activeMatRounded > 20 ? Math.min(24, activeMatRounded + 1) : 20;
    const cols: number[] = [];
    for (let t = start; t <= end; t++) cols.push(t);
    return cols;
  }, [activeMatRounded]);

  const displayedSpecies = useMemo(() => {
    const copy = [...speciesList];
    if (sortByRecords === 'records-desc') {
      copy.sort((a, b) => b.effectiveRecords - a.effectiveRecords);
    } else if (sortByRecords === 'records-asc') {
      copy.sort((a, b) => a.effectiveRecords - b.effectiveRecords);
    }
    return copy;
  }, [speciesList, sortByRecords]);

  return (
    <div className="bg-white border border-[#E2E7E2] rounded-lg overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-4 px-5 py-4 border-b border-[#EAEFEA]">
        <div>
          <h2 className="text-base font-semibold text-[#141A16]">
            Climate Risk Assessment Matrix (Temperature in Celsius)
          </h2>
          <p className="text-xs text-[#5A655D] mt-0.5">
            Modeled after the BGCI Climate Assessment Tool. Outlined column ({activeMatRounded}°) marks {siteLabel} under the active scenario.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="matrix-records-sort" className="text-[#5A655D]">
            Order:
          </label>
          <select
            id="matrix-records-sort"
            value={sortByRecords}
            onChange={(e) =>
              setSortByRecords(e.target.value as 'default' | 'records-desc' | 'records-asc')
            }
            className="px-2.5 py-1 text-xs bg-[#FAFBFA] border border-[#DCE2DD] rounded text-[#141A16] focus:outline-none focus:border-[#1B5E3F]"
          >
            <option value="default">Default Palette</option>
            <option value="records-desc">Highest Records First</option>
            <option value="records-asc">Lowest Records First</option>
          </select>
        </div>
      </div>

      <RiskAssessmentLegend />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#E2E7E2] bg-[#F7F8F7] text-[11px] font-semibold text-[#4A554E]">
              <th className="py-2 px-3 text-left border-r border-[#EAEFEA] min-w-[175px]" rowSpan={2}>
                Species
              </th>
              <th
                className="py-2 px-3 text-left border-r border-[#EAEFEA]"
                rowSpan={2}
                title="GBIF occurrence records: Red = Low, Amber = Medium, Green = Good"
              >
                Records
              </th>
              <th className="py-2 px-3 text-left border-r border-[#EAEFEA] min-w-[150px]" rowSpan={2}>
                Native Range
              </th>
              <th className="py-2 px-2.5 text-right border-r border-[#E2E7E2]" rowSpan={2}>
                MAT
              </th>
              <th
                colSpan={tempCols.length}
                className="py-1.5 px-2 text-center border-b border-r border-[#E2E7E2] text-[#141A16]"
              >
                Temperature in Celsius (Mean Annual Temperature)
              </th>
              <th className="py-2 px-2.5 text-right border-r border-[#EAEFEA]" rowSpan={2}>
                Hottest Month
              </th>
              <th className="py-2 px-2.5 text-right border-r border-[#EAEFEA]" rowSpan={2}>
                Coldest Min
              </th>
              <th className="py-2 px-2.5 text-right border-r border-[#EAEFEA]" rowSpan={2}>
                Annual Precip.
              </th>
              <th className="py-2 px-3 text-left" rowSpan={2}>
                Site Status
              </th>
            </tr>
            <tr className="border-b border-[#E2E7E2] bg-[#F7F8F7] text-[11px] font-mono tabular-nums text-[#4A554E]">
              {tempCols.map((t) => {
                const isTarget = t === activeMatRounded;
                return (
                  <th
                    key={t}
                    className={`py-1.5 px-0.5 text-center w-8 border-r border-[#EAEFEA] ${
                      isTarget
                        ? 'bg-[#FFF5E6] text-[#141A16] font-bold border-x-2 border-t-2 border-x-[#141A16] border-t-[#141A16]'
                        : ''
                    }`}
                  >
                    {t}°
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAEFEA]">
            {displayedSpecies.map((s) => (
              <tr
                key={s.id}
                onClick={() => onSelectSpecies(s.id)}
                className="hover:bg-[#F7F9F7] cursor-pointer transition-colors"
              >
                <td className="py-2 px-3 border-r border-[#EAEFEA]">
                  <div className="font-semibold italic text-[#141A16]">{s.speciesName}</div>
                </td>
                <td className="py-2 px-3 border-r border-[#EAEFEA]">
                  <RecordsCell count={s.effectiveRecords} level={s.recordsLevel} compact />
                </td>
                <td className="py-2 px-3 border-r border-[#EAEFEA]">
                  <div className="text-[#2A332D] max-w-[175px]">
                    {s.nativeRegion}
                  </div>
                </td>
                <td className="py-2 px-2.5 text-right font-mono tabular-nums text-[#141A16] border-r border-[#E2E7E2] whitespace-nowrap">
                  {s.effectiveMatC.toFixed(1)} °C
                </td>
                {tempCols.map((t) => {
                  const score = getMatRiskScore(s, t);
                  const isTarget = t === activeMatRounded;
                  return (
                    <td
                      key={t}
                      className={`p-0 text-center border-r border-white ${
                        isTarget ? 'border-x-2 border-x-[#141A16]' : ''
                      }`}
                    >
                      <RiskScoreCell
                        score={score}
                        size="sm"
                        isHighlighted={isTarget}
                        titleSuffix={`${s.speciesName} at ${t}°C MAT`}
                      />
                    </td>
                  );
                })}
                <td className="py-2 px-2.5 text-right font-mono tabular-nums text-[#141A16] border-r border-[#EAEFEA] whitespace-nowrap">
                  {s.maxTempC}.0 °C
                </td>
                <td className="py-2 px-2.5 text-right font-mono tabular-nums text-[#3E4841] border-r border-[#EAEFEA] whitespace-nowrap">
                  {s.minWinterTempC}.0 °C
                </td>
                <td className="py-2 px-2.5 text-right font-mono tabular-nums text-[#3E4841] border-r border-[#EAEFEA] whitespace-nowrap">
                  {s.annualPrecipMm} mm/yr
                </td>
                <td className="py-2 px-3">
                  <StatusIndicator status={s.status} compact />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
