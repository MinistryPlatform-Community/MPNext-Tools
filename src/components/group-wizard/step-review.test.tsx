import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { GROUP_WIZARD_DEFAULTS, type GroupWizardFormData } from './schema';
import type { GroupWizardLookups } from './types';
import { StepReview } from './step-review';

const LOOKUPS: GroupWizardLookups = {
  groupTypes: [{ id: 1, name: 'Small Group' }],
  ministries: [{ id: 1, name: 'Youth' }],
  congregations: [{ id: 1, name: 'Main' }],
  meetingDays: [{ id: 1, name: 'Monday' }],
  meetingFrequencies: [{ id: 1, name: 'Weekly' }],
  meetingDurations: [{ id: 1, name: '1 hour' }],
  lifeStages: [{ id: 1, name: 'Adult' }],
  groupFocuses: [{ id: 1, name: 'Bible Study' }],
  priorities: [{ id: 1, name: 'High' }],
  rooms: [{ id: 1, name: 'Room A' }],
  books: [{ id: 1, name: 'Genesis' }],
  smsNumbers: [{ id: 1, name: '555-1234' }],
  groupEndedReasons: [{ id: 1, name: 'Completed' }],
};

const BASE_FORM: GroupWizardFormData = {
  ...GROUP_WIZARD_DEFAULTS,
  Group_Name: 'My Group',
  Group_Type_ID: 1,
  Start_Date: '2026-01-01',
  Congregation_ID: 1,
  Ministry_ID: 1,
  Primary_Contact: 42,
};

function Harness({
  defaultValues,
  onEditStep = vi.fn(),
  submitResult = null,
  isEditMode = false,
  onCreateAnother = vi.fn(),
  onClose = vi.fn(),
  contactDisplayMap = new Map<number, string>([[42, 'Jane Doe']]),
  groupDisplayMap = new Map<number, string>(),
}: {
  defaultValues?: Partial<GroupWizardFormData>;
  onEditStep?: (step: number) => void;
  submitResult?: { groupId: number; groupName: string } | null;
  isEditMode?: boolean;
  onCreateAnother?: () => void;
  onClose?: () => void;
  contactDisplayMap?: Map<number, string>;
  groupDisplayMap?: Map<number, string>;
}) {
  const form = useForm<GroupWizardFormData>({
    defaultValues: { ...BASE_FORM, ...defaultValues },
  });
  return (
    <FormProvider {...form}>
      <StepReview
        lookups={LOOKUPS}
        contactDisplayMap={contactDisplayMap}
        groupDisplayMap={groupDisplayMap}
        onEditStep={onEditStep}
        submitResult={submitResult}
        isEditMode={isEditMode}
        onCreateAnother={onCreateAnother}
        onClose={onClose}
      />
    </FormProvider>
  );
}

