import type { Registry } from '$shared/registry';
import { ok, err, type Result } from '$shared/utils';
import { planEntityCleanup, removeFiles } from '$api/_entity-cleanup';

// ----- Types -----

export interface TeamSummary {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly createdAt: Date;
}

export interface TeamMemberEntry {
  readonly id: string;
  readonly personId: string;
  readonly personName: string;
  readonly personTitle: string | null;
}

export interface TeamDetail extends TeamSummary {
  readonly updatedAt: Date;
  readonly members: readonly TeamMemberEntry[];
}

export interface TeamWithMembers extends TeamSummary {
  readonly members: readonly TeamMemberEntry[];
}

// ----- Operations -----

export const listTeams = async (
  reg: Pick<Registry, 'prisma'>
): Promise<Result<readonly TeamSummary[]>> => {
  const teams = await reg.prisma.team.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, description: true, createdAt: true }
  });
  return ok(teams);
};

export const listTeamsWithMembers = async (
  reg: Pick<Registry, 'prisma'>
): Promise<Result<readonly TeamWithMembers[]>> => {
  const teams = await reg.prisma.team.findMany({
    orderBy: { name: 'asc' },
    include: {
      members: {
        include: { person: { select: { id: true, name: true, title: true } } },
        orderBy: { createdAt: 'asc' }
      }
    }
  });
  return ok(
    teams.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      createdAt: t.createdAt,
      members: t.members.map((m) => ({
        id: m.id,
        personId: m.personId,
        personName: m.person.name,
        personTitle: m.person.title
      }))
    }))
  );
};

export const getTeam = async (
  reg: Pick<Registry, 'prisma'>,
  id: string
): Promise<Result<TeamDetail>> => {
  const team = await reg.prisma.team.findFirst({
    where: { id },
    include: {
      members: {
        include: { person: { select: { id: true, name: true, title: true } } },
        orderBy: { createdAt: 'asc' }
      }
    }
  });
  if (!team) return err(new Error('Team not found'));
  return ok({
    id: team.id,
    name: team.name,
    description: team.description,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
    members: team.members.map((m) => ({
      id: m.id,
      personId: m.personId,
      personName: m.person.name,
      personTitle: m.person.title
    }))
  });
};

export const createTeam = async (
  reg: Pick<Registry, 'prisma'>,
  input: { readonly name: string; readonly description?: string }
): Promise<Result<{ readonly id: string }>> => {
  const team = await reg.prisma.team.create({
    data: {
      name: input.name,
      description: input.description
    }
  });
  return ok({ id: team.id });
};

export const updateTeam = async (
  reg: Pick<Registry, 'prisma'>,
  id: string,
  input: { readonly name?: string; readonly description?: string | null }
): Promise<Result<{ readonly id: string }>> => {
  const existing = await reg.prisma.team.findFirst({ where: { id } });
  if (!existing) return err(new Error('Team not found'));

  await reg.prisma.team.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description })
    }
  });
  return ok({ id });
};

/** Also deletes what's attached to the team and its relations, and clears it as an owner. */
export const deleteTeam = async (
  reg: Pick<Registry, 'prisma' | 'storage' | 'logger'>,
  id: string
): Promise<Result<{ readonly deleted: true }>> => {
  const existing = await reg.prisma.team.findFirst({ where: { id } });
  if (!existing) return err(new Error('Team not found'));

  const cleanup = await planEntityCleanup(reg, 'TEAM', id);
  await reg.prisma.$transaction([...cleanup.ops, reg.prisma.team.delete({ where: { id } })]);
  await removeFiles(reg, cleanup.files);
  return ok({ deleted: true as const });
};

// ----- Membership operations -----

export const listTeamMembers = async (
  reg: Pick<Registry, 'prisma'>,
  teamId: string
): Promise<Result<readonly TeamMemberEntry[]>> => {
  const team = await reg.prisma.team.findFirst({ where: { id: teamId } });
  if (!team) return err(new Error('Team not found'));

  const members = await reg.prisma.teamMember.findMany({
    where: { teamId },
    include: { person: { select: { id: true, name: true, title: true } } },
    orderBy: { createdAt: 'asc' }
  });
  return ok(
    members.map((m) => ({
      id: m.id,
      personId: m.personId,
      personName: m.person.name,
      personTitle: m.person.title
    }))
  );
};

export const addTeamMember = async (
  reg: Pick<Registry, 'prisma'>,
  teamId: string,
  input: { readonly personId: string }
): Promise<Result<{ readonly id: string }>> => {
  const team = await reg.prisma.team.findFirst({ where: { id: teamId } });
  if (!team) return err(new Error('Team not found'));

  const person = await reg.prisma.person.findFirst({ where: { id: input.personId } });
  if (!person) return err(new Error('Person not found'));

  const member = await reg.prisma.teamMember.upsert({
    where: { teamId_personId: { teamId, personId: input.personId } },
    create: { teamId, personId: input.personId },
    update: {}
  });
  return ok({ id: member.id });
};

export const removeTeamMember = async (
  reg: Pick<Registry, 'prisma'>,
  teamId: string,
  personId: string
): Promise<Result<{ readonly deleted: true }>> => {
  const team = await reg.prisma.team.findFirst({ where: { id: teamId } });
  if (!team) return err(new Error('Team not found'));

  await reg.prisma.teamMember.deleteMany({ where: { teamId, personId } });
  return ok({ deleted: true as const });
};
