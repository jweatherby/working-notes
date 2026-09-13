<script lang="ts">
  // Title, kind and the kind's properties. Content is edited on the page itself.
  import { trpc } from '$shared/trpc/client';
  import Field from '$lib/ui/Field.svelte';
  import ConfirmButton from '$lib/ui/ConfirmButton.svelte';
  import { submit } from '$lib/ui/submit';
  import { PAGE_KINDS, type PageKind } from '$shared/types/enums';
  import { PAGE_KIND_FIELDS, type PageProperties } from '$shared/types/pages';
  import { PAGE_KIND_LABELS, optionLabel } from '$lib/page/utils';

  interface PageData {
    readonly id?: string;
    readonly title?: string;
    readonly kind?: PageKind;
    readonly parentId?: string | null;
    readonly properties?: PageProperties;
  }

  interface Props {
    readonly initial?: PageData;
    readonly onSuccess: (result: { readonly id: string }) => void;
    readonly onCancel?: () => void;
    readonly onDelete?: () => Promise<void> | void;
  }

  const { initial = {}, onSuccess, onCancel, onDelete }: Props = $props();

  const isEdit = $derived(!!initial.id);

  const asText = (properties: PageProperties | undefined): Record<string, string> =>
    Object.fromEntries(Object.entries(properties ?? {}).map(([key, value]) => [key, String(value)]));

  let title = $state(initial.title ?? '');
  let kind = $state<PageKind>(initial.kind ?? 'GENERAL');
  let values = $state<Record<string, string>>(asText(initial.properties));
  let submitting = $state(false);
  let error = $state('');

  // Re-sync when initial changes (e.g. navigating to a different page)
  $effect(() => {
    title = initial.title ?? '';
    kind = initial.kind ?? 'GENERAL';
    values = asText(initial.properties);
  });

  const fields = $derived(PAGE_KIND_FIELDS[kind]);

  // Every field of the kind: a value, or null to clear it.
  const propertyPatch = (): Record<string, string | number | null> =>
    Object.fromEntries(fields.map((field) => {
      const raw = values[field.key]?.trim() ?? '';
      if (!raw) return [field.key, null];
      return [field.key, field.input === 'number' ? Number(raw) : raw];
    }));

  const handleSubmit = async () => {
    submitting = true;
    error = '';
    const properties = propertyPatch();
    const outcome = isEdit
      ? await submit(() => trpc().page.update.mutate({ id: initial.id!, title: title.trim(), kind, properties }))
      : await submit(() => trpc().page.create.mutate({
          title: title.trim(),
          kind,
          parentId: initial.parentId ?? undefined,
          properties,
        }));
    submitting = false;
    if (!outcome.ok) {
      error = outcome.error;
      return;
    }
    if (!isEdit) {
      title = '';
      values = {};
    }
    onSuccess(outcome.value);
  };
</script>

<form class="form-grid" onsubmit={(e: SubmitEvent) => { e.preventDefault(); handleSubmit(); }}>
  <div class="form-row">
    <Field label="Title">
      {#snippet children({ id })}
        <input {id} type="text" bind:value={title} required placeholder="Page title" />
      {/snippet}
    </Field>
    <Field label="Kind">
      {#snippet children({ id })}
        <select {id} bind:value={kind}>
          {#each PAGE_KINDS as k (k)}
            <option value={k}>{PAGE_KIND_LABELS[k]}</option>
          {/each}
        </select>
      {/snippet}
    </Field>
  </div>

  {#each fields as field (field.key)}
    <Field label={field.label}>
      {#snippet children({ id })}
        {#if field.input === 'select'}
          <select {id} value={values[field.key] ?? ''} onchange={(e) => { values[field.key] = e.currentTarget.value; }}>
            <option value="">—</option>
            {#each field.options ?? [] as option (option)}
              <option value={option}>{optionLabel(option)}</option>
            {/each}
          </select>
        {:else}
          <input
            {id}
            type={field.input}
            step={field.input === 'number' ? 'any' : undefined}
            value={values[field.key] ?? ''}
            oninput={(e) => { values[field.key] = e.currentTarget.value; }}
          />
        {/if}
      {/snippet}
    </Field>
  {/each}

  {#if error}<p class="form-error">{error}</p>{/if}

  <div class="form-actions">
    <button type="submit" class="btn primary" disabled={submitting || !title.trim()} aria-busy={submitting}>
      {isEdit ? 'Save' : 'Add page'}
    </button>
    {#if onCancel}
      <button type="button" class="btn ghost" onclick={onCancel}>Cancel</button>
    {/if}
    {#if isEdit && onDelete}
      <span class="ml-auto"><ConfirmButton label="Delete" confirmLabel="Delete page" variant="button" onConfirm={onDelete} /></span>
    {/if}
  </div>
</form>
