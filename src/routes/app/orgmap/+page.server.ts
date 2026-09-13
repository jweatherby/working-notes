import type { PageServerLoad } from './$types';
import { getReadyRegistry } from '$shared/db/bootstrap.server';
import { listDepartmentsWithMembers } from '$api/org/department/operations';
import { listTeamsWithMembers } from '$api/org/team/operations';
import { listPersons } from '$api/org/person/operations';

export const load: PageServerLoad = async ({ locals }) => {
  const reg = await getReadyRegistry(locals.notebook.id);

  const [departmentsResult, teamsResult, personsResult] = await Promise.all([
    listDepartmentsWithMembers(reg),
    listTeamsWithMembers(reg),
    listPersons(reg)
  ]);

  return {
    departments: departmentsResult.ok ? departmentsResult.value : [],
    teams: teamsResult.ok ? teamsResult.value : [],
    persons: personsResult.ok ? personsResult.value : []
  };
};