describe('StepReview', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('submitResult (success) branch', () => {
    it('renders "Group Created!" in create mode with Create Another button', () => {
      const onCreateAnother = vi.fn();
      const onClose = vi.fn();
      render(
        <Harness
          submitResult={{ groupId: 1, groupName: 'New Group' }}
          isEditMode={false}
          onCreateAnother={onCreateAnother}
          onClose={onClose}
        />,
      );
      expect(screen.getByText('Group Created!')).toBeInTheDocument();
      expect(screen.getByText('New Group')).toBeInTheDocument();
      const createAnotherBtn = screen.getByRole('button', { name: /create another/i });
      fireEvent.click(createAnotherBtn);
      expect(onCreateAnother).toHaveBeenCalledTimes(1);
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('renders "Group Updated!" in edit mode without Create Another button', () => {
      render(
        <Harness
          submitResult={{ groupId: 1, groupName: 'Edited Group' }}
          isEditMode={true}
        />,
      );
      expect(screen.getByText('Group Updated!')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /create another/i })).not.toBeInTheDocument();
    });
  });

  describe('review table branch', () => {
    it('renders required fields and hides optional falsy fields', () => {
      render(<Harness />);
      expect(screen.getByText('My Group')).toBeInTheDocument();
      expect(screen.getByText('Small Group')).toBeInTheDocument();
      expect(screen.getByText('2026-01-01')).toBeInTheDocument();
      // Optional fields not set should not render their labels
      expect(screen.queryByText('End Date')).not.toBeInTheDocument();
      expect(screen.queryByText('Reason Ended')).not.toBeInTheDocument();
      expect(screen.queryByText('Description')).not.toBeInTheDocument();
      expect(screen.queryByText('Parent Group')).not.toBeInTheDocument();
      expect(screen.queryByText('Priority')).not.toBeInTheDocument();
      expect(screen.queryByText('Room')).not.toBeInTheDocument();
      expect(screen.queryByText('Offsite Address')).not.toBeInTheDocument();
      expect(screen.queryByText('Target Size')).not.toBeInTheDocument();
      expect(screen.queryByText('Life Stage')).not.toBeInTheDocument();
      expect(screen.queryByText('Focus')).not.toBeInTheDocument();
      expect(screen.queryByText('Required Book')).not.toBeInTheDocument();
      expect(screen.queryByText('SMS Number')).not.toBeInTheDocument();
      expect(screen.queryByText('Promote to Group')).not.toBeInTheDocument();
      expect(screen.queryByText('Age to Promote')).not.toBeInTheDocument();
      expect(screen.queryByText('Promotion Date')).not.toBeInTheDocument();
      expect(screen.queryByText('Descended From')).not.toBeInTheDocument();
      // primary contact resolved from display map
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      // Meeting Day/Frequency/Duration resolve when unset via resolveLookup(null) -> "—"
      expect(screen.getAllByText('No').length).toBeGreaterThan(0); // Meets Online / Group Is Full: No
    });

    it('renders all optional fields when populated', () => {
      render(
        <Harness
          defaultValues={{
            End_Date: '2026-06-01',
            Reason_Ended: 1,
            Description: 'A description',
            Parent_Group: 55,
            Priority_ID: 1,
            Meeting_Day_ID: 1,
            Meeting_Time: '10:00',
            Meeting_Frequency_ID: 1,
            Meeting_Duration_ID: 1,
            Default_Meeting_Room: 1,
            Offsite_Meeting_Address: 77,
            Meets_Online: true,
            Target_Size: 12,
            Life_Stage_ID: 1,
            Group_Focus_ID: 1,
            Required_Book: 1,
            SMS_Number: 1,
            Group_Is_Full: true,
            Promote_to_Group: 88,
            Age_in_Months_to_Promote: 24,
            Promotion_Date: '2026-07-01',
            Descended_From: 99,
          }}
          groupDisplayMap={new Map([[55, 'Parent Grp'], [88, 'Promo Grp'], [99, 'Ancestor Grp']])}
        />,
      );
      expect(screen.getByText('2026-06-01')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('A description')).toBeInTheDocument();
      expect(screen.getByText('Parent Grp')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Monday')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument();
      expect(screen.getByText('Weekly')).toBeInTheDocument();
      expect(screen.getByText('1 hour')).toBeInTheDocument();
      expect(screen.getByText('Room A')).toBeInTheDocument();
      expect(screen.getByText('Address ID: 77')).toBeInTheDocument();
      expect(screen.getAllByText('Yes').length).toBeGreaterThan(0); // Meets Online / Group Is Full
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('Adult')).toBeInTheDocument();
      expect(screen.getByText('Bible Study')).toBeInTheDocument();
      expect(screen.getByText('Genesis')).toBeInTheDocument();
      expect(screen.getByText('555-1234')).toBeInTheDocument();
      expect(screen.getByText('Promo Grp')).toBeInTheDocument();
      expect(screen.getByText('24 months')).toBeInTheDocument();
      expect(screen.getByText('2026-07-01')).toBeInTheDocument();
      expect(screen.getByText('Ancestor Grp')).toBeInTheDocument();
    });

    it('falls back to "ID: <id>" when a lookup id is not found in the lookups array', () => {
      render(<Harness defaultValues={{ Priority_ID: 999 }} />);
      expect(screen.getByText('ID: 999')).toBeInTheDocument();
    });

    it('falls back to "ID: <id>" for primary contact / parent / promote group not in display map', () => {
      render(
        <Harness
          defaultValues={{ Parent_Group: 12345, Promote_to_Group: 54321, Descended_From: 11111 }}
          contactDisplayMap={new Map()}
        />,
      );
      expect(screen.getByText('ID: 42')).toBeInTheDocument(); // primary contact fallback
      expect(screen.getByText('ID: 12345')).toBeInTheDocument();
      expect(screen.getByText('ID: 54321')).toBeInTheDocument();
      expect(screen.getByText('ID: 11111')).toBeInTheDocument();
    });

    it('shows "All defaults (off)" when every boolean setting is falsy', () => {
      render(<Harness />);
      expect(screen.getByText('All defaults (off)')).toBeInTheDocument();
    });

    it('hides "All defaults (off)" and shows badges when some settings are on', () => {
      render(
        <Harness
          defaultValues={{
            Available_Online: true,
            Enable_Discussion: false,
            'Secure_Check-in': true,
          }}
        />,
      );
      expect(screen.queryByText('All defaults (off)')).not.toBeInTheDocument();
      expect(screen.getByText('Available Online')).toBeInTheDocument();
      expect(screen.getByText('Secure Check-in')).toBeInTheDocument();
      // A falsy badge (Discussion) is not rendered
      expect(screen.queryByText('Discussion')).not.toBeInTheDocument();
    });

    it('calls onEditStep with the section stepIndex when Edit is clicked', () => {
      const onEditStep = vi.fn();
      render(<Harness onEditStep={onEditStep} />);
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      // Sections in order: Identity(0), Organization(1), Meeting(2), Attributes(3), Settings(4)
      expect(editButtons).toHaveLength(5);
      fireEvent.click(editButtons[0]);
      expect(onEditStep).toHaveBeenCalledWith(0);
      fireEvent.click(editButtons[2]);
      expect(onEditStep).toHaveBeenCalledWith(2);
      fireEvent.click(editButtons[4]);
      expect(onEditStep).toHaveBeenCalledWith(4);
    });
  });
});
