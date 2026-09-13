import { describe, it, expect } from 'vitest';
import { GOAL_STATUSES } from '$shared/types/enums';
import { formatGoalValue, goalStatusBadgeClass, progressTone } from '../utils';

describe('goal status styling', () => {
  it('gives every status a badge and a tone', () => {
    for (const status of GOAL_STATUSES) {
      expect(goalStatusBadgeClass(status)).toMatch(/^badge/);
      expect(['accent', 'success', 'warning', 'danger']).toContain(progressTone(status));
    }
  });

  it('marks risk in warning and danger colours', () => {
    expect(goalStatusBadgeClass('AT_RISK')).toBe('badge warning');
    expect(progressTone('OFF_TRACK')).toBe('danger');
  });
});

describe('formatGoalValue', () => {
  it('attaches percentages and spaces other units', () => {
    expect(formatGoalValue(3, '%')).toBe('3%');
    expect(formatGoalValue(12, 'deals')).toBe('12 deals');
    expect(formatGoalValue(7, null)).toBe('7');
    expect(formatGoalValue(null, '%')).toBe('—');
  });
});
