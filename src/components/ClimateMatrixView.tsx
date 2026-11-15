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
    <div className="bg-white border border-[#E2DFD7] rounded-lg overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-4 px-5 py-4 border-b border-[#EAE7DF]">
        <div>
          <h2 className="text-base font-semibold text-[#1A1A1A] tracking-tight">
            Climate Risk Assessment Matrix (Temperature in Celsius)
          </h2>
          <p className="text-xs text-[#5C5C58] mt-0.5">
            Modeled after the BGCI Climate Assessment Tool. Outlined column ({activeMatRounded}°) marks {siteLabel} under the active scenario.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="matrix-records-sort" className="text-[#5C5C58]">
            Order:
          </label>
          <select
            id="matrix-records-sort"
            value={sortByRecords}
            onChange={(e) =>
              setSortByRecords(e.target.value as 'default' | 'records-desc' | 'records-asc')
            }
            className="px-2.5 py-1 text-xs bg-[#F7F6F2] border border-[#E2DFD7] rounded text-[#1A1A1A] focus:outline-none focus:border-[#2F4F3E]"
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
            <tr className="border-b border-[#E2DFD7] bg-[#F2F0EA] text-[11px] font-semibold text-[#5C5C58]">
              <th className="py-2 px-3 text-left border-r border-[#EAE7DF] min-w-[175px]" rowSpan={2}>
                Species
              </th>
              <th
                className="py-2 px-3 text-left border-r border-[#EAE7DF]"
                rowSpan={2}
                title="GBIF occurrence records: Red = Low, Amber = Medium, Green = Good"
              >
                Records
              </th>
              <th className="py-2 px-3 text-left border-r border-[#EAE7DF] min-w-[150px]" rowSpan={2}>
                Native Range
              </th>
              <th className="py-2 px-2.5 text-right border-r border-[#E2DFD7]" rowSpan={2}>
                MAT
              </th>
              <th
                colSpan={tempCols.length}
                className="py-1.5 px-2 text-center border-b border-r border-[#E2DFD7] text-[#1A1A1A]"
              >
                Temperature in Celsius (Mean Annual Temperature)
              </th>
              <th className="py-2 px-2.5 text-right border-r border-[#EAE7DF]" rowSpan={2}>
                Hottest Month
              </th>
              <th className="py-2 px-2.5 text-right border-r border-[#EAE7DF]" rowSpan={2}>
                Coldest Min
              </th>
              <th className="py-2 px-2.5 text-right border-r border-[#EAE7DF]" rowSpan={2}>
                Annual Precip.
              </th>
              <th className="py-2 px-3 text-left" rowSpan={2}>
                Site Status
              </th>
            </tr>
            <tr className="border-b border-[#E2DFD7] bg-[#F2F0EA] text-[11px] font-mono tabular-nums text-[#5C5C58]">
              {tempCols.map((t) => {
                const isTarget = t === activeMatRounded;
                return (
                  <th
                    key={t}
                    className={`py-1.5 px-0.5 text-center w-8 border-r border-[#EAE7DF] ${
                      isTarget
                        ? 'bg-[#F7F3E8] text-[#1A1A1A] font-bold border-x-2 border-t-2 border-x-[#1A1A1A] border-t-[#1A1A1A]'
                        : ''
                    }`}
                  >
                    {t}°
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAE7DF]">
            {displayedSpecies.map((s) => (
              <tr
                key={s.id}
                onClick={() => onSelectSpecies(s.id)}
                className="hover:bg-[#F7F6F2] cursor-pointer transition-colors"
              >
                <td className="py-2 px-3 border-r border-[#EAE7DF]">
                  <div className="font-semibold italic text-[#1A1A1A]">{s.speciesName}</div>
                </td>
                <td className="py-2 px-3 border-r border-[#EAE7DF]">
                  <RecordsCell count={s.effectiveRecords} level={s.recordsLevel} compact />
                </td>
                <td className="py-2 px-3 border-r border-[#EAE7DF]">
                  <div className="text-[#454541] max-w-[175px]">
                    {s.nativeRegion}
                  </div>
                </td>
                <td className="py-2 px-2.5 text-right font-mono tabular-nums text-[#1A1A1A] border-r border-[#E2DFD7] whitespace-nowrap">
                  {s.effectiveMatC.toFixed(1)} °C
                </td>
                {tempCols.map((t) => {
                  const score = getMatRiskScore(s, t);
                  const isTarget = t === activeMatRounded;
                  return (
                    <td
                      key={t}
                      className={`p-0 text-center border-r border-white ${
                        isTarget ? 'border-x-2 border-x-[#1A1A1A]' : ''
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
                <td className="py-2 px-2.5 text-right font-mono tabular-nums text-[#1A1A1A] border-r border-[#EAE7DF] whitespace-nowrap">
                  {s.maxTempC}.0 °C
                </td>
                <td className="py-2 px-2.5 text-right font-mono tabular-nums text-[#454541] border-r border-[#EAE7DF] whitespace-nowrap">
                  {s.minWinterTempC}.0 °C
                </td>
                <td className="py-2 px-2.5 text-right font-mono tabular-nums text-[#454541] border-r border-[#EAE7DF] whitespace-nowrap">
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
