<script lang="ts">
  import type { PageData } from './$types';
  import Popup from '$lib/common/Popup.svelte';
  import PageHeader from '$lib/ui/PageHeader.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import ArchiveFilter from '$lib/ui/ArchiveFilter.svelte';
  import PersonForm from '$lib/person/components/PersonForm.svelte';
  import { openPopup, closePopup } from '$lib/ui/popup-url';
  import { model } from '$lib/stores/notebook-model';
  import { fieldText } from '$lib/person/fields';
  import type { PersonSummary } from '$shared/types/person';

  const { data } = $props<{ data: PageData }>();
  const persons = $derived((data.persons.ok ? data.persons.value : []) as readonly PersonSummary[]);
  // Each column a module adds (Title and Lead, or How we know them and Birthday).
  const fields = $derived($model.personFields);
  // How each person relates to you, once someone is marked as you.
  const hasMe = $derived(persons.some((p) => p.isMe));

  const handleCreated = () => closePopup({ invalidate: true });
</script>

<svelte:head><title>People</title></svelte:head>

<div class="page">
  <PageHeader title="People" description="Everyone in this notebook. Groups (teams, family, friends) are on the Groups page.">
    <a class="btn" href="/app/people/kinds">Relation kinds</a>
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
            {#if hasMe}<th>To you</th>{/if}
            {#each fields as f (`${f.module}.${f.key}`)}<th>{f.label}</th>{/each}
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          {#each persons as person (person.id)}
            <tr>
              <td><a href={person.path}>{person.name}</a>{#if person.isMe} <span class="badge accent">You</span>{/if}{#if person.archivedAt} <span class="badge muted">Archived</span>{/if}</td>
              {#if hasMe}<td class="text-2">{person.toMe.join(', ')}</td>{/if}
              {#each fields as f (`${f.module}.${f.key}`)}<td class="text-2">{fieldText(person.extensions, f) ?? ''}</td>{/each}
              <td class="text-2">{person.email ?? ''}</td>
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
  <PersonForm personOptions={persons} onSuccess={handleCreated} onCancel={() => closePopup()} />
</Popup>
