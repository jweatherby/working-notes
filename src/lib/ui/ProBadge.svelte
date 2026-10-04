<script lang="ts">
  // "Pro" beside a control for a Working Notes Pro feature, shown only while the
  // license isn't active (the /app layout loads it as `license`).
  import { page } from '$app/state';
  import { isProActive, type LicenseStatus } from '$shared/types/license';

  const license = $derived(page.data.license as LicenseStatus | undefined);
</script>

{#if license && !isProActive(license)}
  <span class="badge accent" title="Part of Working Notes Pro">Pro</span>
{/if}
