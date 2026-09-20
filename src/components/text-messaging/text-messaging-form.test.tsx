import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextMessagingForm } from './text-messaging-form';
import type { PreparedAttachment } from './image-utils';
import type { TextRecipientSummary, TextToolConfig } from '@/lib/dto';
import type { PageData, ToolParams } from '@/lib/tool-params';

const mocks = vi.hoisted(() => ({
  getTextToolConfig: vi.fn(),
  resolveTextRecipients: vi.fn(),
  createTextCommunication: vi.fn(),
  sendTextChunk: vi.fn(),
  finalizeTextCommunication: vi.fn(),
  rewriteTextForSms: vi.fn(),
  useMessagingCollisions: vi.fn(),
  summarizeCollisions: vi.fn(),
  prepareAttachment: vi.fn(),
}));

vi.mock('./actions', () => ({
  getTextToolConfig: mocks.getTextToolConfig,
  resolveTextRecipients: mocks.resolveTextRecipients,
  createTextCommunication: mocks.createTextCommunication,
  sendTextChunk: mocks.sendTextChunk,
  finalizeTextCommunication: mocks.finalizeTextCommunication,
  rewriteTextForSms: mocks.rewriteTextForSms,
}));

// The collision module reaches its own server action, and its panel is covered by its
// own suite; the pure utilities the form uses are left real.
vi.mock('@/components/messaging-collision', () => ({
  useMessagingCollisions: mocks.useMessagingCollisions,
  summarizeCollisions: mocks.summarizeCollisions,
  MessagingCollisionPanel: () => null,
}));

// Only the canvas pipeline is stubbed: jsdom has no 2d context. `canShrinkAttachment`
// and `formatBytes` stay real.
vi.mock('./image-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./image-utils')>();
  return { ...actual, prepareAttachment: mocks.prepareAttachment };
});

beforeAll(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
});

const PAGE_DATA: PageData = {
  Page_ID: 292,
  Display_Name: 'Events',
  Singular_Name: 'Event',
  Table_Name: 'Events',
  Primary_Key: 'Event_ID',
};

const SELECTION_PARAMS: ToolParams = { pageID: 292, s: 55, sc: 3, pageData: PAGE_DATA };
const PLAIN_PARAMS: ToolParams = {};

function makeConfig(overrides: Partial<TextToolConfig> = {}): TextToolConfig {
  return {
    quota: { limit: 1000, roleNames: ['Communications'] },
    timeZone: 'America/Phoenix',
    aiWriterEnabled: false,
    curfew: null,
    approvalProcessConfigured: true,
    smsNumbers: [
      {
        id: 1,
        label: 'Main line',
        number: '(602) 555-0100',
        senderLabel: 'Dream City',
        congregationId: null,
        costPerSegment: 0.01,
        isDefault: true,
      },
      {
        id: 2,
        label: 'Youth line',
        number: '(602) 555-0101',
        senderLabel: null,
        congregationId: null,
        costPerSegment: null,
        isDefault: false,
      },
    ],
    audiences: [
      { id: 10, label: 'Volunteers' },
      { id: 11, label: 'Staff' },
    ],
    publications: [{ id: 20, label: 'Weekly News' }],
    messagingViews: [],
    congregations: [
      { id: 1, label: 'Phoenix' },
      { id: 2, label: 'Glendale' },
    ],
    allowedCongregationIds: [1, 2],
    mergeFields: [
      { token: 'Nickname', label: 'Nickname', sample: 'Sam' },
      { token: 'First_Name', label: 'First Name', sample: 'Samuel' },
    ],
    pricing: { defaultCostPerSegment: 0.0075, mmsCostPerMessage: 0.02, segmentsPerSecond: 10 },
    limits: {
      maxImageWidth: 1200,
      compactImageWidth: 640,
      maxAttachmentBytes: 5 * 1024 * 1024,
      recommendedAttachmentBytes: 1024 * 1024,
    },
    ...overrides,
  };
}

