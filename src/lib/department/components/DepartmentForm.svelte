<script lang="ts">
  import { trpc } from '$shared/trpc/client';
  import Field from '$lib/ui/Field.svelte';
  import MarkdownEditor from '$lib/common/MarkdownEditor.svelte';
  import ConfirmButton from '$lib/ui/ConfirmButton.svelte';
  import { submit } from '$lib/ui/submit';

  interface DepartmentData {
    readonly id?: string;
    readonly name?: string;
    readonly description?: string | null;
  }

  interface Props {
    readonly initial?: DepartmentData;
    readonly onSuccess: (result: { readonly id: string }) => void;
    readonly onCancel?: () => void;
    readonly onDelete?: () => Promise<void> | void;
  }

  const { initial = {}, onSuccess, onCancel, onDelete }: Props = $props();

  const isEdit = $derived(!!initial.id);

  let name = $state(initial.name ?? '');
  let description = $state(initial.description ?? '');
  let submitting = $state(false);
  let error = $state('');

  $effect(() => {
    name = initial.name ?? '';
    description = initial.description ?? '';
  });

  const handleSubmit = async () => {
    submitting = true;
    error = '';
    const outcome = isEdit
      ? await submit(() => trpc().department.update.mutate({
          id: initial.id!,
          name: name.trim(),
          description: description.trim() || null,
        }))
      : await submit(() => trpc().department.create.mutate({
          name: name.trim(),
          description: description.trim() || undefined,
        }));
    submitting = false;
    if (!outcome.ok) {
      error = outcome.error;
      return;
    }
    if (!isEdit) {
      name = '';
      description = '';
    }
    onSuccess(outcome.value);
  };
</script>

<form class="form-grid" onsubmit={(e: SubmitEvent) => { e.preventDefault(); handleSubmit(); }}>
  <Field label="Name">
    {#snippet children({ id })}
      <input {id} type="text" bind:value={name} required placeholder="Department name" />
    {/snippet}
  </Field>
  <Field label="Description">
    {#snippet children({ id })}
      <MarkdownEditor value={description} onChange={(md: string) => { description = md; }} />
    {/snippet}
  </Field>

  {#if error}<p class="form-error">{error}</p>{/if}

  <div class="form-actions">
    <button type="submit" class="btn primary" disabled={submitting || !name.trim()} aria-busy={submitting}>
      {isEdit ? 'Save' : 'Add department'}
    </button>
    {#if onCancel}
      <button type="button" class="btn ghost" onclick={onCancel}>Cancel</button>
    {/if}
    {#if isEdit && onDelete}
      <span class="ml-auto"><ConfirmButton label="Delete" confirmLabel="Delete department" variant="button" onConfirm={onDelete} /></span>
    {/if}
  </div>
</form>
