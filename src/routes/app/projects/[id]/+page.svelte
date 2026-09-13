<script lang="ts">
  import type { PageData } from './$types';
  import { goto, invalidateAll } from '$app/navigation';
  import { trpc } from '$shared/trpc/client';
  import EntityDetailPage from '$lib/common/EntityDetailPage.svelte';
  import ProjectForm from '$lib/project/components/ProjectForm.svelte';
  import GoalRows from '$lib/goal/components/GoalRows.svelte';
  import InlinePicker from '$lib/ui/InlinePicker.svelte';
  import ConfirmButton from '$lib/ui/ConfirmButton.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import { submit, submitOrThrow } from '$lib/ui/submit';
  import { statusBadgeClass } from '$lib/project/utils';
  import { parseOwnerOptionValue } from '$shared/trpc/load-owner-options';
  import { wouldCreateCycle } from '$shared/utils/hierarchy';
  import type { GoalSummary } from '$shared/types/goals';

  interface ProjectOption {
    readonly id: string;
    readonly name: string;
    readonly parentId: string | null;
  }

  const { data } = $props<{ data: PageData }>();
  const project = $derived(data.project);
  const docs = $derived(data.docs);
  const notes = $derived(data.notes);
  const todos = $derived(data.todos);
  const reports = $derived(data.reports);
  const relations = $derived(data.relations);
  const linkedGoals = $derived(data.linkedGoals as readonly GoalSummary[]);

  // Any project except this one and its sub-projects can be its parent.
  const parentOptions = $derived.by(() => {
    const allProjects = data.allProjects as readonly ProjectOption[];
    const parents = new Map(allProjects.map((p): [string, string | null] => [p.id, p.parentId]));
    return allProjects.filter((p) => !wouldCreateCycle((id) => parents.get(id), project.id, p.id));
  });

  const goalOptions = $derived(
    (data.allGoals as readonly GoalSummary[])
      .filter((g) => !linkedGoals.some((linked) => linked.id === g.id))
      .map((g) => ({ id: g.id, name: g.title })),
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

  let statusError = $state('');

  const handleStatusChange = async (newStatus: string) => {
    const outcome = await submit(() => trpc().project.update.mutate({ id: project.id, status: newStatus }));
    statusError = outcome.ok ? '' : outcome.error;
    if (outcome.ok) await invalidateAll();
  };

  const handleSetParent = async (parentId: string | null) => {
    await submitOrThrow(() => trpc().project.update.mutate({ id: project.id, parentId }));
    await invalidateAll();
  };

  const handleSetOwner = async (value: string | null) => {
    const picked = value ? parseOwnerOptionValue(value) : null;
    await submitOrThrow(() => trpc().project.update.mutate({
      id: project.id,
      ownerType: picked?.ownerType ?? null,
      ownerId: picked?.ownerId ?? null,
    }));
    await invalidateAll();
  };

  const handleUnlinkChild = async (childId: string) => {
    await submitOrThrow(() => trpc().project.update.mutate({ id: childId, parentId: null }));
    await invalidateAll();
  };

  const handleLinkGoal = async (goalId: string) => {
    await submitOrThrow(() => trpc().goal.addProject.mutate({ goalId, projectId: project.id }));
    await invalidateAll();
  };

  const handleUnlinkGoal = async (goalId: string) => {
    await submitOrThrow(() => trpc().goal.removeProject.mutate({ goalId, projectId: project.id }));
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
  {relations}
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
              {#if statusError}<span class="inline-error" role="alert">{statusError}</span>{/if}
            </dd>
          </div>
        {/if}
        <div>
          <dt>Owner</dt>
          <dd>
            {#if project.owner}
              <a href={project.owner.path}>{project.owner.label ?? 'Missing owner'}</a>
              <ConfirmButton label="Unassign" confirmLabel="Unassign owner" onConfirm={() => handleSetOwner(null)} />
            {:else}
              <InlinePicker label="Assign owner" options={data.ownerOptions} placeholder="Select an owner…" onPick={handleSetOwner} />
            {/if}
          </dd>
        </div>
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
        <h4>Goals <span class="count">{data.linkedGoals.length}</span></h4>
      </div>
      {#if data.linkedGoals.length > 0}
        <GoalRows goals={data.linkedGoals} showOwner removeLabel="Unlink goal" onRemove={handleUnlinkGoal} />
      {:else}
        <EmptyState message="Not linked to any goal." />
      {/if}
      <div class="section-footer">
        <InlinePicker label="Link goal" options={goalOptions} placeholder="Select a goal…" onPick={handleLinkGoal} />
      </div>
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
        <EmptyState message="No sub-projects." />
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
    <ProjectForm initial={project} ownerOptions={data.ownerOptions} {onSuccess} {onCancel} />
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
  .section-footer { margin-top: var(--sp-2); }
</style>
