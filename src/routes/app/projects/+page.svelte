<script lang="ts">
  import type { PageData } from './$types';
  import Popup from '$lib/common/Popup.svelte';
  import PageHeader from '$lib/ui/PageHeader.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import ArchiveFilter from '$lib/ui/ArchiveFilter.svelte';
  import ProjectForm from '$lib/project/components/ProjectForm.svelte';
  import { openPopup, closePopup } from '$lib/ui/popup-url';
  import { statusBadgeClass } from '$lib/project/utils';
  import { buildTree, flattenTree } from '$shared/utils/hierarchy';
  import type { EntityOwner } from '$shared/types/owner';

  interface ProjectRow {
    readonly id: string;
    readonly name: string;
    readonly status: string | null;
    readonly parentId: string | null;
    readonly owner: EntityOwner | null;
    readonly childCount: number;
    readonly archivedAt: Date | string | null;
  }

  const { data } = $props<{ data: PageData }>();
  const allProjects = $derived((data.projects.ok ? data.projects.value : []) as readonly ProjectRow[]);
  const rows = $derived(flattenTree(buildTree(allProjects, (p) => p.parentId)));

  const handleCreated = () => closePopup({ invalidate: true });
</script>

<svelte:head><title>Projects</title></svelte:head>

<div class="page">
  <PageHeader title="Projects" description="Track project health, documentation, and feedback.">
    <button type="button" class="btn primary" onclick={() => openPopup('new-project')}>Add project</button>
  </PageHeader>

  <div class="toolbar filters">
    <ArchiveFilter />
  </div>

  {#if rows.length > 0}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Owner</th>
            <th>Status</th>
            <th>Sub-projects</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as { item: project, depth } (project.id)}
            <tr>
              <td>
                <span class="project-name" style="--depth: {depth}">
                  {#if depth > 0}<span class="tree-indent">└</span>{/if}
                  <a href="/app/projects/{project.id}">{project.name}</a>{#if project.archivedAt} <span class="badge muted">Archived</span>{/if}
                </span>
              </td>
              <td class="text-2">
                {#if project.owner}<a href={project.owner.path}>{project.owner.label ?? '—'}</a>{/if}
              </td>
              <td>
                {#if project.status}<span class={statusBadgeClass(project.status)}>{project.status}</span>{/if}
              </td>
              <td class="text-2">{project.childCount || ''}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <EmptyState message="No projects yet." boxed>
      <button type="button" class="btn sm" onclick={() => openPopup('new-project')}>Add project</button>
    </EmptyState>
  {/if}
</div>

<Popup id="new-project" title="Add project">
  <ProjectForm ownerOptions={data.ownerOptions} onSuccess={handleCreated} onCancel={() => closePopup()} />
</Popup>

<style lang="scss">
  .project-name {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-1);
    padding-left: calc(var(--depth) * var(--sp-5));
  }
  .tree-indent {
    color: var(--border-strong);
    font-size: var(--fs-sm);
  }
</style>
