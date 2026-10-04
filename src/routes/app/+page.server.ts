import type { PageServerLoad } from './$types';
import { trpc } from '$shared/trpc/client';
import { FOCUS_TYPES } from '$shared/types/home';
import { parseTypedIdValue } from '$shared/utils/entity';
import { profileFeatures } from '$shared/settings/base/profile';
import { upcomingBirthdays } from '$shared/utils/birthday';

export const load: PageServerLoad = async ({ fetch, url, locals }) => {
  const client = trpc(fetch);
  const focus = parseTypedIdValue(url.searchParams.get('focus') ?? '', FOCUS_TYPES);
  const showBirthdays = profileFeatures(locals.notebook.profile).birthdays;
  const [todos, updates, graph, persons] = await Promise.all([
    client.home.todos.query({ limit: 15 }),
    client.home.updates.query({ limit: 12 }),
    client.home.graph.query(focus ? { focusType: focus.type, focusId: focus.id } : {}),
    showBirthdays ? client.person.list.query({}) : Promise.resolve(null)
  ]);
  const birthdays = persons?.ok
    ? upcomingBirthdays(persons.value, new Date()).map((b) => ({
      id: b.item.id,
      name: b.item.name,
      birthday: b.item.birthday ?? '',
      inDays: b.inDays,
      turns: b.turns
    }))
    : null;
  return {
    todos: todos.ok ? todos.value : [],
    updates: updates.ok ? updates.value : [],
    graph: graph.ok ? graph.value : { focus: null, groups: [] },
    birthdays
  };
};
