<script lang="ts">
  import { trpc } from '$shared/trpc/client';

  interface ProjectData {
    readonly id?: string;
    readonly name?: string;
    readonly description?: string | null;
    readonly startDate?: Date | string | null;
    readonly endDate?: Date | string | null;
    readonly daysOptimistic?: number | null;
    readonly daysLikely?: number | null;
    readonly daysPessimistic?: number | null;
    readonly parentId?: string;
  }

  const {
    initial = {} as ProjectData,
    onSuccess,
  }: {
    initial?: ProjectData;
    onSuccess: (result: { readonly id: string }) => void;
  } = $props();

  const isEdit = $derived(!!initial.id);

  const toDateStr = (d: Date | string | null | undefined): string => {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toISOString().slice(0, 10);
  };

  let name = $state(initial.name ?? '');
  let description = $state(initial.description ?? '');
  let startDate = $state(toDateStr(initial.startDate));
  let endDate = $state(toDateStr(initial.endDate));
  let daysOptimistic = $state<number | undefined>(initial.daysOptimistic ?? undefined);
  let daysLikely = $state<number | undefined>(initial.daysLikely ?? undefined);
  let daysPessimistic = $state<number | undefined>(initial.daysPessimistic ?? undefined);
  let submitting = $state(false);

  // Re-sync when initial changes (e.g. navigating to a different entity)
  $effect(() => {
    name = initial.name ?? '';
    description = initial.description ?? '';
    startDate = toDateStr(initial.startDate);
    endDate = toDateStr(initial.endDate);
    daysOptimistic = initial.daysOptimistic ?? undefined;
    daysLikely = initial.daysLikely ?? undefined;
    daysPessimistic = initial.daysPessimistic ?? undefined;
  });

  const handleSubmit = async () => {
    submitting = true;
    try {
      if (isEdit) {
        const result = await trpc().project.update.mutate({
          id: initial.id!,
          name,
          description: description || null,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          daysOptimistic: daysOptimistic ?? null,
          daysLikely: daysLikely ?? null,
          daysPessimistic: daysPessimistic ?? null,
        });
        if (result.ok) onSuccess(result.value);
      } else {
        const result = await trpc().project.create.mutate({
          name,
          description: description || undefined,
          status: 'planning',
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          daysOptimistic,
          daysLikely,
          daysPessimistic,
          parentId: initial.parentId,
        });
        if (result.ok) {
          name = '';
          description = '';
          startDate = '';
          endDate = '';
          daysOptimistic = undefined;
          daysLikely = undefined;
          daysPessimistic = undefined;
          onSuccess(result.value);
        }
      }
    } finally {
      submitting = false;
    }
  };
</script>

<form onsubmit={(e: SubmitEvent) => { e.preventDefault(); handleSubmit(); }}>
  <label>
    Name
    <input type="text" bind:value={name} required placeholder="Project name" />
  </label>
  <label>
    Description (optional)
    <textarea bind:value={description} rows={3} placeholder="Brief description"></textarea>
  </label>
  <div class="form-row">
    <label>
      Start date
      <input type="date" bind:value={startDate} />
    </label>
    <label>
      Target date (optional)
      <input type="date" bind:value={endDate} />
    </label>
  </div>
  <div class="form-row thirds">
    <label>
      Optimistic (days)
      <input type="number" min="0" bind:value={daysOptimistic} placeholder="-" />
    </label>
    <label>
      Likely (days)
      <input type="number" min="0" bind:value={daysLikely} placeholder="-" />
    </label>
    <label>
      Pessimistic (days)
      <input type="number" min="0" bind:value={daysPessimistic} placeholder="-" />
    </label>
  </div>
  <button type="submit" disabled={submitting || !name.trim()} aria-busy={submitting}>
    {isEdit ? 'Save' : 'Add Project'}
  </button>
</form>

<style lang="scss">
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    &.thirds { grid-template-columns: 1fr 1fr 1fr; }
  }
</style>
