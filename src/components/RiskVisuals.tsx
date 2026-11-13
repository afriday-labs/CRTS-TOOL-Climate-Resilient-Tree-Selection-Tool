import type { MatRiskScore, RecordConfidenceLevel } from '../data/treeSpecies';

export function RecordsCell({
  count,
  level,
  compact = false,
}: {
  count: number;
  level: RecordConfidenceLevel;
  compact?: boolean;
}) {
  const styles =
    level === 'Good'
      ? 'bg-[#DCFCE7] text-[#14532D] border-[#86EFAC]'
      : level === 'Medium'
      ? 'bg-[#FEF3C7] text-[#78350F] border-[#FCD34D]'
      : 'bg-[#FEE2E2] text-[#7F1D1D] border-[#FCA5A5]';

  const levelShort = level === 'Medium' ? 'Med' : level;

  return (
    <div
      className={`inline-flex items-center justify-between gap-2 px-2 py-1 rounded-[3px] border font-mono tabular-nums text-[11px] leading-none ${styles} ${
        compact ? 'min-w-[82px]' : 'min-w-[104px]'
      }`}
      title={`${count.toLocaleString()} occurrence records (${level} data confidence)`}
    >
      <span className="font-semibold">{count.toLocaleString()}</span>
      <span className="font-sans text-[10px] font-semibold opacity-90">{levelShort}</span>
    </div>
  );
}

const RISK_STYLE: Record<
  MatRiskScore,
  { bg: string; text: string; label: string }
> = {
  3: {
    bg: 'bg-[#7CB342]',
    text: 'text-[#141A16]',
    label: '3 — Optimal thermal suitability',
  },
  2: {
    bg: 'bg-[#F2D027]',
    text: 'text-[#141A16]',
    label: '2 — Suitable / Moderate margin',
  },
  1: {
    bg: 'bg-[#EA6A15]',
    text: 'text-white',
    label: '1 — Marginal / Heat or cold caution',
  },
  0: {
    bg: 'bg-[#C62828]',
    text: 'text-white',
    label: '0 — High climate risk / Outside range',
  },
};

export function RiskScoreCell({
  score,
  isHighlighted = false,
  size = 'md',
  titleSuffix = '',
}: {
  score: MatRiskScore;
  isHighlighted?: boolean;
  size?: 'sm' | 'md';
  titleSuffix?: string;
}) {
  const cfg = RISK_STYLE[score];
  const dims = size === 'sm' ? 'w-7 h-6 text-[11px]' : 'w-9 h-7 text-xs';

  return (
    <div
      className={`inline-flex items-center justify-center font-mono tabular-nums font-bold select-none ${dims} ${cfg.bg} ${cfg.text} ${
        isHighlighted ? 'ring-2 ring-[#141A16] ring-inset' : ''
      }`}
      title={`${cfg.label}${titleSuffix ? ` (${titleSuffix})` : ''}`}
      aria-label={cfg.label}
    >
      {score}
    </div>
  );
}

export function RiskAssessmentLegend() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#F7F8F7] border-b border-[#E2E7E2] text-[11px] text-[#4A554E]">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-semibold text-[#141A16]">Climate Risk Score:</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-4 h-4 font-mono font-bold text-[10px] bg-[#7CB342] text-[#141A16]">
            3
          </span>
          <span>Optimal</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-4 h-4 font-mono font-bold text-[10px] bg-[#F2D027] text-[#141A16]">
            2
          </span>
          <span>Suitable</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-4 h-4 font-mono font-bold text-[10px] bg-[#EA6A15] text-white">
            1
          </span>
          <span>Marginal</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-4 h-4 font-mono font-bold text-[10px] bg-[#C62828] text-white">
            0
          </span>
          <span>High Risk</span>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="font-semibold text-[#141A16]">Records Level:</span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 bg-[#FEE2E2] border border-[#FCA5A5]" aria-hidden="true" />
          <span className="text-[#7F1D1D] font-medium">Low (&lt;10k)</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 bg-[#FEF3C7] border border-[#FCD34D]" aria-hidden="true" />
          <span className="text-[#78350F] font-medium">Med (10k–50k)</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 bg-[#DCFCE7] border border-[#86EFAC]" aria-hidden="true" />
          <span className="text-[#14532D] font-medium">Good (50k+)</span>
        </span>
      </div>
    </div>
  );
}
