<script lang="ts">
  interface Props {
    readonly children: any;
  }

  const { children }: Props = $props();
</script>

<div class="centered-layout">
  {@render children()}
</div>

<style lang="scss">
  .centered-layout {
    max-width: 960px;
    margin: 0 auto;
    padding: 1rem 2rem;
    width: 100%;
    // Lets wide children (e.g. the org chart) scroll instead of stretching the layout.
    min-width: 0;
  }
</style>
