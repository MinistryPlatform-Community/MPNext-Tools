import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const { mockToaster } = vi.hoisted(() => ({
  mockToaster: vi.fn(),
}));

vi.mock('@/contexts/user-context', () => ({
  UserProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="user-provider">{children}</div>
  ),
}));

vi.mock('sonner', () => ({
  Toaster: (props: Record<string, unknown>) => {
    mockToaster(props);
    return <div data-testid="toaster" />;
  },
}));

import { Providers } from './providers';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Providers', () => {
  it('wraps children in the UserProvider', () => {
    render(
      <Providers>
        <p>app-content</p>
      </Providers>,
    );

    const provider = screen.getByTestId('user-provider');
    expect(provider).toBeInTheDocument();
    expect(provider).toHaveTextContent('app-content');
  });

  it('mounts the Toaster inside the provider so toasts can read user context', () => {
    render(
      <Providers>
        <p>app-content</p>
      </Providers>,
    );

    expect(screen.getByTestId('user-provider')).toContainElement(screen.getByTestId('toaster'));
  });

  it('configures the Toaster bottom-right with rich colors', () => {
    render(
      <Providers>
        <p>app-content</p>
      </Providers>,
    );

    expect(mockToaster).toHaveBeenCalledWith(
      expect.objectContaining({ position: 'bottom-right', richColors: true }),
    );
  });
});
