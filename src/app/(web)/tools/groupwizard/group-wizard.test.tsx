import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent, waitFor } from '@testing-library/react';
import { useFormContext } from 'react-hook-form';
import type { GroupWizardFormData, GroupWizardLookups } from '@/components/group-wizard';
import type { ToolParams } from '@/lib/tool-params';

/**
 * Group Wizard shell tests.
 *
 * Covers:
 *  - Next button does not advance when step validation fails
 *  - Step click gating: only completed/past steps can be jumped to
 *  - "Create Another" resets form + step state after a successful submit
 *  - fetchGroupRecord failure renders the error Alert
 *  - Edit mode hydrates contact/group display maps from fetchGroupRecord
 *    (regression coverage for the TODO #1 fix)
 */

const {
  mockFetchGroupWizardLookups,
  mockFetchGroupRecord,
  mockCreateGroup,
  mockUpdateGroup,
  mockRouterBack,
} = vi.hoisted(() => ({
  mockFetchGroupWizardLookups: vi.fn(),
  mockFetchGroupRecord: vi.fn(),
  mockCreateGroup: vi.fn(),
  mockUpdateGroup: vi.fn(),
  mockRouterBack: vi.fn(),
}));

vi.mock('@/components/group-wizard/actions', () => ({
  fetchGroupWizardLookups: mockFetchGroupWizardLookups,
  fetchGroupRecord: mockFetchGroupRecord,
  createGroup: mockCreateGroup,
  updateGroup: mockUpdateGroup,
  searchContacts: vi.fn(),
  searchGroups: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: mockRouterBack,
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    forward: vi.fn(),
  }),
}));

// DevPanel renders a null in non-localhost environments but we also gate it
// behind NODE_ENV. Stub to keep the tree light.
vi.mock('@/components/dev-panel', () => ({
  DevPanel: () => null,
}));

// Stub step components — we assert shell behavior, not step internals.
// StepIdentity exposes a "fill-valid" test button that uses useFormContext
// to populate all required fields, letting us exercise the Next-button
// validation gate end-to-end without rendering real step UI.
vi.mock('@/components/group-wizard', async () => {
  const actual = await vi.importActual<typeof import('@/components/group-wizard')>(
    '@/components/group-wizard',
  );
  return {
    ...actual,
    StepIdentity: ({ lookups }: { lookups: GroupWizardLookups }) => {
      const form = useFormContext<GroupWizardFormData>();
      return (
        <div data-testid="step-identity">
          lookups-loaded:{String(!!lookups)}
          <button
            type="button"
            data-testid="fill-valid"
            onClick={() => {
              form.reset(BASE_FORM);
            }}
          >
            Fill Valid
          </button>
        </div>
      );
    },
    StepOrganization: ({
      contactDisplayMap,
      groupDisplayMap,
    }: {
      contactDisplayMap: Map<number, string>;
      groupDisplayMap: Map<number, string>;
    }) => (
      <div data-testid="step-organization">
        <span data-testid="contact-map-size">{contactDisplayMap.size}</span>
        <span data-testid="group-map-size">{groupDisplayMap.size}</span>
        {Array.from(contactDisplayMap.entries()).map(([id, name]) => (
          <span key={`c-${id}`} data-testid={`contact-name-${id}`}>
            {name}
          </span>
        ))}
        {Array.from(groupDisplayMap.entries()).map(([id, name]) => (
          <span key={`g-${id}`} data-testid={`group-name-${id}`}>
            {name}
          </span>
        ))}
      </div>
    ),
    StepMeeting: () => <div data-testid="step-meeting" />,
    StepAttributes: () => <div data-testid="step-attributes" />,
    StepSettings: () => <div data-testid="step-settings" />,
    StepReview: ({ submitResult, isEditMode, onCreateAnother, onClose }: {
      submitResult: { groupId: number; groupName: string } | null;
      isEditMode: boolean;
      onCreateAnother: () => void;
      onClose: () => void;
    }) =>
      submitResult ? (
        <div data-testid="step-review-success">
          <span>Created: {submitResult.groupName}</span>
          {!isEditMode && (
            <button type="button" onClick={onCreateAnother}>
              Create Another
            </button>
          )}
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      ) : (
        <div data-testid="step-review" />
      ),
  };
});

import { GroupWizard } from './group-wizard';

