import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { NewGroupDialog } from './new-group-dialog';

describe('NewGroupDialog', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders nothing when closed', () => {
    render(
      <NewGroupDialog open={false} onOpenChange={vi.fn()} onCreateGroup={vi.fn()} existingGroupNames={[]} />
    );
    expect(screen.queryByText('New Group')).not.toBeInTheDocument();
  });

  it('renders the form when open', () => {
    render(
      <NewGroupDialog open onOpenChange={vi.fn()} onCreateGroup={vi.fn()} existingGroupNames={[]} />
    );
    expect(screen.getByText('New Group')).toBeInTheDocument();
    expect(screen.getByLabelText('Group Name')).toBeInTheDocument();
  });

  it('shows a required error and does not call onCreateGroup when submitted empty', () => {
    const onCreateGroup = vi.fn();
    render(
      <NewGroupDialog open onOpenChange={vi.fn()} onCreateGroup={onCreateGroup} existingGroupNames={[]} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create Group' }));

    expect(screen.getByText('Group name is required.')).toBeInTheDocument();
    expect(onCreateGroup).not.toHaveBeenCalled();
  });

  it('treats a whitespace-only name as empty', () => {
    render(
      <NewGroupDialog open onOpenChange={vi.fn()} onCreateGroup={vi.fn()} existingGroupNames={[]} />
    );

    fireEvent.change(screen.getByLabelText('Group Name'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Group' }));

    expect(screen.getByText('Group name is required.')).toBeInTheDocument();
  });

  it('shows a duplicate-name error (case-insensitive) and does not call onCreateGroup', () => {
    const onCreateGroup = vi.fn();
    render(
      <NewGroupDialog
        open
        onOpenChange={vi.fn()}
        onCreateGroup={onCreateGroup}
        existingGroupNames={['1 - General']}
      />
    );

    fireEvent.change(screen.getByLabelText('Group Name'), { target: { value: '1 - general' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Group' }));

    expect(screen.getByText('A group with this name already exists.')).toBeInTheDocument();
    expect(onCreateGroup).not.toHaveBeenCalled();
  });

  it('trims the name, calls onCreateGroup, resets the form, and closes on valid submit', () => {
    const onCreateGroup = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <NewGroupDialog open onOpenChange={onOpenChange} onCreateGroup={onCreateGroup} existingGroupNames={[]} />
    );

    fireEvent.change(screen.getByLabelText('Group Name'), { target: { value: '  New Section  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Group' }));

    expect(onCreateGroup).toHaveBeenCalledWith('New Section');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('clears the error as soon as the user types again', () => {
    render(
      <NewGroupDialog open onOpenChange={vi.fn()} onCreateGroup={vi.fn()} existingGroupNames={[]} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create Group' }));
    expect(screen.getByText('Group name is required.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Group Name'), { target: { value: 'X' } });
    expect(screen.queryByText('Group name is required.')).not.toBeInTheDocument();
  });

  it('resets name and error and calls onOpenChange(false) when Cancel is clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <NewGroupDialog open onOpenChange={onOpenChange} onCreateGroup={vi.fn()} existingGroupNames={[]} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create Group' }));
    expect(screen.getByText('Group name is required.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('resets name and error via handleOpenChange when Radix closes the dialog (e.g. Escape)', () => {
    const onOpenChange = vi.fn();
    render(
      <NewGroupDialog open onOpenChange={onOpenChange} onCreateGroup={vi.fn()} existingGroupNames={[]} />
    );

    fireEvent.change(screen.getByLabelText('Group Name'), { target: { value: 'Partial' } });
    fireEvent.keyDown(screen.getByLabelText('Group Name'), { key: 'Escape', code: 'Escape' });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
