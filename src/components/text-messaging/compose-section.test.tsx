import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ComponentProps } from 'react';
import { ComposeSection } from './compose-section';
import { STANDARD_MERGE_FIELDS } from './merge-utils';
import { analyzeSms, toGsmSafe } from './sms-utils';
import type { PreparedAttachment } from './image-utils';

const mocks = vi.hoisted(() => ({
  rewriteTextForSms: vi.fn(),
}));

// The AI panel this section renders calls a server action; nothing else here does.
vi.mock('./actions', () => ({
  rewriteTextForSms: mocks.rewriteTextForSms,
}));

beforeAll(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

type Props = ComponentProps<typeof ComposeSection>;

function makeAttachment(overrides: Partial<PreparedAttachment> = {}): PreparedAttachment {
  const file = new File(['x'.repeat(64)], 'flyer.jpg', { type: 'image/jpeg' });
  return {
    file,
    width: 1200,
    height: 800,
    resized: true,
    originalBytes: 4096,
    warning: null,
    source: file,
    maxWidth: 1200,
    ...overrides,
  };
}

function defaults(): Props {
  return {
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
        number: null,
        senderLabel: null,
        congregationId: null,
        costPerSegment: null,
        isDefault: false,
      },
    ],
    fromSmsNumberId: 1,
    onFromChange: vi.fn(),
    body: '',
    onBodyChange: vi.fn(),
    mergeFields: STANDARD_MERGE_FIELDS,
    unknownPlaceholders: [],
    analysis: analyzeSms(''),
    countsAreEstimated: false,
    attachment: null,
    attachmentPreviewUrl: null,
    attachmentError: null,
    preparingAttachment: false,
    onAttachmentPicked: vi.fn(),
    onAttachmentRemoved: vi.fn(),
    onAttachmentShrink: vi.fn(),
    compactImageWidth: 640,
    mmsWouldBeCheaper: false,
    mmsSavingPerRecipient: 0,
    mmsCostPerMessage: 0.02,
    maxImageWidth: 1200,
    aiWriterEnabled: false,
    costPerSegment: 0.01,
    recipientCount: 100,
    segmentsPerSecond: 10,
  };
}

/**
 * The body is controlled by the parent in the real form, so the harness holds it in
 * state and recomputes the analysis the way the form does.
 */
function Harness({ overrides, onBodyChange }: { overrides: Partial<Props>; onBodyChange?: (v: string) => void }) {
  const [body, setBody] = useState(overrides.body ?? '');
  const props: Props = {
    ...defaults(),
    ...overrides,
    body,
    analysis: overrides.analysis ?? analyzeSms(body),
    onBodyChange: (value: string) => {
      onBodyChange?.(value);
      setBody(value);
    },
  };
  return <ComposeSection {...props} />;
}

function renderCompose(overrides: Partial<Props> = {}, onBodyChange?: (v: string) => void) {
  const utils = render(<Harness overrides={overrides} onBodyChange={onBodyChange} />);
  return {
    ...utils,
    textarea: screen.getByLabelText('Message') as HTMLTextAreaElement,
    fileInput: utils.container.querySelector('input[type="file"]') as HTMLInputElement,
  };
}

describe('ComposeSection: from number', () => {
  it('lets the sender pick between numbers', async () => {
    const user = userEvent.setup();
    const onFromChange = vi.fn();
    renderCompose({ onFromChange });
    await user.click(screen.getByRole('combobox', { name: 'From' }));
    await user.click(await screen.findByRole('option', { name: 'Youth line' }));
    expect(onFromChange).toHaveBeenCalledWith(2);
  });

  it('shows the one number as plain text when there is nothing to choose', () => {
    renderCompose({ smsNumbers: [defaults().smsNumbers[0]] });
    expect(screen.getByText('Main line ((602) 555-0100)')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'From' })).not.toBeInTheDocument();
  });

  it('warns when the sender has no texting number', () => {
    renderCompose({ smsNumbers: [], fromSmsNumberId: undefined });
    expect(screen.getByText('No texting number available to you')).toBeInTheDocument();
    expect(
      screen.getByText(/No active texting numbers are available to you/)
    ).toBeInTheDocument();
  });
});

