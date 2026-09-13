import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import Home from './page';

/**
 * The home page is the tool index. Its job is to link to every tool, so the
 * test that matters is that each tool has a card AND a working href — a card
 * whose link rotted is the failure mode this catches.
 */

afterEach(cleanup);

const TOOLS = [
  { name: 'Template Tool', href: '/tools/template' },
  { name: 'Template Editor', href: '/tools/templateeditor' },
  { name: 'Address Labels', href: '/tools/addresslabels' },
  { name: 'Group Wizard', href: '/tools/groupwizard' },
  { name: 'Field Management', href: '/tools/fieldmanagement' },
  { name: 'Add/Edit Family', href: '/tools/addeditfamily' },
];

describe('Home', () => {
  it('renders the app title', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { level: 1, name: 'MPNext Tools' })).toBeInTheDocument();
  });

  it.each(TOOLS)('lists the $name card', ({ name }) => {
    render(<Home />);

    expect(screen.getByText(name)).toBeInTheDocument();
  });

  it.each(TOOLS)('links $name to $href', ({ href }) => {
    const { container } = render(<Home />);

    expect(container.querySelector(`a[href="${href}"]`)).toBeInTheDocument();
  });

  it('renders exactly one link per tool and no others', () => {
    const { container } = render(<Home />);

    expect(container.querySelectorAll('a')).toHaveLength(TOOLS.length);
  });
});
