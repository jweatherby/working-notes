import type { EntityType as SharedEntityType } from '$shared/types/enums';
export type TodoStatus = 'PENDING' | 'ACTIVE' | 'COMPLETE' | 'CANCELLED';
export type EntityType = SharedEntityType;

export const nextStatus = (current: TodoStatus): TodoStatus => {
  switch (current) {
    case 'PENDING':
      return 'ACTIVE';
    case 'ACTIVE':
      return 'COMPLETE';
    default:
      return current;
  }
};

export const formatTodoDate = (d: Date | string | null): string => {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-CA');
};

export const priorityLabel = (p: number): string => {
  switch (p) {
    case 1:
      return '!';
    case 2:
      return '!!';
    case 3:
      return '!!!';
    default:
      return '';
  }
};
