<script lang="ts">
  import { trpc } from '$shared/trpc/client';
  import type { EntityType, TodoStatus } from '../utils';

  interface Props {
    readonly entityType: EntityType;
    readonly entityId: string;
    readonly editId?: string | null;
    readonly onSuccess: () => Promise<void> | void;
    readonly onCancel?: () => void;
  }

  const { entityType, entityId, editId = null, onSuccess, onCancel }: Props = $props();

  const isEdit = $derived(!!editId);

  let title = $state('');
  let description = $state('');
  let priority = $state(0);
  let targetDate = $state('');
  let status = $state<TodoStatus>('PENDING');
  let submitting = $state(false);
  let deleting = $state(false);
  let error = $state('');
  let loaded = $state(!editId);

  $effect(() => {
    if (editId && !loaded) loadTodo(editId);
  });

  const loadTodo = async (id: string) => {
    try {
      const todos = await trpc().todo.list.query({});
      const todo = (todos as readonly {
        id: string;
        title: string;
        description: string | null;
        status: TodoStatus;
        priority: number;
        entityType: EntityType;
        entityId: string;
        targetDate: Date | null;
      }[]).find((t) => t.id === id);
      if (!todo) {
        error = 'Todo not found.';
        loaded = true;
        return;
      }
      title = todo.title;
      description = todo.description ?? '';
      priority = todo.priority;
      status = todo.status;
      targetDate = todo.targetDate ? new Date(todo.targetDate).toISOString().slice(0, 10) : '';
      error = '';
      loaded = true;
    } catch {
      error = 'Failed to load todo.';
      loaded = true;
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      error = 'Title is required.';
      return;
    }
    submitting = true;
    error = '';
    try {
      if (isEdit && editId) {
        await trpc().todo.update.mutate({
          id: editId,
          title: title.trim(),
          description: description.trim() || null,
          priority,
          status,
          targetDate: targetDate ? new Date(targetDate) : null,
        });
      } else {
        await trpc().todo.create.mutate({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          entityType,
          entityId,
          targetDate: targetDate ? new Date(targetDate) : undefined,
        });
      }
      await onSuccess();
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to save todo.';
    } finally {
      submitting = false;
    }
  };

  const handleDelete = async () => {
    if (!editId) return;
    deleting = true;
    try {
      await trpc().todo.delete.mutate({ id: editId });
      await onSuccess();
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to delete todo.';
    } finally {
      deleting = false;
    }
  };
</script>

{#if loaded}
  <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
    <label>
      Title
      <input type="text" bind:value={title} placeholder="What needs doing?" autofocus />
    </label>

    <label>
      Description
      <textarea bind:value={description} rows={3} placeholder="Optional details…"></textarea>
    </label>

    <div class="row">
      <label class="half">
        Priority
        <select bind:value={priority}>
          <option value={0}>None</option>
          <option value={1}>Low</option>
          <option value={2}>Medium</option>
          <option value={3}>High</option>
        </select>
      </label>
      <label class="half">
        Target date
        <input type="date" bind:value={targetDate} />
      </label>
    </div>

    {#if isEdit}
      <label>
        Status
        <select bind:value={status}>
          <option value="PENDING">Pending</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETE">Complete</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </label>
    {/if}

    {#if error}
      <p class="error">{error}</p>
    {/if}

    <div class="form-actions">
      <button type="submit" disabled={submitting || !title.trim()}>
        {#if submitting}Saving…{:else}{isEdit ? 'Save' : 'Create Todo'}{/if}
      </button>
      {#if onCancel}
        <button type="button" class="outline" data-plain onclick={onCancel}>Cancel</button>
      {/if}
      {#if isEdit}
        <button type="button" class="danger-btn" onclick={handleDelete} disabled={deleting}>
          {#if deleting}Deleting…{:else}Delete{/if}
        </button>
      {/if}
    </div>
  </form>
{/if}

<style lang="scss">
  .row {
    display: flex;
    gap: 0.75rem;
  }
  .half { flex: 1; }
  .error {
    color: var(--color-danger);
    font-size: 0.85rem;
    margin: 0.25rem 0;
  }
  textarea { resize: vertical; }
  .form-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .danger-btn {
    background: transparent;
    color: var(--color-danger);
    border: 1px solid var(--color-danger);
    margin-left: auto;
    &:hover {
      background: var(--color-danger);
      color: white;
    }
  }
</style>
