<script lang="ts">
  import CenteredLayout from '$lib/common/CenteredLayout.svelte';
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Popup from '$lib/common/Popup.svelte';
  import DepartmentForm from '$lib/department/components/DepartmentForm.svelte';

  const { data } = $props<{ data: PageData }>();
  const departments = $derived(data.departments.ok ? data.departments.value : []);

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

<svelte:head><title>Departments</title></svelte:head>

<CenteredLayout>
  <hgroup>
    <h1>Departments</h1>
    <p>Formal reporting groups within the org.</p>
  </hgroup>

  <button onclick={() => openPopup('new-department')}>Add Department</button>

  {#if departments.length > 0}
    <table role="grid">
      <thead>
        <tr>
          <th>Name</th>
          <th>Description</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each departments as dept}
          <tr>
            <td><a href="/app/departments/{dept.id}">{dept.name}</a></td>
            <td>{dept.description ?? '-'}</td>
            <td><a href="/app/departments/{dept.id}">View</a></td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <p>No departments yet. Add one to get started.</p>
  {/if}
</CenteredLayout>

<Popup id="new-department" title="Add Department">
  <DepartmentForm onSuccess={handleCreated} />
</Popup>
