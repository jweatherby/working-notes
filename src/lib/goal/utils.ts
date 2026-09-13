import type { GoalStatus } from '$shared/types/enums';

export const GOAL_STATUS_LABELS: Readonly<Record<GoalStatus, string>> = {
  NOT_STARTED: 'Not started',
  ON_TRACK: 'On track',
  AT_RISK: 'At risk',
  OFF_TRACK: 'Off track',
  DONE: 'Done',
  DROPPED: 'Dropped'
};

export const goalStatusBadgeClass = (status: GoalStatus): string => {
  switch (status) {
    case 'ON_TRACK':
      return 'badge success';
    case 'AT_RISK':
      return 'badge warning';
    case 'OFF_TRACK':
      return 'badge danger';
    case 'DONE':
      return 'badge accent';
    case 'DROPPED':
      return 'badge muted';
    default:
      return 'badge';
  }
};

/** ProgressBar tone for a goal's status. */
export const progressTone = (status: GoalStatus): 'accent' | 'success' | 'warning' | 'danger' => {
  switch (status) {
    case 'ON_TRACK':
    case 'DONE':
      return 'success';
    case 'AT_RISK':
      return 'warning';
    case 'OFF_TRACK':
      return 'danger';
    default:
      return 'accent';
  }
};

/** `3` with unit `%` → `3%`; with `deals` → `3 deals`; no value → `—`. */
export const formatGoalValue = (value: number | null, unit: string | null): string => {
  if (value === null) return '—';
  const n = value.toLocaleString();
  if (!unit) return n;
  return unit === '%' ? `${n}%` : `${n} ${unit}`;
};
