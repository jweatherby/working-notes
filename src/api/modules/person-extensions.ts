// What modules add to people, each in its own table. The person domain and the
// focus graph call these; core code never reads org_person or personal_person.

import type { Registry } from '$shared/registry';
import { ok, err, type Result } from '$shared/utils';
import type { ModuleId } from '$shared/modules/types';
import type { OrgPersonData, OrgPersonDetail, PersonalPersonData } from '$shared/types/person';
import type { orgPersonPatch, personalPersonPatch } from '$shared/types/person';
import type { z } from 'zod';
import type { FocusLink } from '$api/home/focus-node';
import { focusNode } from '$api/home/focus-node';

type Reg = Pick<Registry, 'prisma'>;

export interface PersonExtension<Data, Detail, Patch> {
  readonly module: ModuleId;
  readonly load: (reg: Reg, personIds: readonly string[]) => Promise<ReadonlyMap<string, Data>>;
  readonly detail: (reg: Reg, personId: string) => Promise<Detail | null>;
  /** The patch is already validated against the module's schema. */
  readonly update: (reg: Reg, personId: string, patch: Patch) => Promise<Result<void>>;
  /** Links the home graph shows for a person (Reports to, Direct reports). */
  readonly structuralLinks: (reg: Reg, personId: string) => Promise<readonly FocusLink[]>;
}

// ----- org: title and reporting line -----

const orgRows = (reg: Reg, where: { personId: { in: string[] } } | { personId: string }) =>
  reg.prisma.orgPerson.findMany({ where, include: { lead: { select: { name: true } } } });

const toOrg = (row: { title: string | null; leadId: string | null; lead: { name: string } | null }): OrgPersonData => ({
  title: row.title,
  leadId: row.leadId,
  leadName: row.lead?.name ?? null
});

export const ORG_PERSON: PersonExtension<OrgPersonData, OrgPersonDetail, z.infer<typeof orgPersonPatch>> = {
  module: 'org',
  load: async (reg, ids) => new Map((await orgRows(reg, { personId: { in: [...ids] } })).map((r) => [r.personId, toOrg(r)])),
  detail: async (reg, personId) => {
    const [row] = await orgRows(reg, { personId });
    const reports = await reg.prisma.orgPerson.findMany({
      where: { leadId: personId },
      select: { title: true, person: { select: { id: true, name: true } } },
      orderBy: { person: { name: 'asc' } }
    });
    if (!row && reports.length === 0) return null;
    return {
      ...(row ? toOrg(row) : { title: null, leadId: null, leadName: null }),
      reports: reports.map((r) => ({ id: r.person.id, name: r.person.name, title: r.title }))
    };
  },
  update: async (reg, personId, patch) => {
    const p = patch;
    if (p.leadId) {
      if (p.leadId === personId) return err(new Error('A person cannot be their own lead'));
      if (!(await reg.prisma.person.findUnique({ where: { id: p.leadId }, select: { id: true } }))) {
        return err(new Error(`Lead ${p.leadId} not found. Find ids with person.list.`));
      }
    }
    const data = {
      ...(p.title !== undefined && { title: p.title }),
      ...(p.leadId !== undefined && { leadId: p.leadId })
    };
    await reg.prisma.orgPerson.upsert({ where: { personId }, create: { personId, ...data }, update: data });
    return ok(undefined);
  },
  structuralLinks: async (reg, personId) => {
    const [row] = await orgRows(reg, { personId });
    const reports = await reg.prisma.orgPerson.findMany({ where: { leadId: personId }, select: { person: { select: { id: true, name: true } } } });
    return [
      ...(row?.leadId && row.lead ? [{ label: 'Reports to', node: focusNode('PERSON', row.leadId, row.lead.name) }] : []),
      ...reports.map((r) => ({ label: 'Direct reports', node: focusNode('PERSON', r.person.id, r.person.name) }))
    ];
  }
};

// ----- personal: birthday and how you know them -----

const toPersonal = (row: { birthday: string | null; knownAs: string | null }): PersonalPersonData => ({
  birthday: row.birthday,
  knownAs: row.knownAs
});

export const PERSONAL_PERSON: PersonExtension<PersonalPersonData, PersonalPersonData, z.infer<typeof personalPersonPatch>> = {
  module: 'personal',
  load: async (reg, ids) =>
    new Map((await reg.prisma.personalPerson.findMany({ where: { personId: { in: [...ids] } } })).map((r) => [r.personId, toPersonal(r)])),
  detail: async (reg, personId) => {
    const row = await reg.prisma.personalPerson.findUnique({ where: { personId } });
    return row ? toPersonal(row) : null;
  },
  update: async (reg, personId, patch) => {
    const p = patch;
    const data = {
      ...(p.birthday !== undefined && { birthday: p.birthday }),
      ...(p.knownAs !== undefined && { knownAs: p.knownAs })
    };
    await reg.prisma.personalPerson.upsert({ where: { personId }, create: { personId, ...data }, update: data });
    return ok(undefined);
  },
  structuralLinks: async () => []
};

export const PERSON_EXTENSIONS = { org: ORG_PERSON, personal: PERSONAL_PERSON } as const;
