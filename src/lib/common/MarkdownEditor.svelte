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
  <div class="editor-toolbar">
    <div class="toolbar-group">
      <button type="button" class="btn ghost sm tb" title="Heading 1" onclick={() => editor && runCommand(wrapInHeadingCommand, 1)}>H1</button>
      <button type="button" class="btn ghost sm tb" title="Heading 2" onclick={() => editor && runCommand(wrapInHeadingCommand, 2)}>H2</button>
      <button type="button" class="btn ghost sm tb" title="Heading 3" onclick={() => editor && runCommand(wrapInHeadingCommand, 3)}>H3</button>
    </div>
    <span class="toolbar-sep"></span>
    <div class="toolbar-group">
      <button type="button" class="btn ghost sm tb" title="Bold (Ctrl+B)" onclick={() => editor && runCommand(toggleStrongCommand)}>
        <strong>B</strong>
      </button>
      <button type="button" class="btn ghost sm tb" title="Italic (Ctrl+I)" onclick={() => editor && runCommand(toggleEmphasisCommand)}>
        <em>I</em>
      </button>
      <button type="button" class="btn ghost sm tb" title="Strikethrough" onclick={() => editor && runCommand(toggleStrikethroughCommand)}>
        <s>S</s>
      </button>
      <button type="button" class="btn ghost sm tb" title="Inline code" onclick={() => editor && runCommand(toggleInlineCodeCommand)}>
        <code>&lt;/&gt;</code>
      </button>
    </div>
    <span class="toolbar-sep"></span>
    <div class="toolbar-group">
      <button type="button" class="btn ghost sm tb" title="Bullet list" onclick={() => editor && runCommand(wrapInBulletListCommand)}>
        &#8226;&#8801;
      </button>
      <button type="button" class="btn ghost sm tb" title="Ordered list" onclick={() => editor && runCommand(wrapInOrderedListCommand)}>
        1.&#8801;
      </button>
      <button type="button" class="btn ghost sm tb" title="Blockquote" onclick={() => editor && runCommand(wrapInBlockquoteCommand)}>
        &#10077;
      </button>
    </div>
    <span class="toolbar-sep"></span>
    <div class="toolbar-group">
      <button type="button" class="btn ghost sm tb" title="Link" onclick={() => editor && runCommand(toggleLinkCommand)}>
        &#128279;
      </button>
      <button type="button" class="btn ghost sm tb" title="Clear formatting" onclick={clearFormatting}>
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
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--surface);
    overflow: hidden;
  }

  .editor-toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 2px;
    padding: var(--sp-1) var(--sp-2);
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    position: sticky;
    top: 0;
    z-index: var(--z-sticky);
  }

  .toolbar-group {
    display: flex;
    gap: 2px;
  }

  .toolbar-end {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }

  .toolbar-sep {
    width: 1px;
    height: 16px;
    background: var(--border);
    margin: 0 var(--sp-1);
  }

  .tb {
    min-width: var(--control-h-sm);
    padding: 0 6px;
    color: var(--text-3);
    font-size: var(--fs-sm);
    code { font-size: var(--fs-xs); background: none; padding: 0; color: inherit; }
  }

  .md-editor-wrap {
    min-height: 200px;

    :global(.milkdown) {
      padding: var(--sp-2) var(--sp-3);
    }

    :global(.editor) {
      outline: none;
      min-height: 180px;
      font-family: inherit;
      font-size: var(--fs-md);
      line-height: 1.55;
    }

    :global(.editor p) {
      margin: 0.25em 0;
    }

    :global(h1) { font-size: var(--fs-xl); }
    :global(h2) { font-size: var(--fs-lg); margin-top: var(--sp-4); }
    :global(h3) { font-size: var(--fs-base); margin-top: var(--sp-3); }

    :global(ul), :global(ol) {
      padding-left: var(--sp-5);
    }
    :global(blockquote) {
      border-left: 3px solid var(--border-strong);
      padding-left: var(--sp-3);
      color: var(--text-2);
    }

    :global(.editor img) {
      max-width: 100%;
      border-radius: var(--r-sm);
    }
  }
</style>
