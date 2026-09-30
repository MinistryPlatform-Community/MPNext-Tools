import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockParseToolParams } = vi.hoisted(() => ({
  mockParseToolParams: vi.fn(),
}));

vi.mock('@/lib/tool-params.server', () => ({
  parseToolParams: mockParseToolParams,
}));

vi.mock('./template-editor', () => ({
  TemplateEditor: () => null,
}));

const mockRequireToolAccess = vi.hoisted(() => vi.fn(async () => 42));

vi.mock('@/app/(web)/tools/require-tool-access', () => ({
  requireToolAccess: mockRequireToolAccess,
}));

import TemplateEditorPage from './page';
import { TemplateEditor } from './template-editor';

describe('TemplateEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses search params and passes them through to TemplateEditor', async () => {
    const params = { pageID: 292, recordID: 7 };
    mockParseToolParams.mockResolvedValue(params);
    const searchParams = Promise.resolve({ pageID: '292', recordID: '7' });

    const element = await TemplateEditorPage({ searchParams });

    expect(mockParseToolParams).toHaveBeenCalledWith({ pageID: '292', recordID: '7' });
    expect(element.type).toBe(TemplateEditor);
    expect(element.props).toEqual({ params });
  });
});

describe('TemplateEditorPage self-gate', () => {
  it('gates before parsing params and renders nothing when refused', async () => {
    // Adversarial: the tools layout's redirect does not stop a page segment
    // rendering in Next 16, so the page itself must refuse.
    mockParseToolParams.mockClear();
    mockRequireToolAccess.mockRejectedValueOnce(new Error('NEXT_REDIRECT:/no-access'));

    await expect(TemplateEditorPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      'NEXT_REDIRECT:/no-access',
    );
    expect(mockRequireToolAccess).toHaveBeenCalledWith({ table: 'dp_Tools', operation: 'read' });
    expect(mockParseToolParams).not.toHaveBeenCalled();
  });
});
