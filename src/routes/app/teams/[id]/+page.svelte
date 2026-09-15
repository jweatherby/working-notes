<script lang="ts">
  import type { PageData } from './$types';
  import { invalidateAll } from '$app/navigation';
  import { trpc } from '$shared/trpc/client';
  import EntityDetailPage from '$lib/common/EntityDetailPage.svelte';
  import MarkdownRenderer from '$lib/common/MarkdownRenderer.svelte';
  import TeamForm from '$lib/team/components/TeamForm.svelte';
  import InlinePicker from '$lib/ui/InlinePicker.svelte';
  import ConfirmButton from '$lib/ui/ConfirmButton.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import { submitOrThrow } from '$lib/ui/submit';
  import OwnedWork from '$lib/goal/components/OwnedWork.svelte';

  const { data } = $props<{ data: PageData }>();
  const team = $derived(data.team);
  const docs = $derived(data.docs);
  const notes = $derived(data.notes);
  const todos = $derived(data.todos);
  const reports = $derived(data.reports);
  const relations = $derived(data.relations);

  const availablePersons = $derived(
    data.allPersons.filter(
      (p: { id: string }) =>
        !team.members.some((m: { personId: string }) => m.personId === p.id),
    ),
  );

  const handleAddMember = async (personId: string) => {
    await submitOrThrow(() => trpc().team.addMember.mutate({ teamId: team.id, personId }));
    await invalidateAll();
  };

  const handleRemoveMember = async (personId: string) => {
    await submitOrThrow(() => trpc().team.removeMember.mutate({ teamId: team.id, personId }));
    await invalidateAll();
  };
</script>

<EntityDetailPage
  entityType="TEAM"
  entityId={team.id}
  archivedAt={team.archivedAt}
  entityName={team.name}
  breadcrumbLabel="Teams"
  breadcrumbHref="/app/teams"
  editPopupTitle="Edit team"
  {docs}
  {notes}
  {todos}
  {reports}
  {relations}
>
  {#snippet renderOverview()}
    {#if team.description}
      <section class="section">
        <div class="description"><MarkdownRenderer content={team.description} /></div>
      </section>
    {/if}

    <OwnedWork goals={data.ownedGoals} projects={data.ownedProjects} />

    <section class="section">
      <div class="section-header">
        <h4>Members <span class="count">{team.members.length}</span></h4>
      </div>
      {#if team.members.length > 0}
        <ul class="list">
          {#each team.members as m (m.personId)}
            <li class="list-row">
              <a class="grow truncate" href="/app/people/{m.personId}">{m.personName}</a>
              {#if m.personTitle}<span class="meta">{m.personTitle}</span>{/if}
              <span class="row-actions">
                <ConfirmButton label="Remove member" variant="icon" onConfirm={() => handleRemoveMember(m.personId)} />
              </span>
            </li>
          {/each}
        </ul>
      {:else}
        <EmptyState message="No members yet." />
      {/if}
      <div class="section-footer">
        <InlinePicker label="Add member" options={availablePersons} placeholder="Select a person…" onPick={handleAddMember} />
      </div>
    </section>
  {/snippet}

  {#snippet renderAssetHeader()}
    <span class="asset-h-name">{team.name}</span>
    <span class="asset-h-meta">{team.members.length} member{team.members.length === 1 ? '' : 's'}</span>
  {/snippet}

  {#snippet renderEditForm({ onSuccess, onCancel })}
    <TeamForm initial={team} {onSuccess} {onCancel} />
  {/snippet}
</EntityDetailPage>

<style lang="scss">
  .description { margin: 0; color: var(--text-2); }
  .section-footer { margin-top: var(--sp-2); }
</style>