describe('ComposeSection: counters', () => {
  it('counts characters and texts per person', () => {
    renderCompose({ body: 'Hello there' });
    expect(screen.getByText(/11 characters/)).toHaveTextContent('11 characters · 1 segment per person');
  });

  it('counts several pieces for a long message', () => {
    renderCompose({ body: 'a'.repeat(200) });
    expect(screen.getByText(/200 characters/)).toHaveTextContent('200 characters · 2 segments per person');
  });

  it('drops the per-person piece count for a picture message', () => {
    renderCompose({ body: 'Hello', attachment: makeAttachment() });
    expect(screen.getByText(/5 characters/)).not.toHaveTextContent('per person');
  });

  it('notes that the counts use sample values when placeholders are present', async () => {
    renderCompose({ body: 'Hi [Nickname]', countsAreEstimated: true });
    fireEvent.click(screen.getByRole('button', { name: 'How the length is counted' }));
    expect(await screen.findByText('Counts use sample values for the placeholders.')).toBeInTheDocument();
  });

  it('warns and marks the field when the message is over the carrier limit', () => {
    const { textarea } = renderCompose({ body: 'a'.repeat(501) });
    expect(screen.getByText('Carriers reject texts over 500 characters. Shorten the message.')).toBeInTheDocument();
    expect(textarea.className).toContain('border-red-400');
  });
});

describe('ComposeSection: lookalike auto-replace', () => {
  it('replaces smart quotes as the sender types and says so', () => {
    const onBodyChange = vi.fn();
    const { textarea } = renderCompose({}, onBodyChange);
    fireEvent.change(textarea, { target: { value: 'It’s Sunday' } });
    expect(onBodyChange).toHaveBeenCalledWith("It's Sunday");
    expect(
      screen.getByText('Replaced 1 smart quote with plain characters so the text stays short.')
    ).toBeInTheDocument();
  });

  it('leaves plain text alone and shows no notice', () => {
    const onBodyChange = vi.fn();
    const { textarea } = renderCompose({}, onBodyChange);
    fireEvent.change(textarea, { target: { value: 'Plain text' } });
    expect(onBodyChange).toHaveBeenCalledWith('Plain text');
    expect(screen.queryByText(/Replaced/)).not.toBeInTheDocument();
  });

  it('keeps the caret where the sender left it after a replacement grows the text', async () => {
    const { textarea } = renderCompose();
    textarea.focus();
    fireEvent.change(textarea, { target: { value: '…done', selectionStart: 1 } });
    await waitFor(() => expect(textarea.value).toBe('...done'));
    expect(textarea.selectionStart).toBe(3);
  });

  it('dismisses the notice on request', () => {
    const { textarea } = renderCompose();
    fireEvent.change(textarea, { target: { value: 'Ready — set' } });
    expect(screen.getByText(/Replaced 1 dash/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText(/Replaced 1 dash/)).not.toBeInTheDocument();
  });

  it('clears the notice on its own after a few seconds', () => {
    vi.useFakeTimers();
    const { textarea, unmount } = renderCompose();
    fireEvent.change(textarea, { target: { value: 'Bring • water' } });
    expect(screen.getByText(/Replaced 1 bullet/)).toBeInTheDocument();
    fireEvent.change(textarea, { target: { value: 'Bring • water • now' } });
    act(() => vi.advanceTimersByTime(8000));
    expect(screen.queryByText(/Replaced/)).not.toBeInTheDocument();
    unmount();
  });
});

describe('ComposeSection: placeholders', () => {
  it('inserts the picked placeholder at the caret', async () => {
    const user = userEvent.setup();
    const { textarea } = renderCompose({ body: 'Hi , welcome' });
    textarea.focus();
    textarea.setSelectionRange(3, 3);

    await user.click(screen.getByRole('combobox', { name: 'Insert a placeholder' }));
    await user.click(await screen.findByRole('option', { name: 'Nickname [Nickname]' }));

    expect(textarea.value).toBe('Hi [Nickname], welcome');
    await waitFor(() => expect(textarea.selectionStart).toBe(13));
  });

  it('flags placeholders the recipients cannot fill', () => {
    renderCompose({ body: 'Hi [Rank]', unknownPlaceholders: ['Rank'] });
    expect(screen.getByText(/\[Rank\] is not available for these recipients/)).toBeInTheDocument();
  });

  it('uses the plural for several unknown placeholders', () => {
    renderCompose({ body: 'Hi [Rank] [Unit]', unknownPlaceholders: ['Rank', 'Unit'] });
    expect(screen.getByText(/\[Rank\], \[Unit\] are not available/)).toBeInTheDocument();
  });
});

describe('ComposeSection: special characters', () => {
  const emojiBody = `${'a'.repeat(100)}\u{1F389}`;

  it('quantifies the cost of emoji once recipients are known', () => {
    renderCompose({ body: emojiBody });
    expect(
      screen.getByText(/Emoji or special symbols are adding \$1\.00 and increasing delivery time by under a minute\./)
    ).toBeInTheDocument();
  });

  it('falls back to a plain nudge before recipients resolve', () => {
    renderCompose({ body: emojiBody, recipientCount: 0 });
    expect(
      screen.getByText(/Emoji or special symbols are adding to the cost and delivery time\./)
    ).toBeInTheDocument();
  });

  it('only notes the symbols when they cost nothing extra', () => {
    renderCompose({ body: 'Party \u{1F389}' });
    expect(screen.getByText(/This message contains emoji or special symbols\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remove them/ })).toBeInTheDocument();
  });

  it('offers plain characters when every symbol has an equivalent', () => {
    const onBodyChange = vi.fn();
    renderCompose({ body: 'Faith™ now' }, onBodyChange);
    fireEvent.click(screen.getByRole('button', { name: /Use plain characters/ }));
    expect(onBodyChange).toHaveBeenCalledWith(toGsmSafe('Faith™ now'));
  });

  it('lists the offending characters behind the hint', async () => {
    renderCompose({ body: 'Faith™ \u{1F389}' });
    fireEvent.click(screen.getByRole('button', { name: 'Which characters' }));
    expect(await screen.findByText(/U\+2122/)).toBeInTheDocument();
    expect(screen.getByText(/no plain equivalent, removed/)).toBeInTheDocument();
  });
});

