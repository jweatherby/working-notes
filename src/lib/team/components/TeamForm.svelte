<script lang="ts">
  import { trpc } from '$shared/trpc/client';

  interface TeamData {
    readonly id?: string;
    readonly name?: string;
    readonly description?: string | null;
  }

  const {
    initial = {} as TeamData,
    onSuccess,
  }: {
    initial?: TeamData;
    onSuccess: (result: { readonly id: string }) => void;
  } = $props();

  const isEdit = $derived(!!initial.id);

  let name = $state(initial.name ?? '');
  let description = $state(initial.description ?? '');
  let submitting = $state(false);

  $effect(() => {
    name = initial.name ?? '';
    description = initial.description ?? '';
  });

  const handleSubmit = async () => {
    submitting = true;
    try {
      if (isEdit) {
        const result = await trpc().team.update.mutate({
          id: initial.id!,
          name,
          description: description || null,
        });
        if (result.ok) onSuccess(result.value);
      } else {
        const result = await trpc().team.create.mutate({
          name,
          description: description || undefined,
        });
        if (result.ok) {
          name = '';
          description = '';
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
    <input type="text" bind:value={name} required placeholder="Team name" />
  </label>
  <label>
    Description (optional)
    <textarea bind:value={description} rows={3} placeholder="What does this team do?"></textarea>
  </label>
  <button type="submit" disabled={submitting || !name.trim()} aria-busy={submitting}>
    {isEdit ? 'Save' : 'Add Team'}
  </button>
</form>
