<script lang="ts">
  import type { PageData } from './$types';
  import { invalidateAll } from '$app/navigation';
  import { trpc } from '$shared/trpc/client';
  import EntityDetailPage from '$lib/common/EntityDetailPage.svelte';
  import PersonForm from '$lib/person/components/PersonForm.svelte';

  const { data } = $props<{ data: PageData }>();
  const person = $derived(data.person);
  const docs = $derived(data.docs);
  const notes = $derived(data.notes);
  const todos = $derived(data.todos);
  const reports = $derived(data.reports);

  const leadOptions = $derived(
    data.allPersons.filter((p: { id: string }) => p.id !== person.id),
  );

  const availableTeams = $derived(
    data.allTeams.filter(
      (t: { id: string }) =>
        !person.teamMemberships.some((m: { teamId: string }) => m.teamId === t.id),
    ),
  );

  const availableDepartments = $derived(
    data.allDepartments.filter((d: { id: string }) => d.id !== person.department?.id),
  );

  const handleSetLead = async (leadId: string | null) => {
    await trpc().person.update.mutate({ id: person.id, leadId });
    await invalidateAll();
  };

  const handleAddTeam = async (teamId: string) => {
    await trpc().team.addMember.mutate({ teamId, personId: person.id });
    await invalidateAll();
  };

  const handleRemoveTeam = async (teamId: string) => {
    await trpc().team.removeMember.mutate({ teamId, personId: person.id });
    await invalidateAll();
  };

  const handleAddDept = async (departmentId: string) => {
    await trpc().department.addMember.mutate({ departmentId, personId: person.id });
    await invalidateAll();
  };

  const handleRemoveDept = async (departmentId: string) => {
    await trpc().department.removeMember.mutate({ departmentId, personId: person.id });
    await invalidateAll();
  };
</script>

<EntityDetailPage
  entityType="PERSON"
  entityId={person.id}
  entityName={person.name}
  breadcrumbLabel="People"
  breadcrumbHref="/app/people"
  editPopupTitle="Edit Person"
  {docs}
  {notes}
  {todos}
  {reports}
>
  {#snippet renderOverview({ openEdit })}
    <div class="profile-card">
      {#if person.email}
        <p class="profile-detail">
          <a href="mailto:{person.email}">{person.email}</a>
        </p>
      {/if}

      {#if person.leadName}
        <div class="parent-row">
          <span class="profile-detail">
            Lead: <a href="/app/people/{person.leadId}">{person.leadName}</a>
          </span>
          <button
            class="text-btn danger"
            data-plain
            onclick={() => { if (confirm('Unassign lead?')) handleSetLead(null); }}
          >Unassign</button>
        </div>
      {:else if leadOptions.length > 0}
        <details class="assign-parent">
          <summary>Assign lead</summary>
          <select
            onchange={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              if (v) handleSetLead(v);
            }}
          >
            <option value="">Select a lead…</option>
            {#each leadOptions as p}
              <option value={p.id}>{p.name}</option>
            {/each}
          </select>
        </details>
      {/if}

      <button class="outline edit-btn" onclick={openEdit}>Edit</button>
    </div>

    <div class="section-block">
      <h4>Direct reports</h4>
      {#if person.reports.length > 0}
        <ul class="child-list">
          {#each person.reports as r}
            <li>
              <a href="/app/people/{r.id}">{r.name}</a>
              {#if r.title}<span class="muted">{r.title}</span>{/if}
            </li>
          {/each}
        </ul>
      {:else}
        <p class="muted">No direct reports.</p>
      {/if}
    </div>

    <div class="section-block">
      <h4>Teams</h4>
      {#if person.teamMemberships.length > 0}
        <ul class="child-list">
          {#each person.teamMemberships as m}
            <li>
              <a href="/app/teams/{m.teamId}">{m.teamName}</a>
              <button
                class="text-btn danger"
                data-plain
                onclick={() => { if (confirm('Remove from team?')) handleRemoveTeam(m.teamId); }}
              >&times;</button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="muted">Not on any team.</p>
      {/if}
      {#if availableTeams.length > 0}
        <details class="assign-parent">
          <summary>Add to team</summary>
          <select
            onchange={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              if (v) handleAddTeam(v);
            }}
          >
            <option value="">Select a team…</option>
            {#each availableTeams as t}
              <option value={t.id}>{t.name}</option>
            {/each}
          </select>
        </details>
      {/if}
    </div>

    <div class="section-block">
      <h4>Department</h4>
      {#if person.department}
        <div class="parent-row">
          <a href="/app/departments/{person.department.id}">{person.department.name}</a>
          <button
            class="text-btn danger"
            data-plain
            onclick={() => { if (person.department && confirm('Remove from department?')) handleRemoveDept(person.department.id); }}
          >Unassign</button>
        </div>
      {:else}
        <p class="muted">No department.</p>
      {/if}
      {#if availableDepartments.length > 0}
        <details class="assign-parent">
          <summary>{person.department ? 'Change department' : 'Assign department'}</summary>
          <select
            onchange={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              if (v) handleAddDept(v);
            }}
          >
            <option value="">Select a department…</option>
            {#each availableDepartments as d}
              <option value={d.id}>{d.name}</option>
            {/each}
          </select>
        </details>
      {/if}
    </div>

  {/snippet}

  {#snippet renderAssetHeader()}
    <strong class="asset-h-name">{person.name}</strong>
    {#if person.title}
      <span class="asset-h-meta">{person.title}</span>
    {/if}
  {/snippet}

  {#snippet renderEditForm({ onSuccess })}
    <PersonForm initial={person} {onSuccess} />
  {/snippet}
</EntityDetailPage>

<style lang="scss">
  .profile-card { margin-bottom: 0; }
  .profile-detail {
    margin: 0;
    color: var(--color-muted);
    font-size: 0.85rem;
  }
  .parent-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }
  .assign-parent {
    margin-top: 0.5rem;
    font-size: 0.85rem;
    summary { color: var(--color-muted); font-size: 0.8rem; }
    select { margin-top: 0.25rem; }
  }
  .edit-btn {
    margin-top: 0.5rem;
    padding: 0.25rem 0.75rem;
  }
  .section-block { margin-top: 2rem; }
  h4 { font-size: 0.9rem; margin-bottom: 0.75rem; }
  .child-list {
    list-style: none;
    padding: 0;
    margin: 0 0 0.5rem;
    li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0;
    }
  }
  .text-btn {
    all: unset;
    cursor: pointer;
    font-size: 0.75rem;
    color: var(--color-primary);
    &:hover { text-decoration: underline; }
    &.danger { color: var(--color-danger); }
  }
  .muted {
    font-size: 0.85rem;
    color: var(--color-muted);
  }
  .asset-h-name {
    font-size: 0.95rem;
  }
  .asset-h-meta {
    font-size: 0.8rem;
    color: var(--color-muted);
  }
</style>
