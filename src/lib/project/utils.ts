// Badge class for a project status; unknown statuses fall back to the neutral badge.
export const statusBadgeClass = (status: string | null | undefined): string => {
  switch (status) {
    case 'planning':
      return 'badge accent';
    case 'active':
      return 'badge success';
    case 'archived':
      return 'badge muted';
    default:
      return 'badge';
  }
};
