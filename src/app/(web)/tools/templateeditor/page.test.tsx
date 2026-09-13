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
