import { describe, it, expect, vi, beforeEach } from 'vitest';

const invalidateAll = vi.fn().mockResolvedValue(undefined);

vi.mock('$app/navigation', () => ({
  invalidateAll: (...args: unknown[]) => invalidateAll(...args)
}));

// Import after mock is registered.
import { createDocHandlers } from '../use-doc-handlers';

describe('createDocHandlers.handleAddDoc', () => {
  beforeEach(() => {
    invalidateAll.mockClear();
  });

  it('calls invalidateAll before setActiveDocId', async () => {
    const add = vi.fn().mockResolvedValue({ ok: true, value: { id: 'doc_new' } });
    const setActiveDocId = vi.fn();

    const handlers = createDocHandlers(
      {
        add: { mutate: add },
        update: { mutate: vi.fn() },
        remove: { mutate: vi.fn() },
        reorder: { mutate: vi.fn() },
      },
      'PROJECT',
      'proj_1',
      () => null,
      setActiveDocId,
    );

    await handlers.handleAddDoc('New');

    expect(invalidateAll).toHaveBeenCalledTimes(1);
    expect(setActiveDocId).toHaveBeenCalledTimes(1);
    expect(setActiveDocId).toHaveBeenCalledWith('doc_new');

    const invalidateOrder = invalidateAll.mock.invocationCallOrder[0]!;
    const setActiveOrder = setActiveDocId.mock.invocationCallOrder[0]!;
    expect(invalidateOrder).toBeLessThan(setActiveOrder);
  });

  it('does not call setActiveDocId when the mutation fails', async () => {
    const add = vi.fn().mockResolvedValue({ ok: false, error: new Error('nope') });
    const setActiveDocId = vi.fn();

    const handlers = createDocHandlers(
      {
        add: { mutate: add },
        update: { mutate: vi.fn() },
        remove: { mutate: vi.fn() },
        reorder: { mutate: vi.fn() },
      },
      'PROJECT',
      'proj_1',
      () => null,
      setActiveDocId,
    );

    await handlers.handleAddDoc('New');
    expect(setActiveDocId).not.toHaveBeenCalled();
  });
});

describe('createDocHandlers.handleUploadPdf', () => {
  beforeEach(() => {
    invalidateAll.mockClear();
  });

  it('is a no-op when there is no active doc id', async () => {
    const attachSource = vi.fn();
    const handlers = createDocHandlers(
      {
        add: { mutate: vi.fn() },
        update: { mutate: vi.fn() },
        remove: { mutate: vi.fn() },
        reorder: { mutate: vi.fn() },
        attachSource: { mutate: attachSource },
      },
      'PROJECT',
      'proj_1',
      () => null,
      vi.fn(),
    );

    const file = new File([new Uint8Array([1, 2, 3])], 'x.pdf', { type: 'application/pdf' });
    await handlers.handleUploadPdf(file);

    expect(attachSource).not.toHaveBeenCalled();
  });

  it('reads file bytes and calls attachSource with base64', async () => {
    const attachSource = vi.fn().mockResolvedValue({ ok: true, value: { ok: true } });
    const handlers = createDocHandlers(
      {
        add: { mutate: vi.fn() },
        update: { mutate: vi.fn() },
        remove: { mutate: vi.fn() },
        reorder: { mutate: vi.fn() },
        attachSource: { mutate: attachSource },
      },
      'PROJECT',
      'proj_1',
      () => 'doc_1',
      vi.fn(),
    );

    const bytes = new Uint8Array([1, 2, 3, 250]);
    const file = new File([bytes], 'x.pdf', { type: 'application/pdf' });
    await handlers.handleUploadPdf(file);

    expect(attachSource).toHaveBeenCalledTimes(1);
    const arg = attachSource.mock.calls[0]![0];
    expect(arg.docId).toBe('doc_1');
    expect(arg.contentType).toBe('application/pdf');
    expect(Buffer.from(arg.dataBase64, 'base64')).toEqual(Buffer.from(bytes));
    expect(invalidateAll).toHaveBeenCalledTimes(1);
  });
});
