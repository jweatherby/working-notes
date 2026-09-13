<script lang="ts">
  import type { PageData } from './$types';
  import { goto, invalidateAll } from '$app/navigation';
  import { trpc } from '$shared/trpc/client';
  import EntityDetailPage from '$lib/common/EntityDetailPage.svelte';
  import ProjectForm from '$lib/project/components/ProjectForm.svelte';

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
    try {
      const result = await trpc().project.create.mutate({
        name: newChildName.trim(),
        status: 'planning',
        parentId: project.id,
      });
      newChildName = '';
      if (result.ok) {
        await goto(`/app/projects/${result.value.id}`);
      }
    } finally {
      creatingChild = false;
    }
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
  editPopupTitle="Edit Project"
  {docs}
  {notes}
  {todos}
  {reports}
>
  {#snippet renderOverview({ openEdit })}
    <div class="profile-card">
      {#if project.status && (canRevert || canAdvance)}
        <div class="status-row">
          {#if canRevert}
            <button
              class="status-btn outline"
              data-plain
              onclick={() => handleStatusChange(prevStatus!)}
            >← {prevStatus}</button>
          {/if}
          {#if canAdvance}
            <button
              class="status-btn outline"
              data-plain
              onclick={() => handleStatusChange(nextStatus!)}
            >{nextStatus} →</button>
          {/if}
        </div>
      {/if}
      {#if project.description}
        <p class="profile-detail">{project.description}</p>
      {/if}
      {#if project.parentName}
        <div class="parent-row">
          <span class="profile-detail">
            Parent: <a href="/app/projects/{project.parentId}">{project.parentName}</a>
          </span>
          <button
            class="text-btn danger"
            data-plain
            onclick={() => { if (confirm('Unlink from parent project?')) handleSetParent(null); }}
          >Unlink</button>
        </div>
      {:else if parentOptions.length > 0}
        <details class="assign-parent">
          <summary>Assign to parent project</summary>
          <select
            onchange={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              if (v) handleSetParent(v);
            }}
          >
            <option value="">Select a parent…</option>
            {#each parentOptions as p}
              <option value={p.id}>{p.name}</option>
            {/each}
          </select>
        </details>
      {/if}
      {#if project.startDate || project.endDate}
        <p class="profile-detail">
          {project.startDate ? formatDate(project.startDate) : '?'} - {project.endDate ? formatDate(project.endDate) : 'ongoing'}
        </p>
      {/if}
      <button class="outline edit-btn" onclick={openEdit}>Edit</button>
    </div>

    <div class="section-block">
      <h4>Sub-projects</h4>
      {#if project.children.length > 0}
        <ul class="child-list">
          {#each project.children as child}
            <li>
              {#if child.status}
                <span class="status-badge small" data-status={child.status}>{child.status}</span>
              {/if}
              <a href="/app/projects/{child.id}">{child.name}</a>
              <button
                class="text-btn danger"
                data-plain
                onclick={() => { if (confirm('Unlink this sub-project?')) handleUnlinkChild(child.id); }}
              >&times;</button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="muted">No sub-projects.</p>
      {/if}

      <form
        class="inline-form"
        onsubmit={(e: SubmitEvent) => { e.preventDefault(); handleCreateChild(); }}
      >
        <input type="text" bind:value={newChildName} placeholder="New sub-project name" />
        <button
          type="submit"
          disabled={creatingChild || !newChildName.trim()}
          aria-busy={creatingChild}
        >Add</button>
      </form>
    </div>
  {/snippet}

  {#snippet renderAssetHeader()}
    <strong class="asset-h-name">{project.name}</strong>
    {#if project.status}
      <span class="status-badge small" data-status={project.status}>{project.status}</span>
    {/if}
  {/snippet}

  {#snippet renderEditForm({ onSuccess })}
    <ProjectForm initial={project} {onSuccess} />
  {/snippet}
</EntityDetailPage>

<style lang="scss">
  .profile-card { margin-bottom: 0; }
  .profile-detail {
    margin: 0;
    color: var(--color-muted);
    font-size: 0.85rem;
  }
  .status-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  .status-badge {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.2rem 0.6rem;
    border-radius: $radius-md;
    background: var(--color-muted-border);
    color: var(--color-text);
    text-align: center;

    &[data-status="planning"] { background: var(--blue-2); color: var(--blue-9); }
    &[data-status="active"] { background: var(--green-2); color: var(--green-9); }
    &[data-status="archived"] { background: var(--gray-3); color: var(--gray-7); }
  }
  .status-btn {
    font-size: 0.75rem;
    padding: 0.15rem 0.5rem;
    color: var(--color-muted);
    border: 1px solid var(--color-muted-border);
    border-radius: $radius-md;
    background: transparent;
    transition: color 150ms ease, border-color 150ms ease;
    &:hover {
      color: var(--color-primary);
      border-color: var(--color-primary);
      background: transparent;
    }
  }
  .edit-btn {
    margin-top: 0.5rem;
    padding: 0.25rem 0.75rem;
  }
  .section-block { margin-top: 2rem; }
  h4 { font-size: 0.9rem; margin-bottom: 0.75rem; }
  .parent-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
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
      grid-template-columns: 64px 3fr auto;
      column-gap: 1rem;
      justify-content: space-between;
      align-items: center;
      padding: 0.25rem 0;
    }
  }
  .inline-form {
    display: flex;
    gap: 0.5rem;
    input {
      flex: 1;
      margin: 0;
      font-size: 0.85rem;
      padding: 0.3rem 0.5rem;
    }
    button {
      margin: 0;
      padding: 0.3rem 0.75rem;
      white-space: nowrap;
      width: auto;
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
  .status-badge.small {
    font-size: 0.65rem;
    padding: 0.1rem 0.4rem;
  }
  .muted {
    font-size: 0.85rem;
    color: var(--color-muted);
  }
  .asset-h-name {
    font-size: 0.95rem;
  }
</style>
