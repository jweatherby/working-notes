<script lang="ts">
  import type { PageData } from './$types';
  import { invalidateAll } from '$app/navigation';
  import { trpc } from '$shared/trpc/client';
  import EntityDetailPage from '$lib/common/EntityDetailPage.svelte';
  import DepartmentForm from '$lib/department/components/DepartmentForm.svelte';

  const { data } = $props<{ data: PageData }>();
  const department = $derived(data.department);
  const docs = $derived(data.docs);
  const notes = $derived(data.notes);
  const todos = $derived(data.todos);
  const reports = $derived(data.reports);

  const availablePersons = $derived(
    data.allPersons.filter(
      (p: { id: string }) =>
        !department.members.some((m: { personId: string }) => m.personId === p.id),
    ),
  );

  const handleAddMember = async (personId: string) => {
    await trpc().department.addMember.mutate({ departmentId: department.id, personId });
    await invalidateAll();
  };

  const handleRemoveMember = async (personId: string) => {
    await trpc().department.removeMember.mutate({ departmentId: department.id, personId });
    await invalidateAll();
  };
</script>

<EntityDetailPage
  entityType="DEPARTMENT"
  entityId={department.id}
  entityName={department.name}
  breadcrumbLabel="Departments"
  breadcrumbHref="/app/departments"
  editPopupTitle="Edit Department"
  {docs}
  {notes}
  {todos}
  {reports}
>
  {#snippet renderOverview({ openEdit })}
    <div class="profile-card">
      {#if department.description}
        <p class="profile-detail">{department.description}</p>
      {/if}
      <button class="outline edit-btn" onclick={openEdit}>Edit</button>
    </div>

    <div class="section-block">
      <h4>Members</h4>
      {#if department.members.length > 0}
        <ul class="child-list">
          {#each department.members as m}
            <li>
              <a href="/app/people/{m.personId}">{m.personName}</a>
              {#if m.personTitle}<span class="muted">{m.personTitle}</span>{/if}
              <button
                class="text-btn danger"
                data-plain
                onclick={() => { if (confirm('Remove member?')) handleRemoveMember(m.personId); }}
              >&times;</button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="muted">No members yet.</p>
      {/if}
      {#if availablePersons.length > 0}
        <details class="assign-parent">
          <summary>Add member</summary>
          <select
            onchange={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              if (v) handleAddMember(v);
            }}
          >
            <option value="">Select a person…</option>
            {#each availablePersons as p}
              <option value={p.id}>{p.name}</option>
            {/each}
          </select>
        </details>
      {/if}
    </div>

  {/snippet}

  {#snippet renderAssetHeader()}
    <strong class="asset-h-name">{department.name}</strong>
    <span class="asset-h-meta">{department.members.length} member{department.members.length === 1 ? '' : 's'}</span>
  {/snippet}

  {#snippet renderEditForm({ onSuccess })}
    <DepartmentForm initial={department} {onSuccess} />
  {/snippet}
</EntityDetailPage>

<style lang="scss">
  .profile-card { margin-bottom: 0; }
  .profile-detail {
    margin: 0;
    color: var(--color-muted);
    font-size: 0.85rem;
  }
  .edit-btn {
    margin-top: 0.5rem;
    padding: 0.25rem 0.75rem;
  }
  .section-block { margin-top: 2rem; }
  h4 { font-size: 0.9rem; margin-bottom: 0.75rem; }
  .assign-parent {
    margin-top: 0.5rem;
    font-size: 0.85rem;
    summary { color: var(--color-muted); font-size: 0.8rem; }
    select { margin-top: 0.25rem; }
  }
  .child-list {
    list-style: none;
    padding: 0;
    margin: 0 0 0.5rem;
    li {
      display: grid;
      grid-template-columns: 1fr auto auto;
      column-gap: 0.5rem;
      align-items: center;
      padding: 0.25rem 0;
    }
  }
  .text-btn {
    all: unset;
    cursor: pointer;
    font-size: 0.75rem;
    color: var(--color-primary);
    &:hover { text-decoration: underline; }
    &.danger { color: var(--color-danger); }
  }
  .muted {
    font-size: 0.85rem;
    color: var(--color-muted);
  }
  .asset-h-name {
    font-size: 0.95rem;
  }
  .asset-h-meta {
    font-size: 0.8rem;
    color: var(--color-muted);
  }
</style>
