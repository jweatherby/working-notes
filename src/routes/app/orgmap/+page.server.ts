import type { PageServerLoad } from './$types';
import { getRegistry } from '$shared/registry.server';
import { listDepartmentsWithMembers } from '$api/org/department/operations';
import { listTeamsWithMembers } from '$api/org/team/operations';
import { listPersons } from '$api/org/person/operations';

export const load: PageServerLoad = async () => {
  const reg = getRegistry();

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
