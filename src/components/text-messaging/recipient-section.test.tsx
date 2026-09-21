import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { RecipientSection } from './recipient-section';
import type { TextRecipientSummary } from '@/lib/dto';
import type { PageData } from '@/lib/tool-params';

// jsdom implements none of the pointer APIs Radix Select and Popover call while
// opening, and cmdk scrolls the active item into view.
beforeAll(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type Props = ComponentProps<typeof RecipientSection>;

const PAGE_DATA: PageData = {
  Page_ID: 292,
  Display_Name: 'Events',
  Singular_Name: 'Event',
  Table_Name: 'Events',
  Primary_Key: 'Event_ID',
};

function makeSummary(overrides: Partial<TextRecipientSummary> = {}): TextRecipientSummary {
  return {
    mode: 'selection',
    totalContacts: 4,
    excludedByCongregation: 0,
    excludedNoMobile: 0,
    excludedOptedOut: 0,
    requiresDoubleOptIn: false,
    excludedDuplicateNumber: 0,
    recipientContactIds: [1, 2, 3, 4],
    sampleRecipient: null,
    usedMessagingView: false,
    ...overrides,
  };
}

function defaults(): Props {
  return {
    params: { pageID: 292, s: 55, sc: 12, pageData: PAGE_DATA },
    selectionAvailable: true,
    recordAvailable: true,
    target: { mode: 'selection' },
    onTargetChange: vi.fn(),
    audiences: [
      { id: 10, label: 'Volunteers' },
      { id: 11, label: 'Staff' },
    ],
    publications: [
      { id: 20, label: 'Weekly News' },
      { id: 21, label: 'Prayer List' },
    ],
    messagingViews: [],
    congregations: [
      { id: 1, label: 'Phoenix' },
      { id: 2, label: 'Glendale' },
    ],
    allowedCongregationIds: [1, 2],
    campusScope: 'all',
    onCampusScopeChange: vi.fn(),
    congregationIds: [],
    onCongregationToggle: vi.fn(),
    summary: null,
    resolving: false,
    resolveError: null,
  };
}

function renderSection(overrides: Partial<Props> = {}): Props {
  const props = { ...defaults(), ...overrides };
  render(<RecipientSection {...props} />);
  return props;
}

async function pickFrom(comboboxName: string, optionName: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('combobox', { name: comboboxName }));
  await user.click(await screen.findByRole('option', { name: optionName }));
}

