<script lang="ts">
  import { onMount } from 'svelte';
  import { Editor, rootCtx, defaultValueCtx, editorViewCtx } from '@milkdown/core';
  import {
    commonmark,
    toggleStrongCommand,
    toggleEmphasisCommand,
    toggleInlineCodeCommand,
    wrapInHeadingCommand,
    wrapInBulletListCommand,
    wrapInOrderedListCommand,
    wrapInBlockquoteCommand,
    toggleLinkCommand,
    turnIntoTextCommand,
  } from '@milkdown/preset-commonmark';
  import { gfm, toggleStrikethroughCommand } from '@milkdown/preset-gfm';
  import { listener, listenerCtx } from '@milkdown/plugin-listener';
  import { exitCodeBlockPlugin } from '$lib/shared/components/milkdown-exit-code-block';
  import { createImageDropPlugin } from '$lib/shared/components/milkdown-image-drop';
  import { imageResizeView } from '$lib/shared/components/milkdown-image-resize';

  import type { Snippet } from 'svelte';

  const { value, onChange, pendingImages, toolbarEnd } = $props<{
    value: string;
    onChange: (markdown: string) => void;
    pendingImages?: Map<string, File>;
    toolbarEnd?: Snippet;
  }>();

  let editorEl: HTMLDivElement;
  let editor: Editor | null = null;

  const runCommand = <Args extends unknown[]>(
    cmd: { run: (...args: Args) => boolean },
    ...args: Args
  ): void => {
    cmd.run(...args);
    editorEl?.querySelector<HTMLElement>('.editor')?.focus();
  };

  const clearFormatting = () => {
    if (!editor) return;
    turnIntoTextCommand.run();
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const { state, dispatch } = view;
      const { from, to } = state.selection;
      const tr = state.tr;
      state.doc.nodesBetween(from, to, (node) => {
        node.marks.forEach(mark => { tr.removeMark(from, to, mark.type); });
      });
      dispatch(tr);
    });
    editorEl?.querySelector<HTMLElement>('.editor')?.focus();
  };

  const imagePlugin = pendingImages ? createImageDropPlugin(pendingImages) : undefined;

  onMount(() => {
    let builder = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, editorEl);
        ctx.set(defaultValueCtx, value);
        ctx.get(listenerCtx)
          .markdownUpdated((_ctx, md, _prev) => {
            onChange(md);
          });
      })
      .use(commonmark)
      .use(gfm)
      .use(listener)
      .use(exitCodeBlockPlugin);

    if (imagePlugin) builder = builder.use(imagePlugin);
    builder = builder.use(imageResizeView);

    builder.create().then((e) => { editor = e; });

    return () => {
      editor?.destroy();
    };
  });
</script>

<div class="md-editor-container">
  <div class="toolbar">
    <div class="toolbar-group">
      <button type="button" class="toolbar-btn" title="Heading 1" onclick={() => editor && runCommand(wrapInHeadingCommand, 1)}>H1</button>
      <button type="button" class="toolbar-btn" title="Heading 2" onclick={() => editor && runCommand(wrapInHeadingCommand, 2)}>H2</button>
      <button type="button" class="toolbar-btn" title="Heading 3" onclick={() => editor && runCommand(wrapInHeadingCommand, 3)}>H3</button>
    </div>
    <span class="toolbar-sep"></span>
    <div class="toolbar-group">
      <button type="button" class="toolbar-btn" title="Bold (Ctrl+B)" onclick={() => editor && runCommand(toggleStrongCommand)}>
        <strong>B</strong>
      </button>
      <button type="button" class="toolbar-btn" title="Italic (Ctrl+I)" onclick={() => editor && runCommand(toggleEmphasisCommand)}>
        <em>I</em>
      </button>
      <button type="button" class="toolbar-btn" title="Strikethrough" onclick={() => editor && runCommand(toggleStrikethroughCommand)}>
        <s>S</s>
      </button>
      <button type="button" class="toolbar-btn" title="Inline code" onclick={() => editor && runCommand(toggleInlineCodeCommand)}>
        <code>&lt;/&gt;</code>
      </button>
    </div>
    <span class="toolbar-sep"></span>
    <div class="toolbar-group">
      <button type="button" class="toolbar-btn" title="Bullet list" onclick={() => editor && runCommand(wrapInBulletListCommand)}>
        &#8226;&#8801;
      </button>
      <button type="button" class="toolbar-btn" title="Ordered list" onclick={() => editor && runCommand(wrapInOrderedListCommand)}>
        1.&#8801;
      </button>
      <button type="button" class="toolbar-btn" title="Blockquote" onclick={() => editor && runCommand(wrapInBlockquoteCommand)}>
        &#10077;
      </button>
    </div>
    <span class="toolbar-sep"></span>
    <div class="toolbar-group">
      <button type="button" class="toolbar-btn" title="Link" onclick={() => editor && runCommand(toggleLinkCommand)}>
        &#128279;
      </button>
      <button type="button" class="toolbar-btn" title="Clear formatting" onclick={clearFormatting}>
        &#10005;
      </button>
    </div>
    {#if toolbarEnd}
      <div class="toolbar-end">
        {@render toolbarEnd()}
      </div>
    {/if}
  </div>
  <div class="md-editor-wrap" bind:this={editorEl}></div>
</div>

<style lang="scss">
  .md-editor-container {
    border: 1px solid var(--color-muted-border);
    border-top: none;
    border-radius: 0 0 4px 4px;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0.25rem 0.5rem;
    border-bottom: 1px solid var(--color-muted-border);
    background: var(--color-card-bg);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .toolbar-group {
    display: flex;
    gap: 0;
  }

  .toolbar-end {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .toolbar-sep {
    width: 1px;
    height: 1.2rem;
    background: var(--color-muted-border);
    margin: 0 0.35rem;
  }

  .toolbar-btn {
    padding: 0.2rem 0.45rem;
    margin: 0;
    border: none;
    background: none;
    color: var(--color-muted);
    font-size: 0.8rem;
    cursor: pointer;
    border-radius: 3px;
    line-height: 1.2;

    &:hover {
      background: var(--color-form-bg);
      color: var(--color-text);
    }

    code {
      font-size: 0.75rem;
      background: none;
      padding: 0;
    }
  }

  .md-editor-wrap {
    min-height: 200px;

    :global(.milkdown) {
      padding: 0.5rem 0.75rem;
    }

    :global(.editor) {
      outline: none;
      min-height: 180px;
      font-family: inherit;
      font-size: 0.9rem;
      line-height: 1.5;
    }

    :global(.editor p) {
      margin: 0.25em 0;
    }

    :global(h1) { font-size: 1.3rem; }
    :global(h2) { font-size: 1.1rem; margin-top: 1rem; }
    :global(h3) { font-size: 0.95rem; margin-top: 0.75rem; }

    :global(code) {
      background: var(--color-card-bg);
      color: var(--color-text);
      padding: 0.15rem 0.3rem;
      border-radius: 3px;
      font-size: 0.85em;
    }
    :global(pre) {
      background: var(--color-card-bg);
      color: var(--color-text);
      padding: 0.75rem;
      border-radius: 4px;
      overflow-x: auto;
    }
    :global(pre code) {
      background: none;
      padding: 0;
    }

    :global(ul), :global(ol) {
      padding-left: 1.5rem;
    }
    :global(blockquote) {
      border-left: 3px solid var(--color-muted-border);
      padding-left: 1rem;
      color: var(--color-muted);
    }

    :global(.editor img) {
      max-width: 100%;
      border-radius: 4px;
    }
  }
</style>
