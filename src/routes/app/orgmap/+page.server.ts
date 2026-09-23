import type { PageServerLoad } from './$types';
import { getReadyRegistry } from '$shared/db/bootstrap.server';
import { listDepartmentsWithMembers } from '$api/org/department/operations';
import { listTeamsWithMembers } from '$api/org/team/operations';
import { listPersons } from '$api/org/person/operations';
import { listProjects } from '$api/project/operations';
import { listGoals } from '$api/goal/operations';
import { listProjectDependencies } from '$api/project/dependencies';

export const load: PageServerLoad = async ({ locals, url }) => {
  const reg = await getReadyRegistry(locals.notebook.id);
  const isWork = url.searchParams.get('view') === 'work';

  // The Work view also needs projects, goals and the links between them.
  const [departmentsResult, teamsResult, personsResult, projectsResult, goalsResult, dependenciesResult] = await Promise.all([
    listDepartmentsWithMembers(reg),
    listTeamsWithMembers(reg),
    listPersons(reg),
    isWork ? listProjects(reg) : null,
    isWork ? listGoals(reg, {}) : null,
    isWork ? listProjectDependencies(reg) : null
  ]);

  const departments = departmentsResult.ok ? departmentsResult.value : [];
  const teams = teamsResult.ok ? teamsResult.value : [];
  const work = projectsResult?.ok && goalsResult?.ok && dependenciesResult?.ok
    ? { projects: projectsResult.value, goals: goalsResult.value, dependencies: dependenciesResult.value, teams, departments }
    : null;

  return {
    departments,
    teams,
    persons: personsResult.ok ? personsResult.value : [],
    work
  };
};
