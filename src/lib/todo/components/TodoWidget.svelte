<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { invalidateAll } from "$app/navigation";
  import { trpc } from "$shared/trpc/client";
  import StatusDot from "./StatusDot.svelte";
  import PriorityBadge from "./PriorityBadge.svelte";
  import { nextStatus, formatTodoDate, type TodoStatus } from "../utils";

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

  const { entityType, entityId, todos, onCreate, onEditTodo }: Props = $props();

  let expanded = $state(true);

  const activeTodos = $derived(
    todos.filter((t) => t.status !== "COMPLETE" && t.status !== "CANCELLED"),
  );
  const completedTodos = $derived(
    todos.filter((t) => t.status === "COMPLETE" || t.status === "CANCELLED"),
  );

  const openCreate = () => {
    if (onCreate) return onCreate();
    const url = new URL($page.url);
    url.searchParams.set("popup", "todo");
    goto(url.toString(), { replaceState: true, noScroll: true });
  };

  const openEdit = (id: string) => {
    if (onEditTodo) return onEditTodo(id);
    const url = new URL($page.url);
    url.searchParams.set("popup", "todo");
    url.searchParams.set("todo", id);
    goto(url.toString(), { replaceState: true, noScroll: true });
  };

  const handleStatusChange = async (id: string, status: TodoStatus) => {
    await trpc().todo.update.mutate({ id, status });
    await invalidateAll();
  };
</script>

<div class="todo-widget">
  <div class="header-row">
    <div class="todo-col1">
      <h4>
        Todos <span class="count">{activeTodos.length}</span>
      </h4>

      <button class="add-btn" onclick={openCreate} title="New todo">+</button>
    </div>
    <button
      class="toggle-header"
      data-plain
      onclick={() => (expanded = !expanded)}
    >
      <span class="chevron" class:open={expanded}>▸</span>
    </button>
  </div>

  {#if expanded}
    {#if activeTodos.length > 0}
      <ul class="todo-list">
        {#each activeTodos as todo}
          <li class="todo-item">
            <StatusDot
              status={todo.status}
              clickable
              onclick={() =>
                handleStatusChange(todo.id, nextStatus(todo.status))}
            />
            <button
              class="todo-title-btn"
              data-plain
              onclick={() => openEdit(todo.id)}
            >
              {todo.title}
            </button>
            <PriorityBadge priority={todo.priority} />
            {#if todo.targetDate}
              <span class="target-date">{formatTodoDate(todo.targetDate)}</span>
            {/if}
          </li>
        {/each}
      </ul>
    {:else}
      <p class="empty">No active todos.</p>
    {/if}

    {#if completedTodos.length > 0}
      <details class="completed-section">
        <summary>Completed ({completedTodos.length})</summary>
        <ul class="todo-list">
          {#each completedTodos as todo}
            <li class="todo-item done">
              <StatusDot status="COMPLETE" />
              <button
                class="todo-title-btn struck"
                data-plain
                onclick={() => openEdit(todo.id)}
              >
                {todo.title}
              </button>
              {#if todo.completedAt}
                <span class="target-date"
                  >{formatTodoDate(todo.completedAt)}</span
                >
              {/if}
            </li>
          {/each}
        </ul>
      </details>
    {/if}
  {/if}
</div>

<style lang="scss">
  .todo-widget {
    margin-top: 1.5rem;
  }
  .header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.25rem;
    .todo-col1 {
      display: flex;
      h4 {
        margin: 0;
      }
      .add-btn {
        margin: 0 8px;
        padding: 0 4px;
        font-size: 0.9rem;
        font-weight: 800;
        line-height: 1;
        border: 1px solid transparent;
        background: transparent;
        color: var(--color-muted);
        &:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
        }
      }
    }
  }
  .toggle-header {
    all: unset;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    h4 {
      margin: 0;
      font-size: 0.9rem;
    }
  }
  .count {
    font-size: 0.75rem;
    color: var(--color-muted);
    margin-left: 0.25rem;
  }
  .chevron {
    font-size: 1.75rem;
    color: var(--color-muted);
    transition: transform 150ms ease;
    &.open {
      transform: rotate(90deg);
    }
  }
  .todo-list {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0 0;
  }
  .todo-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.2rem 0;
    font-size: 0.83rem;
    &.done {
      opacity: 0.5;
    }
  }
  .todo-title-btn {
    all: unset;
    cursor: pointer;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    &:hover {
      color: var(--color-primary);
    }
  }
  .struck {
    text-decoration: line-through;
  }
  .target-date {
    font-size: 0.72rem;
    color: var(--color-muted);
    white-space: nowrap;
    flex-shrink: 0;
  }
  .empty {
    font-size: 0.8rem;
    color: var(--color-muted);
    margin: 0.5rem 0 0;
  }
  .completed-section {
    margin-top: 0.5rem;
    summary {
      font-size: 0.78rem;
      color: var(--color-muted);
      cursor: pointer;
    }
  }
</style>
