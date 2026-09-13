<script lang="ts">
  import CenteredLayout from '$lib/common/CenteredLayout.svelte';
  import Popup from '$lib/common/Popup.svelte';
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import { trpc } from '$shared/trpc/client';
  import OrgTree from '$lib/org/components/OrgTree.svelte';
  import { buildOrgTree } from '$lib/org/org-tree';
  import type { PageData } from './$types';

  const { data } = $props<{ data: PageData }>();
  const departments = $derived(data.departments);
  const teams = $derived(data.teams);
  const persons = $derived(data.persons);

  const orgRoots = $derived(buildOrgTree(persons));

  // Department and team names per person, shown as chips on tree rows.
  const groupsByPerson = $derived.by(() => {
    const map = new Map<string, string[]>();
    for (const group of [...departments, ...teams]) {
      for (const m of group.members) {
        const list = map.get(m.personId) ?? [];
        list.push(group.name);
        map.set(m.personId, list);
      }
    }
    return map;
  });

  // ----- Popup helpers -----

  const openPopup = (id: string) => {
    const url = new URL($page.url);
    url.searchParams.set('popup', id);
    goto(url.toString(), { replaceState: true, noScroll: true });
  };

  const closePopup = async () => {
    const url = new URL($page.url);
    url.searchParams.delete('popup');
    await goto(url.toString(), { replaceState: true, noScroll: true, invalidateAll: true });
  };

  // ----- Edit target IDs (derived objects re-read from data after invalidate) -----

  let editDeptId = $state<string | null>(null);
  let editTeamId = $state<string | null>(null);
  let editPersonId = $state<string | null>(null);

  const editDept = $derived(editDeptId ? departments.find((d: any) => d.id === editDeptId) ?? null : null);
  const editTeam = $derived(editTeamId ? teams.find((t: any) => t.id === editTeamId) ?? null : null);
  const editPerson = $derived(editPersonId ? persons.find((p: any) => p.id === editPersonId) ?? null : null);

  // Memberships derived from the loaded org data, so add/remove refreshes automatically.
  const personDeptMemberships = $derived(
    editPersonId
      ? departments
          .filter((d: any) => d.members.some((m: any) => m.personId === editPersonId))
          .map((d: any) => ({ departmentId: d.id, departmentName: d.name }))
      : []
  );

  const personTeamMemberships = $derived(
    editPersonId
      ? teams
          .filter((t: any) => t.members.some((m: any) => m.personId === editPersonId))
          .map((t: any) => ({ teamId: t.id, teamName: t.name }))
      : []
  );

  // ----- Department form state -----

  let deptName = $state('');
  let deptDescription = $state('');
  let deptSubmitting = $state(false);
  let deptMemberPersonId = $state('');

  const startEditDept = (id: string | null) => {
    editDeptId = id;
    const dept = id ? departments.find((d: any) => d.id === id) : null;
    deptName = dept?.name ?? '';
    deptDescription = dept?.description ?? '';
    deptMemberPersonId = '';
    openPopup('edit-department');
  };

  const submitDept = async () => {
    deptSubmitting = true;
    try {
      const result = editDept
        ? await trpc().department.update.mutate({
            id: editDept.id,
            name: deptName,
            description: deptDescription || null
          })
        : await trpc().department.create.mutate({
            name: deptName,
            description: deptDescription || undefined
          });
      if (result.ok) {
        editDeptId = null;
        await closePopup();
      }
    } finally {
      deptSubmitting = false;
    }
  };

  const deleteDept = async () => {
    if (!editDept || !confirm('Delete this department?')) return;
    const result = await trpc().department.delete.mutate({ id: editDept.id });
    if (result.ok) {
      editDeptId = null;
      await closePopup();
    }
  };

  const addDeptMember = async () => {
    if (!editDept || !deptMemberPersonId) return;
    const result = await trpc().department.addMember.mutate({
      departmentId: editDept.id,
      personId: deptMemberPersonId
    });
    if (result.ok) {
      deptMemberPersonId = '';
      await invalidateAll();
    }
  };

  const removeDeptMember = async (personId: string) => {
    if (!editDept) return;
    const result = await trpc().department.removeMember.mutate({
      departmentId: editDept.id,
      personId
    });
    if (result.ok) await invalidateAll();
  };

  // ----- Team form state -----

  let teamName = $state('');
  let teamDescription = $state('');
  let teamSubmitting = $state(false);
  let teamMemberPersonId = $state('');

  const startEditTeam = (id: string | null) => {
    editTeamId = id;
    const team = id ? teams.find((t: any) => t.id === id) : null;
    teamName = team?.name ?? '';
    teamDescription = team?.description ?? '';
    teamMemberPersonId = '';
    openPopup('edit-team');
  };

  const submitTeam = async () => {
    teamSubmitting = true;
    try {
      const result = editTeam
        ? await trpc().team.update.mutate({
            id: editTeam.id,
            name: teamName,
            description: teamDescription || null
          })
        : await trpc().team.create.mutate({
            name: teamName,
            description: teamDescription || undefined
          });
      if (result.ok) {
        editTeamId = null;
        await closePopup();
      }
    } finally {
      teamSubmitting = false;
    }
  };

  const deleteTeam = async () => {
    if (!editTeam || !confirm('Delete this team?')) return;
    const result = await trpc().team.delete.mutate({ id: editTeam.id });
    if (result.ok) {
      editTeamId = null;
      await closePopup();
    }
  };

  const addTeamMember = async () => {
    if (!editTeam || !teamMemberPersonId) return;
    const result = await trpc().team.addMember.mutate({
      teamId: editTeam.id,
      personId: teamMemberPersonId
    });
    if (result.ok) {
      teamMemberPersonId = '';
      await invalidateAll();
    }
  };

  const removeTeamMember = async (personId: string) => {
    if (!editTeam) return;
    const result = await trpc().team.removeMember.mutate({
      teamId: editTeam.id,
      personId
    });
    if (result.ok) await invalidateAll();
  };

  // ----- Person form state -----

  let personName = $state('');
  let personEmail = $state('');
  let personTitle = $state('');
  let personLeadId = $state('');
  let personSubmitting = $state(false);
  let personAddDeptId = $state('');
  let personAddTeamId = $state('');

  const startEditPerson = (id: string | null) => {
    editPersonId = id;
    const p = id ? persons.find((x: any) => x.id === id) : null;
    personName = p?.name ?? '';
    personEmail = p?.email ?? '';
    personTitle = p?.title ?? '';
    personLeadId = p?.leadId ?? '';
    personAddDeptId = '';
    personAddTeamId = '';
    openPopup('edit-person');
  };

  const submitPerson = async () => {
    personSubmitting = true;
    try {
      const result = editPerson
        ? await trpc().person.update.mutate({
            id: editPerson.id,
            name: personName,
            email: personEmail || null,
            title: personTitle || null,
            leadId: personLeadId || null
          })
        : await trpc().person.create.mutate({
            name: personName,
            email: personEmail || undefined,
            title: personTitle || undefined,
            leadId: personLeadId || null
          });
      if (result.ok) {
        editPersonId = null;
        await closePopup();
      }
    } finally {
      personSubmitting = false;
    }
  };

  const deletePerson = async () => {
    if (!editPerson || !confirm('Delete this person?')) return;
    const result = await trpc().person.delete.mutate({ id: editPerson.id });
    if (result.ok) {
      editPersonId = null;
      await closePopup();
    }
  };

  const addPersonToDept = async () => {
    if (!editPerson || !personAddDeptId) return;
    const result = await trpc().department.addMember.mutate({
      departmentId: personAddDeptId,
      personId: editPerson.id
    });
    if (result.ok) {
      personAddDeptId = '';
      await invalidateAll();
    }
  };

  const removePersonFromDept = async (departmentId: string) => {
    if (!editPerson) return;
    const result = await trpc().department.removeMember.mutate({
      departmentId,
      personId: editPerson.id
    });
    if (result.ok) await invalidateAll();
  };

  const addPersonToTeam = async () => {
    if (!editPerson || !personAddTeamId) return;
    const result = await trpc().team.addMember.mutate({
      teamId: personAddTeamId,
      personId: editPerson.id
    });
    if (result.ok) {
      personAddTeamId = '';
      await invalidateAll();
    }
  };

  const removePersonFromTeam = async (teamId: string) => {
    if (!editPerson) return;
    const result = await trpc().team.removeMember.mutate({
      teamId,
      personId: editPerson.id
    });
    if (result.ok) await invalidateAll();
  };

  // ----- Helpers: available options for member add dropdowns -----

  const availablePersonsForDept = $derived(
    editDept
      ? persons.filter((p: any) => !editDept.members.some((m: any) => m.personId === p.id))
      : []
  );

  const availablePersonsForTeam = $derived(
    editTeam
      ? persons.filter((p: any) => !editTeam.members.some((m: any) => m.personId === p.id))
      : []
  );

  const availableDeptsForPerson = $derived(
    editPersonId
      ? departments.filter((d: any) => !d.members.some((m: any) => m.personId === editPersonId))
      : []
  );

  const availableTeamsForPerson = $derived(
    editPersonId
      ? teams.filter((t: any) => !t.members.some((m: any) => m.personId === editPersonId))
      : []
  );

  const availableLeads = $derived(
    persons.filter((p: any) => p.id !== editPersonId)
  );
