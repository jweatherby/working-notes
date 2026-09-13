<script lang="ts">
  import type { PageData } from './$types';
  import Popup from '$lib/common/Popup.svelte';
  import PageHeader from '$lib/ui/PageHeader.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import ArchiveFilter from '$lib/ui/ArchiveFilter.svelte';
  import DepartmentForm from '$lib/department/components/DepartmentForm.svelte';
  import { openPopup, closePopup } from '$lib/ui/popup-url';

  const { data } = $props<{ data: PageData }>();
  const departments = $derived(data.departments.ok ? data.departments.value : []);

  const handleCreated = () => closePopup({ invalidate: true });
</script>

<svelte:head><title>Departments</title></svelte:head>

<div class="page">
  <PageHeader title="Departments" description="Formal reporting groups within the org.">
    <button type="button" class="btn primary" onclick={() => openPopup('new-department')}>Add department</button>
  </PageHeader>

  <div class="toolbar filters">
    <ArchiveFilter />
  </div>

  {#if departments.length > 0}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {#each departments as item (item.id)}
            <tr>
              <td><a href="/app/departments/{item.id}">{item.name}</a>{#if item.archivedAt} <span class="badge muted">Archived</span>{/if}</td>
              <td class="text-2">{item.description ?? ''}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <EmptyState message="No departments yet." boxed>
      <button type="button" class="btn sm" onclick={() => openPopup('new-department')}>Add department</button>
    </EmptyState>
  {/if}
</div>

<Popup id="new-department" title="Add department">
  <DepartmentForm onSuccess={handleCreated} onCancel={() => closePopup()} />
</Popup>
