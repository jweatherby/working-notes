import { invalidateAll } from '$app/navigation';
import { submitOrThrow } from '$lib/ui/submit';

// Handlers throw the API's error message; DocEditor, DocsManager's
// ConfirmButton and EntityDetailPage's create flow catch and show it.

/* eslint-disable @typescript-eslint/no-explicit-any */
interface DocTrpc {
  add: { mutate: (input: any) => Promise<any> };
  update: { mutate: (input: any) => Promise<any> };
  remove: { mutate: (input: any) => Promise<any> };
  reorder: { mutate: (input: any) => Promise<any> };
  attachSource?: { mutate: (input: any) => Promise<any> };
  getReadUrl?: { query: (input: any) => Promise<any> };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const fileToBase64 = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

export interface DocHandlers {
  readonly handleAddDoc: (title: string) => Promise<void>;
  readonly handleSaveDoc: (content: string) => Promise<void>;
  readonly handleSaveTitle: (title: string) => Promise<void>;
  readonly handleRemoveDoc: (id: string) => Promise<void>;
  readonly handleReorderDocs: (docIds: readonly string[]) => Promise<void>;
  readonly handleUploadPdf: (file: File) => Promise<void>;
  readonly handleOpenSourcePdf: () => Promise<void>;
  readonly handleUploadImage: (file: File) => Promise<string>;
  readonly handleResolveImages: (keys: string[]) => Promise<Record<string, string>>;
}

export const createDocHandlers = (
  docTrpc: DocTrpc,
  entityType: string,
  entityId: string,
  getActiveDocId: () => string | null,
  setActiveDocId: (id: string | null) => void,
): DocHandlers => ({
  handleAddDoc: async (title: string) => {
    const doc = await submitOrThrow(() => docTrpc.add.mutate({ entityType, entityId, title }));
    await invalidateAll();
    setActiveDocId(doc.id);
  },

  handleSaveDoc: async (content: string) => {
    const docId = getActiveDocId();
    if (!docId) return;
    await submitOrThrow(() => docTrpc.update.mutate({ id: docId, content }));
    await invalidateAll();
  },

  handleSaveTitle: async (title: string) => {
    const docId = getActiveDocId();
    if (!docId) return;
    await submitOrThrow(() => docTrpc.update.mutate({ id: docId, title }));
    await invalidateAll();
  },

  handleRemoveDoc: async (id: string) => {
    await submitOrThrow(() => docTrpc.remove.mutate({ id }));
    if (getActiveDocId() === id) setActiveDocId(null);
    await invalidateAll();
  },

  handleReorderDocs: async (docIds: readonly string[]) => {
    await submitOrThrow(() => docTrpc.reorder.mutate({ entityType, entityId, docIds: [...docIds] }));
    await invalidateAll();
  },

  handleUploadPdf: async (file: File) => {
    const docId = getActiveDocId();
    const attachSource = docTrpc.attachSource;
    if (!docId || !attachSource) return;
    const dataBase64 = await fileToBase64(file);
    await submitOrThrow(() => attachSource.mutate({ docId, contentType: 'application/pdf', dataBase64 }));
    await invalidateAll();
  },

  handleOpenSourcePdf: async () => {
    const docId = getActiveDocId();
    if (!docId || !docTrpc.getReadUrl) return;
    const result = await docTrpc.getReadUrl.query({ id: docId });
    if (result.ok) window.open(result.value.url, '_blank');
  },

  handleUploadImage: async (_file: File): Promise<string> => {
    throw new Error('Image upload not yet supported');
  },

  handleResolveImages: async (_keys: string[]): Promise<Record<string, string>> => {
    return {};
  },
});
