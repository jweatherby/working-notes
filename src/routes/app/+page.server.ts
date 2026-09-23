import type { PageServerLoad } from './$types';
import { trpc } from '$shared/trpc/client';
import { FOCUS_TYPES } from '$shared/types/home';
import { parseTypedIdValue } from '$shared/utils/entity';

export const load: PageServerLoad = async ({ fetch, url }) => {
  const client = trpc(fetch);
  const focus = parseTypedIdValue(url.searchParams.get('focus') ?? '', FOCUS_TYPES);
  const [todos, updates, graph] = await Promise.all([
    client.home.todos.query({ limit: 15 }),
    client.home.updates.query({ limit: 12 }),
    client.home.graph.query(focus ? { focusType: focus.type, focusId: focus.id } : {})
  ]);
  return {
    todos: todos.ok ? todos.value : [],
    updates: updates.ok ? updates.value : [],
    graph: graph.ok ? graph.value : { focus: null, groups: [] }
  };
};
