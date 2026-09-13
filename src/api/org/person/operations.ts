import type { Registry } from '$shared/registry';
import { ok, err, type Result } from '$shared/utils';
import type { ArchiveFilter } from '$shared/types/enums';
import { planEntityCleanup, removeFiles } from '$api/_entity-cleanup';
import { archiveWhere, ensureWritable } from '$api/_archive';

// ----- Types -----

export interface PersonSummary {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly title: string | null;
  readonly leadId: string | null;
  readonly leadName: string | null;
  readonly archivedAt: Date | null;
  readonly createdAt: Date;
}

export interface PersonReport {
  readonly id: string;
  readonly name: string;
  readonly title: string | null;
}

export interface PersonTeamMembership {
  readonly teamId: string;
  readonly teamName: string;
}

export interface PersonDepartment {
  readonly id: string;
  readonly name: string;
}

export interface PersonDetail extends PersonSummary {
  readonly updatedAt: Date;
  readonly reports: readonly PersonReport[];
  readonly teamMemberships: readonly PersonTeamMembership[];
  readonly department: PersonDepartment | null;
}

// ----- Operations -----

export const listPersons = async (
  reg: Pick<Registry, 'prisma'>,
  archived: ArchiveFilter = 'exclude'
): Promise<Result<readonly PersonSummary[]>> => {
  const persons = await reg.prisma.person.findMany({
    where: archiveWhere(archived),
    orderBy: { name: 'asc' },
    include: { lead: { select: { id: true, name: true } } }
  });
  return ok(
    persons.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      title: p.title,
      leadId: p.leadId,
      leadName: p.lead?.name ?? null,
      archivedAt: p.archivedAt,
      createdAt: p.createdAt
    }))
  );
};

export const getPerson = async (
  reg: Pick<Registry, 'prisma'>,
  id: string
): Promise<Result<PersonDetail>> => {
  const person = await reg.prisma.person.findFirst({
    where: { id },
    include: {
      lead: { select: { id: true, name: true } },
      reports: { select: { id: true, name: true, title: true }, orderBy: { name: 'asc' } },
      teamMemberships: {
        include: { team: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' }
      },
      department: { select: { id: true, name: true } }
    }
  });
  if (!person) return err(new Error('Person not found'));
  return ok({
    id: person.id,
    name: person.name,
    email: person.email,
    title: person.title,
    leadId: person.leadId,
    leadName: person.lead?.name ?? null,
    archivedAt: person.archivedAt,
    createdAt: person.createdAt,
    updatedAt: person.updatedAt,
    reports: person.reports.map((r) => ({ id: r.id, name: r.name, title: r.title })),
    teamMemberships: person.teamMemberships.map((tm) => ({
      teamId: tm.team.id,
      teamName: tm.team.name
    })),
    department: person.department ? { id: person.department.id, name: person.department.name } : null
  });
};

export const createPerson = async (
  reg: Pick<Registry, 'prisma'>,
  input: {
    readonly name: string;
    readonly email?: string;
    readonly title?: string;
    readonly leadId?: string | null;
  }
): Promise<Result<{ readonly id: string }>> => {
  if (input.leadId) {
    const lead = await reg.prisma.person.findFirst({ where: { id: input.leadId } });
    if (!lead) return err(new Error('Lead not found'));
  }

  const person = await reg.prisma.person.create({
    data: {
      name: input.name,
      email: input.email,
      title: input.title,
      leadId: input.leadId ?? null
    }
  });
  return ok({ id: person.id });
};

export const updatePerson = async (
  reg: Pick<Registry, 'prisma'>,
  id: string,
  input: {
    readonly name?: string;
    readonly email?: string | null;
    readonly title?: string | null;
    readonly leadId?: string | null;
  }
): Promise<Result<{ readonly id: string }>> => {
  const existing = await reg.prisma.person.findFirst({ where: { id } });
  if (!existing) return err(new Error('Person not found'));
  const writable = await ensureWritable(reg, 'PERSON', id);
  if (!writable.ok) return err(writable.error);

  if (input.leadId !== undefined && input.leadId !== null) {
    if (input.leadId === id) return err(new Error('Person cannot be their own lead'));
    const lead = await reg.prisma.person.findFirst({ where: { id: input.leadId } });
    if (!lead) return err(new Error('Lead not found'));
  }

  await reg.prisma.person.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.title !== undefined && { title: input.title }),
      ...(input.leadId !== undefined && { leadId: input.leadId })
    }
  });
  return ok({ id });
};

/** Also deletes what's attached to the person and their relations, and clears them as an owner. */
export const deletePerson = async (
  reg: Pick<Registry, 'prisma' | 'storage' | 'logger'>,
  id: string
): Promise<Result<{ readonly deleted: true }>> => {
  const existing = await reg.prisma.person.findFirst({ where: { id } });
  if (!existing) return err(new Error('Person not found'));

  const cleanup = await planEntityCleanup(reg, 'PERSON', id);
  await reg.prisma.$transaction([...cleanup.ops, reg.prisma.person.delete({ where: { id } })]);
  await removeFiles(reg, cleanup.files);
  return ok({ deleted: true as const });
};
