<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import { trpc } from '$shared/trpc/client';
  import type { TodoSummary } from '$api/todo/operations';
  import StatusDot from '$lib/todo/components/StatusDot.svelte';
  import PriorityBadge from '$lib/todo/components/PriorityBadge.svelte';
  import { nextStatus, formatTodoDate, type TodoStatus } from '$lib/todo/utils';

  interface Props {
    readonly todos: readonly TodoSummary[];
  }

  const { todos }: Props = $props();

  const openEdit = (id: string) => {
    const url = new URL($page.url);
    url.searchParams.set('popup', 'todo');
    url.searchParams.set('todo', id);
    goto(url.toString(), { replaceState: true, noScroll: true });
  };

  const advance = async (id: string, status: TodoStatus) => {
    await trpc().todo.update.mutate({ id, status: nextStatus(status) });
    await invalidateAll();
  };
</script>

<section class="panel">
  <header>
    <h2>Todos</h2>
    <a href="/app/todos" class="more">All todos →</a>
  </header>

  {#if todos.length === 0}
    <p class="empty">Nothing open. Nice.</p>
  {:else}
    <ul class="todo-list">
      {#each todos as todo (todo.id)}
        <li class="todo-item">
          <StatusDot status={todo.status} clickable onclick={() => advance(todo.id, todo.status)} />
          <div class="body">
            <button class="title" data-plain onclick={() => openEdit(todo.id)}>
              {todo.title}<PriorityBadge priority={todo.priority} />
            </button>
            <div class="meta">
              {#if todo.entityLabel}<a href={todo.entityPath}>{todo.entityLabel}</a>{/if}
              {#if todo.targetDate}<span>due {formatTodoDate(todo.targetDate)}</span>{/if}
            </div>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style lang="scss">
  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }
  h2 {
    font-size: 1.1rem;
    margin: 0;
  }
  .more {
    font-size: 0.8rem;
  }
  .todo-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .todo-item {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.4rem 0;
    border-bottom: 1px solid var(--color-muted-border);
    font-size: 0.9rem;
    &:last-child {
      border-bottom: none;
    }
    :global(.status-toggle) {
      margin-top: 0.15rem;
    }
  }
  .body {
    min-width: 0;
    flex: 1;
  }
  .title {
    all: unset;
    cursor: pointer;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    &:hover {
      color: var(--color-primary);
    }
  }
  .meta {
    display: flex;
    gap: 0.6rem;
    font-size: 0.75rem;
    color: var(--color-muted);
    a {
      color: inherit;
    }
  }
  .empty {
    color: var(--color-muted);
    font-size: 0.85rem;
  }
</style>
