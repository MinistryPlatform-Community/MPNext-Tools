import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockParseToolParams } = vi.hoisted(() => ({
  mockParseToolParams: vi.fn(),
}));

vi.mock('@/lib/tool-params.server', () => ({
  parseToolParams: mockParseToolParams,
}));

vi.mock('./field-management', () => ({
  FieldManagement: () => null,
}));

import FieldManagementPage from './page';

describe('FieldManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('awaits searchParams before parsing them', async () => {
    const raw = { pageID: '292' };
    mockParseToolParams.mockResolvedValueOnce({ pageID: 292 });

    await FieldManagementPage({ searchParams: Promise.resolve(raw) });

    expect(mockParseToolParams).toHaveBeenCalledExactlyOnceWith(raw);
  });

  it('passes the parsed params through to FieldManagement', async () => {
    const parsed = { pageID: 292 };
    mockParseToolParams.mockResolvedValueOnce(parsed);

    const element = await FieldManagementPage({ searchParams: Promise.resolve({}) });

    expect(element.props.params).toBe(parsed);
  });

  it('propagates a parse failure rather than rendering with bad params', async () => {
    mockParseToolParams.mockRejectedValueOnce(new Error('bad params'));

    await expect(
      FieldManagementPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow('bad params');
  });
});
