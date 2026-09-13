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
