import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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

// StepOrganization's own search UX (debounce, no-results, error states) is
// covered by contact-search.test.tsx / group-search.test.tsx directly. Here we
// only need stubs that let us drive the onSelect callbacks this step wires up.
vi.mock('./contact-search', () => ({
  ContactSearch: ({
    onSelect,
    displayName,
  }: {
    onSelect: (id: number, name: string) => void;
    displayName?: string;
  }) => (
    <div data-testid="contact-search-stub">
      <span data-testid="contact-display-name">{displayName ?? ''}</span>
      <button type="button" onClick={() => onSelect(42, 'Jane Doe')}>
        pick-contact
      </button>
    </div>
  ),
}));

vi.mock('./group-search', () => ({
  GroupSearch: ({
    onSelect,
    displayName,
    placeholder,
  }: {
    onSelect: (id: number | null, name: string) => void;
    displayName?: string;
    placeholder?: string;
  }) => (
    <div data-testid={`group-search-stub-${placeholder}`}>
      <span>{displayName ?? ''}</span>
      <button type="button" onClick={() => onSelect(77, 'Parent Group Name')}>
        pick-group
      </button>
      <button type="button" onClick={() => onSelect(null, '')}>
        clear-group
      </button>
    </div>
  ),
}));

import { StepOrganization } from './step-organization';

const LOOKUPS: GroupWizardLookups = {
  groupTypes: [],
  ministries: [
    { id: 1, name: 'Youth Ministry' },
    { id: 2, name: 'Adult Ministry' },
  ],
  congregations: [
    { id: 1, name: 'Main Campus' },
    { id: 2, name: 'East Campus' },
  ],
  meetingDays: [],
  meetingFrequencies: [],
  meetingDurations: [],
  lifeStages: [],
  groupFocuses: [],
  priorities: [
    { id: 1, name: 'High' },
    { id: 2, name: 'Low' },
  ],
  rooms: [],
  books: [],
  smsNumbers: [],
  groupEndedReasons: [],
};

function Harness({
  overrides,
  onContactSelect = vi.fn(),
  onGroupSelect = vi.fn(),
  contactDisplayMap = new Map<number, string>(),
  groupDisplayMap = new Map<number, string>(),
}: {
  overrides?: Partial<GroupWizardFormData>;
  onContactSelect?: (id: number, name: string) => void;
  onGroupSelect?: (field: string, id: number | null, name: string) => void;
  contactDisplayMap?: Map<number, string>;
  groupDisplayMap?: Map<number, string>;
}) {
  const form = useForm<GroupWizardFormData>({
    resolver: zodResolver(groupWizardSchema),
    defaultValues: { ...GROUP_WIZARD_DEFAULTS, ...overrides } as GroupWizardFormData,
    mode: 'onTouched',
  });
  return (
    <FormProvider {...form}>
      <StepOrganization
        lookups={LOOKUPS}
        contactDisplayMap={contactDisplayMap}
        groupDisplayMap={groupDisplayMap}
        onContactSelect={onContactSelect}
        onGroupSelect={onGroupSelect}
      />
      <button
        type="button"
        data-testid="trigger-validate"
        onClick={() => {
          void form.trigger(['Congregation_ID', 'Ministry_ID', 'Primary_Contact']);
        }}
      >
        validate
      </button>
    </FormProvider>
  );
}

function renderStep(props: Parameters<typeof Harness>[0] = {}) {
  return render(<Harness {...props} />);
}

async function selectOption(user: ReturnType<typeof userEvent.setup>, comboboxIndex: number, optionName: string) {
  const comboboxes = screen.getAllByRole('combobox');
  await user.click(comboboxes[comboboxIndex]);
  const option = await screen.findByRole('option', { name: optionName });
  await user.click(option);
}

describe('StepOrganization', () => {
  it('renders all organization fields', () => {
    renderStep();
    expect(screen.getByText('Organization & People')).toBeInTheDocument();
    expect(screen.getByText(/Congregation/)).toBeInTheDocument();
    expect(screen.getByText(/Ministry/)).toBeInTheDocument();
    expect(screen.getByText(/Primary Contact/)).toBeInTheDocument();
    expect(screen.getByText('Parent Group')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
  });

  it('selects a congregation', async () => {
    const user = userEvent.setup();
    renderStep();
    await selectOption(user, 0, 'East Campus');
    expect(screen.getAllByRole('combobox')[0]).toHaveTextContent('East Campus');
  });

  it('selects a ministry', async () => {
    const user = userEvent.setup();
    renderStep();
    await selectOption(user, 1, 'Adult Ministry');
    expect(screen.getAllByRole('combobox')[1]).toHaveTextContent('Adult Ministry');
  });

  it('selects a priority', async () => {
    const user = userEvent.setup();
    renderStep();
    await selectOption(user, 2, 'High');
    expect(screen.getAllByRole('combobox')[2]).toHaveTextContent('High');
  });

  it('picks a primary contact via ContactSearch and notifies the parent', async () => {
    const user = userEvent.setup();
    const onContactSelect = vi.fn();
    renderStep({ onContactSelect });
    await user.click(screen.getByText('pick-contact'));
    expect(onContactSelect).toHaveBeenCalledWith(42, 'Jane Doe');
  });

  it('picks a parent group via GroupSearch and notifies the parent with the field name', async () => {
    const user = userEvent.setup();
    const onGroupSelect = vi.fn();
    renderStep({ onGroupSelect });
    const stub = screen.getByTestId('group-search-stub-Search parent group...');
    await user.click(within(stub).getByText('pick-group'));
    expect(onGroupSelect).toHaveBeenCalledWith('Parent_Group', 77, 'Parent Group Name');
  });

  it('clears the parent group selection', async () => {
    const user = userEvent.setup();
    const onGroupSelect = vi.fn();
    renderStep({ onGroupSelect, overrides: { Parent_Group: 77 } });
    const stub = screen.getByTestId('group-search-stub-Search parent group...');
    await user.click(within(stub).getByText('clear-group'));
    expect(onGroupSelect).toHaveBeenCalledWith('Parent_Group', null, '');
  });

  it('renders the contact display name from the map', () => {
    renderStep({ contactDisplayMap: new Map([[42, 'Jane Doe']]), overrides: { Primary_Contact: 42 } });
    expect(screen.getByTestId('contact-display-name')).toHaveTextContent('Jane Doe');
  });

  it('shows required-field validation errors when validated empty', async () => {
    const user = userEvent.setup();
    renderStep();
    await user.click(screen.getByTestId('trigger-validate'));
    expect(await screen.findByText('Congregation is required')).toBeInTheDocument();
    expect(await screen.findByText('Ministry is required')).toBeInTheDocument();
    expect(await screen.findByText('Primary contact is required')).toBeInTheDocument();
  });
});
