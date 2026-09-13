import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StepIdentity } from './step-identity';
import { groupWizardSchema, GROUP_WIZARD_DEFAULTS, type GroupWizardFormData } from './schema';
import type { GroupWizardLookups } from './types';

// Radix Select relies on pointer-capture / scrollIntoView APIs jsdom does not
// implement — stub them so the popover content actually opens in tests.
beforeEach(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture || (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture || (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const LOOKUPS: GroupWizardLookups = {
  groupTypes: [
    { id: 1, name: 'Small Group' },
    { id: 2, name: 'Class' },
  ],
  ministries: [],
  congregations: [],
  meetingDays: [],
  meetingFrequencies: [],
  meetingDurations: [],
  lifeStages: [],
  groupFocuses: [],
  priorities: [],
  rooms: [],
  books: [],
  smsNumbers: [],
  groupEndedReasons: [
    { id: 1, name: 'Moved' },
    { id: 2, name: 'Disbanded' },
  ],
};

function Harness({ overrides }: { overrides?: Partial<GroupWizardFormData> }) {
  const form = useForm<GroupWizardFormData>({
    resolver: zodResolver(groupWizardSchema),
    defaultValues: { ...GROUP_WIZARD_DEFAULTS, ...overrides } as GroupWizardFormData,
    mode: 'onTouched',
  });
  return (
    <FormProvider {...form}>
      <StepIdentity lookups={LOOKUPS} />
      <button
        type="button"
        data-testid="trigger-validate"
        onClick={() => {
          void form.trigger(['Group_Name', 'Group_Type_ID', 'Start_Date']);
        }}
      >
        validate
      </button>
    </FormProvider>
  );
}

function renderStep(overrides?: Partial<GroupWizardFormData>) {
  return render(<Harness overrides={overrides} />);
}

/**
 * These tests deliberately drive failure paths, and the code under test logs
 * them on purpose. Silence the channel so a real, unexpected error still
 * stands out in the runner output instead of drowning in expected noise.
 * `mockImplementation` keeps the spy recording, so assertions on what was
 * logged still work.
 */
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('StepIdentity', () => {
  it('renders the core identity fields', () => {
    renderStep();
    expect(screen.getByText('Group Identity')).toBeInTheDocument();
    expect(screen.getByLabelText(/Group Name/)).toBeInTheDocument();
    expect(screen.getByText(/Group Type/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Start Date/)).toBeInTheDocument();
    expect(screen.getByLabelText(/End Date/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
  });

  it('does not render Reason_Ended when End_Date is empty', () => {
    renderStep();
    expect(screen.queryByText('Reason Ended')).not.toBeInTheDocument();
  });

  it('renders Reason_Ended once End_Date is set', async () => {
    const user = userEvent.setup();
    renderStep();
    const endDate = screen.getByLabelText(/End Date/);
    await user.type(endDate, '2026-01-01');
    expect(screen.getByText('Reason Ended')).toBeInTheDocument();
  });

  it('lets the user type a group name', async () => {
    const user = userEvent.setup();
    renderStep();
    const nameInput = screen.getByLabelText(/Group Name/);
    await user.type(nameInput, 'Youth Group');
    expect(nameInput).toHaveValue('Youth Group');
  });

  it('shows a validation error when Group_Name is empty and validated', async () => {
    const user = userEvent.setup();
    renderStep({ Group_Name: '', Start_Date: '2026-01-01', Group_Type_ID: 1 });
    await user.click(screen.getByTestId('trigger-validate'));
    expect(await screen.findByText('Group name is required')).toBeInTheDocument();
  });

  it('shows a validation error when Start_Date is empty and validated', async () => {
    const user = userEvent.setup();
    renderStep({ Group_Name: 'Valid', Start_Date: '', Group_Type_ID: 1 });
    await user.click(screen.getByTestId('trigger-validate'));
    expect(await screen.findByText('Start date is required')).toBeInTheDocument();
  });

  it('selects a Group Type from the dropdown', async () => {
    const user = userEvent.setup();
    renderStep();
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    const option = await screen.findByRole('option', { name: 'Class' });
    await user.click(option);
    expect(screen.getByRole('combobox')).toHaveTextContent('Class');
  });

  it('selects a Reason Ended value once the field is shown', async () => {
    const user = userEvent.setup();
    renderStep({ End_Date: '2026-01-01' });
    const comboboxes = screen.getAllByRole('combobox');
    // Second combobox is Reason Ended (first is Group Type)
    const reasonTrigger = comboboxes[1];
    await user.click(reasonTrigger);
    const option = await screen.findByRole('option', { name: 'Disbanded' });
    await user.click(option);
    expect(reasonTrigger).toHaveTextContent('Disbanded');
  });

  it('clears End_Date back to null when the input is cleared', async () => {
    const user = userEvent.setup();
    renderStep({ End_Date: '2026-01-01' });
    const endDate = screen.getByLabelText(/End Date/);
    await user.clear(endDate);
    expect(screen.queryByText('Reason Ended')).not.toBeInTheDocument();
  });

  it('lets the user type a description', async () => {
    const user = userEvent.setup();
    renderStep();
    const desc = screen.getByLabelText(/Description/);
    await user.type(desc, 'A weekly gathering');
    expect(desc).toHaveValue('A weekly gathering');
  });

  it('clears the description back to null when emptied', async () => {
    const user = userEvent.setup();
    renderStep({ Description: 'Existing text' });
    const desc = screen.getByLabelText(/Description/);
    await user.clear(desc);
    expect(desc).toHaveValue('');
  });

  it('renders with an existing Group_Type_ID selected', () => {
    renderStep({ Group_Type_ID: 2 });
    expect(screen.getByRole('combobox')).toHaveTextContent('Class');
  });

  it('uses within() to scope the identity heading section', () => {
    renderStep();
    const heading = screen.getByText('Group Identity').closest('div');
    expect(heading).not.toBeNull();
    if (heading) {
      expect(within(heading).getByText('Group Identity')).toBeInTheDocument();
    }
  });
});
