<script lang="ts">
  import type { PageData } from './$types';
  import { invalidateAll } from '$app/navigation';
  import { trpc } from '$shared/trpc/client';
  import EntityDetailPage from '$lib/common/EntityDetailPage.svelte';
  import DepartmentForm from '$lib/department/components/DepartmentForm.svelte';
  import InlinePicker from '$lib/ui/InlinePicker.svelte';
  import ConfirmButton from '$lib/ui/ConfirmButton.svelte';

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
  editPopupTitle="Edit department"
  {docs}
  {notes}
  {todos}
  {reports}
>
  {#snippet renderOverview()}
    <section class="section">
      {#if department.description}
        <p class="description">{department.description}</p>
      {/if}
    </section>

    <section class="section">
      <div class="section-header">
        <h4>Members <span class="count">{department.members.length}</span></h4>
      </div>
      {#if department.members.length > 0}
        <ul class="list">
          {#each department.members as m (m.personId)}
            <li class="list-row">
              <a class="grow truncate" href="/app/people/{m.personId}">{m.personName}</a>
              {#if m.personTitle}<span class="meta">{m.personTitle}</span>{/if}
              <span class="row-actions">
                <ConfirmButton label="Remove member" variant="icon" onConfirm={() => handleRemoveMember(m.personId)} />
              </span>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="empty">No members yet.</p>
      {/if}
      <div class="section-footer">
        <InlinePicker label="Add member" options={availablePersons} placeholder="Select a person…" onPick={handleAddMember} />
      </div>
    </section>
  {/snippet}

  {#snippet renderAssetHeader()}
    <span class="asset-h-name">{department.name}</span>
    <span class="asset-h-meta">{department.members.length} member{department.members.length === 1 ? '' : 's'}</span>
  {/snippet}

  {#snippet renderEditForm({ onSuccess, onCancel })}
    <DepartmentForm initial={department} {onSuccess} {onCancel} />
  {/snippet}
</EntityDetailPage>

<style lang="scss">
  .description { margin: 0 0 var(--sp-3); color: var(--text-2); }
  .section-footer { margin-top: var(--sp-2); }
</style>
