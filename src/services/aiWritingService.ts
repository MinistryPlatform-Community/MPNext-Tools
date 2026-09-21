import { createAiTextProvider, type AiTextProvider } from "@/lib/providers/ai-text";

export interface SmsRewriteInput {
  /** The sender's current draft, placeholders included. */
  body: string;
  /** Placeholder tokens (without brackets) that must survive verbatim. */
  placeholders: string[];
  /** Current stats so the model knows what it is optimizing away from. */
  currentCharacters: number;
  currentSegments: number;
  currentEncoding: 'GSM-7' | 'UCS-2';
  /** Non-GSM characters found in the draft, e.g. curly quotes or emoji. */
  nonGsmCharacters: string[];
  /** True when an image is attached (MMS: one message up to 1600 chars, brevity still matters). */
  isMms: boolean;
  /** Optional sender steer on tone, emphasis, or what must stay. */
  guidance?: string;
}

/**
 * AI-assisted writing for the Text Messaging tool (SMS rewrites).
 *
 * Process-lifetime singleton that dispatches to whatever `AiTextProvider` the
 * deployment wires in `src/lib/providers/ai-text/index.ts`. This repo ships none, so
 * `isEnabled()` is false, the tool hides its AI rewrite button, and the action reports
 * the feature disabled. No MP data is read here; the only MP-facing work is in the
 * calling action, which gates through `AuthorizationService` (CLAUDE.md rule 12).
 */
export class AiWritingService {
  private static instance: AiWritingService;
  private provider: AiTextProvider | null = null;
  private resolved = false;

  private constructor() {}

  public static async getInstance(): Promise<AiWritingService> {
    if (!AiWritingService.instance) {
      AiWritingService.instance = new AiWritingService();
    }
    return AiWritingService.instance;
  }

  private getProviderOrNull(): AiTextProvider | null {
    if (!this.resolved) {
      this.provider = createAiTextProvider();
      this.resolved = true;
    }
    return this.provider;
  }

  /** Whether a provider is wired. False hides every AI affordance in the tools. */
  public async isEnabled(): Promise<boolean> {
    return this.getProviderOrNull() !== null;
  }

  private async getProvider(): Promise<AiTextProvider> {
    const provider = this.getProviderOrNull();
    if (!provider) {
      throw new Error(
        "AI writing is not configured. Return a provider from createAiTextProvider() in " +
          "src/lib/providers/ai-text/index.ts to enable it.",
      );
    }
    return provider;
  }

  /**
   * Rewrite an SMS draft for brevity, clarity, and cost: fewer GSM-7 segments, plain
   * ASCII punctuation, every fact and placeholder kept. Returns only the rewritten
   * text; the caller re-analyzes it and enforces the GSM-safe and placeholder rules.
   */
  public async rewriteTextMessage(input: SmsRewriteInput): Promise<string> {
    const provider = await this.getProvider();

    const instructions = [
      "You rewrite text messages (SMS) sent by a church to its people.",
      "Rewrite the message so it is shorter and clearer while keeping every fact: names, dates, times, places, links, phone numbers, prices, and instructions must all survive.",
      "Placeholders written in square brackets like [First_Name] are merge fields. Keep each one exactly as written, including brackets, capitalization, and underscores. Do not add new placeholders.",
      "Cost matters: an SMS is billed per 160-character segment, and any character outside plain GSM-7 (curly quotes, em dashes, ellipsis characters, emoji, other symbols) shrinks segments to 70 characters. Use only straight quotes, hyphens, and ordinary ASCII punctuation. Never use emoji.",
      "Aim to fit the message in one 160-character segment. If that is impossible without losing information, use as few segments as possible.",
      "Keep a warm, friendly, natural tone. Do not add greetings, sign-offs, hashtags, or calls to action that were not in the original.",
      "Return only the rewritten message as plain text: no quotation marks around it, no markdown, no explanation.",
    ].join(" ");

    const parts = [
      `Current message:\n${input.body}`,
      `Current stats: ${input.currentCharacters} characters, ${input.currentSegments} segment${input.currentSegments === 1 ? "" : "s"}, ${input.currentEncoding} encoding.` +
        (input.nonGsmCharacters.length > 0
          ? ` Characters forcing UCS-2: ${input.nonGsmCharacters.map((c) => JSON.stringify(c)).join(", ")}.`
          : ""),
      input.placeholders.length > 0
        ? `Placeholders that must remain exactly: ${input.placeholders.map((t) => `[${t}]`).join(", ")}.`
        : "The message has no placeholders.",
      input.isMms
        ? "An image is attached, so this sends as an MMS (billed once, up to 1600 characters). Brevity still helps readability."
        : "This sends as an SMS.",
    ];
    if (input.guidance?.trim()) {
      parts.push(`Extra guidance from the sender: ${input.guidance.trim()}`);
    }

    return provider.generate({
      instructions,
      input: parts.join("\n\n"),
      maxOutputTokens: 400,
    });
  }
}