function makeSummary(count: number, overrides: Partial<TextRecipientSummary> = {}): TextRecipientSummary {
  return {
    mode: 'selection',
    totalContacts: count,
    excludedByCongregation: 0,
    excludedNoMobile: 0,
    excludedOptedOut: 0,
    excludedDuplicateNumber: 0,
    recipientContactIds: Array.from({ length: count }, (_, i) => i + 1),
    sampleRecipient:
      count > 0
        ? {
            contactId: 1,
            displayName: 'Rivera, Samuel',
            mobilePhone: '6025550142',
            mergeValues: { Nickname: 'Sam' },
          }
        : null,
    usedMessagingView: false,
    ...overrides,
  };
}

function makeAttachment(overrides: Partial<PreparedAttachment> = {}): PreparedAttachment {
  const file = new File(['x'.repeat(32)], 'flyer.jpg', { type: 'image/jpeg' });
  return {
    file,
    width: 1200,
    height: 800,
    resized: true,
    originalBytes: 8192,
    warning: null,
    source: file,
    maxWidth: 1200,
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const NO_COLLISIONS = { result: null, loading: false, error: null, refresh: vi.fn() };

beforeEach(() => {
  mocks.getTextToolConfig.mockResolvedValue({ success: true, config: makeConfig() });
  mocks.resolveTextRecipients.mockResolvedValue({ success: true, summary: makeSummary(3) });
  mocks.createTextCommunication.mockResolvedValue({
    success: true,
    communicationId: 77,
    startDate: '2026-09-20 09:00:00',
    attachmentFileId: null,
  });
  mocks.sendTextChunk.mockImplementation(async (input: { contactIds: number[] }) => ({
    success: true,
    createdCount: input.contactIds.length,
    skippedCount: 0,
  }));
  mocks.finalizeTextCommunication.mockResolvedValue({
    success: true,
    communicationId: 77,
    outcome: 'ready_to_send',
    messageCount: 3,
    quotaLimit: 1000,
  });
  mocks.useMessagingCollisions.mockReturnValue(NO_COLLISIONS);
  mocks.summarizeCollisions.mockReturnValue(null);
  mocks.prepareAttachment.mockResolvedValue(makeAttachment());
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:preview');
  globalThis.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  // reset, not clear: several tests queue one-shot implementations, and beforeEach
  // rebuilds every mock from scratch.
  vi.resetAllMocks();
});

async function renderForm(params: ToolParams = SELECTION_PARAMS) {
  const utils = render(<TextMessagingForm params={params} />);
  await screen.findByText('Review and send');
  return utils;
}

function typeBody(value: string) {
  fireEvent.change(screen.getByLabelText('Message'), { target: { value } });
}

/** The muted line the Review card shows beside the disabled send button. */
function blockedReason() {
  return screen.findByText(
    (_content, element) =>
      element?.tagName === 'SPAN' &&
      element.className.includes('text-xs') &&
      element.className.includes('text-muted-foreground') &&
      element.textContent !== '' &&
      element.previousElementSibling?.tagName === 'BUTTON'
  );
}

/** The recipient count sits in a nested span, so match the line and read its text. */
async function expectRecipientLine(text: string) {
  await waitFor(() => expect(screen.getByText(/will receive this text/)).toHaveTextContent(text));
}

async function expectBlockedBy(reason: string) {
  const span = await blockedReason();
  expect(span).toHaveTextContent(reason);
}

async function confirmSend(label: string) {
  fireEvent.click(screen.getByRole('button', { name: label }));
  const dialog = await screen.findByRole('alertdialog');
  fireEvent.click(within(dialog).getByRole('button', { name: label }));
}

describe('TextMessagingForm: loading the config', () => {
  it('shows a spinner until the config arrives', async () => {
    const pending = deferred<unknown>();
    mocks.getTextToolConfig.mockReturnValue(pending.promise);
    render(<TextMessagingForm params={SELECTION_PARAMS} />);
    expect(screen.getByText('Loading the text messaging tool...')).toBeInTheDocument();

    pending.resolve({ success: true, config: makeConfig() });
    expect(await screen.findByText('Review and send')).toBeInTheDocument();
  });

  it('shows the error when the config cannot be read', async () => {
    mocks.getTextToolConfig.mockResolvedValue({ success: false, error: 'Not authorized to text' });
    render(<TextMessagingForm params={SELECTION_PARAMS} />);
    expect(await screen.findByText('Not authorized to text')).toBeInTheDocument();
    expect(screen.queryByText('Review and send')).not.toBeInTheDocument();
  });

  it('drops a config that arrives after the tool is closed', async () => {
    const pending = deferred<unknown>();
    mocks.getTextToolConfig.mockReturnValue(pending.promise);
    const { unmount } = render(<TextMessagingForm params={SELECTION_PARAMS} />);
    unmount();

    pending.resolve({ success: true, config: makeConfig() });
    await waitFor(() => expect(mocks.getTextToolConfig).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Review and send')).not.toBeInTheDocument();
  });

  it('renders the recipient, message and review cards once loaded', async () => {
    await renderForm();
    expect(screen.getByText('Recipients')).toBeInTheDocument();
    expect(screen.getByText('Message')).toBeInTheDocument();
    expect(screen.getByText('Cost and timing')).toBeInTheDocument();
    expect(screen.getByText('Review and send')).toBeInTheDocument();
  });
});

describe('TextMessagingForm: resolving recipients', () => {
  it('resolves the launching selection on mount', async () => {
    await renderForm();
    await waitFor(() => expect(mocks.resolveTextRecipients).toHaveBeenCalledTimes(1));
    expect(mocks.resolveTextRecipients).toHaveBeenCalledWith(
      SELECTION_PARAMS,
      { mode: 'selection', congregationIds: [] },
      []
    );
    expect(await screen.findByText(/will receive this text/)).toHaveTextContent(
      '3 contacts will receive this text.'
    );
  });

  it('starts on the single open record when there is no selection', async () => {
    await renderForm({ pageID: 292, recordID: 8, recordDescription: 'Fall Retreat', pageData: PAGE_DATA });
    await waitFor(() =>
      expect(mocks.resolveTextRecipients).toHaveBeenCalledWith(
        expect.anything(),
        { mode: 'record', congregationIds: [] },
        []
      )
    );
  });

  it('re-resolves when the campus scope narrows', async () => {
    const user = userEvent.setup();
    await renderForm();
    await waitFor(() => expect(mocks.resolveTextRecipients).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('radio', { name: 'Specific campuses' }));
    await expectBlockedBy('Pick at least one campus');
    expect(mocks.resolveTextRecipients).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /Pick one or more campuses/ }));
    await user.click(await screen.findByRole('option', { name: 'Glendale' }));

    await waitFor(() =>
      expect(mocks.resolveTextRecipients).toHaveBeenLastCalledWith(
        expect.anything(),
        { mode: 'selection', congregationIds: [2] },
        []
      )
    );

    fireEvent.click(screen.getByRole('radio', { name: 'All my campuses (2)' }));
    await waitFor(() =>
      expect(mocks.resolveTextRecipients).toHaveBeenLastCalledWith(
        expect.anything(),
        { mode: 'selection', congregationIds: [] },
        []
      )
    );
  });

  it('re-resolves when the draft gains a page-specific placeholder', async () => {
    await renderForm();
    await waitFor(() => expect(mocks.resolveTextRecipients).toHaveBeenCalledTimes(1));

    typeBody('Hi [Nickname]');
    await waitFor(() => expect(screen.getByLabelText('Message')).toHaveValue('Hi [Nickname]'));
    expect(mocks.resolveTextRecipients).toHaveBeenCalledTimes(1);

    typeBody('Hi [Nickname], see you at [Event_Title]');
    await waitFor(() =>
      expect(mocks.resolveTextRecipients).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), [
        'Nickname',
        'Event_Title',
      ])
    );
  });

  it('ignores a stale resolve that lands after a newer one', async () => {
    const user = userEvent.setup();
    const slow = deferred<unknown>();
    mocks.resolveTextRecipients
      .mockReturnValueOnce(slow.promise)
      .mockResolvedValueOnce({ success: true, summary: makeSummary(7) });

    await renderForm(PLAIN_PARAMS);
    await user.click(screen.getByRole('combobox', { name: 'Audience' }));
    await user.click(await screen.findByRole('option', { name: 'Volunteers' }));
    await waitFor(() => expect(mocks.resolveTextRecipients).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('combobox', { name: 'Audience' }));
    await user.click(await screen.findByRole('option', { name: 'Staff' }));
    await expectRecipientLine('7 contacts will receive this text.');

    slow.resolve({ success: true, summary: makeSummary(3) });
    await waitFor(() => expect(screen.getByText(/will receive this text/)).toHaveTextContent('7 contacts'));
    expect(screen.getByText(/will receive this text/)).not.toHaveTextContent('3 contacts');
  });

  it('shows a resolve failure', async () => {
    mocks.resolveTextRecipients.mockResolvedValue({ success: false, error: 'Selection 55 is empty' });
    await renderForm();
    expect(await screen.findByText('Selection 55 is empty')).toBeInTheDocument();
  });
});

