<script lang="ts">
  // A single-pick relationship editor: a link-style trigger that reveals a
  // compact select. Replaces the <details><summary><select onchange> pattern.
  interface Option {
    readonly id: string;
    readonly name: string;
  }

  interface Props {
    readonly label: string;
    readonly options: readonly Option[];
    readonly placeholder?: string;
    readonly onPick: (id: string) => Promise<void> | void;
  }

  const { label, options, placeholder = 'Choose…', onPick }: Props = $props();

  let open = $state(false);
  let busy = $state(false);
  let error = $state('');
  let selectEl = $state<HTMLSelectElement | null>(null);

  $effect(() => {
    if (open) selectEl?.focus();
  });

  const close = () => {
    open = false;
    error = '';
  };

  const handleChange = async (e: Event) => {
    const value = (e.currentTarget as HTMLSelectElement).value;
    if (!value) return;
    busy = true;
    error = '';
    try {
      await onPick(value);
      open = false;
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Could not save.';
    } finally {
      busy = false;
    }
  };
</script>

{#if options.length > 0}
  {#if open}
    <div class="picker">
      <select
        class="sm"
        bind:this={selectEl}
        onchange={handleChange}
        onkeydown={(e) => { if (e.key === 'Escape') close(); }}
        disabled={busy}
        aria-busy={busy}
        aria-label={label}
      >
        <option value="">{placeholder}</option>
        {#each options as o (o.id)}
          <option value={o.id}>{o.name}</option>
        {/each}
      </select>
      <button type="button" class="btn ghost sm" onclick={close}>Cancel</button>
      {#if error}<span class="text-sm" style="color: var(--danger)">{error}</span>{/if}
    </div>
  {:else}
    <button type="button" class="btn link text-sm" onclick={() => { open = true; }}>+ {label}</button>
  {/if}
{/if}

<style lang="scss">
  .picker {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    max-width: 320px;
    select { flex: 1; }
  }
</style>
