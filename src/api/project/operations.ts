import type { Registry } from '$shared/registry';
import { ok, err, type Result } from '$shared/utils';

// ----- Types -----

export interface ProjectSummary {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: string | null;
  readonly parentId: string | null;
  readonly childCount: number;
  readonly createdAt: Date;
}

export interface ProjectDetail {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: string | null;
  readonly startDate: Date | null;
  readonly endDate: Date | null;
  readonly daysOptimistic: number | null;
  readonly daysLikely: number | null;
  readonly daysPessimistic: number | null;
  readonly parentId: string | null;
  readonly parentName: string | null;
  readonly children: readonly { readonly id: string; readonly name: string }[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ----- Operations -----

export const listProjects = async (
  reg: Pick<Registry, 'prisma'>
): Promise<Result<readonly ProjectSummary[]>> => {
  const projects = await reg.prisma.project.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { children: true } } }
  });
  return ok(projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    parentId: p.parentId,
    childCount: p._count.children,
    createdAt: p.createdAt
  })));
};

export const getProject = async (
  reg: Pick<Registry, 'prisma'>,
  id: string
): Promise<Result<ProjectDetail>> => {
  const project = await reg.prisma.project.findFirst({
    where: { id },
    include: {
      parent: { select: { id: true, name: true } },
      children: { select: { id: true, name: true }, orderBy: { name: 'asc' } }
    }
  });
  if (!project) return err(new Error('Project not found'));

  return ok({
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    startDate: project.startDate,
    endDate: project.endDate,
    daysOptimistic: project.daysOptimistic,
    daysLikely: project.daysLikely,
    daysPessimistic: project.daysPessimistic,
    parentId: project.parentId,
    parentName: project.parent?.name ?? null,
    children: project.children,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  });
};

interface CreateProjectInput {
  readonly name: string;
  readonly description?: string;
  readonly status?: string;
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly daysOptimistic?: number;
  readonly daysLikely?: number;
  readonly daysPessimistic?: number;
  readonly parentId?: string;
}

export const createProject = async (
  reg: Pick<Registry, 'prisma'>,
  input: CreateProjectInput
): Promise<Result<{ readonly id: string }>> => {
  const project = await reg.prisma.project.create({
    data: {
      name: input.name,
      description: input.description,
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
      daysOptimistic: input.daysOptimistic,
      daysLikely: input.daysLikely,
      daysPessimistic: input.daysPessimistic,
      parentId: input.parentId
    }
  });
  return ok({ id: project.id });
};

export const updateProject = async (
  reg: Pick<Registry, 'prisma'>,
  id: string,
  input: {
    readonly name?: string;
    readonly description?: string | null;
    readonly status?: string | null;
    readonly startDate?: Date | null;
    readonly endDate?: Date | null;
    readonly daysOptimistic?: number | null;
    readonly daysLikely?: number | null;
    readonly daysPessimistic?: number | null;
    readonly parentId?: string | null;
  }
): Promise<Result<{ readonly id: string }>> => {
  const existing = await reg.prisma.project.findFirst({ where: { id } });
  if (!existing) return err(new Error('Project not found'));

  await reg.prisma.project.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.daysOptimistic !== undefined && { daysOptimistic: input.daysOptimistic }),
      ...(input.daysLikely !== undefined && { daysLikely: input.daysLikely }),
      ...(input.daysPessimistic !== undefined && { daysPessimistic: input.daysPessimistic }),
      ...(input.parentId !== undefined && { parentId: input.parentId })
    }
  });
  return ok({ id });
};

export const deleteProject = async (
  reg: Pick<Registry, 'prisma'>,
  id: string
): Promise<Result<{ readonly deleted: true }>> => {
  const existing = await reg.prisma.project.findFirst({ where: { id } });
  if (!existing) return err(new Error('Project not found'));

  await reg.prisma.project.delete({ where: { id } });
  return ok({ deleted: true as const });
};
