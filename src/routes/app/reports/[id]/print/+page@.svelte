<script lang="ts">
  import type { PageData } from './$types';
  import MarkdownReport from '$lib/report/components/MarkdownReport.svelte';

  const { data }: { data: PageData } = $props();
  const report = $derived(data.report);
</script>

<svelte:head>
  <title>{report.title}</title>
</svelte:head>

<div class="print-toolbar no-print">
  <a href="/app/reports/{report.id}">← Back to editor</a>
  <button onclick={() => window.print()}>Print / Save as PDF</button>
</div>

<main class="print-page">
  <MarkdownReport markdown={report.content} branding={report.branding} />
</main>

<style lang="scss">
  .print-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 900px;
    margin: 0 auto;
    padding: 1rem 1.5rem 0;
    button {
      margin: 0;
    }
  }
  .print-page {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem 1.5rem 3rem;
  }
  @media print {
    .print-page {
      padding: 0;
      max-width: none;
    }
    :global(.chart-block) {
      break-inside: avoid;
    }
  }
</style>
