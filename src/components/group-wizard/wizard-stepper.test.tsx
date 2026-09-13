import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { WizardStepper } from './wizard-stepper';
import { WIZARD_STEPS } from './types';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('WizardStepper', () => {
  it('calls onStepClick when a completed step button is clicked', () => {
    const onStepClick = vi.fn();
    render(
      <WizardStepper currentStep={2} completedSteps={new Set([0, 1])} onStepClick={onStepClick} />,
    );
    // Step 0 ("Identity") is completed → clickable
    const identityBtn = screen.getAllByRole('button').find((b) => b.textContent?.includes(WIZARD_STEPS[0].label));
    expect(identityBtn).toBeDefined();
    fireEvent.click(identityBtn!);
    expect(onStepClick).toHaveBeenCalledWith(0);
  });

  it('does not call onStepClick for a future, non-completed step (not clickable)', () => {
    const onStepClick = vi.fn();
    render(
      <WizardStepper currentStep={1} completedSteps={new Set([0])} onStepClick={onStepClick} />,
    );
    // Step 3 ("Attributes") is neither completed nor before currentStep
    const futureBtn = screen.getAllByRole('button').find((b) => b.textContent?.includes(WIZARD_STEPS[3].label));
    expect(futureBtn).toBeDefined();
    expect(futureBtn).toBeDisabled();
    fireEvent.click(futureBtn!);
    expect(onStepClick).not.toHaveBeenCalled();
  });

  it('calls onStepClick for a step before currentStep even if not marked completed', () => {
    const onStepClick = vi.fn();
    // currentStep is 3; step 1 is before currentStep but NOT in completedSteps.
    render(
      <WizardStepper currentStep={3} completedSteps={new Set()} onStepClick={onStepClick} />,
    );
    const orgBtn = screen.getAllByRole('button').find((b) => b.textContent?.includes(WIZARD_STEPS[1].label));
    expect(orgBtn).toBeDefined();
    fireEvent.click(orgBtn!);
    expect(onStepClick).toHaveBeenCalledWith(1);
  });

  it('renders the connector line styled for a completed segment vs an incomplete one', () => {
    const { container } = render(
      <WizardStepper currentStep={2} completedSteps={new Set([0])} onStepClick={vi.fn()} />,
    );
    const connectors = container.querySelectorAll('nav li > div');
    expect(connectors.length).toBeGreaterThan(0);
    // First connector (after completed step 0) should carry bg-primary
    expect(connectors[0].className).toContain('bg-primary');
  });

  it('renders the current step as a ring-highlighted, non-completed circle', () => {
    render(<WizardStepper currentStep={1} completedSteps={new Set()} onStepClick={vi.fn()} />);
    // Current step shows its 1-based index number, not a check mark
    const currentBtn = screen.getAllByRole('button').find((b) => b.textContent?.includes(WIZARD_STEPS[1].label));
    expect(currentBtn?.textContent).toContain('2');
  });

  it('renders the mobile stepper current label, step count, and progress width', () => {
    const { container } = render(
      <WizardStepper currentStep={2} completedSteps={new Set([0, 1])} onStepClick={vi.fn()} />,
    );
    const mobile = container.querySelector('.md\\:hidden') as HTMLElement;
    expect(mobile).toBeTruthy();
    expect(within(mobile).getByText(WIZARD_STEPS[2].label)).toBeInTheDocument();
    expect(within(mobile).getByText(`Step 3 of ${WIZARD_STEPS.length}`)).toBeInTheDocument();
    expect(within(mobile).getByText(WIZARD_STEPS[2].description)).toBeInTheDocument();

    const progressBar = container.querySelector('.md\\:hidden .bg-primary') as HTMLElement;
    expect(progressBar).toBeTruthy();
    expect(progressBar.style.width).toBe(`${((2 + 1) / WIZARD_STEPS.length) * 100}%`);
  });

  it('disables a button that is neither clickable nor current', () => {
    render(<WizardStepper currentStep={0} completedSteps={new Set()} onStepClick={vi.fn()} />);
    const lastBtn = screen.getAllByRole('button').find((b) =>
      b.textContent?.includes(WIZARD_STEPS[WIZARD_STEPS.length - 1].label),
    );
    expect(lastBtn).toBeDisabled();
  });
});
