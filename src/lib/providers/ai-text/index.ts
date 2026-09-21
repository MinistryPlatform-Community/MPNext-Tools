import type { AiTextProvider } from './types';

export type { AiGenerateRequest, AiTextProvider } from './types';

/**
 * Where a deployment plugs in its own AI service.
 *
 * The Text Messaging tool's "AI rewrite" button, its server action, and
 * `AiWritingService` are all in place, but this repo ships no vendor client: hosting
 * varies too much across churches for one provider to be the right default. The
 * feature stays hidden until this function returns a provider.
 *
 * To enable it, implement `AiTextProvider` against your vendor (OpenAI, Azure
 * OpenAI, Anthropic, Gemini, a self-hosted model) in a sibling file, read its
 * endpoint and credentials from your own environment variables or from
 * `dp_Configuration_Settings`, and return an instance here. The rewrite prompt and
 * the GSM-safe and placeholder rules are enforced by the service and the action, so
 * the provider only has to turn `instructions` + `input` into text.
 *
 * Returning `null` means "not configured": the button is hidden and nothing errors.
 */
export function createAiTextProvider(): AiTextProvider | null {
  return null;
}
