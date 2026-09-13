<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { trpc } from '$shared/trpc/client';
  import type { EntityType, TodoStatus } from '../utils';

  const entityContext = $derived.by((): { entityType: EntityType; entityId: string } | null => {
    const path = $page.url.pathname;
    const m = path.match(/^\/app\/(projects|teams|departments)\/([^/]+)/);
    if (!m?.[1] || !m?.[2]) return null;
    const typeMap = { projects: 'PROJECT', teams: 'TEAM', departments: 'DEPARTMENT' } as const;
    const entityType = typeMap[m[1] as keyof typeof typeMap];
    if (!entityType) return null;
    return { entityType, entityId: m[2] };
  });

  const isOpen = $derived($page.url.searchParams.get('popup') === 'todo');
  const editId = $derived($page.url.searchParams.get('todo'));
  const isEdit = $derived(!!editId);

  let title = $state('');
  let description = $state('');
  let priority = $state(0);
  let targetDate = $state('');
  let status = $state<TodoStatus>('PENDING');
  let entityType = $state<EntityType>('PROJECT');
  let entityId = $state('');
  let submitting = $state(false);
  let deleting = $state(false);
  let error = $state('');
  let loaded = $state(false);

  $effect(() => {
    if (!isOpen) {
      loaded = false;
      return;
    }
    if (editId && !loaded) {
      loadTodo(editId);
    } else if (!editId) {
      title = '';
      description = '';
      priority = 0;
      targetDate = '';
      status = 'PENDING';
      error = '';
      if (entityContext) {
        entityType = entityContext.entityType;
        entityId = entityContext.entityId;
      } else {
        entityId = '';
      }
      loaded = true;
    }
  });

  const loadTodo = async (id: string) => {
    try {
      const todos = await trpc().todo.list.query({});
      const todo = (todos as readonly { id: string; title: string; description: string | null; status: TodoStatus; priority: number; entityType: EntityType; entityId: string; targetDate: Date | null }[]).find((t) => t.id === id);
      if (!todo) {
        error = 'Todo not found.';
        loaded = true;
        return;
      }
      title = todo.title;
      description = todo.description ?? '';
      priority = todo.priority;
      status = todo.status;
      entityType = todo.entityType;
      entityId = todo.entityId;
      targetDate = todo.targetDate ? new Date(todo.targetDate).toISOString().slice(0, 10) : '';
      error = '';
      loaded = true;
    } catch {
      error = 'Failed to load todo.';
      loaded = true;
    }
  };

  const close = () => {
    const url = new URL($page.url);
    url.searchParams.delete('popup');
    url.searchParams.delete('todo');
    goto(url.toString(), { replaceState: true, noScroll: true });
  };

  const handleSubmit = async () => {
    if (!title.trim() || !entityId.trim()) {
      error = 'Title and entity ID are required.';
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
          targetDate: targetDate ? new Date(targetDate) : null
        });
      } else {
        await trpc().todo.create.mutate({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          entityType,
          entityId: entityId.trim(),
          targetDate: targetDate ? new Date(targetDate) : undefined
        });
      }
      const url = new URL($page.url);
      url.searchParams.delete('popup');
      url.searchParams.delete('todo');
      await goto(url.toString(), { replaceState: true, noScroll: true, invalidateAll: true });
      submitting = false;
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to save todo.';
      submitting = false;
    }
  };

  const handleDelete = async () => {
    if (!editId) return;
    deleting = true;
    try {
      await trpc().todo.delete.mutate({ id: editId });
      deleting = false;
      const url = new URL($page.url);
      url.searchParams.delete('popup');
      url.searchParams.delete('todo');
      await goto(url.toString(), { replaceState: true, noScroll: true, invalidateAll: true });
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to delete todo.';
      deleting = false;
    }
  };

  const handleBackdrop = (e: MouseEvent) => {
    if (e.target === e.currentTarget) close();
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) close();
  };
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && loaded}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <dialog class="popup" open onclick={handleBackdrop}>
    <article class="popup-article">
      <header class="popup-header">
        <button aria-label="Close" class="close-btn" onclick={close}></button>
        <h3>{isEdit ? 'Edit Todo' : 'New Todo'}</h3>
      </header>
      <div class="popup-body">
        <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <label>
            Title
            <input type="text" bind:value={title} placeholder="What needs doing?" autofocus />
          </label>

          <label>
            Description
            <textarea bind:value={description} rows={2} placeholder="Optional details…"></textarea>
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

          {#if !entityContext && !isEdit}
            <div class="row">
              <label class="half">
                Entity type
                <select bind:value={entityType}>
                  <option value="PROJECT">Project</option>
                  <option value="PERSON">Person</option>
                  <option value="TEAM">Team</option>
                  <option value="DEPARTMENT">Department</option>
                </select>
              </label>
              <label class="half">
                Entity ID
                <input type="text" bind:value={entityId} placeholder="Entity ID" />
              </label>
            </div>
          {:else if !isEdit}
            <p class="context-hint">
              Linking to current {entityType.toLowerCase()}.
            </p>
          {/if}

          {#if error}
            <p class="error">{error}</p>
          {/if}

          <div class="form-actions">
            <button type="submit" disabled={submitting || !title.trim()}>
              {#if submitting}Saving…{:else}{isEdit ? 'Save' : 'Create Todo'}{/if}
            </button>
            {#if isEdit}
              <button type="button" class="danger-btn" onclick={handleDelete} disabled={deleting}>
                {#if deleting}Deleting…{:else}Delete{/if}
              </button>
            {/if}
          </div>
        </form>
      </div>
    </article>
  </dialog>
{/if}

<style lang="scss">
  .popup-article {
    display: flex;
    flex-direction: column;
    max-height: 85vh;
    overflow: hidden;
  }
  .popup-header {
    flex-shrink: 0;
    position: sticky;
    top: 0;
    z-index: 1;
  }
  .popup-body {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
  .row {
    display: flex;
    gap: 0.75rem;
  }
  .half {
    flex: 1;
  }
  .context-hint {
    font-size: 0.8rem;
    color: var(--color-muted);
    margin: 0 0 0.75rem;
  }
  .error {
    color: var(--color-danger);
    font-size: 0.85rem;
    margin: 0.25rem 0;
  }
  textarea {
    resize: vertical;
  }
  .form-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .danger-btn {
    background: transparent;
    color: var(--color-danger);
    border: 1px solid var(--color-danger);
    &:hover {
      background: var(--color-danger);
      color: white;
    }
  }
</style>
