<script lang="ts">
  import CenteredLayout from '$lib/common/CenteredLayout.svelte';  import type { PageData } from "./$types";
  import { trpc } from "$shared/trpc/client";
  import { goto, invalidateAll } from "$app/navigation";

  const { data } = $props<{ data: PageData }>();
  const brandings = $derived(data.brandings.ok ? data.brandings.value : []);

  let busy = $state(false);
  let showCreate = $state(false);
  let newName = $state("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    busy = true;
    try {
      const result = await trpc().branding.create.mutate({
        name: newName.trim(),
      });
      if (result.ok) {
        goto(`/app/branding/${result.value.id}`);
      }
    } finally {
      busy = false;
    }
  };
</script>

<svelte:head><title>Branding</title></svelte:head>

<CenteredLayout>
<hgroup>
  <h1>Branding Profiles</h1>
  <p>Logos and colours applied to reports and their printed PDFs.</p>
</hgroup>

<div class="toolbar">
  <button class="outline" onclick={() => { showCreate = !showCreate; }}>
    {showCreate ? "Cancel" : "New Profile"}
  </button>
</div>

{#if showCreate}
  <article class="create-form">
    <form onsubmit={(e) => { e.preventDefault(); handleCreate(); }}>
      <label>
        Profile name
        <input type="text" bind:value={newName} placeholder="e.g. Acme Corp" required />
      </label>
      <button type="submit" disabled={busy || !newName.trim()} aria-busy={busy}>
        Create Profile
      </button>
    </form>
  </article>
{/if}

{#if brandings.length === 0 && !showCreate}
  <p class="muted">No branding profiles yet. Create one to brand your reports.</p>
{/if}

{#if brandings.length > 0}
  <div class="brand-grid">
    {#each brandings as brand}
      <a href="/app/branding/{brand.id}" class="brand-card">
        <div class="brand-swatches">
          <span class="swatch" style="background:{brand.primaryColor}"></span>
          <span class="swatch" style="background:{brand.accentColor}"></span>
        </div>
        <div class="brand-info">
          <strong>
            {brand.name}
            {#if brand.isDefault}<span class="default-badge">Default</span>{/if}
          </strong>
          <span class="brand-meta">
            {#if brand.hasIcon}icon{/if}
            {#if brand.hasLogo}{#if brand.hasIcon} · {/if}logo{/if}
          </span>
        </div>
      </a>
    {/each}
  </div>
{/if}
</CenteredLayout>

<style lang="scss">
  .toolbar {
    margin-bottom: 1rem;
  }
  .create-form {
    margin-bottom: 1.5rem;
  }
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .muted { font-size: $font-md; }
  .brand-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1rem;
  }
  .brand-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    border: 1px solid var(--color-muted-border);
    border-radius: 6px;
    text-decoration: none;
    color: inherit;
    transition: border-color 100ms ease, box-shadow 100ms ease;
    &:hover {
      border-color: var(--color-primary);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }
  }
  .brand-swatches {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .swatch {
    display: block;
    width: 28px;
    height: 14px;
    border-radius: 3px;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }
  .brand-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .brand-meta {
    font-size: 0.8rem;
    color: var(--color-muted);
  }
  .default-badge {
    display: inline-block;
    margin-left: 0.4rem;
    padding: 0.05rem 0.4rem;
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--color-primary);
    background: var(--color-surface-alt, #f0f0f0);
    border-radius: 3px;
    vertical-align: middle;
  }
</style>
