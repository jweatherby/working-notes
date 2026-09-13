import type { Registry } from '$shared/registry';
import { ok, err, type Result } from '$shared/utils';
import { planEntityCleanup, removeFiles } from '$api/_entity-cleanup';

// ----- Types -----

export interface DepartmentSummary {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly createdAt: Date;
}

export interface DepartmentMemberEntry {
  readonly personId: string;
  readonly personName: string;
  readonly personTitle: string | null;
}

export interface DepartmentDetail extends DepartmentSummary {
  readonly updatedAt: Date;
  readonly members: readonly DepartmentMemberEntry[];
}

export interface DepartmentWithMembers extends DepartmentSummary {
  readonly members: readonly DepartmentMemberEntry[];
}

// ----- Operations -----

export const listDepartments = async (
  reg: Pick<Registry, 'prisma'>
): Promise<Result<readonly DepartmentSummary[]>> => {
  const departments = await reg.prisma.department.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, description: true, createdAt: true }
  });
  return ok(departments);
};

export const listDepartmentsWithMembers = async (
  reg: Pick<Registry, 'prisma'>
): Promise<Result<readonly DepartmentWithMembers[]>> => {
  const depts = await reg.prisma.department.findMany({
    orderBy: { name: 'asc' },
    include: {
      members: {
        select: { id: true, name: true, title: true },
        orderBy: { name: 'asc' }
      }
    }
  });
  return ok(
    depts.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      createdAt: d.createdAt,
      members: d.members.map((p) => ({
        personId: p.id,
        personName: p.name,
        personTitle: p.title
      }))
    }))
  );
};

export const getDepartment = async (
  reg: Pick<Registry, 'prisma'>,
  id: string
): Promise<Result<DepartmentDetail>> => {
  const dept = await reg.prisma.department.findFirst({
    where: { id },
    include: {
      members: {
        select: { id: true, name: true, title: true },
        orderBy: { name: 'asc' }
      }
    }
  });
  if (!dept) return err(new Error('Department not found'));
  return ok({
    id: dept.id,
    name: dept.name,
    description: dept.description,
    createdAt: dept.createdAt,
    updatedAt: dept.updatedAt,
    members: dept.members.map((p) => ({
      personId: p.id,
      personName: p.name,
      personTitle: p.title
    }))
  });
};

export const createDepartment = async (
  reg: Pick<Registry, 'prisma'>,
  input: { readonly name: string; readonly description?: string }
): Promise<Result<{ readonly id: string }>> => {
  const dept = await reg.prisma.department.create({
    data: {
      name: input.name,
      description: input.description
    }
  });
  return ok({ id: dept.id });
};

export const updateDepartment = async (
  reg: Pick<Registry, 'prisma'>,
  id: string,
  input: { readonly name?: string; readonly description?: string | null }
): Promise<Result<{ readonly id: string }>> => {
  const existing = await reg.prisma.department.findFirst({ where: { id } });
  if (!existing) return err(new Error('Department not found'));

  await reg.prisma.department.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description })
    }
  });
  return ok({ id });
};

/** Also deletes what's attached to the department and its relations, and clears it as an owner. */
export const deleteDepartment = async (
  reg: Pick<Registry, 'prisma' | 'storage' | 'logger'>,
  id: string
): Promise<Result<{ readonly deleted: true }>> => {
  const existing = await reg.prisma.department.findFirst({ where: { id } });
  if (!existing) return err(new Error('Department not found'));

  const cleanup = await planEntityCleanup(reg, 'DEPARTMENT', id);
  await reg.prisma.$transaction([...cleanup.ops, reg.prisma.department.delete({ where: { id } })]);
  await removeFiles(reg, cleanup.files);
  return ok({ deleted: true as const });
};

// ----- Membership operations -----

export const listDepartmentMembers = async (
  reg: Pick<Registry, 'prisma'>,
  departmentId: string
): Promise<Result<readonly DepartmentMemberEntry[]>> => {
  const dept = await reg.prisma.department.findFirst({ where: { id: departmentId } });
  if (!dept) return err(new Error('Department not found'));

  const members = await reg.prisma.person.findMany({
    where: { departmentId },
    select: { id: true, name: true, title: true },
    orderBy: { name: 'asc' }
  });
  return ok(
    members.map((p) => ({
      personId: p.id,
      personName: p.name,
      personTitle: p.title
    }))
  );
};

export const addDepartmentMember = async (
  reg: Pick<Registry, 'prisma'>,
  departmentId: string,
  input: { readonly personId: string }
): Promise<Result<{ readonly id: string }>> => {
  const dept = await reg.prisma.department.findFirst({ where: { id: departmentId } });
  if (!dept) return err(new Error('Department not found'));

  const person = await reg.prisma.person.findFirst({ where: { id: input.personId } });
  if (!person) return err(new Error('Person not found'));

  await reg.prisma.person.update({
    where: { id: input.personId },
    data: { departmentId }
  });
  return ok({ id: input.personId });
};

export const removeDepartmentMember = async (
  reg: Pick<Registry, 'prisma'>,
  departmentId: string,
  personId: string
): Promise<Result<{ readonly deleted: true }>> => {
  const dept = await reg.prisma.department.findFirst({ where: { id: departmentId } });
  if (!dept) return err(new Error('Department not found'));

  await reg.prisma.person.updateMany({
    where: { id: personId, departmentId },
    data: { departmentId: null }
  });
  return ok({ deleted: true as const });
};
