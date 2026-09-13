import type { PageServerLoad } from './$types';
import { trpc } from '$shared/trpc/client';

export const load: PageServerLoad = async ({ fetch }) => {
  const client = trpc(fetch);
  const [todos, updates, graph] = await Promise.all([
    client.home.todos.query({ limit: 15 }),
    client.home.updates.query({ limit: 12 }),
    client.home.graph.query({})
  ]);
  return {
    todos: todos.ok ? todos.value : [],
    updates: updates.ok ? updates.value : [],
    graph: graph.ok ? graph.value : { nodes: [], edges: [] }
  };
};
