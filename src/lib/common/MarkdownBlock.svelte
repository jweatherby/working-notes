<script lang="ts">
  import { marked } from 'marked';

  interface Props {
    readonly value: string;
    readonly placeholder?: string;
    readonly readonly?: boolean;
    readonly onSave?: (value: string) => void | Promise<void>;
  }

  const { value, placeholder = 'Click to add content...', readonly: isReadonly = false, onSave }: Props = $props();

  let editing = $state(false);
  let draft = $state('');
  let saving = $state(false);

  const startEdit = () => {
    if (isReadonly) return;
    draft = value;
    editing = true;
  };

  const cancel = () => {
    editing = false;
  };

  const save = async () => {
    if (!onSave) return;
    saving = true;
    try {
      await onSave(draft);
      editing = false;
    } finally {
      saving = false;
    }
  };
</script>

{#if editing}
  <div class="md-editor">
    <textarea bind:value={draft} rows={6}></textarea>
    <div class="md-actions">
      <button class="outline" onclick={cancel} disabled={saving}>Cancel</button>
      <button onclick={save} disabled={saving} aria-busy={saving}>Save</button>
    </div>
  </div>
{:else}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="md-preview"
    class:clickable={!isReadonly}
    class:empty={!value}
    onclick={startEdit}
  >
    {#if value}
      {@html marked.parse(value)}
    {:else}
      <span class="placeholder">{placeholder}</span>
    {/if}
  </div>
{/if}

<style lang="scss">
  .md-preview {
    font-size: $font-md;
    line-height: 1.6;

    &.clickable {
      cursor: pointer;
      border-radius: 4px;
      padding: 0.5rem;
      margin: -0.5rem;
      transition: background 150ms ease;

      &:hover {
        background: var(--color-form-bg);
      }
    }

    &.empty {
      min-height: 2rem;
    }

    :global(p:last-child) {
      margin-bottom: 0;
    }
  }

  .placeholder {
    color: var(--color-muted);
    font-style: italic;
  }

  .md-editor {
    textarea {
      width: 100%;
      font-family: monospace;
      font-size: 0.85rem;
    }
  }

  .md-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;

    button {
      padding: 0.3rem 0.75rem;
      margin: 0;
    }
  }
</style>