describe('TextMessagingForm: what blocks a send', () => {
  it('waits while recipients are still resolving', async () => {
    const pending = deferred<unknown>();
    mocks.resolveTextRecipients.mockReturnValue(pending.promise);
    await renderForm();
    await expectBlockedBy('Resolving recipients...');
    pending.resolve({ success: true, summary: makeSummary(3) });
    await screen.findByText(/will receive this text/);
  });

  it('asks which contacts to text when the page offers messaging views', async () => {
    const user = userEvent.setup();
    mocks.getTextToolConfig.mockResolvedValue({
      success: true,
      config: makeConfig({
        messagingViews: [
          { id: 5, label: 'Participants: Registered', subPageName: 'Participants', viewTitle: 'Registered' },
        ],
      }),
    });
    await renderForm();
    await expectBlockedBy('Choose which contacts to text');
    expect(mocks.resolveTextRecipients).not.toHaveBeenCalled();

    await user.click(screen.getByRole('combobox', { name: 'Which contacts' }));
    await user.click(await screen.findByRole('option', { name: 'Participants: Registered' }));
    await waitFor(() =>
      expect(mocks.resolveTextRecipients).toHaveBeenCalledWith(
        expect.anything(),
        { mode: 'selection', messagingViewId: 5, congregationIds: [] },
        []
      )
    );
  });

  it('asks for recipients before an audience is picked', async () => {
    await renderForm(PLAIN_PARAMS);
    await expectBlockedBy('Choose recipients first');
    expect(mocks.resolveTextRecipients).not.toHaveBeenCalled();
  });

  it('blocks when nobody in the source can be texted', async () => {
    mocks.resolveTextRecipients.mockResolvedValue({ success: true, summary: makeSummary(0) });
    await renderForm();
    await expectBlockedBy('No recipients can receive a text');
  });

  it('blocks a no-quota sender when the church has no approval process', async () => {
    mocks.getTextToolConfig.mockResolvedValue({
      success: true,
      config: makeConfig({ quota: { limit: null, roleNames: [] }, approvalProcessConfigured: false }),
    });
    await renderForm();
    await expectBlockedBy('Your account has no texting limit and this church has no approval process');
  });

  it('blocks an over-quota send when the church has no approval process', async () => {
    mocks.getTextToolConfig.mockResolvedValue({
      success: true,
      config: makeConfig({
        quota: { limit: 2, roleNames: ['Staff'] },
        approvalProcessConfigured: false,
      }),
    });
    await renderForm();
    await expectBlockedBy('Over your limit of 2; this church has no approval process');
  });

  it('blocks when the sender has no texting number', async () => {
    mocks.getTextToolConfig.mockResolvedValue({ success: true, config: makeConfig({ smsNumbers: [] }) });
    await renderForm();
    await expectBlockedBy('Choose a number to send from');
  });

  it('blocks an empty message', async () => {
    await renderForm();
    await expectBlockedBy('Enter a message');
  });

  it('blocks a message over the carrier limit', async () => {
    await renderForm();
    typeBody('a'.repeat(501));
    await expectBlockedBy('Message is too long');
  });

  it('blocks until a scheduled date and time is picked', async () => {
    await renderForm();
    typeBody('Hello');
    fireEvent.click(screen.getByRole('radio', { name: 'Schedule for later' }));
    await expectBlockedBy('Pick a date and time to schedule');
  });

  it('blocks a scheduled time in the past', async () => {
    await renderForm();
    typeBody('Hello');
    fireEvent.click(screen.getByRole('radio', { name: 'Schedule for later' }));
    fireEvent.change(await screen.findByLabelText('Send at'), { target: { value: '2020-01-01T09:00' } });
    await expectBlockedBy('That time has already passed');
    expect(screen.getAllByText('That time has already passed').length).toBeGreaterThan(1);
  });

  it('blocks a scheduled value the zone converter cannot read', async () => {
    await renderForm();
    typeBody('Hello');
    fireEvent.click(screen.getByRole('radio', { name: 'Schedule for later' }));
    fireEvent.change(await screen.findByLabelText('Send at'), {
      target: { value: '2099-06-01T09:00:00.500' },
    });
    await expectBlockedBy('That date and time is not valid');
  });

  it('requires an override to send during quiet hours', async () => {
    mocks.getTextToolConfig.mockResolvedValue({
      success: true,
      // A window that wraps past every wall-clock minute but one.
      config: makeConfig({ curfew: { start: '12:00', end: '11:59' } }),
    });
    await renderForm();
    typeBody('Hello');
    await expectBlockedBy('Confirm sending during quiet hours');
    expect(screen.getByText('Sending during quiet hours')).toBeInTheDocument();

    fireEvent.click(
      screen.getByLabelText('I understand and want to deliver this text outside of messaging quiet hours.')
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send text' })).toBeEnabled());
  });

  it('re-arms the quiet hours override when the schedule changes', async () => {
    mocks.getTextToolConfig.mockResolvedValue({
      success: true,
      config: makeConfig({ curfew: { start: '12:00', end: '11:59' } }),
    });
    await renderForm();
    typeBody('Hello');
    fireEvent.click(
      screen.getByLabelText('I understand and want to deliver this text outside of messaging quiet hours.')
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send text' })).toBeEnabled());

    fireEvent.click(screen.getByRole('radio', { name: 'Schedule for later' }));
    fireEvent.change(await screen.findByLabelText('Send at'), { target: { value: '2099-06-01T09:00' } });
    await expectBlockedBy('Confirm sending during quiet hours');
  });

  it('clears every block for a ready draft', async () => {
    await renderForm();
    typeBody('Hello everyone');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send text' })).toBeEnabled());
  });
});

describe('TextMessagingForm: AI rewrite', () => {
  it('is offered only when the church has AI writing configured', async () => {
    await renderForm();
    expect(screen.queryByRole('button', { name: /AI rewrite/ })).not.toBeInTheDocument();

    cleanup();
    mocks.getTextToolConfig.mockResolvedValue({ success: true, config: makeConfig({ aiWriterEnabled: true }) });
    await renderForm();
    expect(screen.getByRole('button', { name: /AI rewrite/ })).toBeInTheDocument();
  });
});

describe('TextMessagingForm: the attachment', () => {
  function pickFile(name = 'flyer.jpg') {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], name, { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });
    return file;
  }

  it('prepares a picked image and shows the chip', async () => {
    const pending = deferred<PreparedAttachment>();
    mocks.prepareAttachment.mockReturnValue(pending.promise);
    await renderForm();
    typeBody('Hello');

    const file = pickFile();
    await expectBlockedBy('Preparing the image...');
    expect(mocks.prepareAttachment).toHaveBeenCalledWith(file, {
      maxWidth: 1200,
      maxBytes: 5 * 1024 * 1024,
    });

    pending.resolve(makeAttachment());
    expect(await screen.findByText('flyer.jpg')).toBeInTheDocument();
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
  });

  it('re-prepares the source file at the compact width when asked to shrink', async () => {
    const attachment = makeAttachment({ warning: 'This image is 1.40 MB.' });
    mocks.prepareAttachment.mockResolvedValue(attachment);
    await renderForm();
    typeBody('Hello');
    pickFile();

    fireEvent.click(await screen.findByRole('button', { name: /Optimize for Texting/ }));
    await waitFor(() =>
      expect(mocks.prepareAttachment).toHaveBeenLastCalledWith(attachment.source, {
        maxWidth: 640,
        maxBytes: 5 * 1024 * 1024,
      })
    );
  });

  it('removes the attachment again', async () => {
    await renderForm();
    typeBody('Hello');
    pickFile();
    await screen.findByText('flyer.jpg');

    fireEvent.click(screen.getByRole('button', { name: 'Remove attachment' }));
    await waitFor(() => expect(screen.queryByText('flyer.jpg')).not.toBeInTheDocument());
  });

  it('reports why an image was rejected', async () => {
    mocks.prepareAttachment.mockRejectedValue(new Error('Unsupported image type. Use JPEG, PNG, GIF, or WebP.'));
    await renderForm();
    typeBody('Hello');
    pickFile('notes.txt');

    expect(
      await screen.findByText('Unsupported image type. Use JPEG, PNG, GIF, or WebP.')
    ).toBeInTheDocument();
    await expectBlockedBy('Fix the attachment first');
  });

  it('falls back to a generic message when the failure is not an Error', async () => {
    mocks.prepareAttachment.mockRejectedValue('boom');
    await renderForm();
    typeBody('Hello');
    pickFile();
    expect(await screen.findByText('Could not prepare that image.')).toBeInTheDocument();
  });
});

