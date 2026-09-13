import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StepMeeting } from './step-meeting';
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
  meetingDays: [
    { id: 1, name: 'Sunday' },
    { id: 2, name: 'Monday' },
  ],
  meetingFrequencies: [
    { id: 1, name: 'Weekly' },
    { id: 2, name: 'Biweekly' },
  ],
  meetingDurations: [
    { id: 1, name: '1 hour' },
    { id: 2, name: '2 hours' },
  ],
  lifeStages: [],
  groupFocuses: [],
  priorities: [],
  rooms: [
    { id: 1, name: 'Room A' },
    { id: 2, name: 'Room B' },
  ],
  books: [],
  smsNumbers: [],
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
      <StepMeeting lookups={LOOKUPS} />
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

describe('StepMeeting', () => {
  it('renders all meeting fields', () => {
    renderStep();
    expect(screen.getByText('Meeting Schedule')).toBeInTheDocument();
    expect(screen.getByText('Meeting Day')).toBeInTheDocument();
    expect(screen.getByLabelText(/Meeting Time/)).toBeInTheDocument();
    expect(screen.getByText('Meeting Frequency')).toBeInTheDocument();
    expect(screen.getByText('Meeting Duration')).toBeInTheDocument();
    expect(screen.getByLabelText(/Default Meeting Room/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Offsite Meeting Address/)).toBeInTheDocument();
    expect(screen.getByText('Meets Online')).toBeInTheDocument();
  });

  it('selects a meeting day', async () => {
    const user = userEvent.setup();
    renderStep();
    await selectOption(user, 0, 'Monday');
    expect(screen.getAllByRole('combobox')[0]).toHaveTextContent('Monday');
  });

  it('selects a meeting frequency', async () => {
    const user = userEvent.setup();
    renderStep();
    await selectOption(user, 1, 'Biweekly');
    expect(screen.getAllByRole('combobox')[1]).toHaveTextContent('Biweekly');
  });

  it('selects a meeting duration', async () => {
    const user = userEvent.setup();
    renderStep();
    await selectOption(user, 2, '2 hours');
    expect(screen.getAllByRole('combobox')[2]).toHaveTextContent('2 hours');
  });

  it('selects a default meeting room', async () => {
    const user = userEvent.setup();
    renderStep();
    await selectOption(user, 3, 'Room B');
    expect(screen.getAllByRole('combobox')[3]).toHaveTextContent('Room B');
  });

  it('sets a meeting time', async () => {
    const user = userEvent.setup();
    renderStep();
    const time = screen.getByLabelText(/Meeting Time/);
    await user.type(time, '09:30');
    expect(time).toHaveValue('09:30');
  });

  it('enters a numeric offsite address and converts to a number', async () => {
    const user = userEvent.setup();
    renderStep();
    const addr = screen.getByLabelText(/Offsite Meeting Address/);
    await user.type(addr, '55');
    expect(addr).toHaveValue(55);
  });

  it('clears the offsite address back to empty/null', async () => {
    const user = userEvent.setup();
    renderStep({ Offsite_Meeting_Address: 55 });
    const addr = screen.getByLabelText(/Offsite Meeting Address/);
    await user.clear(addr);
    expect(addr).toHaveValue(null);
  });

  it('toggles Meets Online switch on', async () => {
    const user = userEvent.setup();
    renderStep();
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('data-state', 'unchecked');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('data-state', 'checked');
  });

  it('renders with a pre-set meeting time value', () => {
    renderStep({ Meeting_Time: '14:00' });
    expect(screen.getByLabelText(/Meeting Time/)).toHaveValue('14:00');
  });

  it('renders with Meets_Online already true', () => {
    renderStep({ Meets_Online: true });
    expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'checked');
  });
});
