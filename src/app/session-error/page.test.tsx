import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

/**
 * SessionErrorPage is the only escape hatch for an authenticated-but-unusable
 * session (one with no userGuid). AuthWrapper redirects here, and because the
 * page sits outside the (web) group it is not itself wrapped — so it cannot
 * loop. The sign-out form must always render.
 */

const { mockHandleSignOut } = vi.hoisted(() => ({
  mockHandleSignOut: vi.fn(),
}));

vi.mock('@/components/user-menu/actions', () => ({
  handleSignOut: mockHandleSignOut,
}));

import SessionErrorPage, { dynamic } from './page';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SessionErrorPage', () => {
  it('is force-dynamic so the per-request CSP nonce is available', () => {
    // A prerendered page has no request, therefore no nonce, therefore a
    // blocked bootstrap script — which would leave this page's only
    // sign-out control non-functional.
    expect(dynamic).toBe('force-dynamic');
  });

  it('explains that the MP user link was missing', () => {
    render(<SessionErrorPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: /couldn't load your account/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/ministry platform\s+user link/i)).toBeInTheDocument();
  });

  it('renders a sign-out submit button wired to the handleSignOut action', () => {
    const { container } = render(<SessionErrorPage />);

    const button = screen.getByRole('button', { name: /sign out and try again/i });
    expect(button).toHaveAttribute('type', 'submit');
    expect(container.querySelector('form')).toBeInTheDocument();
  });
});
