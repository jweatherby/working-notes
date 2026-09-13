<script lang="ts">
  import "./styles.scss";
  import { navigating } from "$app/stores";

  import type { LayoutData } from "./$types";

  let { children, data } = $props<{ children: any; data: LayoutData }>();

  const LOADING_MESSAGES: readonly string[] = [
    "Loading…",
    "Just a moment…",
    "Fetching data…",
  ];

  const pickMessage = (): string =>
    LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]!;

  let loadingMessage = $state(LOADING_MESSAGES[0]!);

  $effect(() => {
    if ($navigating) loadingMessage = pickMessage();
  });
</script>

<svelte:head></svelte:head>

{@render children()}

{#if $navigating}
  <div
    class="nav-loading"
    role="status"
    aria-live="polite"
    aria-label="Loading"
  >
    <div class="bar"></div>
    <div class="pulse">
      <span></span>
      <span></span>
      <span></span>
      <span class="label">{loadingMessage}</span>
    </div>
  </div>
{/if}

<style lang="scss">
  .nav-loading {
    position: fixed;
    inset: 0;
    z-index: 100;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(2px);
    animation: nav-fade-in 180ms ease;
  }

  .bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent,
      var(--color-primary) 40%,
      var(--color-primary) 60%,
      transparent
    );
    background-size: 200% 100%;
    animation: nav-bar 1.1s linear infinite;
  }

  .pulse {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.6rem 1rem;
    background: var(--color-card-bg);
    border: 1px solid var(--color-muted-border);
    border-radius: 4px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
  }
  .pulse span {
    width: 0.35rem;
    height: 0.35rem;
    border-radius: 50%;
    background: var(--color-primary);
    animation: nav-pulse 1.2s ease-in-out infinite;
  }
  .pulse span:nth-child(1) { animation-delay: 0s; }
  .pulse span:nth-child(2) { animation-delay: 0.18s; }
  .pulse span:nth-child(3) { animation-delay: 0.36s; }
  .pulse .label {
    width: auto;
    height: auto;
    border-radius: 0;
    background: transparent;
    animation: none;
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-left: 0.45rem;
  }

  @keyframes nav-bar {
    0% { background-position: 200% 0; }
    100% { background-position: -100% 0; }
  }
  @keyframes nav-pulse {
    0%, 100% { opacity: 0.25; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.1); }
  }
  @keyframes nav-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style>
