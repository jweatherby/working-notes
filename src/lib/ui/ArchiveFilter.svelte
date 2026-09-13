<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { ARCHIVE_FILTERS, type ArchiveFilter } from '$shared/types/enums';
  import { ARCHIVE_FILTER_LABELS, parseArchiveFilter } from '$shared/utils/archive';

  // List-page toolbar filter. The value lives in `?archived=` so the server load can pass it to `*.list`.
  const current = $derived(parseArchiveFilter(page.url.searchParams.get('archived')));

  const handleChange = (e: Event) => {
    const value = (e.currentTarget as HTMLSelectElement).value as ArchiveFilter;
    const url = new URL(page.url);
    if (value === 'exclude') url.searchParams.delete('archived');
    else url.searchParams.set('archived', value);
    void goto(url, { keepFocus: true, noScroll: true, replaceState: true });
  };
</script>

<select class="sm" value={current} onchange={handleChange} aria-label="Show active or archived">
  {#each ARCHIVE_FILTERS as filter (filter)}
    <option value={filter}>{ARCHIVE_FILTER_LABELS[filter]}</option>
  {/each}
</select>
