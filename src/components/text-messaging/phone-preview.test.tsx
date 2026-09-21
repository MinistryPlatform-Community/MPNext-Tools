import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PhonePreview } from './phone-preview';

afterEach(() => {
  cleanup();
});

describe('PhonePreview', () => {
  it('renders the merged body, the sender label, and the merge caption', () => {
    render(
      <PhonePreview
        body={'Hi Sam, service starts at 9.'}
        senderLabel="Dream City Church"
        imageUrl={null}
        recipientName="Rivera, Samuel"
      />
    );

    expect(screen.getByLabelText('Message preview')).toBeInTheDocument();
    expect(screen.getByText('Hi Sam, service starts at 9.')).toBeInTheDocument();
    expect(screen.getByText('Dream City Church')).toBeInTheDocument();
    expect(screen.getByText('Preview merged for Rivera, Samuel')).toBeInTheDocument();
    expect(screen.getByText('Text Message · Today')).toBeInTheDocument();
  });

  it('keeps line breaks in the merged body', () => {
    render(
      <PhonePreview body={'Line one\nLine two'} senderLabel="+15555550123" imageUrl={null} recipientName={null} />
    );

    expect(screen.getByText(/Line one/)).toHaveTextContent('Line one Line two');
  });

  it('falls back to the sample-values caption when no recipient has resolved', () => {
    render(<PhonePreview body="Hello" senderLabel="+15555550123" imageUrl={null} recipientName={null} />);

    expect(screen.getByText('Preview uses sample values until recipients resolve')).toBeInTheDocument();
  });

  it('shows the placeholder when the body is blank and there is no attachment', () => {
    render(<PhonePreview body="   " senderLabel="Church" imageUrl={null} recipientName={null} />);

    expect(screen.getByText('Start typing to see your message here.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders the attachment image alongside the body', () => {
    render(
      <PhonePreview
        body="Look at this"
        senderLabel="Church"
        imageUrl="blob:preview-image"
        recipientName="Doe, Jane"
      />
    );

    const image = screen.getByAltText('Attachment preview');
    expect(image).toHaveAttribute('src', 'blob:preview-image');
    expect(screen.getByText('Look at this')).toBeInTheDocument();
  });

  it('renders the attachment on its own when the body is empty', () => {
    render(<PhonePreview body="" senderLabel="Church" imageUrl="blob:only-image" recipientName={null} />);

    expect(screen.getByAltText('Attachment preview')).toBeInTheDocument();
    expect(screen.queryByText('Start typing to see your message here.')).not.toBeInTheDocument();
  });
});
