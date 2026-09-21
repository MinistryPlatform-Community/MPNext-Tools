import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreateProvider = vi.hoisted(() => vi.fn());
vi.mock('@/lib/providers/ai-text', () => ({ createAiTextProvider: mockCreateProvider }));

import { AiWritingService, type SmsRewriteInput } from './aiWritingService';

function input(overrides: Partial<SmsRewriteInput> = {}): SmsRewriteInput {
  return {
    body: 'Hey [Nickname], don’t forget: Sunday at 9am!',
    placeholders: ['Nickname'],
    currentCharacters: 44,
    currentSegments: 1,
    currentEncoding: 'UCS-2',
    nonGsmCharacters: ['’'],
    isMms: false,
    ...overrides,
  };
}

describe('AiWritingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (AiWritingService as unknown as { instance: unknown }).instance = undefined;
  });

  it('is a singleton', async () => {
    mockCreateProvider.mockReturnValue(null);
    const a = await AiWritingService.getInstance();
    const b = await AiWritingService.getInstance();
    expect(a).toBe(b);
  });

  it('reports disabled and refuses to rewrite when no provider is wired', async () => {
    mockCreateProvider.mockReturnValue(null);
    const service = await AiWritingService.getInstance();
    expect(await service.isEnabled()).toBe(false);
    await expect(service.rewriteTextMessage(input())).rejects.toThrow(/not configured/);
    expect(mockCreateProvider).toHaveBeenCalledTimes(1);
  });

  it('reports enabled and sends the draft, stats, placeholders, and guidance to the provider', async () => {
    const generate = vi.fn().mockResolvedValue('Hey [Nickname], Sunday at 9am!');
    mockCreateProvider.mockReturnValue({ generate });
    const service = await AiWritingService.getInstance();
    expect(await service.isEnabled()).toBe(true);

    const text = await service.rewriteTextMessage(input({ guidance: 'Keep it warm' }));
    expect(text).toBe('Hey [Nickname], Sunday at 9am!');
    expect(generate).toHaveBeenCalledTimes(1);
    const request = generate.mock.calls[0][0];
    expect(request.instructions).toMatch(/Placeholders written in square brackets/);
    expect(request.instructions).toMatch(/GSM-7/);
    expect(request.input).toContain('Current message:\nHey [Nickname]');
    expect(request.input).toContain('44 characters, 1 segment, UCS-2 encoding');
    expect(request.input).toContain('Characters forcing UCS-2: "’"');
    expect(request.input).toContain('Placeholders that must remain exactly: [Nickname].');
    expect(request.input).toContain('This sends as an SMS.');
    expect(request.input).toContain('Extra guidance from the sender: Keep it warm');
    expect(request.maxOutputTokens).toBe(400);
  });

  it('describes an MMS send and a placeholder-free draft', async () => {
    const generate = vi.fn().mockResolvedValue('Shorter.');
    mockCreateProvider.mockReturnValue({ generate });
    const service = await AiWritingService.getInstance();
    await service.rewriteTextMessage(
      input({ placeholders: [], nonGsmCharacters: [], currentSegments: 2, currentEncoding: 'GSM-7', isMms: true })
    );
    const request = generate.mock.calls[0][0];
    expect(request.input).toContain('2 segments, GSM-7 encoding.');
    expect(request.input).not.toContain('Characters forcing UCS-2');
    expect(request.input).toContain('The message has no placeholders.');
    expect(request.input).toContain('An image is attached, so this sends as an MMS');
  });

  it('resolves the provider once per process', async () => {
    mockCreateProvider.mockReturnValue({ generate: vi.fn().mockResolvedValue('x') });
    const service = await AiWritingService.getInstance();
    await service.isEnabled();
    await service.isEnabled();
    await service.rewriteTextMessage(input());
    expect(mockCreateProvider).toHaveBeenCalledTimes(1);
  });
});
