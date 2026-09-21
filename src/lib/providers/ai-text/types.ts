/**
 * A single text-generation request. `instructions` is the system prompt (voice,
 * constraints, output shape); `input` is the concrete task/content the model
 * writes from. `maxOutputTokens` caps generation length so a runaway response
 * can't stall the request.
 */
export interface AiGenerateRequest {
  instructions: string;
  input: string;
  maxOutputTokens?: number;
}

/**
 * A text-generation adapter. The implementation owns its upstream client, auth,
 * and response parsing, and throws a clear `Error` on failure. `AiWritingService`
 * dispatches here and never knows which vendor is behind it.
 */
export interface AiTextProvider {
  /** Generate plain text for the given prompt; returns the trimmed output. */
  generate(request: AiGenerateRequest): Promise<string>;
}
