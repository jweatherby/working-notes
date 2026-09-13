<script lang="ts">
  // "Goals" and "Projects owned" sections for a person, team or department overview.
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import GoalRows from './GoalRows.svelte';
  import type { GoalSummary } from '$shared/types/goals';
  import { statusBadgeClass } from '$lib/project/utils';

  interface OwnedProject {
    readonly id: string;
    readonly name: string;
    readonly status: string | null;
    readonly path: string;
  }

  interface Props {
    readonly goals: readonly GoalSummary[];
    readonly projects: readonly OwnedProject[];
  }

  const { goals, projects }: Props = $props();
</script>

<section class="section">
  <div class="section-header">
    <h4>Goals <span class="count">{goals.length}</span></h4>
  </div>
  {#if goals.length > 0}
    <GoalRows {goals} />
  {:else}
    <EmptyState message="No goals owned." />
  {/if}
</section>

<section class="section">
  <div class="section-header">
    <h4>Projects owned <span class="count">{projects.length}</span></h4>
  </div>
  {#if projects.length > 0}
    <ul class="list">
      {#each projects as project (project.id)}
        <li class="list-row">
          <a class="grow truncate" href={project.path}>{project.name}</a>
          {#if project.status}<span class={statusBadgeClass(project.status)}>{project.status}</span>{/if}
        </li>
      {/each}
    </ul>
  {:else}
    <EmptyState message="No projects owned." />
  {/if}
</section>
