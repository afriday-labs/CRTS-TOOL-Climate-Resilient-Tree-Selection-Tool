import { Check, AlertTriangle, X } from 'lucide-react';
import type { ResilienceStatus } from '../data/treeSpecies';

interface StatusIndicatorProps {
  status: ResilienceStatus;
  compact?: boolean;
}

export function StatusIndicator({ status, compact = false }: StatusIndicatorProps) {
  if (status === 'Fully Resilient') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2F4F3E] whitespace-nowrap shrink-0">
        <Check className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
        <span>{compact ? 'Resilient' : 'Fully Resilient'}</span>
      </span>
    );
  }

  if (status === 'Borderline') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9A5B13] whitespace-nowrap shrink-0">
        <AlertTriangle className="w-3.5 h-3.5 stroke-[2.25]" aria-hidden="true" />
        <span>Borderline</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9E2A2B] whitespace-nowrap shrink-0">
      <X className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
      <span>Unsuited</span>
    </span>
  );
}
