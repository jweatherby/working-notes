<script lang="ts">
  // The projects list's Size: a dot whose area shows the estimate relative to
  // the biggest project shown, with "~18d" beside it (project-timeline.ts).
  import { sizeDotDiameter, SIZE_DOT_MAX } from '../project-timeline';

  interface Props {
    /** 0–1 of the biggest estimate shown. */
    readonly fraction: number;
    readonly label: string;
  }

  const { fraction, label }: Props = $props();
</script>

<span class="size" style="--slot: {SIZE_DOT_MAX}px">
  <span class="dot-slot"><span class="dot" style="--d: {sizeDotDiameter(fraction)}px"></span></span>
  <span class="text-xs text-2">{label}</span>
</span>

<style lang="scss">
  .size {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
  }
  // A fixed slot, so the labels line up whatever the dot's size.
  .dot-slot {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--slot);
    height: var(--slot);
  }
  .dot {
    width: var(--d);
    height: var(--d);
    border-radius: var(--r-full);
    background: var(--text-3);
  }
</style>