describe('TextMessagingForm: sending', () => {
  it('creates the communication, sends it in chunks of 200, then finalizes', async () => {
    mocks.resolveTextRecipients.mockResolvedValue({ success: true, summary: makeSummary(250) });
    mocks.finalizeTextCommunication.mockResolvedValue({
      success: true,
      communicationId: 77,
      outcome: 'ready_to_send',
      messageCount: 250,
      quotaLimit: 1000,
    });
    await renderForm();
    await expectRecipientLine('250 contacts will receive this text.');
    typeBody('Hi [Nickname], see you Sunday');

    await confirmSend('Send text');

    await waitFor(() => expect(mocks.finalizeTextCommunication).toHaveBeenCalledWith(77));
    expect(mocks.sendTextChunk).toHaveBeenCalledTimes(2);
    expect(mocks.sendTextChunk.mock.calls[0][0].contactIds).toHaveLength(200);
    expect(mocks.sendTextChunk.mock.calls[1][0].contactIds).toHaveLength(50);
    expect(mocks.sendTextChunk.mock.calls[0][0]).toMatchObject({
      communicationId: 77,
      body: 'Hi [Nickname], see you Sunday',
      fromSmsNumberId: 1,
      selectionId: 55,
      pageId: 292,
    });

    const formData = mocks.createTextCommunication.mock.calls[0][0] as FormData;
    expect(JSON.parse(String(formData.get('payload')))).toMatchObject({
      body: 'Hi [Nickname], see you Sunday',
      fromSmsNumberId: 1,
      recipientCount: 250,
      pageId: 292,
      selectionId: 55,
      target: { mode: 'selection', congregationIds: [] },
    });

    expect(
      await screen.findByText(
        'Prepared 250 texts (communication 77). The platform is delivering them now.'
      )
    ).toBeInTheDocument();
  });

  it('posts the prepared image with the communication', async () => {
    await renderForm();
    typeBody('Hello with a picture');
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'flyer.jpg', { type: 'image/jpeg' })] },
    });
    await screen.findByText('flyer.jpg');

    await confirmSend('Send text');
    await waitFor(() => expect(mocks.createTextCommunication).toHaveBeenCalled());

    const formData = mocks.createTextCommunication.mock.calls[0][0] as FormData;
    const posted = formData.get('attachment') as File;
    expect(posted).toBeInstanceOf(File);
    expect(posted.name).toBe('flyer.jpg');
  });

  it('shows progress while the chunks go out', async () => {
    mocks.resolveTextRecipients.mockResolvedValue({ success: true, summary: makeSummary(250) });
    const firstChunk = deferred<unknown>();
    mocks.sendTextChunk
      .mockReturnValueOnce(firstChunk.promise)
      .mockResolvedValue({ success: true, createdCount: 50, skippedCount: 0 });

    await renderForm();
    await expectRecipientLine('250 contacts');
    typeBody('Hello');
    await confirmSend('Send text');

    expect(await screen.findByText(/Preparing messages\.\.\. 0 of 250/)).toBeInTheDocument();
    firstChunk.resolve({ success: true, createdCount: 200, skippedCount: 0 });
    expect(await screen.findByText(/Prepared 250 texts/)).toBeInTheDocument();
  });

  it('counts contacts skipped at send time', async () => {
    mocks.sendTextChunk.mockResolvedValue({ success: true, createdCount: 2, skippedCount: 1 });
    await renderForm();
    typeBody('Hello');
    await confirmSend('Send text');
    expect(
      await screen.findByText(
        'Prepared 2 texts (communication 77). 1 contact skipped at send time. The platform is delivering them now.'
      )
    ).toBeInTheDocument();
  });

  it('leaves a Retry button when a chunk fails, and finishes on retry', async () => {
    mocks.resolveTextRecipients.mockResolvedValue({ success: true, summary: makeSummary(250) });
    mocks.finalizeTextCommunication.mockResolvedValue({
      success: true,
      communicationId: 77,
      outcome: 'ready_to_send',
      messageCount: 250,
      quotaLimit: 1000,
    });
    mocks.sendTextChunk
      .mockResolvedValueOnce({ success: true, createdCount: 200, skippedCount: 0 })
      .mockResolvedValueOnce({ success: false, error: 'Chunk 2 was rejected' });

    await renderForm();
    await expectRecipientLine('250 contacts');
    typeBody('Hello');
    await confirmSend('Send text');

    expect(
      await screen.findByText(
        '50 recipients could not be queued. Use Retry to try them again; the message stays a draft in Ministry Platform until every recipient is queued.'
      )
    ).toBeInTheDocument();
    expect(mocks.finalizeTextCommunication).not.toHaveBeenCalled();

    mocks.sendTextChunk.mockResolvedValue({ success: true, createdCount: 50, skippedCount: 0 });
    fireEvent.click(screen.getByRole('button', { name: 'Retry 50 failed' }));

    expect(await screen.findByText(/Prepared 250 texts/)).toBeInTheDocument();
    expect(mocks.finalizeTextCommunication).toHaveBeenCalledWith(77);
  });

  it('reports a failure to create the communication and stays editable', async () => {
    mocks.createTextCommunication.mockResolvedValue({ success: false, error: 'Communication was rejected' });
    await renderForm();
    typeBody('Hello');
    await confirmSend('Send text');

    expect(await screen.findByText('Communication was rejected')).toBeInTheDocument();
    expect(mocks.sendTextChunk).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Message')).toBeEnabled();
  });

  it('reports a failure to release the communication', async () => {
    mocks.finalizeTextCommunication.mockResolvedValue({ success: false, error: 'Approval process missing' });
    await renderForm();
    typeBody('Hello');
    await confirmSend('Send text');

    expect(await screen.findByText('Approval process missing')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /New message/ })).not.toBeInTheDocument();
  });

  it('explains a review hold for a sender with no quota', async () => {
    mocks.getTextToolConfig.mockResolvedValue({
      success: true,
      config: makeConfig({ quota: { limit: null, roleNames: [] } }),
    });
    mocks.finalizeTextCommunication.mockResolvedValue({
      success: true,
      communicationId: 77,
      outcome: 'in_review',
      messageCount: 3,
      quotaLimit: null,
    });
    await renderForm();
    typeBody('Hello');
    await confirmSend('Submit for approval');

    expect(
      await screen.findByText(
        'Prepared 3 texts (communication 77). An approver needs to release it because your account has no pre-approved texting limit.'
      )
    ).toBeInTheDocument();
  });

  it('explains a review hold for an over-quota send', async () => {
    mocks.getTextToolConfig.mockResolvedValue({
      success: true,
      config: makeConfig({ quota: { limit: 2, roleNames: ['Staff'] } }),
    });
    mocks.finalizeTextCommunication.mockResolvedValue({
      success: true,
      communicationId: 77,
      outcome: 'in_review',
      messageCount: 3,
      quotaLimit: 2,
    });
    await renderForm();
    typeBody('Hello');
    await confirmSend('Submit for approval');

    expect(
      await screen.findByText(
        'Prepared 3 texts (communication 77). An approver needs to release it because 3 people is over your limit of 2.'
      )
    ).toBeInTheDocument();
  });

  it('posts the scheduled wall-clock time and says when delivery starts', async () => {
    await renderForm();
    typeBody('Hello');
    fireEvent.click(screen.getByRole('radio', { name: 'Schedule for later' }));
    fireEvent.change(await screen.findByLabelText('Send at'), { target: { value: '2099-06-01T09:00' } });

    await confirmSend('Schedule text');

    await waitFor(() => expect(mocks.createTextCommunication).toHaveBeenCalled());
    const formData = mocks.createTextCommunication.mock.calls[0][0] as FormData;
    expect(JSON.parse(String(formData.get('payload'))).scheduledLocal).toBe('2099-06-01T09:00');
    expect(await screen.findByText(/Delivery starts Mon, Jun 1 at 9:00 AM/)).toBeInTheDocument();
  });

  it('locks the form once the send completes and starts fresh on New message', async () => {
    await renderForm();
    typeBody('Hello everyone');
    await confirmSend('Send text');

    expect(await screen.findByText(/Prepared 3 texts/)).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Send text' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /New message/ }));
    await waitFor(() => expect(screen.getByLabelText('Message')).toHaveValue(''));
    expect(screen.getByLabelText('Message')).toBeEnabled();
    expect(screen.queryByText(/Prepared 3 texts/)).not.toBeInTheDocument();
    expect(mocks.getTextToolConfig).toHaveBeenCalledTimes(1);
  });
});

describe('TextMessagingForm: collisions', () => {
  it('repeats a collision warning in the confirm dialog', async () => {
    mocks.useMessagingCollisions.mockReturnValue({
      result: { collisions: [] },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    mocks.summarizeCollisions.mockReturnValue({
      level: 'warning',
      headline: '2 other large sends land within 2 hours of this text.',
    });
    await renderForm();
    typeBody('Hello');

    fireEvent.click(screen.getByRole('button', { name: 'Send text' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Heads up: 2 other large sends land within 2 hours of this text.');
  });

  it('says nothing extra when the check finds nothing worth flagging', async () => {
    mocks.useMessagingCollisions.mockReturnValue({
      result: { collisions: [] },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    mocks.summarizeCollisions.mockReturnValue({ level: 'info', headline: 'Nothing nearby.' });
    await renderForm();
    typeBody('Hello');

    fireEvent.click(screen.getByRole('button', { name: 'Send text' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).not.toHaveTextContent('Heads up');
  });
});
