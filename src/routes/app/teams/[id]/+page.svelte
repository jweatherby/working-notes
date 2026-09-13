<script lang="ts">
  import type { PageData } from './$types';
  import { invalidateAll } from '$app/navigation';
  import { trpc } from '$shared/trpc/client';
  import EntityDetailPage from '$lib/common/EntityDetailPage.svelte';
  import TeamForm from '$lib/team/components/TeamForm.svelte';
  import InlinePicker from '$lib/ui/InlinePicker.svelte';
  import ConfirmButton from '$lib/ui/ConfirmButton.svelte';

  const { data } = $props<{ data: PageData }>();
  const team = $derived(data.team);
  const docs = $derived(data.docs);
  const notes = $derived(data.notes);
  const todos = $derived(data.todos);
  const reports = $derived(data.reports);

  const availablePersons = $derived(
    data.allPersons.filter(
      (p: { id: string }) =>
        !team.members.some((m: { personId: string }) => m.personId === p.id),
    ),
  );

  const handleAddMember = async (personId: string) => {
    await trpc().team.addMember.mutate({ teamId: team.id, personId });
    await invalidateAll();
  };

  const handleRemoveMember = async (personId: string) => {
    await trpc().team.removeMember.mutate({ teamId: team.id, personId });
    await invalidateAll();
  };
</script>

<EntityDetailPage
  entityType="TEAM"
  entityId={team.id}
  entityName={team.name}
  breadcrumbLabel="Teams"
  breadcrumbHref="/app/teams"
  editPopupTitle="Edit team"
  {docs}
  {notes}
  {todos}
  {reports}
>
  {#snippet renderOverview()}
    <section class="section">
      {#if team.description}
        <p class="description">{team.description}</p>
      {/if}
    </section>

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
        <p class="empty">No members yet.</p>
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
  .description { margin: 0 0 var(--sp-3); color: var(--text-2); }
  .section-footer { margin-top: var(--sp-2); }
</style>
