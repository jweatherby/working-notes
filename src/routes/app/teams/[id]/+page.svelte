<script lang="ts">
  import type { PageData } from './$types';
  import { invalidateAll } from '$app/navigation';
  import { trpc } from '$shared/trpc/client';
  import EntityDetailPage from '$lib/common/EntityDetailPage.svelte';
  import TeamForm from '$lib/team/components/TeamForm.svelte';

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
  editPopupTitle="Edit Team"
  {docs}
  {notes}
  {todos}
  {reports}
>
  {#snippet renderOverview({ openEdit })}
    <div class="profile-card">
      {#if team.description}
        <p class="profile-detail">{team.description}</p>
      {/if}
      <button class="outline edit-btn" onclick={openEdit}>Edit</button>
    </div>

    <div class="section-block">
      <h4>Members</h4>
      {#if team.members.length > 0}
        <ul class="child-list">
          {#each team.members as m}
            <li>
              <a href="/app/people/{m.personId}">{m.personName}</a>
              {#if m.personTitle}<span class="muted">{m.personTitle}</span>{/if}
              <button
                class="text-btn danger"
                data-plain
                onclick={() => { if (confirm('Remove member?')) handleRemoveMember(m.personId); }}
              >&times;</button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="muted">No members yet.</p>
      {/if}
      {#if availablePersons.length > 0}
        <details class="assign-parent">
          <summary>Add member</summary>
          <select
            onchange={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              if (v) handleAddMember(v);
            }}
          >
            <option value="">Select a person…</option>
            {#each availablePersons as p}
              <option value={p.id}>{p.name}</option>
            {/each}
          </select>
        </details>
      {/if}
    </div>

  {/snippet}

  {#snippet renderAssetHeader()}
    <strong class="asset-h-name">{team.name}</strong>
    <span class="asset-h-meta">{team.members.length} member{team.members.length === 1 ? '' : 's'}</span>
  {/snippet}

  {#snippet renderEditForm({ onSuccess })}
    <TeamForm initial={team} {onSuccess} />
  {/snippet}
</EntityDetailPage>

<style lang="scss">
  .profile-card { margin-bottom: 0; }
  .profile-detail {
    margin: 0;
    color: var(--color-muted);
    font-size: 0.85rem;
  }
  .edit-btn {
    margin-top: 0.5rem;
    padding: 0.25rem 0.75rem;
  }
  .section-block { margin-top: 2rem; }
  h4 { font-size: 0.9rem; margin-bottom: 0.75rem; }
  .assign-parent {
    margin-top: 0.5rem;
    font-size: 0.85rem;
    summary { color: var(--color-muted); font-size: 0.8rem; }
    select { margin-top: 0.25rem; }
  }
  .child-list {
    list-style: none;
    padding: 0;
    margin: 0 0 0.5rem;
    li {
      display: grid;
      grid-template-columns: 1fr auto auto;
      column-gap: 0.5rem;
      align-items: center;
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
