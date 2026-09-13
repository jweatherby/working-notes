<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { trpc } from '$shared/trpc/client';
  import type { TodoSummary } from '$api/aux/todo/operations';
  import StatusDot from '$lib/todo/components/StatusDot.svelte';
  import PriorityBadge from '$lib/todo/components/PriorityBadge.svelte';
  import { nextStatus, formatTodoDate, type TodoStatus } from '$lib/todo/utils';
  import { openPopup } from '$lib/ui/popup-url';

  interface Props {
    readonly todos: readonly TodoSummary[];
  }

  const { todos }: Props = $props();

  const openEdit = (id: string) => openPopup('todo', { todo: id });

  const advance = async (id: string, status: TodoStatus) => {
    await trpc().todo.update.mutate({ id, status: nextStatus(status) });
    await invalidateAll();
  };
</script>

<section class="card panel">
  <header class="section-header">
    <h2>Todos <span class="count">{todos.length}</span></h2>
    <a href="/app/todos" class="text-sm">All todos →</a>
  </header>

  {#if todos.length === 0}
    <p class="empty">Nothing open. Nice.</p>
  {:else}
    <ul class="list divided">
      {#each todos as todo (todo.id)}
        <li class="list-row todo-row">
          <StatusDot status={todo.status} clickable onclick={() => advance(todo.id, todo.status)} />
          <div class="body">
            <button type="button" class="title truncate" onclick={() => openEdit(todo.id)}>
              {todo.title} <PriorityBadge priority={todo.priority} />
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
  h2 { font-size: var(--fs-base); }
  .todo-row {
    align-items: flex-start;
    padding: var(--sp-2) 0;
    :global(.status-toggle) { margin-top: 1px; }
  }
  .body { min-width: 0; flex: 1; }
  .title {
    display: block;
    width: 100%;
    text-align: left;
    font-size: var(--fs-md);
    &:hover { color: var(--accent); }
  }
  .meta {
    display: flex;
    gap: var(--sp-2);
    font-size: var(--fs-sm);
    color: var(--text-3);
    a { color: inherit; }
    a:hover { color: var(--text); }
  }
</style>
