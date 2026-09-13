<script lang="ts">
  import CenteredLayout from '$lib/common/CenteredLayout.svelte';
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Popup from '$lib/common/Popup.svelte';
  import PersonForm from '$lib/person/components/PersonForm.svelte';

  const { data } = $props<{ data: PageData }>();
  const persons = $derived(data.persons.ok ? data.persons.value : []);

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

<svelte:head><title>People</title></svelte:head>

<CenteredLayout>
  <hgroup>
    <h1>People</h1>
    <p>Everyone in the org, their titles, and reporting lines.</p>
  </hgroup>

  <button onclick={() => openPopup('new-person')}>Add Person</button>

  {#if persons.length > 0}
    <table role="grid">
      <thead>
        <tr>
          <th>Name</th>
          <th>Title</th>
          <th>Email</th>
          <th>Lead</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each persons as person}
          <tr>
            <td><a href="/app/people/{person.id}">{person.name}</a></td>
            <td>{person.title ?? '-'}</td>
            <td>{person.email ?? '-'}</td>
            <td>{person.leadName ?? '-'}</td>
            <td><a href="/app/people/{person.id}">View</a></td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <p>No people yet. Add one to get started.</p>
  {/if}
</CenteredLayout>

<Popup id="new-person" title="Add Person">
  <PersonForm onSuccess={handleCreated} />
</Popup>