describe('ComposeSection: attachment', () => {
  it('hands a picked file to the parent and clears the input', () => {
    const onAttachmentPicked = vi.fn();
    const { fileInput } = renderCompose({ onAttachmentPicked });
    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(onAttachmentPicked).toHaveBeenCalledWith(file);
    expect(fileInput.value).toBe('');
  });

  it('ignores a cancelled file picker', () => {
    const onAttachmentPicked = vi.fn();
    const { fileInput } = renderCompose({ onAttachmentPicked });
    fireEvent.change(fileInput, { target: { files: [] } });
    expect(onAttachmentPicked).not.toHaveBeenCalled();
  });

  it('opens the file picker from the toolbar button', () => {
    const { fileInput } = renderCompose();
    const click = vi.spyOn(fileInput, 'click');
    fireEvent.click(screen.getByRole('button', { name: /Attach image/ }));
    expect(click).toHaveBeenCalled();
  });

  it('shows the attachment chip and removes it again', () => {
    const onAttachmentRemoved = vi.fn();
    renderCompose({
      attachment: makeAttachment(),
      attachmentPreviewUrl: 'blob:preview',
      onAttachmentRemoved,
    });
    expect(screen.getByText('flyer.jpg')).toBeInTheDocument();
    expect(screen.getByText(/Sent as a picture message \(MMS\)/)).toBeInTheDocument();
    expect(screen.getByAltText('Attachment')).toHaveAttribute('src', 'blob:preview');
    expect(screen.queryByRole('button', { name: /Attach image/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove attachment' }));
    expect(onAttachmentRemoved).toHaveBeenCalled();
  });

  it('describes the prepared image behind the hint', async () => {
    renderCompose({ attachment: makeAttachment() });
    fireEvent.click(screen.getByRole('button', { name: 'About picture messages' }));
    expect(await screen.findByText(/1200 x 800 px/)).toBeInTheDocument();
  });

  it('offers to shrink an oversized wide image', () => {
    const onAttachmentShrink = vi.fn();
    renderCompose({
      attachment: makeAttachment({ warning: 'This image is 1.40 MB and may be downscaled.' }),
      onAttachmentShrink,
    });
    expect(screen.getByText('This image is 1.40 MB and may be downscaled.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Optimize for Texting/ }));
    expect(onAttachmentShrink).toHaveBeenCalled();
  });

  it('does not offer to shrink an image that is already narrow', () => {
    renderCompose({
      attachment: makeAttachment({ width: 480, height: 320, warning: 'This image is 1.40 MB.' }),
    });
    expect(screen.queryByRole('button', { name: /Optimize for Texting/ })).not.toBeInTheDocument();
  });

  it('disables the shrink button while another image is being prepared', () => {
    renderCompose({
      attachment: makeAttachment({ warning: 'This image is 1.40 MB.' }),
      preparingAttachment: true,
    });
    expect(screen.getByRole('button', { name: /Optimize for Texting/ })).toBeDisabled();
  });

  it('shows an attachment failure', () => {
    renderCompose({ attachmentError: 'Unsupported image type. Use JPEG, PNG, GIF, or WebP.' });
    expect(
      screen.getByText('Unsupported image type. Use JPEG, PNG, GIF, or WebP.')
    ).toBeInTheDocument();
  });
});

describe('ComposeSection: picture-message nudge', () => {
  it('quantifies the saving of attaching an image', () => {
    renderCompose({
      body: 'a'.repeat(200),
      mmsWouldBeCheaper: true,
      mmsSavingPerRecipient: 0.005,
    });
    expect(
      screen.getByText(/Attach an image to save \$0\.50 and reduce delivery time by under a minute\./)
    ).toBeInTheDocument();
  });

  it('falls back to a plain nudge before recipients resolve', () => {
    renderCompose({
      body: 'a'.repeat(200),
      mmsWouldBeCheaper: true,
      mmsSavingPerRecipient: 0.005,
      recipientCount: 0,
    });
    expect(screen.getByText(/Attach an image to lower the cost and delivery time\./)).toBeInTheDocument();
  });

  it('opens the file picker from the nudge', () => {
    const { fileInput } = renderCompose({ body: 'a'.repeat(200), mmsWouldBeCheaper: true });
    const click = vi.spyOn(fileInput, 'click');
    const buttons = screen.getAllByRole('button', { name: /Attach image/ });
    fireEvent.click(buttons[buttons.length - 1]);
    expect(click).toHaveBeenCalled();
  });

  it('is hidden once an image is attached', () => {
    renderCompose({ body: 'a'.repeat(200), mmsWouldBeCheaper: true, attachment: makeAttachment() });
    expect(screen.queryByText(/Attach an image to/)).not.toBeInTheDocument();
  });
});

describe('ComposeSection: AI rewrite', () => {
  it('is hidden when Azure OpenAI is not configured', () => {
    renderCompose({ aiWriterEnabled: true });
    expect(screen.getByRole('button', { name: /AI rewrite/ })).toBeInTheDocument();
    cleanup();
    renderCompose({ aiWriterEnabled: false });
    expect(screen.queryByRole('button', { name: /AI rewrite/ })).not.toBeInTheDocument();
  });

  it('opens and closes the panel', () => {
    renderCompose({ aiWriterEnabled: true, body: 'Come to church on Sunday at nine' });
    const toggle = screen.getByRole('button', { name: /AI rewrite/ });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /Suggest a rewrite/ })).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByRole('button', { name: /Suggest a rewrite/ })).not.toBeInTheDocument();
  });

  it('applies a suggestion to the body and closes the panel', async () => {
    mocks.rewriteTextForSms.mockResolvedValue({
      success: true,
      text: 'Church at 9 on Sunday',
      placeholdersDropped: [],
      gsmFixed: false,
    });
    const onBodyChange = vi.fn();
    const { textarea } = renderCompose(
      { aiWriterEnabled: true, body: 'Come to church on Sunday at nine oclock' },
      onBodyChange
    );

    fireEvent.click(screen.getByRole('button', { name: /AI rewrite/ }));
    fireEvent.click(screen.getByRole('button', { name: /Suggest a rewrite/ }));

    fireEvent.click(await screen.findByRole('button', { name: /Use this rewrite/ }));
    expect(onBodyChange).toHaveBeenCalledWith('Church at 9 on Sunday');
    expect(textarea.value).toBe('Church at 9 on Sunday');
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Suggest a rewrite/ })).not.toBeInTheDocument()
    );
  });
});

describe('ComposeSection: locked state', () => {
  it('disables every control after the send completes', () => {
    renderCompose({ body: 'Hello \u{1F389}', aiWriterEnabled: true, attachment: makeAttachment(), disabled: true });
    expect(screen.getByLabelText('Message')).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Insert a placeholder' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /AI rewrite/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove attachment' })).toBeDisabled();
  });
});
