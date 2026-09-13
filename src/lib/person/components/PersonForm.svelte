<script lang="ts">
  import { trpc } from '$shared/trpc/client';
  import Field from '$lib/ui/Field.svelte';
  import ConfirmButton from '$lib/ui/ConfirmButton.svelte';
  import { submit } from '$lib/ui/submit';

  interface PersonData {
    readonly id?: string;
    readonly name?: string;
    readonly email?: string | null;
    readonly title?: string | null;
    readonly leadId?: string | null;
  }

  interface LeadOption {
    readonly id: string;
    readonly name: string;
  }

  interface Props {
    readonly initial?: PersonData;
    readonly leadOptions?: readonly LeadOption[];
    readonly onSuccess: (result: { readonly id: string }) => void;
    readonly onCancel?: () => void;
    readonly onDelete?: () => Promise<void> | void;
  }

  const { initial = {}, leadOptions, onSuccess, onCancel, onDelete }: Props = $props();

  const isEdit = $derived(!!initial.id);

  let name = $state(initial.name ?? '');
  let email = $state(initial.email ?? '');
  let title = $state(initial.title ?? '');
  let leadId = $state(initial.leadId ?? '');
  let submitting = $state(false);
  let error = $state('');

  $effect(() => {
    name = initial.name ?? '';
    email = initial.email ?? '';
    title = initial.title ?? '';
    leadId = initial.leadId ?? '';
  });

  const handleSubmit = async () => {
    submitting = true;
    error = '';
    const lead = leadOptions ? { leadId: leadId || null } : {};
    const outcome = isEdit
      ? await submit(() => trpc().person.update.mutate({
          id: initial.id!,
          name: name.trim(),
          email: email.trim() || null,
          title: title.trim() || null,
          ...lead,
        }))
      : await submit(() => trpc().person.create.mutate({
          name: name.trim(),
          email: email.trim() || undefined,
          title: title.trim() || undefined,
          ...(leadOptions && leadId ? { leadId } : {}),
        }));
    submitting = false;
    if (!outcome.ok) {
      error = outcome.error;
      return;
    }
    if (!isEdit) {
      name = '';
      email = '';
      title = '';
      leadId = '';
    }
    onSuccess(outcome.value);
  };
</script>

<form class="form-grid" onsubmit={(e: SubmitEvent) => { e.preventDefault(); handleSubmit(); }}>
  <Field label="Name">
    {#snippet children({ id })}
      <input {id} type="text" bind:value={name} required placeholder="Full name" />
    {/snippet}
  </Field>
  <div class="form-row">
    <Field label="Title">
      {#snippet children({ id })}
        <input {id} type="text" bind:value={title} placeholder="e.g. Senior Engineer" />
      {/snippet}
    </Field>
    <Field label="Email">
      {#snippet children({ id })}
        <input {id} type="email" bind:value={email} placeholder="name@example.com" />
      {/snippet}
    </Field>
  </div>
  {#if leadOptions}
    <Field label="Lead">
      {#snippet children({ id })}
        <select {id} bind:value={leadId}>
          <option value="">No lead</option>
          {#each leadOptions as p (p.id)}
            <option value={p.id}>{p.name}</option>
          {/each}
        </select>
      {/snippet}
    </Field>
  {/if}

  {#if error}<p class="form-error">{error}</p>{/if}

  <div class="form-actions">
    <button type="submit" class="btn primary" disabled={submitting || !name.trim()} aria-busy={submitting}>
      {isEdit ? 'Save' : 'Add person'}
    </button>
    {#if onCancel}
      <button type="button" class="btn ghost" onclick={onCancel}>Cancel</button>
    {/if}
    {#if isEdit && onDelete}
      <span class="ml-auto"><ConfirmButton label="Delete" confirmLabel="Delete person" variant="button" onConfirm={onDelete} /></span>
    {/if}
  </div>
</form>
