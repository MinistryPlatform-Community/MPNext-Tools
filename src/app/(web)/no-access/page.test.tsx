import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import NoAccessPage from './page';

/**
 * This page is the landing spot for a signed-in user with no MP security role.
 * It lives inside the (web) route group specifically so the app shell — and
 * therefore the sign-out control — stays reachable. These tests pin the copy
 * that tells the user what to do, since that copy IS the feature.
 */

afterEach(cleanup);

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
});
