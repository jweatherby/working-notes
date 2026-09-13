<script lang="ts">
  import type { PageData } from './$types';
  import Popup from '$lib/common/Popup.svelte';
  import PageHeader from '$lib/ui/PageHeader.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import ProjectForm from '$lib/project/components/ProjectForm.svelte';
  import { openPopup, closePopup } from '$lib/ui/popup-url';
  import { statusBadgeClass } from '$lib/project/utils';

  const { data } = $props<{ data: PageData }>();
  const allProjects = $derived(data.projects.ok ? data.projects.value : []);

  interface ProjectNode {
    readonly id: string;
    readonly name: string;
    readonly status: string | null;
    readonly parentId: string | null;
    readonly childCount: number;
    readonly children: ProjectNode[];
  }

  const projectTree = $derived.by(() => {
    const map = new Map<string, ProjectNode>();
    const roots: ProjectNode[] = [];

    for (const p of allProjects) {
      map.set(p.id, { ...p, children: [] });
    }
    for (const p of allProjects) {
      const node = map.get(p.id)!;
      if (p.parentId && map.has(p.parentId)) {
        map.get(p.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  });

  const handleCreated = () => closePopup({ invalidate: true });
</script>

<svelte:head><title>Projects</title></svelte:head>

<div class="page">
  <PageHeader title="Projects" description="Track project health, documentation, and feedback.">
    <button type="button" class="btn primary" onclick={() => openPopup('new-project')}>Add project</button>
  </PageHeader>

  {#if projectTree.length > 0}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Sub-projects</th>
          </tr>
        </thead>
        <tbody>
          {#each projectTree as project (project.id)}
            {@render projectRow(project, 0)}
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

{#snippet projectRow(project: ProjectNode, depth: number)}
  <tr>
    <td>
      <span class="project-name" style="padding-left: {depth * 1.25}rem">
        {#if depth > 0}<span class="tree-indent">└</span>{/if}
        <a href="/app/projects/{project.id}">{project.name}</a>
      </span>
    </td>
    <td>
      {#if project.status}<span class={statusBadgeClass(project.status)}>{project.status}</span>{/if}
    </td>
    <td class="text-2">{project.childCount || ''}</td>
  </tr>
  {#each project.children as child (child.id)}
    {@render projectRow(child, depth + 1)}
  {/each}
{/snippet}

<Popup id="new-project" title="Add project">
  <ProjectForm onSuccess={handleCreated} onCancel={() => closePopup()} />
</Popup>

<style lang="scss">
  .project-name {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-1);
  }
  .tree-indent {
    color: var(--border-strong);
    font-size: var(--fs-sm);
  }
</style>
