export type GrokRole = 'system' | 'user' | 'assistant';

export interface GrokMessage {
  role: GrokRole;
  content: string;
}

interface GrokChoice {
  index: number;
  message: { role: GrokRole; content: string };
  finish_reason: string | null;
}

export interface GrokCompletionResponse {
  id: string;
  model: string;
  created: number;
  choices: GrokChoice[];
}

export interface GrokCompletionPayload {
  model: string;
  temperature?: number;
  stream?: boolean;
  messages: GrokMessage[];
}

// Default to the current xAI chat model; can be overridden via XAI_MODEL in .env
export const FALLBACK_XAI_MODEL = 'grok-3';
export const DEFAULT_API_URL = process.env.XAI_API_URL ?? 'https://api.x.ai/v1/chat/completions';

export async function createGrokCompletion(
  payload: GrokCompletionPayload
): Promise<GrokCompletionResponse> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing XAI_API_KEY environment variable. Set it in a .env file or your environment.');
  }

  const response = await fetch(DEFAULT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: payload.model,
      temperature: payload.temperature ?? 0.2,
      stream: payload.stream ?? false,
      messages: payload.messages
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Grok API error (${response.status}): ${errorBody}`);
  }

  return (await response.json()) as GrokCompletionResponse;
}


