<script lang="ts">
  import type { PageData } from './$types';
  import Popup from '$lib/common/Popup.svelte';
  import PageHeader from '$lib/ui/PageHeader.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import TeamForm from '$lib/team/components/TeamForm.svelte';
  import { openPopup, closePopup } from '$lib/ui/popup-url';

  const { data } = $props<{ data: PageData }>();
  const teams = $derived(data.teams.ok ? data.teams.value : []);

  const handleCreated = () => closePopup({ invalidate: true });
</script>

<svelte:head><title>Teams</title></svelte:head>

<div class="page">
  <PageHeader title="Teams" description="Groups organized around shared work.">
    <button type="button" class="btn primary" onclick={() => openPopup('new-team')}>Add team</button>
  </PageHeader>

  {#if teams.length > 0}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {#each teams as item (item.id)}
            <tr>
              <td><a href="/app/teams/{item.id}">{item.name}</a></td>
              <td class="text-2">{item.description ?? ''}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <EmptyState message="No teams yet." boxed>
      <button type="button" class="btn sm" onclick={() => openPopup('new-team')}>Add team</button>
    </EmptyState>
  {/if}
</div>

<Popup id="new-team" title="Add team">
  <TeamForm onSuccess={handleCreated} onCancel={() => closePopup()} />
</Popup>
