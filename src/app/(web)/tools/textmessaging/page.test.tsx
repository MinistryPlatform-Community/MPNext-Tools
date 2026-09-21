import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { ToolParams } from '@/lib/tool-params';

const { mockParseToolParams } = vi.hoisted(() => ({
  mockParseToolParams: vi.fn(),
}));

vi.mock('@/lib/tool-params.server', () => ({
  parseToolParams: mockParseToolParams,
}));

vi.mock('./text-messaging', () => ({
  TextMessaging: ({ params }: { params: ToolParams }) => (
    <div data-testid="text-messaging">{JSON.stringify(params)}</div>
  ),
}));

import TextMessagingPage, { generateMetadata } from './page';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('TextMessagingPage', () => {
  it('titles the route', () => {
    expect(generateMetadata()).toEqual({ title: 'Text Messaging' });
  });

  it('parses the search params and renders the tool with the result', async () => {
    const parsed: ToolParams = { pageID: 292, s: 17 };
    mockParseToolParams.mockResolvedValue(parsed);

    const element = await TextMessagingPage({ searchParams: Promise.resolve({ pageID: '292', s: '17' }) });
    render(element);

    expect(mockParseToolParams).toHaveBeenCalledWith({ pageID: '292', s: '17' });
    expect(screen.getByTestId('text-messaging').textContent).toBe(JSON.stringify(parsed));
  });

  it('awaits the search params promise before parsing', async () => {
    mockParseToolParams.mockResolvedValue({ recordID: -1 });
    const raw = { recordID: '-1' };

    await TextMessagingPage({ searchParams: Promise.resolve(raw) });

    expect(mockParseToolParams).toHaveBeenCalledWith(raw);
  });
});
