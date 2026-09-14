<script lang="ts">
  // The chevron that shows or hides a row's children.
  interface Props {
    readonly expanded: boolean;
    /** What the button expands, for its accessible name ("Expand <label>"). */
    readonly label: string;
    readonly onToggle: () => void;
  }

  const { expanded, label, onToggle }: Props = $props();
</script>

<button
  type="button"
  class="btn icon sm disclosure"
  class:open={expanded}
  aria-expanded={expanded}
  aria-label="{expanded ? 'Collapse' : 'Expand'} {label}"
  onclick={onToggle}>▸</button>

<style lang="scss">
  .disclosure {
    transition: transform var(--ease);
    &.open { transform: rotate(90deg); }
  }
</style>
