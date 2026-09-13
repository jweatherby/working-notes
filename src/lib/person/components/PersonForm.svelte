<script lang="ts">
  import { trpc } from '$shared/trpc/client';

  interface PersonData {
    readonly id?: string;
    readonly name?: string;
    readonly email?: string | null;
    readonly title?: string | null;
  }

  const {
    initial = {} as PersonData,
    onSuccess,
  }: {
    initial?: PersonData;
    onSuccess: (result: { readonly id: string }) => void;
  } = $props();

  const isEdit = $derived(!!initial.id);

  let name = $state(initial.name ?? '');
  let email = $state(initial.email ?? '');
  let title = $state(initial.title ?? '');
  let submitting = $state(false);

  $effect(() => {
    name = initial.name ?? '';
    email = initial.email ?? '';
    title = initial.title ?? '';
  });

  const handleSubmit = async () => {
    submitting = true;
    try {
      if (isEdit) {
        const result = await trpc().person.update.mutate({
          id: initial.id!,
          name,
          email: email || null,
          title: title || null,
        });
        if (result.ok) onSuccess(result.value);
      } else {
        const result = await trpc().person.create.mutate({
          name,
          email: email || undefined,
          title: title || undefined,
        });
        if (result.ok) {
          name = '';
          email = '';
          title = '';
          onSuccess(result.value);
        }
      }
    } finally {
      submitting = false;
    }
  };
</script>

<form onsubmit={(e: SubmitEvent) => { e.preventDefault(); handleSubmit(); }}>
  <label>
    Name
    <input type="text" bind:value={name} required placeholder="Full name" />
  </label>
  <label>
    Title (optional)
    <input type="text" bind:value={title} placeholder="e.g. Senior Engineer" />
  </label>
  <label>
    Email (optional)
    <input type="email" bind:value={email} placeholder="name@example.com" />
  </label>
  <button type="submit" disabled={submitting || !name.trim()} aria-busy={submitting}>
    {isEdit ? 'Save' : 'Add Person'}
  </button>
</form>
