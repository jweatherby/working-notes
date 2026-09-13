<script lang="ts">
  import type { PageData } from "./$types";
  import { trpc } from "$shared/trpc/client";
  import { goto, invalidateAll } from "$app/navigation";

  const { data } = $props<{ data: PageData }>();
  const brand = $derived(data.brand);

  let name = $state(brand.name);
  let primaryColor = $state(brand.primaryColor);
  let accentColor = $state(brand.accentColor);
  let primaryFontColor = $state(brand.primaryFontColor);
  let accentFontColor = $state(brand.accentFontColor);
  let iconPreview = $state(brand.iconUrl ?? "");
  let logoPreview = $state(brand.logoUrl ?? "");
  let pendingIconBlob = $state<Blob | null>(null);
  let pendingLogoBlob = $state<Blob | null>(null);
  let iconRemoved = $state(false);
  let logoRemoved = $state(false);
  let isDefault = $state(brand.isDefault);

  let busy = $state(false);
  let saved = $state(false);
  let error = $state("");
  let confirmDelete = $state(false);

  const resizeToBlob = (
    file: File,
    maxW: number,
    maxH: number
  ): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
          file.type.startsWith("image/png") ? "image/png" : "image/jpeg",
          0.9
        );
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });

  const handleFileSelect = async (e: Event, target: "icon" | "logo") => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const maxW = target === "icon" ? 256 : 800;
      const maxH = target === "icon" ? 256 : 200;
      const blob = await resizeToBlob(file, maxW, maxH);
      const preview = URL.createObjectURL(blob);
      if (target === "icon") { iconPreview = preview; pendingIconBlob = blob; iconRemoved = false; }
      else { logoPreview = preview; pendingLogoBlob = blob; logoRemoved = false; }
    } catch {
      error = "Failed to process image";
    }
  };

  const blobToBase64 = async (blob: Blob): Promise<string> => {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  };

  const uploadBlob = async (blob: Blob, type: "icon" | "logo"): Promise<string | null> => {
    const result = await trpc().branding.uploadImage.mutate({
      brandingId: brand.id,
      type,
      contentType: blob.type === "image/png" ? "image/png" : "image/jpeg",
      dataBase64: await blobToBase64(blob),
    });
    if (!result.ok) { error = result.error.message; return null; }
    return result.value.key;
  };

  const handleRemoveImage = (target: "icon" | "logo") => {
    if (target === "icon") { iconPreview = ""; pendingIconBlob = null; iconRemoved = true; }
    else { logoPreview = ""; pendingLogoBlob = null; logoRemoved = true; }
  };

  const handleSave = async () => {
    busy = true;
    error = "";
    try {
      const input: Record<string, unknown> = {
        id: brand.id,
        name,
        primaryColor,
        accentColor,
        primaryFontColor,
        accentFontColor,
        isDefault,
      };

      if (pendingIconBlob) {
        const key = await uploadBlob(pendingIconBlob, "icon");
        if (!key) return;
        input.iconUrl = key;
      } else if (iconRemoved) {
        input.iconUrl = null;
      }

      if (pendingLogoBlob) {
        const key = await uploadBlob(pendingLogoBlob, "logo");
        if (!key) return;
        input.logoUrl = key;
      } else if (logoRemoved) {
        input.logoUrl = null;
      }

      const result = await trpc().branding.update.mutate(input as any);
      if (!result.ok) {
        error = result.error.message;
      } else {
        pendingIconBlob = null;
        pendingLogoBlob = null;
        iconRemoved = false;
        logoRemoved = false;
        saved = true;
        setTimeout(() => { saved = false; }, 2000);
        await invalidateAll();
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Save failed";
    } finally {
      busy = false;
    }
  };

  const handleDelete = async () => {
    busy = true;
    error = "";
    try {
      const result = await trpc().branding.delete.mutate({ id: brand.id });
      if (!result.ok) {
        error = result.error.message;
        confirmDelete = false;
      } else {
        goto("/app/branding");
      }
    } finally {
      busy = false;
    }
  };
</script>

<svelte:head><title>{brand.name} - Branding</title></svelte:head>

<nav aria-label="breadcrumb">
  <ul>
    <li><a href="/app/branding">Branding</a></li>
    <li>{brand.name}</li>
  </ul>
</nav>

<h1>{brand.name}</h1>

{#if error}
  <p class="error-msg">{error}</p>
{/if}

<div class="editor-layout">
  <div class="editor-form">
    <h3>General</h3>
    <label>
      Profile name
      <input type="text" bind:value={name} required />
    </label>
    <label class="visibility-toggle">
      <input type="checkbox" role="switch" bind:checked={isDefault} />
      Default - used by reports that don't pick a branding
    </label>
    <h3>Colors</h3>
    <div class="color-grid">
      <label class="color-field">
        <span>Primary</span>
        <div class="color-input-row">
          <input type="color" bind:value={primaryColor} />
          <input type="text" bind:value={primaryColor} class="hex-input" />
        </div>
      </label>
      <label class="color-field">
        <span>Primary font</span>
        <div class="color-input-row">
          <input type="color" bind:value={primaryFontColor} />
          <input type="text" bind:value={primaryFontColor} class="hex-input" />
        </div>
      </label>
      <label class="color-field">
        <span>Accent</span>
        <div class="color-input-row">
          <input type="color" bind:value={accentColor} />
          <input type="text" bind:value={accentColor} class="hex-input" />
        </div>
      </label>
      <label class="color-field">
        <span>Accent font</span>
        <div class="color-input-row">
          <input type="color" bind:value={accentFontColor} />
          <input type="text" bind:value={accentFontColor} class="hex-input" />
        </div>
      </label>
    </div>

    <h3>Images</h3>
    <div class="form-row">
      <div class="image-field">
        <span class="image-label">Icon (square)</span>
        <input type="file" accept="image/*" onchange={(e) => handleFileSelect(e, "icon")} />
        {#if iconPreview}
          <div class="image-preview">
            <img src={iconPreview} alt="Icon preview" class="icon-preview" />
            <button class="text-btn danger" onclick={() => handleRemoveImage("icon")}>Remove</button>
          </div>
        {/if}
      </div>
      <div class="image-field">
        <span class="image-label">Logo (horizontal)</span>
        <input type="file" accept="image/*" onchange={(e) => handleFileSelect(e, "logo")} />
        {#if logoPreview}
          <div class="image-preview">
            <img src={logoPreview} alt="Logo preview" class="logo-preview" />
            <button class="text-btn danger" onclick={() => handleRemoveImage("logo")}>Remove</button>
          </div>
        {/if}
      </div>
    </div>

    <div class="form-actions">
      <div class="actions-left">
        {#if confirmDelete}
          <span class="confirm-msg">Delete this profile?</span>
          <button class="danger-btn btn-sm" onclick={handleDelete} disabled={busy}>Yes, delete</button>
          <button class="outline secondary btn-sm" onclick={() => { confirmDelete = false; }}>Cancel</button>
        {:else}
          <button class="outline secondary" onclick={() => { confirmDelete = true; }}>Delete profile</button>
        {/if}
      </div>
      <div class="actions-right">
        {#if saved}<span class="saved-msg">Saved</span>{/if}
        <button onclick={handleSave} disabled={busy || !name.trim()} aria-busy={busy}>
          Save Changes
        </button>
      </div>
    </div>
  </div>

  <aside class="preview-panel">
    <h3>Preview</h3>
    <div class="preview-card">
      {#if logoPreview}
        <img src={logoPreview} alt="Logo" class="preview-logo" />
      {/if}
      <div class="preview-btn" style="background:{primaryColor};color:{primaryFontColor}">
        Primary Button
      </div>
      <div class="preview-btn" style="background:{accentColor};color:{accentFontColor}">
        Accent Button
      </div>
    </div>
  </aside>
</div>

<style lang="scss">
  .editor-layout {
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: 2rem;
    align-items: start;
  }
  .editor-form {
    h3 {
      margin: 1.5rem 0 0.75rem;
      font-size: 1rem;
      &:first-child { margin-top: 0; }
    }
  }
  .visibility-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
    input { margin: 0; }
  }
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .color-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem 1rem;
  }
  .color-field {
    span {
      display: block;
      font-size: 0.85rem;
      margin-bottom: 0.25rem;
    }
  }
  .color-input-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    input[type="color"] {
      width: 36px;
      height: 36px;
      padding: 2px;
      border: 1px solid var(--color-muted-border);
      border-radius: 4px;
      cursor: pointer;
      margin: 0;
    }
    .hex-input {
      flex: 1;
      margin: 0;
      font-size: 0.85rem;
      font-family: monospace;
    }
  }
  .image-field {
    .image-label {
      display: block;
      font-size: 0.85rem;
      margin-bottom: 0.25rem;
    }
    input[type="file"] {
      font-size: 0.85rem;
      margin-bottom: 0.5rem;
    }
  }
  .image-preview {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .icon-preview {
    width: 40px;
    height: 40px;
    object-fit: contain;
    border: 1px solid var(--color-muted-border);
    border-radius: 4px;
  }
  .logo-preview {
    max-height: 40px;
    max-width: 160px;
    object-fit: contain;
    border: 1px solid var(--color-muted-border);
    border-radius: 4px;
  }
  .text-btn {
    @include unstyled-button;
    font-size: $font-xs;
    color: var(--color-primary);
    &:hover { text-decoration: underline; }
    &.danger { color: var(--color-danger); }
  }
  .form-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-muted-border);
  }
  .actions-left {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }
  .actions-right {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .confirm-msg {
    font-size: 0.8rem;
    color: var(--color-danger);
  }
  .danger-btn {
    background: var(--color-danger);
    border-color: var(--color-danger);
    color: #fff;
    &:hover { opacity: 0.85; }
  }
  .saved-msg {
    font-size: 0.8rem;
    color: var(--color-success);
  }

  // Preview panel
  .preview-panel {
    position: sticky;
    top: 2rem;
    h3 {
      margin: 0 0 0.75rem;
      font-size: 1rem;
    }
  }
  .preview-card {
    border: 1px solid var(--color-muted-border);
    border-radius: 6px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .preview-logo {
    max-height: 36px;
    max-width: 100%;
    object-fit: contain;
    align-self: flex-start;
  }
  .preview-btn {
    padding: 0.6rem 1rem;
    border-radius: 6px;
    text-align: center;
    font-weight: 600;
    font-size: 0.85rem;
  }
</style>
