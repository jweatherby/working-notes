<script lang="ts">
  import CenteredLayout from '$lib/common/CenteredLayout.svelte';
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Popup from '$lib/common/Popup.svelte';
  import TeamForm from '$lib/team/components/TeamForm.svelte';

  const { data } = $props<{ data: PageData }>();
  const teams = $derived(data.teams.ok ? data.teams.value : []);

  const openPopup = (id: string) => {
    const url = new URL($page.url);
    url.searchParams.set('popup', id);
    goto(url.toString(), { replaceState: true, noScroll: true });
  };

  const handleCreated = async () => {
    const url = new URL($page.url);
    url.searchParams.delete('popup');
    await goto(url.toString(), { replaceState: true, noScroll: true, invalidateAll: true });
  };
</script>

<svelte:head><title>Teams</title></svelte:head>

<CenteredLayout>
  <hgroup>
    <h1>Teams</h1>
    <p>Groups organized around shared work.</p>
  </hgroup>

  <button onclick={() => openPopup('new-team')}>Add Team</button>

  {#if teams.length > 0}
    <table role="grid">
      <thead>
        <tr>
          <th>Name</th>
          <th>Description</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each teams as team}
          <tr>
            <td><a href="/app/teams/{team.id}">{team.name}</a></td>
            <td>{team.description ?? '-'}</td>
            <td><a href="/app/teams/{team.id}">View</a></td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <p>No teams yet. Add one to get started.</p>
  {/if}
</CenteredLayout>

<Popup id="new-team" title="Add Team">
  <TeamForm onSuccess={handleCreated} />
</Popup>
