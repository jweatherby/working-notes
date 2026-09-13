<script lang="ts">
  import type { PageData } from './$types';
  import { goto, invalidateAll } from '$app/navigation';
  import { trpc } from '$shared/trpc/client';
  import EntityDetailPage from '$lib/common/EntityDetailPage.svelte';
  import ProjectForm from '$lib/project/components/ProjectForm.svelte';
  import InlinePicker from '$lib/ui/InlinePicker.svelte';
  import ConfirmButton from '$lib/ui/ConfirmButton.svelte';
  import { submit } from '$lib/ui/submit';
  import { statusBadgeClass } from '$lib/project/utils';

  const { data } = $props<{ data: PageData }>();
  const project = $derived(data.project);
  const docs = $derived(data.docs);
  const notes = $derived(data.notes);
  const todos = $derived(data.todos);
  const reports = $derived(data.reports);

  const parentOptions = $derived(
    data.allProjects.filter((p: { id: string }) => p.id !== project.id),
  );

  let newChildName = $state('');
  let creatingChild = $state(false);
  let childError = $state('');

  // ----- Status flow -----
  const STATUS_FLOW = ['planning', 'active', 'archived'] as const;
  const statusIndex = $derived(
    STATUS_FLOW.indexOf(project.status as (typeof STATUS_FLOW)[number]),
  );
  const canAdvance = $derived(
    statusIndex >= 0 && statusIndex < STATUS_FLOW.length - 1,
  );
  const canRevert = $derived(statusIndex > 0);
  const nextStatus = $derived(canAdvance ? STATUS_FLOW[statusIndex + 1] : null);
  const prevStatus = $derived(canRevert ? STATUS_FLOW[statusIndex - 1] : null);

  const handleStatusChange = async (newStatus: string) => {
    await trpc().project.update.mutate({ id: project.id, status: newStatus });
    await invalidateAll();
  };

  const handleSetParent = async (parentId: string | null) => {
    await trpc().project.update.mutate({ id: project.id, parentId });
    await invalidateAll();
  };

  const handleUnlinkChild = async (childId: string) => {
    await trpc().project.update.mutate({ id: childId, parentId: null });
    await invalidateAll();
  };

  const handleCreateChild = async () => {
    if (!newChildName.trim()) return;
    creatingChild = true;
    childError = '';
    const outcome = await submit(() => trpc().project.create.mutate({
      name: newChildName.trim(),
      status: 'planning',
      parentId: project.id,
    }));
    creatingChild = false;
    if (!outcome.ok) {
      childError = outcome.error;
      return;
    }
    newChildName = '';
    await goto(`/app/projects/${outcome.value.id}`);
  };

  const formatDate = (d: Date | string) => {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString('en-CA');
  };
</script>

<EntityDetailPage
  entityType="PROJECT"
  entityId={project.id}
  entityName={project.name}
  breadcrumbLabel="Projects"
  breadcrumbHref="/app/projects"
  editPopupTitle="Edit project"
  {docs}
  {notes}
  {todos}
  {reports}
>
  {#snippet renderOverview()}
    <section class="section">
      {#if project.description}
        <p class="description">{project.description}</p>
      {/if}
      <dl class="meta-list">
        {#if project.status}
          <div>
            <dt>Status</dt>
            <dd>
              <span class={statusBadgeClass(project.status)}>{project.status}</span>
              {#if canRevert}
                <button type="button" class="btn ghost sm" onclick={() => handleStatusChange(prevStatus!)}>← {prevStatus}</button>
              {/if}
              {#if canAdvance}
                <button type="button" class="btn ghost sm" onclick={() => handleStatusChange(nextStatus!)}>{nextStatus} →</button>
              {/if}
            </dd>
          </div>
        {/if}
        <div>
          <dt>Parent</dt>
          <dd>
            {#if project.parentName}
              <a href="/app/projects/{project.parentId}">{project.parentName}</a>
              <ConfirmButton label="Unlink" confirmLabel="Unlink parent" onConfirm={() => handleSetParent(null)} />
            {:else}
              <InlinePicker label="Assign parent" options={parentOptions} placeholder="Select a parent…" onPick={handleSetParent} />
            {/if}
          </dd>
        </div>
        {#if project.startDate || project.endDate}
          <div>
            <dt>Dates</dt>
            <dd>{project.startDate ? formatDate(project.startDate) : '?'} → {project.endDate ? formatDate(project.endDate) : 'ongoing'}</dd>
          </div>
        {/if}
      </dl>
    </section>

    <section class="section">
      <div class="section-header">
        <h4>Sub-projects <span class="count">{project.children.length}</span></h4>
      </div>
      {#if project.children.length > 0}
        <ul class="list">
          {#each project.children as child (child.id)}
            <li class="list-row">
              <a class="grow truncate" href="/app/projects/{child.id}">{child.name}</a>
              {#if child.status}<span class={statusBadgeClass(child.status)}>{child.status}</span>{/if}
              <span class="row-actions">
                <ConfirmButton label="Unlink sub-project" variant="icon" onConfirm={() => handleUnlinkChild(child.id)} />
              </span>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="empty">No sub-projects.</p>
      {/if}

      <form class="toolbar child-form" onsubmit={(e: SubmitEvent) => { e.preventDefault(); handleCreateChild(); }}>
        <input type="text" class="sm" bind:value={newChildName} placeholder="New sub-project name" aria-label="New sub-project name" />
        <button type="submit" class="btn sm" disabled={creatingChild || !newChildName.trim()} aria-busy={creatingChild}>Add</button>
      </form>
      {#if childError}<p class="form-error">{childError}</p>{/if}
    </section>
  {/snippet}

  {#snippet renderAssetHeader()}
    <span class="asset-h-name">{project.name}</span>
    {#if project.status}<span class={statusBadgeClass(project.status)}>{project.status}</span>{/if}
  {/snippet}

  {#snippet renderEditForm({ onSuccess, onCancel })}
    <ProjectForm initial={project} {onSuccess} {onCancel} />
  {/snippet}
</EntityDetailPage>

<style lang="scss">
  .description { margin: 0 0 var(--sp-3); color: var(--text-2); }
  .meta-list {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: var(--sp-2) var(--sp-4);
    margin: 0 0 var(--sp-3);
    font-size: var(--fs-md);
    > div { display: contents; }
    dt { color: var(--text-3); }
    dd { display: flex; align-items: center; gap: var(--sp-2); margin: 0; min-height: 22px; }
  }
  .child-form {
    margin-top: var(--sp-2);
    max-width: 360px;
    input { flex: 1; }
  }
</style>
