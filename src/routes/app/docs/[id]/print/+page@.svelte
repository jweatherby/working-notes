<script lang="ts">
  import type { PageData } from './$types';
  import PrintView from '$lib/doc/PrintView.svelte';
  import { printUrl } from '$lib/doc/print-options';

  const { data }: { data: PageData } = $props();
  const doc = $derived(data.doc);
</script>

<PrintView
  title={doc.title}
  content={doc.content}
  backHref={doc.entityPath}
  brandings={data.brandings}
  options={data.options}
  branding={data.branding}
  urlFor={(choice, header) => printUrl(doc.id, choice, header)}
/>
