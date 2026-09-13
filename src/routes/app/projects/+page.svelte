<script lang="ts">
  import CenteredLayout from '$lib/common/CenteredLayout.svelte';  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Popup from '$lib/common/Popup.svelte';
  import ProjectForm from '$lib/project/components/ProjectForm.svelte';

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

<svelte:head><title>Projects</title></svelte:head>

<CenteredLayout>
<hgroup>
  <h1>Projects</h1>
  <p>Track project health, documentation, and feedback.</p>
</hgroup>

<button onclick={() => openPopup('new-project')}>Add Project</button>

{#if projectTree.length > 0}
  <table role="grid">
    <thead>
      <tr>
        <th>Name</th>
        <th>Status</th>
        <th>Children</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each projectTree as project}
        {@render projectRow(project, 0)}
      {/each}
    </tbody>
  </table>
{:else}
  <p>No projects yet. Add one to get started.</p>
{/if}
</CenteredLayout>

{#snippet projectRow(project: ProjectNode, depth: number)}
  <tr>
    <td>
      <span style="padding-left: {depth * 1.25}rem" class="project-name">
        {#if depth > 0}<span class="tree-indent">&#x2514;</span>{/if}
        <a href="/app/projects/{project.id}">{project.name}</a>
      </span>
    </td>
    <td>{project.status ?? '-'}</td>
    <td>{project.childCount}</td>
    <td><a href="/app/projects/{project.id}">View</a></td>
  </tr>
  {#each project.children as child}
    {@render projectRow(child, depth + 1)}
  {/each}
{/snippet}

<Popup id="new-project" title="Add Project">
  <ProjectForm onSuccess={handleCreated} />
</Popup>

<style lang="scss">
  .project-name {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }
  .tree-indent {
    color: var(--color-muted-border);
    font-size: 0.8rem;
  }
  .badge {
    display: inline-block;
    font-size: 0.7rem;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    background: var(--color-primary-bg);
    color: var(--color-primary-inverse);
    margin-left: 0.4rem;
    vertical-align: middle;
  }
</style>
