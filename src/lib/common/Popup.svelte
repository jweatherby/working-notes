<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";

  const { id, title, children } = $props<{
    id: string;
    title: string;
    children: any;
  }>();

  const isOpen = $derived($page.url.searchParams.get("popup") === id);

  const close = () => {
    const url = new URL($page.url);
    url.searchParams.delete("popup");
    goto(url.toString(), {
      replaceState: true,
      noScroll: true,
      invalidateAll: true,
    });
  };

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) close();
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <dialog class="popup" open onclick={handleBackdropClick}>
    <article class="popup-article">
      <header class="popup-header">
        <button aria-label="Close" class="close-btn" onclick={close}></button>
        <h3>{title}</h3>
      </header>
      <div class="popup-body">
        {@render children()}
      </div>
    </article>
  </dialog>
{/if}

<style lang="scss">
  .popup-article {
    display: flex;
    flex-direction: column;
    max-height: 85vh;
    overflow: hidden;
  }
  .popup-header {
    flex-shrink: 0;
    position: sticky;
    top: 0;
    z-index: 1;
  }
  .popup-body {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
</style>