</script>

<svelte:head><title>Org Map</title></svelte:head>

<CenteredLayout>
  <hgroup>
    <h1>Org Map</h1>
    <p>Reporting lines, departments and teams.</p>
  </hgroup>

  <div class="cta-row">
    <button onclick={() => startEditDept(null)}>Add Department</button>
    <button onclick={() => startEditTeam(null)}>Add Team</button>
    <button onclick={() => startEditPerson(null)}>Add Person</button>
  </div>

  <section class="persons-section">
    <h2>Reporting lines</h2>
    {#if persons.length === 0}
      <p class="empty">No people yet.</p>
    {:else}
      <OrgTree roots={orgRoots} {groupsByPerson} onEdit={startEditPerson} />
    {/if}
  </section>

  <section class="groups-section">
    <h2>Departments</h2>
    {#if departments.length === 0}
      <p class="empty">No departments yet.</p>
    {:else}
      <ul class="group-list">
        {#each departments as dept (dept.id)}
          <li class="group-card">
            <a class="group-title" href="/app/departments/{dept.id}">{dept.name}</a>
            <span class="count">{dept.members.length} {dept.members.length === 1 ? 'person' : 'people'}</span>
            <button type="button" class="link-btn" onclick={() => startEditDept(dept.id)}>Edit</button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="groups-section">
    <h2>Teams</h2>
    {#if teams.length === 0}
      <p class="empty">No teams yet.</p>
    {:else}
      <ul class="group-list">
        {#each teams as team (team.id)}
          <li class="group-card">
            <a class="group-title" href="/app/teams/{team.id}">{team.name}</a>
            <span class="count">{team.members.length} {team.members.length === 1 ? 'person' : 'people'}</span>
            <button type="button" class="link-btn" onclick={() => startEditTeam(team.id)}>Edit</button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</CenteredLayout>

<Popup id="edit-department" title={editDept ? 'Edit Department' : 'Add Department'}>
  <form onsubmit={(e: SubmitEvent) => { e.preventDefault(); submitDept(); }}>
    <label>
      Name
      <input type="text" bind:value={deptName} required placeholder="Department name" />
    </label>
    <label>
      Description (optional)
      <textarea bind:value={deptDescription} rows={3}></textarea>
    </label>
    <div class="form-actions">
      <button type="submit" disabled={deptSubmitting || !deptName.trim()} aria-busy={deptSubmitting}>
        {editDept ? 'Save' : 'Add Department'}
      </button>
      {#if editDept}
        <button type="button" class="danger" onclick={deleteDept}>Delete</button>
      {/if}
    </div>
  </form>

  {#if editDept}
    <hr />
    <h4>Members</h4>
    {#if editDept.members.length === 0}
      <p class="empty">No members yet.</p>
    {:else}
      <ul class="member-list">
        {#each editDept.members as m}
          <li class="member-row">
            <span>{m.personName}{m.personTitle ? ` — ${m.personTitle}` : ''}</span>
            <button type="button" class="link-btn danger" onclick={() => removeDeptMember(m.personId)}>Remove</button>
          </li>
        {/each}
      </ul>
    {/if}

    {#if availablePersonsForDept.length > 0}
      <div class="add-member-row">
        <select bind:value={deptMemberPersonId}>
          <option value="">Select person...</option>
          {#each availablePersonsForDept as p}
            <option value={p.id}>{p.name}</option>
          {/each}
        </select>
        <button type="button" onclick={addDeptMember} disabled={!deptMemberPersonId}>Add</button>
      </div>
    {:else}
      <p class="empty">All people are already members.</p>
    {/if}
  {/if}
</Popup>

<Popup id="edit-team" title={editTeam ? 'Edit Team' : 'Add Team'}>
  <form onsubmit={(e: SubmitEvent) => { e.preventDefault(); submitTeam(); }}>
    <label>
      Name
      <input type="text" bind:value={teamName} required placeholder="Team name" />
    </label>
    <label>
      Description (optional)
      <textarea bind:value={teamDescription} rows={3}></textarea>
    </label>
    <div class="form-actions">
      <button type="submit" disabled={teamSubmitting || !teamName.trim()} aria-busy={teamSubmitting}>
        {editTeam ? 'Save' : 'Add Team'}
      </button>
      {#if editTeam}
        <button type="button" class="danger" onclick={deleteTeam}>Delete</button>
      {/if}
    </div>
  </form>

  {#if editTeam}
    <hr />
    <h4>Members</h4>
    {#if editTeam.members.length === 0}
      <p class="empty">No members yet.</p>
    {:else}
      <ul class="member-list">
        {#each editTeam.members as m}
          <li class="member-row">
            <span>{m.personName}{m.personTitle ? ` — ${m.personTitle}` : ''}</span>
            <button type="button" class="link-btn danger" onclick={() => removeTeamMember(m.personId)}>Remove</button>
          </li>
        {/each}
      </ul>
    {/if}

    {#if availablePersonsForTeam.length > 0}
      <div class="add-member-row">
        <select bind:value={teamMemberPersonId}>
          <option value="">Select person...</option>
          {#each availablePersonsForTeam as p}
            <option value={p.id}>{p.name}</option>
          {/each}
        </select>
        <button type="button" onclick={addTeamMember} disabled={!teamMemberPersonId}>Add</button>
      </div>
    {:else}
      <p class="empty">All people are already members.</p>
    {/if}
  {/if}
</Popup>

<Popup id="edit-person" title={editPerson ? 'Edit Person' : 'Add Person'}>
  <form onsubmit={(e: SubmitEvent) => { e.preventDefault(); submitPerson(); }}>
    <label>
      Name
      <input type="text" bind:value={personName} required placeholder="Full name" />
    </label>
    <label>
      Title (optional)
      <input type="text" bind:value={personTitle} placeholder="e.g. Engineer" />
    </label>
    <label>
      Email (optional)
      <input type="email" bind:value={personEmail} placeholder="name@example.com" />
    </label>
    <label>
      Lead (optional)
      <select bind:value={personLeadId}>
        <option value="">None</option>
        {#each availableLeads as p}
          <option value={p.id}>{p.name}</option>
        {/each}
      </select>
    </label>
    <div class="form-actions">
      <button type="submit" disabled={personSubmitting || !personName.trim()} aria-busy={personSubmitting}>
        {editPerson ? 'Save' : 'Add Person'}
      </button>
      {#if editPerson}
        <button type="button" class="danger" onclick={deletePerson}>Delete</button>
      {/if}
    </div>
  </form>

  {#if editPerson}
    <hr />
    <h4>Departments</h4>
    {#if personDeptMemberships.length === 0}
      <p class="empty">Not in any department.</p>
    {:else}
      <ul class="member-list">
        {#each personDeptMemberships as m}
          <li class="member-row">
            <span>{m.departmentName}</span>
            <button type="button" class="link-btn danger" onclick={() => removePersonFromDept(m.departmentId)}>Remove</button>
          </li>
        {/each}
      </ul>
    {/if}
    {#if availableDeptsForPerson.length > 0}
      <div class="add-member-row">
        <select bind:value={personAddDeptId}>
          <option value="">Select department...</option>
          {#each availableDeptsForPerson as d}
            <option value={d.id}>{d.name}</option>
          {/each}
        </select>
        <button type="button" onclick={addPersonToDept} disabled={!personAddDeptId}>Add</button>
      </div>
    {/if}

    <h4>Teams</h4>
    {#if personTeamMemberships.length === 0}
      <p class="empty">Not on any team.</p>
    {:else}
      <ul class="member-list">
        {#each personTeamMemberships as m}
          <li class="member-row">
            <span>{m.teamName}</span>
            <button type="button" class="link-btn danger" onclick={() => removePersonFromTeam(m.teamId)}>Remove</button>
          </li>
        {/each}
      </ul>
    {/if}
    {#if availableTeamsForPerson.length > 0}
      <div class="add-member-row">
        <select bind:value={personAddTeamId}>
          <option value="">Select team...</option>
          {#each availableTeamsForPerson as t}
            <option value={t.id}>{t.name}</option>
          {/each}
        </select>
        <button type="button" onclick={addPersonToTeam} disabled={!personAddTeamId}>Add</button>
      </div>
    {/if}
  {/if}
</Popup>

<style lang="scss">
  .cta-row {
    display: flex;
    gap: var(--space-2, 0.75rem);
    flex-wrap: wrap;
    margin-bottom: var(--space-3, 1rem);
  }
  .cta-row button {
    margin: 0;
  }

  .groups-section {
    margin-top: var(--space-4, 1.5rem);
  }

  .groups-section h2 {
    margin: 0 0 var(--space-2, 0.75rem) 0;
    font-size: 1.1rem;
  }

  // Departments and teams: compact cards side by side, wrapping onto new rows.
  .group-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2, 0.5rem);
  }

  .group-card {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-muted-border);
    border-radius: var(--radius, 8px);
    background: var(--color-card-bg, transparent);

    .link-btn {
      opacity: 0;
    }

    &:hover .link-btn,
    &:focus-within .link-btn {
      opacity: 1;
    }
  }

  .group-title {
    font-weight: 600;
  }

  .count {
    color: var(--color-muted);
    font-size: 0.85rem;
  }

  .empty {
    color: var(--color-muted);
    font-style: italic;
  }

  .persons-section {
    margin: var(--space-3, 1rem) 0 var(--space-5, 2rem);
  }

  .persons-section h2 {
    font-size: 1.1rem;
    margin: 0 0 var(--space-2, 0.75rem) 0;
  }

  .link-btn {
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    color: var(--color-primary);
    cursor: pointer;
    font-size: 0.9rem;
    text-decoration: underline;
  }

  .link-btn.danger {
    color: var(--color-danger, #b91c1c);
  }

  .form-actions {
    display: flex;
    gap: var(--space-2, 0.75rem);
    align-items: center;
    margin-top: var(--space-2, 0.75rem);
  }

  .form-actions button {
    margin: 0;
  }

  .form-actions .danger {
    margin-left: auto;
    background: transparent;
    color: var(--color-danger, #b91c1c);
    border: 1px solid var(--color-danger, #b91c1c);
  }

  hr {
    margin: var(--space-3, 1rem) 0;
    border: none;
    border-top: 1px solid var(--color-muted-border);
  }

  h4 {
    margin: var(--space-2, 0.75rem) 0 var(--space-2, 0.5rem) 0;
    font-size: 0.95rem;
  }

  .member-list {
    list-style: none;
    margin: 0 0 var(--space-2, 0.75rem) 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1, 0.25rem);
  }

  .member-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2, 0.75rem);
    padding: var(--space-1, 0.25rem) 0;
  }

  .add-member-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--space-2, 0.5rem);
    align-items: center;
    margin-top: var(--space-2, 0.5rem);
  }

  .add-member-row select,
  .add-member-row input,
  .add-member-row button {
    margin: 0;
  }
</style>
