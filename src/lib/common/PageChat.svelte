<script lang="ts">
  import { trpc } from '$shared/trpc/client';
  import type { ChatMessage } from '$shared/types/page-chat';
  import type { RightPanelPage } from '$lib/stores/right-panel';
  import MarkdownRenderer from '$lib/common/MarkdownRenderer.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import { errorMessage } from '$lib/ui/submit';
  import { askAboutPage } from '$lib/common/use-page-chat';

  interface Props {
    readonly page: RightPanelPage;
  }

  const { page }: Props = $props();

  // One chat per mount: RightPanel remounts this when the page changes.
  let chatId = $state(crypto.randomUUID());
  let messages = $state<readonly ChatMessage[]>([]);
  let draft = $state('');
  let waiting = $state(false);
  let notice = $state<{ readonly tone: 'warning' | 'error'; readonly message: string } | null>(null);
  let listEl: HTMLDivElement | undefined = $state();

  $effect(() => {
    void messages.length;
    void waiting;
    listEl?.scrollTo({ top: listEl.scrollHeight });
  });

  const send = async () => {
    const content = draft.trim();
    if (!content || waiting) return;
    const sent = [...messages, { role: 'user' as const, content }];
    messages = sent;
    draft = '';
    notice = null;
    waiting = true;
    try {
      const reply = await askAboutPage(trpc().chat, {
        chatId,
        entityType: page.entityType,
        entityName: page.entityName,
        pageText: page.getPageText(),
        messages: sent
      });
      if (reply.kind === 'reply') messages = [...sent, { role: 'assistant', content: reply.content }];
      else {
        // Nothing was sent: put the message back to send again.
        messages = sent.slice(0, -1);
        draft = content;
        notice = { tone: 'warning', message: reply.message };
      }
    } catch (e: unknown) {
      notice = { tone: 'error', message: errorMessage(e) };
    } finally {
      waiting = false;
    }
  };

  const clear = () => {
    messages = [];
    notice = null;
    chatId = crypto.randomUUID();
  };

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      void send();
    }
  };
</script>

<div class="page-chat">
  <div class="messages" bind:this={listEl}>
    {#if messages.length === 0}
      <EmptyState small message="Ask Claude about {page.entityName}. It reads what's on this page and doesn't change anything." />
    {/if}
    {#each messages as message, i (i)}
      <div class="message" class:user={message.role === 'user'}>
        {#if message.role === 'user'}
          <p class="user-text">{message.content}</p>
        {:else}
          <MarkdownRenderer content={message.content} />
        {/if}
      </div>
    {/each}
    {#if waiting}
      <p class="thinking" aria-busy="true">Claude is thinking…</p>
    {/if}
    {#if notice}
      <p class={notice.tone === 'error' ? 'inline-error' : 'chat-warning'}>{notice.message}</p>
    {/if}
  </div>

  <form class="composer" onsubmit={(e) => { e.preventDefault(); void send(); }}>
    <textarea
      rows="3"
      bind:value={draft}
      onkeydown={onKeydown}
      placeholder="Ask about this page…"
      aria-label="Message Claude about this page"
    ></textarea>
    <div class="composer-actions">
      {#if messages.length > 0}
        <button type="button" class="btn ghost sm" onclick={clear} disabled={waiting}>Clear</button>
      {/if}
      <button type="submit" class="btn primary sm" disabled={waiting || !draft.trim()} aria-busy={waiting}>
        {waiting ? 'Waiting…' : 'Send'}
      </button>
    </div>
  </form>
</div>

<style lang="scss">
  .page-chat {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }
  .messages {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    padding: var(--sp-3) var(--sp-4);
  }
  .message {
    font-size: var(--fs-md);
    &.user {
      align-self: flex-end;
      max-width: 90%;
      padding: var(--sp-2) var(--sp-3);
      border-radius: var(--r-md);
      background: var(--surface-2);
    }
  }
  .user-text { margin: 0; white-space: pre-wrap; }
  .thinking { margin: 0; font-size: var(--fs-sm); color: var(--text-3); }
  .chat-warning { margin: 0; font-size: var(--fs-sm); color: var(--warning); }
  .composer {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    padding: var(--sp-3) var(--sp-4);
    border-top: 1px solid var(--border);
    textarea { width: 100%; resize: vertical; }
  }
  .composer-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--sp-2);
  }
</style>