describe('RecipientSection: send-to modes', () => {
  it('offers all four modes when a selection and a record are both available', () => {
    renderSection();
    expect(screen.getByRole('radio', { name: /Selected records/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /This event/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'An audience' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Publication subscribers' })).toBeInTheDocument();
  });

  it('hides the selection and record modes when neither launch context exists', () => {
    renderSection({
      selectionAvailable: false,
      recordAvailable: false,
      target: { mode: 'audience' },
      params: {},
    });
    expect(screen.queryByRole('radio', { name: /Selected records/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /This record/ })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'An audience' })).toBeInTheDocument();
  });

  it('labels the selection with its count and page name', () => {
    renderSection();
    expect(screen.getByText('Selected records (12 from Events)')).toBeInTheDocument();
  });

  it('labels the selection with only the page name when no count was passed', () => {
    renderSection({ params: { pageID: 292, s: 55, pageData: PAGE_DATA } });
    expect(screen.getByText('Selected records (from Events)')).toBeInTheDocument();
  });

  it('falls back to a bare selection label without page data', () => {
    renderSection({ params: { pageID: 292, s: 55 } });
    expect(screen.getByText('Selected records')).toBeInTheDocument();
  });

  it('labels the record with its description', () => {
    renderSection({
      params: { pageID: 292, recordID: 7, recordDescription: 'Fall Retreat', pageData: PAGE_DATA },
    });
    expect(screen.getByText('This event: Fall Retreat')).toBeInTheDocument();
  });

  it('falls back to "This record" when the page has no singular name', () => {
    renderSection({ params: { pageID: 292, recordID: 7 } });
    expect(screen.getByText('This record')).toBeInTheDocument();
  });

  it('reports a mode change', () => {
    const props = renderSection();
    fireEvent.click(screen.getByRole('radio', { name: 'An audience' }));
    expect(props.onTargetChange).toHaveBeenCalledWith({ mode: 'audience' });
  });

  it('disables the mode radios when locked', () => {
    renderSection({ disabled: true });
    expect(screen.getByRole('radio', { name: 'An audience' })).toBeDisabled();
  });
});

describe('RecipientSection: messaging views', () => {
  const views = [
    { id: 5, label: 'Participants: Registered', subPageName: 'Participants', viewTitle: 'Registered' },
    { id: 6, label: 'Participants: Cancelled', subPageName: 'Participants', viewTitle: 'Cancelled' },
  ];

  it('is not shown when the page offers no messaging views', () => {
    renderSection();
    expect(screen.queryByText('Which contacts')).not.toBeInTheDocument();
  });

  it('is not shown for an audience send', () => {
    renderSection({ messagingViews: views, target: { mode: 'audience' } });
    expect(screen.queryByText('Which contacts')).not.toBeInTheDocument();
  });

  it('asks which contacts to text when the launching page offers views', () => {
    renderSection({ messagingViews: views });
    expect(screen.getByText('Which contacts')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Which contacts' })).toHaveTextContent(
      'Choose which contacts to text'
    );
  });

  it('keeps the launch mode when a view is picked', async () => {
    const props = renderSection({ messagingViews: views, target: { mode: 'record' } });
    await pickFrom('Which contacts', 'Participants: Cancelled');
    expect(props.onTargetChange).toHaveBeenCalledWith({ mode: 'record', messagingViewId: 6 });
  });

  it('shows the picked view', () => {
    renderSection({ messagingViews: views, target: { mode: 'selection', messagingViewId: 5 } });
    expect(screen.getByRole('combobox', { name: 'Which contacts' })).toHaveTextContent(
      'Participants: Registered'
    );
  });
});

describe('RecipientSection: audience and publication pickers', () => {
  it('picks an audience', async () => {
    const props = renderSection({ target: { mode: 'audience' } });
    expect(screen.getByRole('combobox', { name: 'Audience' })).toHaveTextContent('Choose an audience');
    await pickFrom('Audience', 'Staff');
    expect(props.onTargetChange).toHaveBeenCalledWith({ mode: 'audience', audienceId: 11 });
  });

  it('shows the already-picked audience', () => {
    renderSection({ target: { mode: 'audience', audienceId: 10 } });
    expect(screen.getByRole('combobox', { name: 'Audience' })).toHaveTextContent('Volunteers');
  });

  it('picks a publication', async () => {
    const props = renderSection({ target: { mode: 'publication' } });
    expect(screen.getByRole('combobox', { name: 'Publication' })).toHaveTextContent('Choose a publication');
    await pickFrom('Publication', 'Prayer List');
    expect(props.onTargetChange).toHaveBeenCalledWith({ mode: 'publication', publicationId: 21 });
  });

  it('shows the already-picked publication', () => {
    renderSection({ target: { mode: 'publication', publicationId: 20 } });
    expect(screen.getByRole('combobox', { name: 'Publication' })).toHaveTextContent('Weekly News');
  });

  it('shows only the picker for the active mode', () => {
    renderSection({ target: { mode: 'audience' } });
    expect(screen.queryByRole('combobox', { name: 'Publication' })).not.toBeInTheDocument();
  });
});

describe('RecipientSection: campuses', () => {
  it('counts the campuses the global filter allows', () => {
    renderSection();
    expect(screen.getByRole('radio', { name: 'All my campuses (2)' })).toBeInTheDocument();
  });

  it('offers all campuses when the sender has no global filter', () => {
    renderSection({ allowedCongregationIds: [] });
    expect(screen.getByRole('radio', { name: 'All campuses' })).toBeInTheDocument();
  });

  it('reports a switch to specific campuses', () => {
    const props = renderSection();
    fireEvent.click(screen.getByRole('radio', { name: 'Specific campuses' }));
    expect(props.onCampusScopeChange).toHaveBeenCalledWith('specific');
  });

  it('hides the multi-select while the scope is all campuses', () => {
    renderSection();
    expect(screen.queryByText('Pick one or more campuses')).not.toBeInTheDocument();
  });

  it('asks for at least one campus once the scope is specific', () => {
    renderSection({ campusScope: 'specific' });
    expect(screen.getByText('Pick one or more campuses')).toBeInTheDocument();
    expect(
      screen.getByText('Pick at least one campus, or switch back to all campuses.')
    ).toBeInTheDocument();
  });

  it('drops the hint once a campus is picked and can remove it again', () => {
    const props = renderSection({ campusScope: 'specific', congregationIds: [1] });
    expect(
      screen.queryByText('Pick at least one campus, or switch back to all campuses.')
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Phoenix' }));
    expect(props.onCongregationToggle).toHaveBeenCalledWith(1);
  });

  it('toggles a campus from the picker list', async () => {
    const user = userEvent.setup();
    const props = renderSection({ campusScope: 'specific' });
    await user.click(screen.getByRole('button', { name: /Pick one or more campuses/ }));
    await user.click(await screen.findByRole('option', { name: 'Glendale' }));
    expect(props.onCongregationToggle).toHaveBeenCalledWith(2);
  });
});

describe('RecipientSection: recipient count', () => {
  it('reports every resolved contact when nothing was excluded', () => {
    renderSection({ summary: makeSummary() });
    expect(screen.getByText(/contacts will receive this text/)).toHaveTextContent(
      '4 contacts will receive this text.'
    );
    expect(screen.queryByText(/Not included/)).not.toBeInTheDocument();
  });

  it('uses the singular for one contact', () => {
    renderSection({ summary: makeSummary({ totalContacts: 1, recipientContactIds: [9] }) });
    expect(screen.getByText(/will receive this text/)).toHaveTextContent(
      '1 contact will receive this text.'
    );
  });

  it('shows the resolved total when some contacts were excluded', () => {
    renderSection({
      summary: makeSummary({
        totalContacts: 10,
        recipientContactIds: [1, 2, 3],
        excludedByCongregation: 3,
        excludedNoMobile: 2,
        excludedOptedOut: 1,
        excludedDuplicateNumber: 1,
      }),
    });
    expect(screen.getByText(/will receive this text/)).toHaveTextContent(
      '3 of 10 contacts will receive this text.'
    );
    expect(screen.getByText(/Not included/)).toHaveTextContent(
      'Not included: 3 at other campuses, 2 with no mobile number, 1 not opted in to texting, 1 sharing a number with someone already included.'
    );
  });

  it('explains the double opt-in exclusion when the sending number requires it', () => {
    renderSection({
      summary: makeSummary({
        totalContacts: 5,
        recipientContactIds: [1, 2],
        excludedOptedOut: 3,
        requiresDoubleOptIn: true,
      }),
    });
    expect(screen.getByText(/Not included/)).toHaveTextContent(
      'Not included: 3 without double opt-in (required by this number).'
    );
  });

  it('shows a spinner while recipients resolve', () => {
    renderSection({ resolving: true, summary: makeSummary() });
    expect(screen.getByText('Finding recipients...')).toBeInTheDocument();
    expect(screen.queryByText(/will receive this text/)).not.toBeInTheDocument();
  });

  it('shows a resolve failure instead of a count', () => {
    renderSection({ resolveError: 'Selection 55 could not be read', summary: makeSummary() });
    expect(screen.getByText('Selection 55 could not be read')).toBeInTheDocument();
    expect(screen.queryByText(/will receive this text/)).not.toBeInTheDocument();
  });
});
