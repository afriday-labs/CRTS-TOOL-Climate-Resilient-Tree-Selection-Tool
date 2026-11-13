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
  return (
    <section
      aria-label="Climate change scenario prediction"
      className="bg-white border border-[#E2E7E2] rounded-lg p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3.5">
        <div>
          <h2 className="text-sm font-semibold text-[#141A16]">
            Specify the Climate Change Scenario
          </h2>
          <p className="text-xs text-[#5A655D] mt-0.5">
            Switch between BGCI CAT emission pathways to test how your tree palette shifts from 2020 to 2050 and 2090.
          </p>
        </div>

        <div className="text-xs font-mono tabular-nums text-[#3E4841]">
          Site MAT {effectiveMatC.toFixed(1)}°C · {effectiveSummerMaxC}°C peak · {effectiveDrought} drought
        </div>
      </div>

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
                  ? 'border-[#1B5E3F] bg-[#EEF5F0]/70'
                  : 'border-[#DCE2DD] bg-[#FAFBFA] hover:border-[#9EB0A3] hover:bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#141A16]">
                    {sc.title}
                  </span>
                  {isActive && (
                    <span className="text-[11px] font-semibold text-[#1B5E3F]">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#5A655D] mt-0.5">{sc.pathway}</div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-[#E2E7E2]/80 flex items-center justify-between gap-2 text-xs">
                <span className="font-mono text-[#3E4841]">{sc.horizon}</span>
                <span className="font-mono tabular-nums text-[#5A655D]">
                  {sc.tempDeltaC === 0 ? '+0°C' : `+${sc.tempDeltaC}°C`}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
