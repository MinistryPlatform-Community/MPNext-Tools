import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import type { ToolParams } from '@/lib/tool-params';

const mockParseToolParams = vi.hoisted(() => vi.fn());

vi.mock('@/lib/tool-params.server', () => ({
  parseToolParams: mockParseToolParams,
}));

vi.mock('./address-labels', () => ({
  AddressLabels: ({ params }: { params: ToolParams }) => (
    <div data-testid="address-labels">{JSON.stringify(params)}</div>
  ),
}));

const mockRequireToolAccess = vi.hoisted(() => vi.fn(async () => 42));

vi.mock('@/app/(web)/tools/require-tool-access', () => ({
  requireToolAccess: mockRequireToolAccess,
}));

import AddressLabelsPage from './page';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('AddressLabelsPage', () => {
  it('parses search params and renders AddressLabels with the result', async () => {
    const parsed: ToolParams = { recordID: 42 };
    mockParseToolParams.mockResolvedValue(parsed);

    const searchParams = Promise.resolve({ recordID: '42' });
    const ui = await AddressLabelsPage({ searchParams });
    render(ui);

    expect(mockParseToolParams).toHaveBeenCalledWith({ recordID: '42' });
    expect(screen.getByTestId('address-labels').textContent).toBe(JSON.stringify(parsed));
  });
});

describe('AddressLabelsPage self-gate', () => {
  it('gates before parsing params and renders nothing when refused', async () => {
    // Adversarial: the tools layout's redirect does not stop a page segment
    // rendering in Next 16, so the page itself must refuse.
    mockParseToolParams.mockClear();
    mockRequireToolAccess.mockRejectedValueOnce(new Error('NEXT_REDIRECT:/no-access'));

    await expect(AddressLabelsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      'NEXT_REDIRECT:/no-access',
    );
    expect(mockRequireToolAccess).toHaveBeenCalledWith({ table: 'Contacts', operation: 'read' });
    expect(mockParseToolParams).not.toHaveBeenCalled();
  });
});
