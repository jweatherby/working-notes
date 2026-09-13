<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { trpc } from '$shared/trpc/client';
  import StatusDot from './StatusDot.svelte';
  import PriorityBadge from './PriorityBadge.svelte';
  import { nextStatus, formatTodoDate, type TodoStatus } from '../utils';
  import { openPopup } from '$lib/ui/popup-url';

  interface Todo {
    readonly id: string;
    readonly title: string;
    readonly status: TodoStatus;
    readonly priority: number;
    readonly targetDate: Date | null;
    readonly completedAt: Date | null;
  }

  interface Props {
    readonly entityType: string;
    readonly entityId: string;
    readonly todos: readonly Todo[];
    readonly onCreate?: () => void;
    readonly onEditTodo?: (id: string) => void;
  }

  const { todos, onCreate, onEditTodo }: Props = $props();

  let expanded = $state(true);

  const activeTodos = $derived(
    todos.filter((t) => t.status !== 'COMPLETE' && t.status !== 'CANCELLED'),
  );
  const completedTodos = $derived(
    todos.filter((t) => t.status === 'COMPLETE' || t.status === 'CANCELLED'),
  );

  const openCreate = () => {
    if (onCreate) return onCreate();
    openPopup('todo');
  };

  const openEdit = (id: string) => {
    if (onEditTodo) return onEditTodo(id);
    openPopup('todo', { todo: id });
  };

  const handleStatusChange = async (id: string, status: TodoStatus) => {
    await trpc().todo.update.mutate({ id, status });
    await invalidateAll();
  };
</script>

<div class="todo-widget">
  <div class="section-header">
    <h4>Todos <span class="count">{activeTodos.length}</span></h4>
    <span class="header-actions">
      <button type="button" class="btn icon sm" onclick={openCreate} title="New todo" aria-label="New todo">+</button>
      <button type="button" class="btn icon sm chevron" class:open={expanded} onclick={() => (expanded = !expanded)} aria-label={expanded ? 'Collapse' : 'Expand'} aria-expanded={expanded}>▸</button>
    </span>
  </div>

  {#if expanded}
    {#if activeTodos.length > 0}
      <ul class="list">
        {#each activeTodos as todo (todo.id)}
          <li class="list-row todo-row">
            <StatusDot status={todo.status} clickable onclick={() => handleStatusChange(todo.id, nextStatus(todo.status))} />
            <button type="button" class="grow truncate todo-title" onclick={() => openEdit(todo.id)}>{todo.title}</button>
            <PriorityBadge priority={todo.priority} />
            {#if todo.targetDate}<span class="meta">{formatTodoDate(todo.targetDate)}</span>{/if}
          </li>
        {/each}
      </ul>
    {:else}
      <p class="empty text-sm">No active todos.</p>
    {/if}

    {#if completedTodos.length > 0}
      <details class="completed">
        <summary>Completed ({completedTodos.length})</summary>
        <ul class="list">
          {#each completedTodos as todo (todo.id)}
            <li class="list-row todo-row done">
              <StatusDot status={todo.status} />
              <button type="button" class="grow truncate todo-title" onclick={() => openEdit(todo.id)}>{todo.title}</button>
              {#if todo.completedAt}<span class="meta">{formatTodoDate(todo.completedAt)}</span>{/if}
            </li>
          {/each}
        </ul>
      </details>
    {/if}
  {/if}
</div>

<style lang="scss">
  .header-actions { display: flex; align-items: center; }
  .chevron {
    transition: transform var(--ease);
    &.open { transform: rotate(90deg); }
  }
  .todo-row { padding-top: 3px; padding-bottom: 3px; }
  .todo-title {
    text-align: left;
    font-size: var(--fs-md);
    &:hover { color: var(--accent); }
  }
  .done .todo-title { color: var(--text-3); text-decoration: line-through; }
  .completed { margin-top: var(--sp-2); }
</style>
