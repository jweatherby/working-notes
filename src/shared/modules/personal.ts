import type { ModuleDefinition } from './types';

/** Personal life: birthdays, how you know someone, family and friends. */
export const PERSONAL_MODULE: ModuleDefinition = {
  id: 'personal',
  name: 'Personal',
  groupKinds: [
    { key: 'FAMILY', name: 'Family', plural: 'Families', exclusive: false },
    { key: 'FRIENDS', name: 'Friends', plural: 'Friend groups', exclusive: false }
  ],
  personFields: [
    { module: 'personal', key: 'knownAs', label: 'How we know them', input: 'text', placeholder: 'e.g. College friend' },
    { module: 'personal', key: 'birthday', label: 'Birthday', input: 'birthday', placeholder: '1990-05-03, or --05-03 without the year' }
  ],
  relationKinds: ['PARTNER_OF', 'PARENT_OF', 'SIBLING_OF', 'FRIEND_OF'],
  entityTypes: [],
  nav: [],
  routes: [],
  procedures: [],
  homeWidgets: ['birthdays']
};
