<script lang="ts">
  import type { PageData } from './$types';
  import { invalidateAll } from '$app/navigation';
  import { trpc } from '$shared/trpc/client';
  import EntityDetailPage from '$lib/common/EntityDetailPage.svelte';
  import PersonForm from '$lib/person/components/PersonForm.svelte';
  import InlinePicker from '$lib/ui/InlinePicker.svelte';
  import ConfirmButton from '$lib/ui/ConfirmButton.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import { submitOrThrow } from '$lib/ui/submit';
  import OwnedWork from '$lib/goal/components/OwnedWork.svelte';

  const { data } = $props<{ data: PageData }>();
  const person = $derived(data.person);
  const docs = $derived(data.docs);
  const notes = $derived(data.notes);
  const todos = $derived(data.todos);
  const reports = $derived(data.reports);
  const relations = $derived(data.relations);

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
    await submitOrThrow(() => trpc().person.update.mutate({ id: person.id, leadId }));
    await invalidateAll();
  };

  const handleAddTeam = async (teamId: string) => {
    await submitOrThrow(() => trpc().team.addMember.mutate({ teamId, personId: person.id }));
    await invalidateAll();
  };

  const handleRemoveTeam = async (teamId: string) => {
    await submitOrThrow(() => trpc().team.removeMember.mutate({ teamId, personId: person.id }));
    await invalidateAll();
  };

  const handleAddDept = async (departmentId: string) => {
    await submitOrThrow(() => trpc().department.addMember.mutate({ departmentId, personId: person.id }));
    await invalidateAll();
  };

  const handleRemoveDept = async (departmentId: string) => {
    await submitOrThrow(() => trpc().department.removeMember.mutate({ departmentId, personId: person.id }));
    await invalidateAll();
  };
</script>

<EntityDetailPage
  entityType="PERSON"
  entityId={person.id}
  archivedAt={person.archivedAt}
  entityName={person.name}
  breadcrumbLabel="People"
  breadcrumbHref="/app/people"
  editPopupTitle="Edit person"
  {docs}
  {notes}
  {todos}
  {reports}
  {relations}
>
  {#snippet renderOverview()}
    <section class="section">
      <dl class="meta-list">
        <div>
          <dt>Email</dt>
          <dd>{#if person.email}<a href="mailto:{person.email}">{person.email}</a>{:else}<span class="muted">—</span>{/if}</dd>
        </div>
        <div>
          <dt>Lead</dt>
          <dd>
            {#if person.leadName}
              <a href="/app/people/{person.leadId}">{person.leadName}</a>
              <ConfirmButton label="Unassign" confirmLabel="Unassign lead" onConfirm={() => handleSetLead(null)} />
            {:else}
              <InlinePicker label="Assign lead" options={leadOptions} placeholder="Select a lead…" onPick={handleSetLead} />
            {/if}
          </dd>
        </div>
        <div>
          <dt>Department</dt>
          <dd>
            {#if person.department}
              <a href="/app/departments/{person.department.id}">{person.department.name}</a>
              <ConfirmButton label="Remove" confirmLabel="Remove from department" onConfirm={() => handleRemoveDept(person.department!.id)} />
            {:else}
              <InlinePicker label="Assign department" options={availableDepartments} placeholder="Select a department…" onPick={handleAddDept} />
            {/if}
          </dd>
        </div>
      </dl>
    </section>

    <section class="section">
      <div class="section-header">
        <h4>Direct reports <span class="count">{person.reports.length}</span></h4>
      </div>
      {#if person.reports.length > 0}
        <ul class="list">
          {#each person.reports as r (r.id)}
            <li class="list-row">
              <a class="grow truncate" href="/app/people/{r.id}">{r.name}</a>
              {#if r.title}<span class="meta">{r.title}</span>{/if}
            </li>
          {/each}
        </ul>
      {:else}
        <EmptyState message="No direct reports." />
      {/if}
    </section>

    <section class="section">
      <div class="section-header">
        <h4>Teams <span class="count">{person.teamMemberships.length}</span></h4>
      </div>
      {#if person.teamMemberships.length > 0}
        <ul class="list">
          {#each person.teamMemberships as m (m.teamId)}
            <li class="list-row">
              <a class="grow truncate" href="/app/teams/{m.teamId}">{m.teamName}</a>
              <span class="row-actions">
                <ConfirmButton label="Remove from team" variant="icon" onConfirm={() => handleRemoveTeam(m.teamId)} />
              </span>
            </li>
          {/each}
        </ul>
      {:else}
        <EmptyState message="Not on any team." />
      {/if}
      <div class="section-footer">
        <InlinePicker label="Add to team" options={availableTeams} placeholder="Select a team…" onPick={handleAddTeam} />
      </div>
    </section>

    <OwnedWork goals={data.ownedGoals} projects={data.ownedProjects} />
  {/snippet}

  {#snippet renderAssetHeader()}
    <span class="asset-h-name">{person.name}</span>
    {#if person.title}<span class="asset-h-meta">{person.title}</span>{/if}
  {/snippet}

  {#snippet renderEditForm({ onSuccess, onCancel })}
    <PersonForm initial={person} {leadOptions} {onSuccess} {onCancel} />
  {/snippet}
</EntityDetailPage>

<style lang="scss">
  .meta-list {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: var(--sp-2) var(--sp-4);
    margin: 0;
    font-size: var(--fs-md);
    > div { display: contents; }
    dt { color: var(--text-3); }
    dd { display: flex; align-items: center; gap: var(--sp-3); margin: 0; min-height: 22px; }
  }
  .section-footer { margin-top: var(--sp-2); }
</style>
