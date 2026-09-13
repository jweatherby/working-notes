<script lang="ts">
  import CenteredLayout from '$lib/common/CenteredLayout.svelte';  import type { PageData } from './$types';
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import { trpc } from '$shared/trpc/client';
  import StatusDot from '$lib/todo/components/StatusDot.svelte';
  import PriorityBadge from '$lib/todo/components/PriorityBadge.svelte';
  import { nextStatus, formatTodoDate, type TodoStatus, type EntityType } from '$lib/todo/utils';
  const { data } = $props<{ data: PageData }>();
  const todos = $derived(data.todos);

  let statusFilter = $state<TodoStatus | 'ALL'>('ALL');
  let entityFilter = $state<EntityType | 'ALL'>('ALL');

  interface TodoItem {
    readonly id: string;
    readonly title: string;
    readonly status: TodoStatus;
    readonly priority: number;
    readonly entityType: EntityType;
    readonly entityId: string;
    readonly entityLabel: string | null;
    readonly targetDate: Date | null;
    readonly completedAt: Date | null;
    readonly createdAt: Date;
  }

  const filtered = $derived(
    (todos as readonly TodoItem[]).filter((t: TodoItem) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (entityFilter !== 'ALL' && t.entityType !== entityFilter) return false;
      return true;
    })
  );

  interface EntityGroup {
    readonly entityType: EntityType;
    readonly entityId: string;
    readonly entityLabel: string;
    readonly todos: readonly TodoItem[];
  }

  const groupByEntity = (items: readonly TodoItem[]): readonly EntityGroup[] => {
    const map = new Map<string, { entityType: EntityType; entityId: string; entityLabel: string; todos: TodoItem[] }>();
    for (const t of items) {
      const key = `${t.entityType}:${t.entityId}`;
      if (!map.has(key)) {
        map.set(key, { entityType: t.entityType, entityId: t.entityId, entityLabel: t.entityLabel ?? t.entityId, todos: [] });
      }
      map.get(key)!.todos.push(t);
    }
    return [...map.values()];
  };

  const activeGroups = $derived(groupByEntity(filtered.filter((t: TodoItem) => t.status !== 'COMPLETE' && t.status !== 'CANCELLED')));
  const completedTodos = $derived(filtered.filter((t: TodoItem) => t.status === 'COMPLETE' || t.status === 'CANCELLED'));

  const openEdit = (id: string) => {
    const url = new URL($page.url);
    url.searchParams.set('popup', 'todo');
    url.searchParams.set('todo', id);
    goto(url.toString(), { replaceState: true, noScroll: true });
  };

  const handleStatusChange = async (id: string, status: TodoStatus) => {
    await trpc().todo.update.mutate({ id, status });
    await invalidateAll();
  };

  const entityPath = (entityType: EntityType, entityId: string): string => {
    switch (entityType) {
      case 'PROJECT': return `/app/projects/${entityId}`;
      case 'PERSON': return `/app/people/${entityId}`;
      case 'TEAM': return `/app/teams/${entityId}`;
      case 'DEPARTMENT': return `/app/departments/${entityId}`;
      default: return `/app`;
    }
  };

  const entityTypeLabel = (t: EntityType): string => {
    switch (t) {
      case 'PROJECT': return 'Project';
      case 'PERSON': return 'Person';
      case 'TEAM': return 'Team';
      case 'DEPARTMENT': return 'Department';
      default: return t.replace('_', ' ').toLowerCase();
    }
  };
</script>

<svelte:head><title>Todos</title></svelte:head>

<CenteredLayout>
<h1>Todos</h1>

<div class="filters">
  <select bind:value={statusFilter}>
    <option value="ALL">All statuses</option>
    <option value="PENDING">Pending</option>
    <option value="ACTIVE">Active</option>
    <option value="COMPLETE">Complete</option>
    <option value="CANCELLED">Cancelled</option>
  </select>
  <select bind:value={entityFilter}>
    <option value="ALL">All types</option>
    <option value="PROJECT">Projects</option>
    <option value="PERSON">People</option>
    <option value="TEAM">Teams</option>
    <option value="DEPARTMENT">Departments</option>
  </select>
</div>

{#if activeGroups.length > 0}
  {#each activeGroups as group}
    <div class="entity-group">
      <h3 class="group-heading">
        <span class="entity-type">{entityTypeLabel(group.entityType)}</span>
        <a href={entityPath(group.entityType, group.entityId)}>{group.entityLabel}</a>
      </h3>
      <ul class="todo-list">
        {#each group.todos as todo}
          <li class="todo-item">
            <StatusDot
              status={todo.status}
              clickable
              onclick={() => handleStatusChange(todo.id, nextStatus(todo.status))}
            />
            <button class="todo-title-btn" data-plain onclick={() => openEdit(todo.id)}>
              <PriorityBadge priority={todo.priority} />
              {todo.title}
            </button>
            {#if todo.targetDate}
              <span class="date-cell">{formatTodoDate(todo.targetDate)}</span>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {/each}
{:else}
  <p class="empty">No active todos.</p>
{/if}

{#if completedTodos.length > 0}
  <details class="completed-section">
    <summary>Completed ({completedTodos.length})</summary>
    <table role="grid">
      <tbody>
        {#each completedTodos as todo}
          <tr class="done-row">
            <td class="col-status"><StatusDot status="COMPLETE" /></td>
            <td>
              <button class="todo-title-btn struck" data-plain onclick={() => openEdit(todo.id)}>
                {todo.title}
              </button>
            </td>
            <td>
              <a href={entityPath(todo.entityType, todo.entityId)} class="entity-link">
                <span class="entity-type">{entityTypeLabel(todo.entityType)}</span>
                {todo.entityLabel ?? todo.entityId}
              </a>
            </td>
            <td class="date-cell">{formatTodoDate(todo.completedAt)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </details>
{/if}
</CenteredLayout>

<style lang="scss">
  h1 {
    font-size: 1.4rem;
    margin-bottom: 1rem;
  }
  .filters {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    select {
      font-size: 0.85rem;
      padding: 0.3rem 0.5rem;
      margin: 0;
    }
  }
  .entity-group {
    margin-bottom: 1.5rem;
  }
  .group-heading {
    font-size: 0.9rem;
    margin: 0 0 0.5rem;
    a { text-decoration: none; &:hover { text-decoration: underline; } }
  }
  .todo-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .todo-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.25rem 0;
    font-size: 0.85rem;
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
  .entity-type {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--color-muted);
    margin-right: 0.3rem;
  }
  .date-cell {
    font-size: 0.78rem;
    color: var(--color-muted);
    white-space: nowrap;
  }
  .struck {
    text-decoration: line-through;
    opacity: 0.5;
  }
  .done-row {
    opacity: 0.6;
  }
  .empty {
    color: var(--color-muted);
    font-size: 0.85rem;
  }
  .completed-section {
    margin-top: 1.5rem;
    summary {
      font-size: 0.85rem;
      color: var(--color-muted);
      cursor: pointer;
      margin-bottom: 0.5rem;
    }
  }
</style>
