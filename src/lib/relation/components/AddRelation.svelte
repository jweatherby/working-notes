<script lang="ts">
  // The Related section's add form: how the link reads from this side
  // ("Related to", "Depends on", "Needed by"), then search for the other
  // entity. Picking one adds the link, or, for an entity that isn't saved yet
  // (a new todo), hands it to `onPickLink` for the form to add once it saves.
  import { onMount } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import { trpc } from '$shared/trpc/client';
  import { loadEntityOptions, type EntityOption } from '$shared/trpc/load-entity-options';
  import { RELATABLE_TYPES } from '$shared/types/enums';
  import { ENTITY_SEARCH_SCOPES, parseTypedIdValue } from '$shared/utils/entity';
  import { relationChoices, toRelationInput, type PickedLink, type RelationEnd } from '$shared/utils/relations';
  import SearchPicker from '$lib/ui/SearchPicker.svelte';
  import { errorMessage, submitOrThrow } from '$lib/ui/submit';

  interface Props {
    /** The entity the link is on; null while it's still being created (pass `onPickLink`). */
    readonly self: RelationEnd | null;
    /** Takes the picked link instead of adding it. */
    readonly onPickLink?: (link: PickedLink) => void;
    /** Runs after a link is added. */
    readonly onChange?: () => Promise<void> | void;
    readonly onDone: () => void;
  }

  const { self, onPickLink, onChange, onDone }: Props = $props();

  const choices = relationChoices();

  let choice = $state('RELATED:out');
  let options = $state<readonly EntityOption[]>([]);
  let loading = $state(true);
  let loadError = $state('');

  onMount(async () => {
    try {
      options = await loadEntityOptions(trpc(), self);
    } catch (e: unknown) {
      loadError = errorMessage(e);
    } finally {
      loading = false;
    }
  });

  const handlePick = async (id: string) => {
    const parsed = parseTypedIdValue(id, RELATABLE_TYPES);
    const target = parsed ? { entityType: parsed.type, entityId: parsed.id } : null;
    if (target && onPickLink) {
      const name = options.find((o) => o.id === id)?.name ?? '';
      onPickLink({ choice, choiceName: choices.find((c) => c.id === choice)?.name ?? '', target, name });
      onDone();
      return;
    }
    const input = target && self ? toRelationInput(choice, self, target) : null;
    if (!input) throw new Error('Choose what to link to.');
    await submitOrThrow(() => trpc().relation.add.mutate(input));
    onDone();
    await onChange?.();
    await invalidateAll();
  };
</script>

<div class="add-relation">
  <select class="sm" bind:value={choice} aria-label="How it's linked">
    {#each choices as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
  </select>
  <SearchPicker label="Link to" {options} scopes={ENTITY_SEARCH_SCOPES} {loading} onPick={handlePick} onCancel={onDone} />
  {#if loadError}<span class="inline-error" role="alert">{loadError}</span>{/if}
</div>

<style lang="scss">
  .add-relation {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    margin-bottom: var(--sp-2);
  }
</style>
