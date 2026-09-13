<script lang="ts">
  // Global todo popup, opened with `?popup=todo` (create) or `?popup=todo&todo=<id>` (edit).
  import { page } from '$app/stores';
  import Popup from '$lib/common/Popup.svelte';
  import TodoForm from './TodoForm.svelte';
  import { closePopup } from '$lib/ui/popup-url';
  import type { EntityType } from '../utils';

  const ROUTE_TYPES = {
    projects: 'PROJECT',
    people: 'PERSON',
    teams: 'TEAM',
    departments: 'DEPARTMENT',
  } as const;

  const entityContext = $derived.by((): { entityType: EntityType; entityId: string } | null => {
    const m = $page.url.pathname.match(/^\/app\/(projects|people|teams|departments)\/([^/]+)/);
    if (!m?.[1] || !m?.[2]) return null;
    return { entityType: ROUTE_TYPES[m[1] as keyof typeof ROUTE_TYPES], entityId: m[2] };
  });

  const isOpen = $derived($page.url.searchParams.get('popup') === 'todo');
  const editId = $derived($page.url.searchParams.get('todo'));

  const close = () => closePopup({ clear: ['todo'] });
  const done = () => closePopup({ invalidate: true, clear: ['todo'] });
</script>

<Popup id="todo" title={editId ? 'Edit todo' : 'New todo'} clearParams={['todo']}>
  {#if isOpen}
    {#key editId}
      <TodoForm
        entityType={entityContext?.entityType}
        entityId={entityContext?.entityId}
        {editId}
        onSuccess={done}
        onCancel={close}
      />
    {/key}
  {/if}
</Popup>
