import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockParseToolParams } = vi.hoisted(() => ({
  mockParseToolParams: vi.fn(),
}));

vi.mock('@/lib/tool-params.server', () => ({
  parseToolParams: mockParseToolParams,
}));

vi.mock('./template-tool', () => ({
  TemplateTool: () => null,
}));

const mockRequireToolAccess = vi.hoisted(() => vi.fn(async () => 42));

vi.mock('@/app/(web)/tools/require-tool-access', () => ({
  requireToolAccess: mockRequireToolAccess,
}));

import TemplateToolPage from './page';

describe('TemplateToolPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('awaits searchParams before parsing them', async () => {
    const raw = { pageID: '312', recordID: '7' };
    mockParseToolParams.mockResolvedValueOnce({ pageID: 312, recordID: 7 });

    await TemplateToolPage({ searchParams: Promise.resolve(raw) });

    expect(mockParseToolParams).toHaveBeenCalledExactlyOnceWith(raw);
  });

  it('passes the parsed params through to TemplateTool', async () => {
    const parsed = { pageID: 312, recordID: 7 };
    mockParseToolParams.mockResolvedValueOnce(parsed);

    const element = await TemplateToolPage({ searchParams: Promise.resolve({}) });

    expect(element.props.params).toBe(parsed);
  });

  it('propagates a parse failure rather than rendering with bad params', async () => {
    mockParseToolParams.mockRejectedValueOnce(new Error('bad params'));

    await expect(
      TemplateToolPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow('bad params');
  });
});

describe('TemplateToolPage self-gate', () => {
  it('gates before parsing params and renders nothing when refused', async () => {
    // Adversarial: the tools layout's redirect does not stop a page segment
    // rendering in Next 16, so the page itself must refuse.
    mockParseToolParams.mockClear();
    mockRequireToolAccess.mockRejectedValueOnce(new Error('NEXT_REDIRECT:/no-access'));

    await expect(TemplateToolPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      'NEXT_REDIRECT:/no-access',
    );
    expect(mockRequireToolAccess).toHaveBeenCalledWith({ table: 'dp_Tools', operation: 'read' });
    expect(mockParseToolParams).not.toHaveBeenCalled();
  });
});
