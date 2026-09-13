import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { WizardNavigation } from './wizard-navigation';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function baseProps(overrides: Partial<React.ComponentProps<typeof WizardNavigation>> = {}) {
  return {
    currentStep: 0,
    totalSteps: 6,
    onBack: vi.fn(),
    onNext: vi.fn(),
    onCancel: vi.fn(),
    onSubmit: vi.fn(),
    isSubmitting: false,
    isEditMode: false,
    ...overrides,
  };
}

describe('WizardNavigation', () => {
  it('hides Back button on the first step', () => {
    render(<WizardNavigation {...baseProps({ currentStep: 0 })} />);
    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
  });

  it('shows Back button and calls onBack when not on the first step', () => {
    const onBack = vi.fn();
    render(<WizardNavigation {...baseProps({ currentStep: 1, onBack })} />);
    const backBtn = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows Next button and calls onNext on a non-review step', () => {
    const onNext = vi.fn();
    render(<WizardNavigation {...baseProps({ currentStep: 1, totalSteps: 6, onNext })} />);
    const nextBtn = screen.getByRole('button', { name: /^next$/i });
    fireEvent.click(nextBtn);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /create group/i })).not.toBeInTheDocument();
  });

  it('shows "Create Group" submit button on the review step in create mode and calls onSubmit', () => {
    const onSubmit = vi.fn();
    render(<WizardNavigation {...baseProps({ currentStep: 5, totalSteps: 6, isEditMode: false, onSubmit })} />);
    const submitBtn = screen.getByRole('button', { name: /create group/i });
    fireEvent.click(submitBtn);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows "Save Changes" submit button on the review step in edit mode', () => {
    render(<WizardNavigation {...baseProps({ currentStep: 5, totalSteps: 6, isEditMode: true })} />);
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('shows the spinner and "Creating..." text while submitting in create mode', () => {
    render(
      <WizardNavigation
        {...baseProps({ currentStep: 5, totalSteps: 6, isEditMode: false, isSubmitting: true })}
      />,
    );
    expect(screen.getByText(/creating\.\.\./i)).toBeInTheDocument();
  });

  it('shows the spinner and "Saving..." text while submitting in edit mode', () => {
    render(
      <WizardNavigation
        {...baseProps({ currentStep: 5, totalSteps: 6, isEditMode: true, isSubmitting: true })}
      />,
    );
    expect(screen.getByText(/saving\.\.\./i)).toBeInTheDocument();
  });

  it('disables Back and Cancel while submitting', () => {
    render(
      <WizardNavigation
        {...baseProps({ currentStep: 1, totalSteps: 6, isSubmitting: true })}
      />,
    );
    expect(screen.getByRole('button', { name: /back/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });

  it('enables Back and Cancel when not submitting', () => {
    render(<WizardNavigation {...baseProps({ currentStep: 1, totalSteps: 6, isSubmitting: false })} />);
    expect(screen.getByRole('button', { name: /back/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).not.toBeDisabled();
  });

  it('always renders Cancel and calls onCancel on click', () => {
    const onCancel = vi.fn();
    render(<WizardNavigation {...baseProps({ onCancel })} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables the submit button on the review step while submitting', () => {
    render(
      <WizardNavigation
        {...baseProps({ currentStep: 5, totalSteps: 6, isSubmitting: true })}
      />,
    );
    // The button now shows "Creating..." text; find it by role without name filter.
    const buttons = screen.getAllByRole('button');
    const submitBtn = buttons.find((b) => b.textContent?.match(/creating/i));
    expect(submitBtn).toBeDisabled();
  });
});