const LOOKUPS: GroupWizardLookups = {
  groupTypes: [{ id: 1, name: 'Small Group' }],
  ministries: [{ id: 1, name: 'Youth' }],
  congregations: [{ id: 1, name: 'Main' }],
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

const BASE_FORM: GroupWizardFormData = {
  Group_Name: 'Loaded Group',
  Group_Type_ID: 1,
  Description: null,
  Start_Date: '2024-01-01',
  End_Date: null,
  Reason_Ended: null,
  Congregation_ID: 1,
  Ministry_ID: 1,
  Primary_Contact: 42,
  Parent_Group: 77,
  Priority_ID: null,
  Meeting_Day_ID: null,
  Meeting_Time: null,
  Meeting_Frequency_ID: null,
  Meeting_Duration_ID: null,
  Meets_Online: false,
  Default_Meeting_Room: null,
  Offsite_Meeting_Address: null,
  Target_Size: null,
  Life_Stage_ID: null,
  Group_Focus_ID: null,
  Required_Book: null,
  SMS_Number: null,
  Group_Is_Full: false,
  Available_Online: false,
  Available_On_App: null,
  Enable_Discussion: false,
  Send_Attendance_Notification: false,
  Send_Service_Notification: false,
  Create_Next_Meeting: false,
  'Secure_Check-in': false,
  Suppress_Nametag: false,
  Suppress_Care_Note: false,
  On_Classroom_Manager: false,
  Promote_to_Group: 88,
  Age_in_Months_to_Promote: null,
  Promote_Weekly: false,
  Promote_Participants_Only: false,
  Promotion_Date: null,
  Descended_From: null,
};

describe('GroupWizard shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchGroupWizardLookups.mockResolvedValue(LOOKUPS);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders Step 1 after lookups resolve', async () => {
    const params: ToolParams = { recordID: -1 };
    render(<GroupWizard params={params} />);

    await waitFor(() => {
      expect(screen.getByTestId('step-identity')).toBeInTheDocument();
    });
    expect(mockFetchGroupWizardLookups).toHaveBeenCalledTimes(1);
  });

  it('Next button does not advance past step 0 when required fields are empty', async () => {
    const params: ToolParams = { recordID: -1 };
    render(<GroupWizard params={params} />);

    await waitFor(() => expect(screen.getByTestId('step-identity')).toBeInTheDocument());

    const nextBtn = screen.getByRole('button', { name: /next/i });
    await act(async () => {
      fireEvent.click(nextBtn);
    });

    // Still on step 0 — step 2 (organization) must not render
    expect(screen.getByTestId('step-identity')).toBeInTheDocument();
    expect(screen.queryByTestId('step-organization')).not.toBeInTheDocument();
  });

  it('step click on a non-completed future step is ignored', async () => {
    const params: ToolParams = { recordID: -1 };
    render(<GroupWizard params={params} />);

    await waitFor(() => expect(screen.getByTestId('step-identity')).toBeInTheDocument());

    // Find the stepper button for "Meeting" (index 2) — non-completed, future
    const meetingBtn = screen.getAllByRole('button').find(
      (b) => b.textContent?.includes('Meeting') && !b.textContent?.includes('Next'),
    );
    expect(meetingBtn).toBeDefined();
    // Button is disabled (isClickable=false, isCurrent=false)
    expect(meetingBtn).toBeDisabled();
  });

  it('shows the error Alert when fetchGroupRecord fails in edit mode', async () => {
    mockFetchGroupRecord.mockResolvedValueOnce({ success: false, error: 'Group not found' });
    const params: ToolParams = { recordID: 999 };
    render(<GroupWizard params={params} />);

    await waitFor(() => {
      expect(screen.getByText('Group not found')).toBeInTheDocument();
    });
    expect(mockFetchGroupRecord).toHaveBeenCalledWith(999);
    // Stepper/steps are not rendered while error Alert is showing
    expect(screen.queryByTestId('step-identity')).not.toBeInTheDocument();
  });

  it('hydrates contact + group display maps from fetchGroupRecord in edit mode', async () => {
    mockFetchGroupRecord.mockResolvedValueOnce({
      success: true,
      data: BASE_FORM,
      displayNames: {
        contacts: { 42: 'Jane Doe' },
        groups: { 77: 'Parent Group', 88: 'Promotion Target' },
      },
    });

    const params: ToolParams = { recordID: 100 };
    render(<GroupWizard params={params} />);

    // Wait for lookups + record to resolve
    await waitFor(() => expect(screen.getByTestId('step-identity')).toBeInTheDocument());

    // Click Next (step 0 → step 1). In edit mode the fields are populated from
    // BASE_FORM, so validation passes.
    const nextBtn = screen.getByRole('button', { name: /next/i });
    await act(async () => {
      fireEvent.click(nextBtn);
    });

    await waitFor(() => expect(screen.getByTestId('step-organization')).toBeInTheDocument());

    // Display maps were seeded from fetchGroupRecord.displayNames
    expect(screen.getByTestId('contact-map-size').textContent).toBe('1');
    expect(screen.getByTestId('group-map-size').textContent).toBe('2');
    expect(screen.getByTestId('contact-name-42').textContent).toBe('Jane Doe');
    expect(screen.getByTestId('group-name-77').textContent).toBe('Parent Group');
    expect(screen.getByTestId('group-name-88').textContent).toBe('Promotion Target');
  });

  it('Cancel button invokes router.back', async () => {
    const params: ToolParams = { recordID: -1 };
    render(<GroupWizard params={params} />);
    await waitFor(() => expect(screen.getByTestId('step-identity')).toBeInTheDocument());

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await act(async () => {
      fireEvent.click(cancelBtn);
    });
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('renders success screen after edit-mode Save Changes, Create Another hidden in edit mode', async () => {
    // Seed edit-mode with a fully valid record so we can walk through all
    // step-validation gates without filling inputs manually.
    mockFetchGroupRecord.mockResolvedValueOnce({
      success: true,
      data: BASE_FORM,
      displayNames: { contacts: { 42: 'Jane Doe' }, groups: {} },
    });
    mockUpdateGroup.mockResolvedValueOnce({
      success: true,
      groupId: 100,
      groupName: 'Loaded Group',
    });

    const params: ToolParams = { recordID: 100 };
    render(<GroupWizard params={params} />);
    await waitFor(() => expect(screen.getByTestId('step-identity')).toBeInTheDocument());

    // Advance through steps 0 → 5 by clicking Next five times.
    for (let i = 0; i < 5; i++) {
      const nextBtn = screen.getByRole('button', { name: /next/i });
      await act(async () => {
        fireEvent.click(nextBtn);
      });
    }

    await waitFor(() => expect(screen.getByTestId('step-review')).toBeInTheDocument());

    // In edit mode the submit button reads "Save Changes", not "Create Group"
    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    // Success screen renders with Close (no Create Another in edit mode)
    await waitFor(() => expect(screen.getByTestId('step-review-success')).toBeInTheDocument());
    expect(screen.getByText(/Created: Loaded Group/)).toBeInTheDocument();
    // Create Another is hidden in edit mode (our mock reflects that via isEditMode)
    expect(screen.queryByRole('button', { name: /create another/i })).not.toBeInTheDocument();
    expect(mockUpdateGroup).toHaveBeenCalledTimes(1);
  });

  it('Create Another resets form + step state after a successful create (new-record mode)', async () => {
    mockCreateGroup.mockResolvedValueOnce({
      success: true,
      groupId: 200,
      groupName: 'Brand New',
    });

    const params: ToolParams = { recordID: -1 };
    render(<GroupWizard params={params} />);
    await waitFor(() => expect(screen.getByTestId('step-identity')).toBeInTheDocument());

    // Use the test-only "Fill Valid" button on the mocked StepIdentity to
    // populate all required form fields via useFormContext.reset().
    await act(async () => {
      fireEvent.click(screen.getByTestId('fill-valid'));
    });

    // Walk forward through all 5 step-validation gates.
    for (let i = 0; i < 5; i++) {
      const nextBtn = screen.getByRole('button', { name: /next/i });
      await act(async () => {
        fireEvent.click(nextBtn);
      });
    }

    await waitFor(() => expect(screen.getByTestId('step-review')).toBeInTheDocument());

    const createBtn = screen.getByRole('button', { name: /create group/i });
    await act(async () => {
      fireEvent.click(createBtn);
    });

    await waitFor(() => expect(screen.getByTestId('step-review-success')).toBeInTheDocument());
    expect(mockCreateGroup).toHaveBeenCalledTimes(1);

    // Create Another IS shown in new-record mode
    const createAnotherBtn = screen.getByRole('button', { name: /create another/i });
    await act(async () => {
      fireEvent.click(createAnotherBtn);
    });

    // Reset returned to step 0 and cleared submitResult
    await waitFor(() => expect(screen.getByTestId('step-identity')).toBeInTheDocument());
    expect(screen.queryByTestId('step-review-success')).not.toBeInTheDocument();
    // The stepper should no longer show any completed steps — all 5 Next
    // buttons must be clicked again to reach review. Verify by checking
    // the Meeting step button is disabled once more (non-completed future step).
    const meetingBtn = screen.getAllByRole('button').find(
      (b) => b.textContent?.includes('Meeting') && !b.textContent?.includes('Next'),
    );
    expect(meetingBtn).toBeDisabled();
  });

  it('renders success screen after edit-mode Save Changes; Create Another hidden in edit mode', async () => {
    mockFetchGroupRecord.mockResolvedValueOnce({
      success: true,
      data: BASE_FORM,
      displayNames: { contacts: { 42: 'Jane Doe' }, groups: {} },
    });
    mockUpdateGroup.mockResolvedValueOnce({
      success: true,
      groupId: 100,
      groupName: 'Loaded Group',
    });

    const params: ToolParams = { recordID: 100 };
    render(<GroupWizard params={params} />);
    await waitFor(() => expect(screen.getByTestId('step-identity')).toBeInTheDocument());

    for (let i = 0; i < 5; i++) {
      const nextBtn = screen.getByRole('button', { name: /next/i });
      await act(async () => {
        fireEvent.click(nextBtn);
      });
    }

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => expect(screen.getByTestId('step-review-success')).toBeInTheDocument());
    expect(screen.getByText(/Created: Loaded Group/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /create another/i })).not.toBeInTheDocument();
    expect(mockUpdateGroup).toHaveBeenCalledTimes(1);
  });

  it('exposes Cancel and Next controls on step 0', async () => {
    const params: ToolParams = { recordID: -1 };
    render(<GroupWizard params={params} />);

    await waitFor(() => expect(screen.getByTestId('step-identity')).toBeInTheDocument());

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    // Back button is hidden on step 0
    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
  });
});
