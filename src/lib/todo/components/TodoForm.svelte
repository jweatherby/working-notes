<script lang="ts">
  import { trpc } from '$shared/trpc/client';
  import type { EntityType, TodoStatus } from '../utils';
  import Field from '$lib/ui/Field.svelte';
  import MarkdownEditor from '$lib/common/MarkdownEditor.svelte';
  import ConfirmButton from '$lib/ui/ConfirmButton.svelte';
  import { submit } from '$lib/ui/submit';
  import { toRelationInput, type PickedLink } from '$shared/utils/relations';
  import TodoLinks from './TodoLinks.svelte';

  interface Props {
    /** Omit both entity props to let the form ask which entity the todo belongs to. */
    readonly entityType?: EntityType;
    readonly entityId?: string;
    readonly editId?: string | null;
    readonly onSuccess: () => Promise<void> | void;
    readonly onCancel?: () => void;
  }

  const { entityType, entityId, editId = null, onSuccess, onCancel }: Props = $props();

  // Set when a new todo saved but some of its links didn't, so the form carries on as its edit form.
  let savedId = $state<string | null>(null);
  const todoId = $derived(editId ?? savedId);
  const isEdit = $derived(!!todoId);
  const needsEntity = $derived(!isEdit && !(entityType && entityId));

  let title = $state('');
  let description = $state('');
  let priority = $state(0);
  let targetDate = $state('');
  let status = $state<TodoStatus>('PENDING');
  let pickedEntityType = $state<EntityType>(entityType ?? 'PROJECT');
  let pickedEntityId = $state(entityId ?? '');
  let submitting = $state(false);
  let error = $state('');
  let loaded = $state(!editId);
  let pendingLinks = $state<readonly PickedLink[]>([]);

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
      pickedEntityType = todo.entityType;
      pickedEntityId = todo.entityId;
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
    const targetType = entityType ?? pickedEntityType;
    const targetId = (entityId ?? pickedEntityId).trim();
    if (!isEdit && !targetId) {
      error = 'Choose what this todo belongs to.';
      return;
    }
    submitting = true;
    error = '';
    const id = todoId;
    const outcome = id
      ? await submit(() => trpc().todo.update.mutate({
          id,
          title: title.trim(),
          description: description.trim() || null,
          priority,
          status,
          targetDate: targetDate ? new Date(targetDate) : null,
        }))
      : await submit(() => trpc().todo.create.mutate({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          entityType: targetType,
          entityId: targetId,
          targetDate: targetDate ? new Date(targetDate) : undefined,
        }));
    if (!outcome.ok) {
      submitting = false;
      error = outcome.error;
      return;
    }
    if (!id) {
      const failed = await addLinks(outcome.value.id);
      if (failed.length > 0) {
        submitting = false;
        savedId = outcome.value.id;
        pendingLinks = [];
        error = `The todo was created, but linking it failed: ${failed.join('; ')}`;
        return;
      }
    }
    submitting = false;
    await onSuccess();
  };

  /** Adds the links picked while creating; returns what failed. */
  const addLinks = async (id: string): Promise<readonly string[]> => {
    const failed: string[] = [];
    for (const link of pendingLinks) {
      const input = toRelationInput(link.choice, { entityType: 'TODO', entityId: id }, link.target);
      const outcome = input ? await submit(() => trpc().relation.add.mutate(input)) : { ok: false as const, error: 'unknown link kind' };
      if (!outcome.ok) failed.push(`${link.name} (${outcome.error})`);
    }
    return failed;
  };

  const handleDelete = async () => {
    const id = todoId;
    if (!id) return;
    const outcome = await submit(() => trpc().todo.delete.mutate({ id }));
    if (!outcome.ok) {
      error = outcome.error;
      return;
    }
    await onSuccess();
  };
</script>

{#if loaded}
  <form class="form-grid" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
    <Field label="Title">
      {#snippet children({ id })}
        <input {id} type="text" bind:value={title} placeholder="What needs doing?" />
      {/snippet}
    </Field>

    <Field label="Description">
      {#snippet children({ id })}
        <MarkdownEditor value={description} onChange={(md: string) => { description = md; }} />
      {/snippet}
    </Field>

    <div class="form-row" class:thirds={isEdit}>
      <Field label="Priority">
        {#snippet children({ id })}
          <select {id} bind:value={priority}>
            <option value={0}>None</option>
            <option value={1}>Low</option>
            <option value={2}>Medium</option>
            <option value={3}>High</option>
          </select>
        {/snippet}
      </Field>
      <Field label="Target date">
        {#snippet children({ id })}
          <input {id} type="date" bind:value={targetDate} />
        {/snippet}
      </Field>
      {#if isEdit}
        <Field label="Status">
          {#snippet children({ id })}
            <select {id} bind:value={status}>
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETE">Complete</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          {/snippet}
        </Field>
      {/if}
    </div>

    {#if needsEntity}
      <div class="form-row">
        <Field label="Belongs to">
          {#snippet children({ id })}
            <select {id} bind:value={pickedEntityType}>
              <option value="PROJECT">Project</option>
              <option value="PERSON">Person</option>
              <option value="TEAM">Team</option>
              <option value="DEPARTMENT">Department</option>
              <option value="GOAL">Goal</option>
              <option value="PAGE">Page</option>
            </select>
          {/snippet}
        </Field>
        <Field label="Entity id" hint="Open the entity page and add the todo there to skip this.">
          {#snippet children({ id })}
            <input {id} type="text" bind:value={pickedEntityId} placeholder="Entity id" />
          {/snippet}
        </Field>
      </div>
    {/if}

    <TodoLinks {todoId} bind:pending={pendingLinks} />

    {#if error}<p class="form-error">{error}</p>{/if}

    <div class="form-actions">
      <button type="submit" class="btn primary" disabled={submitting || !title.trim()} aria-busy={submitting}>
        {isEdit ? 'Save' : 'Create todo'}
      </button>
      {#if onCancel}
        <button type="button" class="btn ghost" onclick={onCancel}>Cancel</button>
      {/if}
      {#if isEdit}
        <span class="ml-auto"><ConfirmButton label="Delete" confirmLabel="Delete todo" variant="button" onConfirm={handleDelete} /></span>
      {/if}
    </div>
  </form>
{/if}
