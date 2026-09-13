import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import GlobalError from './global-error';

/**
 * GlobalError replaces the root layout when the layout itself throws. It must
 * not import app code and must render without app styles.
 *
 * jsdom warns about nesting <html>/<body> inside the test container; that is
 * expected for this component and does not affect the assertions.
 */

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

function makeError(overrides: Partial<Error & { digest?: string }> = {}) {
  const error = new Error('boom') as Error & { digest?: string };
  return Object.assign(error, overrides);
}

describe('GlobalError', () => {
  it('renders the failure message and a retry control', () => {
    render(<GlobalError error={makeError()} retry={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByText(/application failed to load/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('invokes retry when the button is clicked', async () => {
    const retry = vi.fn();
    render(<GlobalError error={makeError()} retry={retry} />);

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('shows the digest reference when one is present', () => {
    render(<GlobalError error={makeError({ digest: 'abc123' })} retry={vi.fn()} />);

    expect(screen.getByText(/reference:/i)).toBeInTheDocument();
    expect(screen.getByText('abc123')).toBeInTheDocument();
  });

  it('omits the reference line when there is no digest', () => {
    render(<GlobalError error={makeError()} retry={vi.fn()} />);

    expect(screen.queryByText(/reference:/i)).not.toBeInTheDocument();
  });

  it('logs identifiers only — never the error message or stack', () => {
    // CLAUDE.md rule 14: errors log identifiers and shape, never content.
    const error = makeError({ digest: 'digest-xyz' });
    render(<GlobalError error={error} retry={vi.fn()} />);

    expect(console.error).toHaveBeenCalledWith('ui.render.error', {
      boundary: 'global',
      name: 'Error',
      digest: 'digest-xyz',
    });
    const logged = JSON.stringify((console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls);
    expect(logged).not.toContain('boom');
  });
});
