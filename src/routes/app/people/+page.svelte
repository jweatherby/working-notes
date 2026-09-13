<script lang="ts">
  import type { PageData } from './$types';
  import Popup from '$lib/common/Popup.svelte';
  import PageHeader from '$lib/ui/PageHeader.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import ArchiveFilter from '$lib/ui/ArchiveFilter.svelte';
  import PersonForm from '$lib/person/components/PersonForm.svelte';
  import { openPopup, closePopup } from '$lib/ui/popup-url';

  const { data } = $props<{ data: PageData }>();
  const persons = $derived(data.persons.ok ? data.persons.value : []);

  const handleCreated = () => closePopup({ invalidate: true });
</script>

<svelte:head><title>People</title></svelte:head>

<div class="page">
  <PageHeader title="People" description="Everyone in the org, their titles, and reporting lines.">
    <button type="button" class="btn primary" onclick={() => openPopup('new-person')}>Add person</button>
  </PageHeader>

  <div class="toolbar filters">
    <ArchiveFilter />
  </div>

  {#if persons.length > 0}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Title</th>
            <th>Email</th>
            <th>Lead</th>
          </tr>
        </thead>
        <tbody>
          {#each persons as person (person.id)}
            <tr>
              <td><a href="/app/people/{person.id}">{person.name}</a>{#if person.archivedAt} <span class="badge muted">Archived</span>{/if}</td>
              <td class="text-2">{person.title ?? ''}</td>
              <td class="text-2">{person.email ?? ''}</td>
              <td class="text-2">{person.leadName ?? ''}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <EmptyState message="No people yet." boxed>
      <button type="button" class="btn sm" onclick={() => openPopup('new-person')}>Add person</button>
    </EmptyState>
  {/if}
</div>

<Popup id="new-person" title="Add person">
  <PersonForm onSuccess={handleCreated} onCancel={() => closePopup()} />
</Popup>
