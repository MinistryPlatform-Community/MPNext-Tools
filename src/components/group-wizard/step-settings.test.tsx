import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  groupWizardSchema,
  GROUP_WIZARD_DEFAULTS,
  type GroupWizardFormData,
} from './schema';
import type { GroupWizardLookups } from './types';

const mockOnSelect = vi.hoisted(() => vi.fn());

vi.mock('./group-search', () => ({
  GroupSearch: ({
    value,
    displayName,
    onSelect,
    placeholder,
  }: {
    value: number | null | undefined;
    displayName: string | undefined;
    onSelect: (id: number | null, name: string) => void;
    placeholder?: string;
  }) => (
    <div>
      <span data-testid={`group-search-value-${placeholder}`}>{value ?? 'none'}</span>
      <span data-testid={`group-search-display-${placeholder}`}>{displayName ?? 'none'}</span>
      <button type="button" onClick={() => onSelect(999, 'Selected Group')}>
        select-{placeholder}
      </button>
      <button type="button" onClick={() => onSelect(null, '')}>
        clear-{placeholder}
      </button>
    </div>
  ),
}));

import { StepSettings } from './step-settings';

const LOOKUPS: GroupWizardLookups = {
  groupTypes: [],
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
  groupEndedReasons: [],
};

function Harness({
  groupDisplayMap = new Map(),
  onGroupSelect = mockOnSelect,
  defaultValues,
}: {
  groupDisplayMap?: Map<number, string>;
  onGroupSelect?: (field: string, id: number | null, name: string) => void;
  defaultValues?: Partial<GroupWizardFormData>;
}) {
  const form = useForm<GroupWizardFormData>({
    resolver: zodResolver(groupWizardSchema),
    defaultValues: { ...GROUP_WIZARD_DEFAULTS, ...defaultValues },
  });
  return (
    <FormProvider {...form}>
      <StepSettings
        lookups={LOOKUPS}
        groupDisplayMap={groupDisplayMap}
        onGroupSelect={onGroupSelect}
      />
    </FormProvider>
  );
}

const SWITCH_LABELS = [
  'Available Online',
  'Available On App',
  'Enable Discussion',
  'Send Attendance Notification',
  'Send Service Notification',
  'Create Next Meeting',
  'Secure Check-in',
  'Suppress Nametag',
  'Suppress Care Note',
  'On Classroom Manager',
  'Promote Weekly',
  'Promote Participants Only',
];

describe('StepSettings', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders all switch rows unchecked by default', () => {
    render(<Harness />);
    for (const label of SWITCH_LABELS) {
      const row = screen.getByText(label).closest('div')?.parentElement;
      expect(row).toBeTruthy();
    }
    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(SWITCH_LABELS.length);
    for (const sw of switches) {
      expect(sw).toHaveAttribute('data-state', 'unchecked');
    }
  });

  it('toggles every switch row on click', () => {
    render(<Harness />);
    const switches = screen.getAllByRole('switch');
    for (const sw of switches) {
      fireEvent.click(sw);
      expect(sw).toHaveAttribute('data-state', 'checked');
    }
  });

  it('Promote_to_Group GroupSearch select updates field value and calls onGroupSelect', () => {
    const onGroupSelect = vi.fn();
    render(<Harness onGroupSelect={onGroupSelect} />);
    fireEvent.click(screen.getByText('select-Search promotion target group...'));
    expect(onGroupSelect).toHaveBeenCalledWith('Promote_to_Group', 999, 'Selected Group');
  });

  it('Promote_to_Group GroupSearch clear passes null id', () => {
    const onGroupSelect = vi.fn();
    render(<Harness onGroupSelect={onGroupSelect} />);
    fireEvent.click(screen.getByText('clear-Search promotion target group...'));
    expect(onGroupSelect).toHaveBeenCalledWith('Promote_to_Group', null, '');
  });

  it('Descended_From GroupSearch select updates field value and calls onGroupSelect', () => {
    const onGroupSelect = vi.fn();
    render(<Harness onGroupSelect={onGroupSelect} />);
    fireEvent.click(screen.getByText('select-Search original group...'));
    expect(onGroupSelect).toHaveBeenCalledWith('Descended_From', 999, 'Selected Group');
  });

  it('passes displayName from groupDisplayMap for a populated Promote_to_Group value', () => {
    const map = new Map([[42, 'Existing Promotion Group']]);
    render(<Harness groupDisplayMap={map} defaultValues={{ Promote_to_Group: 42 }} />);
    expect(
      screen.getByTestId('group-search-display-Search promotion target group...').textContent,
    ).toBe('Existing Promotion Group');
    expect(
      screen.getByTestId('group-search-value-Search promotion target group...').textContent,
    ).toBe('42');
  });

  it('passes undefined displayName when Promote_to_Group value is falsy', () => {
    render(<Harness />);
    expect(
      screen.getByTestId('group-search-display-Search promotion target group...').textContent,
    ).toBe('none');
  });

  it('Age_in_Months_to_Promote: typing a value sets a number, clearing sets null', () => {
    render(<Harness />);
    const input = screen.getByPlaceholderText('e.g., 24') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '24' } });
    expect(input.value).toBe('24');
    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');
  });

  it('Promotion_Date: typing a date sets value, clearing sets null', () => {
    render(<Harness />);
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(1);
    const input = dateInputs[0] as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2026-05-01' } });
    expect(input.value).toBe('2026-05-01');
    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');
  });

  it('renders section headings', () => {
    render(<Harness />);
    expect(screen.getByText('Settings & Promotion')).toBeInTheDocument();
    expect(screen.getByText('Visibility & Communication')).toBeInTheDocument();
    expect(screen.getByText('Check-in & Classroom')).toBeInTheDocument();
    expect(screen.getByText('Promotion')).toBeInTheDocument();
  });
});
