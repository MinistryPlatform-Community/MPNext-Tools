import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { InfoHint } from './info-hint';

afterEach(() => {
  cleanup();
});

describe('InfoHint', () => {
  it('renders a trigger with the default accessible name and no content until opened', () => {
    render(<InfoHint>Segments are billing units.</InfoHint>);

    expect(screen.getByRole('button', { name: 'More information' })).toBeInTheDocument();
    expect(screen.queryByText('Segments are billing units.')).not.toBeInTheDocument();
  });

  it('uses the supplied label and className on the trigger', () => {
    render(
      <InfoHint label="About approval limits" className="mt-0.5">
        Detail
      </InfoHint>
    );

    const trigger = screen.getByRole('button', { name: 'About approval limits' });
    expect(trigger).toHaveClass('mt-0.5');
  });

  it('opens on click and shows its content', () => {
    render(<InfoHint label="About rates">Texts cost $0.01 per piece.</InfoHint>);

    fireEvent.click(screen.getByRole('button', { name: 'About rates' }));

    expect(screen.getByText('Texts cost $0.01 per piece.')).toBeInTheDocument();
  });

  it('closes again when the trigger is clicked a second time', () => {
    render(<InfoHint label="About rates">Texts cost $0.01 per piece.</InfoHint>);

    const trigger = screen.getByRole('button', { name: 'About rates' });
    fireEvent.click(trigger);
    expect(screen.getByText('Texts cost $0.01 per piece.')).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.queryByText('Texts cost $0.01 per piece.')).not.toBeInTheDocument();
  });

  it('opens on hover and closes when the pointer leaves the trigger', () => {
    render(<InfoHint label="About rates">Hover detail</InfoHint>);

    const trigger = screen.getByRole('button', { name: 'About rates' });
    fireEvent.mouseEnter(trigger);
    expect(screen.getByText('Hover detail')).toBeInTheDocument();

    fireEvent.mouseLeave(trigger);
    expect(screen.queryByText('Hover detail')).not.toBeInTheDocument();
  });

  it('stays open while the pointer is over the content and closes when it leaves', () => {
    render(
      <InfoHint label="About rates" side="bottom">
        Hover detail
      </InfoHint>
    );

    const trigger = screen.getByRole('button', { name: 'About rates' });
    fireEvent.mouseEnter(trigger);
    const content = screen.getByText('Hover detail');

    fireEvent.mouseEnter(content);
    expect(screen.getByText('Hover detail')).toBeInTheDocument();

    fireEvent.mouseLeave(content);
    expect(screen.queryByText('Hover detail')).not.toBeInTheDocument();
  });

  it('does not move focus into the popover when it opens', () => {
    render(<InfoHint label="About rates">Focusless detail</InfoHint>);

    const trigger = screen.getByRole('button', { name: 'About rates' });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByText('Focusless detail')).toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
