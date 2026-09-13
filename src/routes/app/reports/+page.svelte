<script lang="ts">
  import CenteredLayout from '$lib/common/CenteredLayout.svelte';
  import type { PageData } from './$types';

  const { data }: { data: PageData } = $props();

  const formatDate = (d: Date | string): string =>
    (typeof d === 'string' ? new Date(d) : d).toLocaleDateString('en-CA');
</script>

<svelte:head><title>Reports</title></svelte:head>

<CenteredLayout>
  <hgroup>
    <h1>Reports</h1>
    <p>Branded write-ups with charts. Create one from a person, team, department or project page, or ask Claude.</p>
  </hgroup>

  {#if data.reports.length === 0}
    <p class="muted">No reports yet.</p>
  {:else}
    <table>
      <thead>
        <tr><th>Title</th><th>About</th><th>Branding</th><th>Updated</th></tr>
      </thead>
      <tbody>
        {#each data.reports as report (report.id)}
          <tr>
            <td><a href="/app/reports/{report.id}">{report.title}</a></td>
            <td>
              {#if report.entityName}
                <a href={report.entityPath}>{report.entityName}</a>
              {:else}
                <span class="muted">{report.entityType.toLowerCase()}</span>
              {/if}
            </td>
            <td>{report.brandingName ?? 'Default'}</td>
            <td>{formatDate(report.updatedAt)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</CenteredLayout>

<style lang="scss">
  table {
    width: 100%;
    font-size: 0.9rem;
  }
  .muted {
    color: var(--color-muted);
  }
</style>
