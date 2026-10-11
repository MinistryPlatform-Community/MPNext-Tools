import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const { mockHandleSignOut } = vi.hoisted(() => ({
  mockHandleSignOut: vi.fn(),
}));

vi.mock('@/components/shared-actions/sign-out', () => ({
  handleSignOut: mockHandleSignOut,
}));

import NoAccessPage from './page';

/**
 * This page is the landing spot for a signed-in user with no MP security role.
 * Sign-in is not role-gated, so the user has a session; these tests pin the copy
 * that tells them what to do and the sign-out form that lets them end it.
 */

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('NoAccessPage', () => {
  it('renders a heading explaining the user lacks access', () => {
    render(<NoAccessPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: /don't have access to this tool/i }),
    ).toBeInTheDocument();
  });

  it('tells the user sign-in succeeded but no role is assigned', () => {
    render(<NoAccessPage />);

    expect(screen.getByText(/signed in successfully/i)).toBeInTheDocument();
    expect(screen.getByText(/doesn't have a security role/i)).toBeInTheDocument();
  });

  it('directs the user to their Ministry Platform administrator', () => {
    render(<NoAccessPage />);

    expect(screen.getByText(/ask your ministry platform administrator/i)).toBeInTheDocument();
  });

  it('renders a sign-out submit button wired to the handleSignOut action', () => {
    // Without it a role-less user is stuck in their session until the 12 h
    // lifetime ends — there is no other sign-out control on this page.
    const { container } = render(<NoAccessPage />);

    const button = screen.getByRole('button', { name: /^sign out$/i });
    expect(button).toHaveAttribute('type', 'submit');
    expect(button.closest('form')).toBe(container.querySelector('form'));
  });
});
