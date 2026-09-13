import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StepAttributes } from './step-attributes';
import { groupWizardSchema, GROUP_WIZARD_DEFAULTS, type GroupWizardFormData } from './schema';
import type { GroupWizardLookups } from './types';

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
  groupTypes: [],
  ministries: [],
  congregations: [],
  meetingDays: [],
  meetingFrequencies: [],
  meetingDurations: [],
  lifeStages: [
    { id: 1, name: 'Adult' },
    { id: 2, name: 'Youth' },
  ],
  groupFocuses: [
    { id: 1, name: 'Study' },
    { id: 2, name: 'Support' },
  ],
  priorities: [],
  rooms: [],
  books: [
    { id: 1, name: 'Book A' },
    { id: 2, name: 'Book B' },
  ],
  smsNumbers: [
    { id: 1, name: '555-0100' },
    { id: 2, name: '555-0200' },
  ],
  groupEndedReasons: [],
};

function Harness({ overrides }: { overrides?: Partial<GroupWizardFormData> }) {
  const form = useForm<GroupWizardFormData>({
    resolver: zodResolver(groupWizardSchema),
    defaultValues: { ...GROUP_WIZARD_DEFAULTS, ...overrides } as GroupWizardFormData,
    mode: 'onTouched',
  });
  return (
    <FormProvider {...form}>
      <StepAttributes lookups={LOOKUPS} />
      <button
        type="button"
        data-testid="trigger-validate"
        onClick={() => {
          void form.trigger(['Target_Size']);
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

async function selectOption(user: ReturnType<typeof userEvent.setup>, comboboxIndex: number, optionName: string) {
  const comboboxes = screen.getAllByRole('combobox');
  await user.click(comboboxes[comboboxIndex]);
  const option = await screen.findByRole('option', { name: optionName });
  await user.click(option);
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

describe('StepAttributes', () => {
  it('renders all attribute fields', () => {
    renderStep();
    expect(screen.getByText('Group Attributes')).toBeInTheDocument();
    expect(screen.getByLabelText(/Target Size/)).toBeInTheDocument();
    expect(screen.getByText('Life Stage')).toBeInTheDocument();
    expect(screen.getByText('Group Focus')).toBeInTheDocument();
    expect(screen.getByText('Required Book')).toBeInTheDocument();
    expect(screen.getByText('SMS Number')).toBeInTheDocument();
    expect(screen.getByText('Group Is Full')).toBeInTheDocument();
  });

  it('enters a target size and converts it to a number', async () => {
    const user = userEvent.setup();
    renderStep();
    const input = screen.getByLabelText(/Target Size/);
    await user.type(input, '12');
    expect(input).toHaveValue(12);
  });

  it('clears the target size back to null', async () => {
    const user = userEvent.setup();
    renderStep({ Target_Size: 12 });
    const input = screen.getByLabelText(/Target Size/);
    await user.clear(input);
    expect(input).toHaveValue(null);
  });

  it('rejects a non-positive Target_Size on validation', async () => {
    const user = userEvent.setup();
    renderStep({ Target_Size: 0 });
    await user.click(screen.getByTestId('trigger-validate'));
    expect(await screen.findByText('Must be a positive number')).toBeInTheDocument();
  });

  it('selects a life stage', async () => {
    const user = userEvent.setup();
    renderStep();
    await selectOption(user, 0, 'Youth');
    expect(screen.getAllByRole('combobox')[0]).toHaveTextContent('Youth');
  });

  it('selects a group focus', async () => {
    const user = userEvent.setup();
    renderStep();
    await selectOption(user, 1, 'Support');
    expect(screen.getAllByRole('combobox')[1]).toHaveTextContent('Support');
  });

  it('selects a required book', async () => {
    const user = userEvent.setup();
    renderStep();
    await selectOption(user, 2, 'Book B');
    expect(screen.getAllByRole('combobox')[2]).toHaveTextContent('Book B');
  });

  it('selects an SMS number', async () => {
    const user = userEvent.setup();
    renderStep();
    await selectOption(user, 3, '555-0200');
    expect(screen.getAllByRole('combobox')[3]).toHaveTextContent('555-0200');
  });

  it('toggles Group Is Full switch', async () => {
    const user = userEvent.setup();
    renderStep();
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('data-state', 'unchecked');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('data-state', 'checked');
  });

  it('renders with Group_Is_Full already true', () => {
    renderStep({ Group_Is_Full: true });
    expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'checked');
  });

  it('renders with pre-selected lookup values', () => {
    renderStep({ Life_Stage_ID: 1, Group_Focus_ID: 2, Required_Book: 1, SMS_Number: 2 });
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes[0]).toHaveTextContent('Adult');
    expect(comboboxes[1]).toHaveTextContent('Support');
    expect(comboboxes[2]).toHaveTextContent('Book A');
    expect(comboboxes[3]).toHaveTextContent('555-0200');
  });
});
