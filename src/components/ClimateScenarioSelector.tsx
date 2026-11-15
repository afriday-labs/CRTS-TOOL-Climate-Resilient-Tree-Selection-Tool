import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export type ClimateScenarioId = 'current' | 'ssp2_2050' | 'ssp3_2090';

export interface ClimateScenarioOption {
  id: ClimateScenarioId;
  title: string;
  pathway: string;
  horizon: string;
  tempDeltaC: number;
  summary: string;
}

export const CLIMATE_SCENARIOS: ClimateScenarioOption[] = [
  {
    id: 'current',
    title: 'Current',
    pathway: 'Baseline Climate',
    horizon: '2020',
    tempDeltaC: 0,
    summary: 'Historical baseline temperatures and moisture regime',
  },
  {
    id: 'ssp2_2050',
    title: 'Emissions Limited',
    pathway: 'SSP2',
    horizon: 'RCP4.5 by 2050',
    tempDeltaC: 2,
    summary: '+2°C warming shift · moderate mid-century warming',
  },
  {
    id: 'ssp3_2090',
    title: 'Business as Usual',
    pathway: 'SSP3',
    horizon: 'RCP7.0 by 2090',
    tempDeltaC: 4,
    summary: '+4°C warming shift · heightened summer drought',
  },
];

interface ClimateScenarioSelectorProps {
  activeScenario: ClimateScenarioId;
  onSelectScenario: (id: ClimateScenarioId) => void;
  effectiveSummerMaxC: number;
  effectiveMatC: number;
  effectiveDrought: string;
}

export function ClimateScenarioSelector({
  activeScenario,
  onSelectScenario,
  effectiveSummerMaxC,
  effectiveMatC,
  effectiveDrought,
}: ClimateScenarioSelectorProps) {
  const [sectionOpen, setSectionOpen] = useState(false);
  const currentOption =
    CLIMATE_SCENARIOS.find((s) => s.id === activeScenario) ?? CLIMATE_SCENARIOS[0];

  return (
    <section
      aria-label="Climate change scenario prediction"
      className="bg-white border border-[#E2DFD7] rounded-lg overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setSectionOpen((prev) => !prev)}
        aria-expanded={sectionOpen}
        className="w-full px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-left hover:bg-[#FAF9F6] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          {sectionOpen ? (
            <ChevronDown className="w-4 h-4 text-[#5C5C58] shrink-0" aria-hidden="true" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#5C5C58] shrink-0" aria-hidden="true" />
          )}
          <h2 className="text-sm font-semibold text-[#1A1A1A] tracking-tight">
            Climate Change Scenario
          </h2>
          <span className="px-2 py-0.5 text-[11px] font-medium bg-[#ECEFE9] text-[#2F4F3E] rounded border border-[#C9D3C8]">
            {currentOption.title} ({currentOption.horizon})
          </span>
        </div>

        <div className="text-xs font-mono tabular-nums text-[#454541]">
          Site MAT {effectiveMatC.toFixed(1)}°C · {effectiveSummerMaxC}°C peak · {effectiveDrought} drought
        </div>
      </button>

      {sectionOpen && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3 border-t border-[#EAE7DF]">
          <p className="text-xs text-[#5C5C58] mb-3">
            Switch between BGCI CAT emission pathways to test how your tree palette shifts from 2020 to 2050 and 2090.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CLIMATE_SCENARIOS.map((sc) => {
              const isActive = activeScenario === sc.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => onSelectScenario(sc.id)}
                  aria-pressed={isActive}
                  className={`text-left p-4 rounded-md border transition-colors cursor-pointer flex flex-col justify-between min-h-[104px] ${
                    isActive
                      ? 'border-[#2F4F3E] bg-[#ECEFE9]/75'
                      : 'border-[#E2DFD7] bg-[#F7F6F2] hover:border-[#C9D3C8] hover:bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#1A1A1A]">
                        {sc.title}
                      </span>
                      {isActive && (
                        <span className="text-[11px] font-semibold text-[#2F4F3E]">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#5C5C58] mt-0.5">{sc.pathway}</div>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-[#E2DFD7] flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-[#454541]">{sc.horizon}</span>
                    <span className="font-mono tabular-nums text-[#5C5C58]">
                      {sc.tempDeltaC === 0 ? '+0°C' : `+${sc.tempDeltaC}°C`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
