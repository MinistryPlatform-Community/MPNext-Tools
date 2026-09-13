import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { ToolParams } from '@/lib/tool-params';

const { mockParseToolParams, mockGetMpTimezone } = vi.hoisted(() => ({
  mockParseToolParams: vi.fn(),
  mockGetMpTimezone: vi.fn(),
}));

vi.mock('@/lib/tool-params.server', () => ({
  parseToolParams: mockParseToolParams,
}));

vi.mock('@/components/shared-actions/domain', () => ({
  getMpTimezone: mockGetMpTimezone,
}));

vi.mock('./group-wizard', () => ({
  GroupWizard: ({ params, mpTimezone }: { params: ToolParams; mpTimezone: string }) => (
    <div data-testid="group-wizard-stub">
      <span data-testid="params">{JSON.stringify(params)}</span>
      <span data-testid="mp-timezone">{mpTimezone}</span>
    </div>
  ),
}));

import GroupWizardPage from './page';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('GroupWizardPage', () => {
  it('parses search params and MP timezone, forwarding both to GroupWizard', async () => {
    const parsedParams: ToolParams = { recordID: 5 };
    mockParseToolParams.mockResolvedValueOnce(parsedParams);
    mockGetMpTimezone.mockResolvedValueOnce('America/Chicago');

    const jsx = await GroupWizardPage({
      searchParams: Promise.resolve({ recordID: '5' }),
    });
    render(jsx);

    expect(screen.getByTestId('group-wizard-stub')).toBeInTheDocument();
    expect(screen.getByTestId('params').textContent).toBe(JSON.stringify(parsedParams));
    expect(screen.getByTestId('mp-timezone').textContent).toBe('America/Chicago');
    expect(mockParseToolParams).toHaveBeenCalledWith({ recordID: '5' });
    expect(mockGetMpTimezone).toHaveBeenCalledTimes(1);
  });

  it('awaits the searchParams promise before parsing', async () => {
    mockParseToolParams.mockResolvedValueOnce({ recordID: -1 });
    mockGetMpTimezone.mockResolvedValueOnce('Etc/UTC');

    const rawParams = { pageID: '292' };
    await GroupWizardPage({ searchParams: Promise.resolve(rawParams) });

    expect(mockParseToolParams).toHaveBeenCalledWith(rawParams);
  });
});
