import { useMemo, useState } from 'react';
import type { DroughtStressIndex, DroughtTolerance, EvaluatedSpecies } from '../data/treeSpecies';
import { StatusIndicator } from './StatusIndicator';

interface ThermalEnvelopeChartProps {
  speciesList: EvaluatedSpecies[];
  droughtStress: DroughtStressIndex;
  summerMaxC: number;
  selectedSpeciesId: string | null;
  onSelectSpecies: (id: string) => void;
}

const DROUGHT_TIERS: Array<{ key: DroughtTolerance; label: string; colIndex: number }> = [
  { key: 'Low', label: 'Low Drought Tolerance', colIndex: 0 },
  { key: 'Med', label: 'Moderate Drought Tolerance', colIndex: 1 },
  { key: 'High', label: 'High Drought Tolerance', colIndex: 2 },
];

const STRESS_MIN_COL: Record<DroughtStressIndex, number> = {
  Low: 0,
  Moderate: 1,
  Severe: 2,
};

export function ThermalEnvelopeChart({
  speciesList,
  droughtStress,
  summerMaxC,
  selectedSpeciesId,
  onSelectSpecies,
}: ThermalEnvelopeChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const width = 820;
  const height = 340;
  const pad = { top: 28, right: 28, bottom: 44, left: 54 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const minTemp = 26;
  const maxTemp = 47;
  const colW = plotW / 3;

  const colCenterX = (colIndex: number) => pad.left + colW * colIndex + colW / 2;
  const yScale = (t: number) => pad.top + ((maxTemp - t) / (maxTemp - minTemp)) * plotH;

  const hoveredSpecies = useMemo(
    () => speciesList.find((s) => s.id === hoveredId) ?? null,
    [speciesList, hoveredId]
  );

  // Spread points symmetrically within each Drought Tolerance column when temperatures are close
  const plottedPoints = useMemo(() => {
    const groups = new Map<string, EvaluatedSpecies[]>();
    for (const s of speciesList) {
      const tempBucket = Math.round(s.maxTempC / 1.5);
      const key = `${s.droughtTolerance}-${tempBucket}`;
      const existing = groups.get(key) ?? [];
      existing.push(s);
      groups.set(key, existing);
    }

    const result: Array<{ species: EvaluatedSpecies; x: number; y: number }> = [];
    groups.forEach((group) => {
      const sorted = [...group].sort((a, b) => a.speciesName.localeCompare(b.speciesName));
      const count = sorted.length;
      const step = Math.min(26, (colW - 44) / Math.max(1, count));
      sorted.forEach((s, idx) => {
        const colIdx = s.droughtTolerance === 'Low' ? 0 : s.droughtTolerance === 'Med' ? 1 : 2;
        const offset = (idx - (count - 1) / 2) * step;
        result.push({
          species: s,
          x: colCenterX(colIdx) + offset,
          y: yScale(s.maxTempC),
        });
      });
    });

    return result;
  }, [speciesList]);

  const peakY = yScale(Math.min(maxTemp, Math.max(minTemp, summerMaxC)));
  const minRequiredCol = STRESS_MIN_COL[droughtStress];
  const suitableBandX = pad.left + minRequiredCol * colW;
  const suitableBandW = (3 - minRequiredCol) * colW;

  return (
    <div className="bg-white border border-[#E2DFD7] rounded-lg p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-semibold text-[#1A1A1A] tracking-tight">
            Heat Ceiling &amp; Drought Tolerance Suitability
          </h2>
          <p className="text-xs text-[#5C5C58] mt-0.5">
            Shaded region marks drought tiers meeting your site’s {droughtStress.toLowerCase()} drought stress; dashed line marks the active scenario’s summer peak ({summerMaxC}°C).
          </p>
        </div>

        <div className="flex items-center gap-5 text-xs text-[#5C5C58]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#2F4F3E]" aria-hidden="true" />
            Fully Resilient
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rotate-45 bg-[#9A5B13]" aria-hidden="true" />
            Borderline
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 bg-[#9E2A2B]" aria-hidden="true" />
            Unsuited
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[600px] select-none"
          role="img"
          aria-label="Chart plotting tree species max temperature threshold against drought tolerance"
        >
          {/* Shaded Safe Climatic Envelope (above peak temp & meeting drought stress) */}
          <rect
            x={suitableBandX}
            y={pad.top}
            width={suitableBandW}
            height={Math.max(0, peakY - pad.top)}
            fill="#2F4F3E"
            fillOpacity={0.07}
          />

          {/* Drought Column Dividers & Labels */}
          {DROUGHT_TIERS.map((tier) => {
            const cx = colCenterX(tier.colIndex);
            const meetsDrought = tier.colIndex >= minRequiredCol;
            return (
              <g key={tier.key}>
                {tier.colIndex > 0 && (
                  <line
                    x1={pad.left + tier.colIndex * colW}
                    y1={pad.top}
                    x2={pad.left + tier.colIndex * colW}
                    y2={height - pad.bottom}
                    stroke="#E2DFD7"
                    strokeWidth={1}
                  />
                )}
                <text
                  x={cx}
                  y={height - pad.bottom + 20}
                  textAnchor="middle"
                  className={`text-[11px] font-medium ${
                    meetsDrought ? 'fill-[#2F4F3E] font-semibold' : 'fill-[#5C5C58]'
                  }`}
                >
                  {tier.label}
                </text>
              </g>
            );
          })}

          {/* Horizontal Gridlines (Temperature °C) */}
          {[28, 32, 36, 40, 44].map((temp) => {
            const y = yScale(temp);
            return (
              <g key={temp}>
                <line
                  x1={pad.left}
                  y1={y}
                  x2={width - pad.right}
                  y2={y}
                  stroke="#EAE7DF"
                  strokeWidth={1}
                />
                <text
                  x={pad.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[#5C5C58] text-[11px] font-mono"
                >
                  {temp}°C
                </text>
              </g>
            );
          })}

          {/* Expected Summer Peak Threshold Line */}
          <line
            x1={pad.left}
            y1={peakY}
            x2={width - pad.right}
            y2={peakY}
            stroke="#1A1A1A"
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
          <text
            x={width - pad.right - 4}
            y={peakY - 7}
            textAnchor="end"
            className="fill-[#1A1A1A] text-[11px] font-mono font-medium"
          >
            Site Summer Peak: {summerMaxC}°C
          </text>

          {/* Species Markers */}
          {plottedPoints.map(({ species: s, x, y }) => {
            const isActive = selectedSpeciesId === s.id || hoveredId === s.id;
            const color =
              s.status === 'Fully Resilient'
                ? '#2F4F3E'
                : s.status === 'Borderline'
                ? '#9A5B13'
                : '#9E2A2B';

            return (
              <g
                key={s.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredId(s.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelectSpecies(s.id)}
              >
                {s.status === 'Fully Resilient' && (
                  <circle
                    cx={x}
                    cy={y}
                    r={isActive ? 7 : 5.5}
                    fill={color}
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                  />
                )}
                {s.status === 'Borderline' && (
                  <polygon
                    points={`${x},${y - (isActive ? 7.5 : 6)} ${x + (isActive ? 7 : 5.5)},${y + (isActive ? 6 : 4.8)} ${x - (isActive ? 7 : 5.5)},${y + (isActive ? 6 : 4.8)}`}
                    fill={color}
                    stroke="#FFFFFF"
                    strokeWidth={1.25}
                  />
                )}
                {s.status === 'Unsuited' && (
                  <rect
                    x={x - (isActive ? 6 : 4.8)}
                    y={y - (isActive ? 6 : 4.8)}
                    width={isActive ? 12 : 9.6}
                    height={isActive ? 12 : 9.6}
                    fill={color}
                    stroke="#FFFFFF"
                    strokeWidth={1.25}
                  />
                )}

                {isActive && (
                  <text
                    x={x}
                    y={y - 12}
                    textAnchor="middle"
                    className="fill-[#1A1A1A] text-[11px] font-semibold italic"
                  >
                    {s.speciesName} ({s.maxTempC}°C)
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {hoveredSpecies && (
          <div className="mt-3 pt-3 border-t border-[#EAE7DF] flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold italic text-[#1A1A1A]">{hoveredSpecies.speciesName}</span>
              <span className="text-[#7A7A74]" aria-hidden="true">·</span>
              <span className="text-[#454541]">
                {hoveredSpecies.droughtTolerance} drought · {hoveredSpecies.soilPreference}
              </span>
              <span className="text-[#7A7A74]" aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-[#454541]">
                Ceiling {hoveredSpecies.maxTempC}°C ({hoveredSpecies.thermalMarginC >= 0 ? `+${hoveredSpecies.thermalMarginC}` : hoveredSpecies.thermalMarginC}°C)
              </span>
            </div>
            <StatusIndicator status={hoveredSpecies.status} />
          </div>
        )}
      </div>
    </div>
  );
}
