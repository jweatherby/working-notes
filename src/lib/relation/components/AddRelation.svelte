<script lang="ts">
  // The Related section's add form: how the link reads from this side
  // ("Related to", "Depends on", "Needed by"), then search for the other
  // entity. Picking one adds the link.
  import { onMount } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import { trpc } from '$shared/trpc/client';
  import { loadRelationTargets, type RelationTargetOption } from '$shared/trpc/load-relation-targets';
  import { RELATABLE_TYPES } from '$shared/types/enums';
  import { parseTypedIdValue } from '$shared/utils/entity';
  import { RELATION_TARGET_SCOPES, relationChoices, toRelationInput, type RelationEnd } from '$shared/utils/relations';
  import SearchPicker from '$lib/ui/SearchPicker.svelte';
  import { errorMessage, submitOrThrow } from '$lib/ui/submit';

  interface Props {
    readonly self: RelationEnd;
    readonly onDone: () => void;
  }

  const { self, onDone }: Props = $props();

  const choices = relationChoices();

  let choice = $state('RELATED:out');
  let options = $state<readonly RelationTargetOption[]>([]);
  let loading = $state(true);
  let loadError = $state('');

  onMount(async () => {
    try {
      options = await loadRelationTargets(trpc(), self);
    } catch (e: unknown) {
      loadError = errorMessage(e);
    } finally {
      loading = false;
    }
  });

  const handlePick = async (id: string) => {
    const target = parseTypedIdValue(id, RELATABLE_TYPES);
    const input = target ? toRelationInput(choice, self, { entityType: target.type, entityId: target.id }) : null;
    if (!input) throw new Error('Choose what to link to.');
    await submitOrThrow(() => trpc().relation.add.mutate(input));
    onDone();
    await invalidateAll();
  };
</script>

<div class="add-relation">
  <select class="sm" bind:value={choice} aria-label="How it's linked">
    {#each choices as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
  </select>
  <SearchPicker label="Link to" {options} scopes={RELATION_TARGET_SCOPES} {loading} onPick={handlePick} onCancel={onDone} />
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
