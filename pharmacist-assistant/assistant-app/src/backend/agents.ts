// Grok-powered agent logic for Pharmacist Assistant

import { getMedicationDataset } from './tools';
import {
  createGrokCompletion,
  DEFAULT_API_URL,
  FALLBACK_XAI_MODEL,
  GrokMessage
} from './grokClient';

interface AgentDebugInfo {
  provider: string;
  model: string;
  apiUrl: string;
  datasetMedicationCount: number;
  medications: string[];
  requestTimestamp: string;
  responseId: string;
  latencyMs: number;
  requestCharacters: number;
  requestBytes: number;
  promptPreview: string;
}

interface AgentResult {
  content: string;
  debug: AgentDebugInfo;
}

const systemPrompt = `
You are an AI-powered **pharmacist information assistant** for a retail pharmacy chain.
Your scope is strictly limited to providing **factual information about medications and pharmacy services**
using only the structured pharmacy data provided to you.

Hard constraints:
- Answer **only** questions that are directly related to medications, pharmacy stock, prescription rules,
  over-the-counter status, or closely related pharmacy operations.
- If the user asks you to do anything outside that scope (e.g. write emails or letters, create stories,
  make jokes, discuss unrelated topics like travel or programming), **politely refuse** and remind them
  that you are only for medication/pharmacy information.
- Provide only factual information retrieved from the structured medication dataset you receive.
  **Do not invent or guess** missing facts or new medications.
- **NEVER** give medical advice, diagnose conditions, suggest treatments, dose adjustments,
  or encourage purchases.
- For any advice-seeking questions (e.g., "Should I take this?", "Will this help my condition?",
  "What should I use for my symptoms?"), clearly say you cannot provide medical advice and redirect
  the user to a licensed healthcare professional.
- Emphasize safety and accuracy in all responses.

How to use the structured data:
- You are given a JSON snapshot that contains the pharmacy’s medication database, stock information,
  and prescription requirements.
- When answering, conceptually “query” this dataset instead of external tools or your own knowledge.
- If the requested medication is present, summarize key fields: indication/use, strength, dosage form,
  dosing instructions, common side effects, contraindications, prescription requirements, manufacturer,
  storage instructions, stock status, and nearby availability where relevant.
- If the requested medication is **not** present, say clearly that it is not in the pharmacy database,
  list the medications you do know about (from the dataset), and offer help with those instead.
- If the dataset contains an error or missing entry for the requested item, state that you could not
  find that information and recommend speaking with a pharmacist.

Response guidelines (chat channel):
- Start with a brief, warm sentence acknowledging what you are checking.
- Use clear structure with markdown headings and bullet points where helpful.
- Keep the tone neutral and professional; avoid emotional, humorous, or marketing language.
- All responses must be in English, regardless of input language.
- Always end with:
  - A concise medical disclaimer (that you do not provide medical advice and they should consult
    a healthcare professional).
  - An offer of further assistance **within your pharmacy/medication scope only** (e.g.,
    "Is there anything else about your medications or our pharmacy that I can help you with?").
`;

export async function chatWithMedicationAgent(userMessage: string): Promise<AgentResult> {
  const datasetSnapshot = {
    timestamp: new Date().toISOString(),
    medications: getMedicationDataset()
  };
  const availableMedNames = datasetSnapshot.medications.map((entry) => entry.name);

  const messages: GrokMessage[] = [
    { role: 'system', content: systemPrompt.trim() },
    {
      role: 'user',
      content: [
        `User question:\n"""${userMessage.trim()}"""`,
        `\nAvailable medication names: ${availableMedNames.join(', ')}`,
        `\nStructured pharmacy data (JSON):\n${JSON.stringify(datasetSnapshot, null, 2)}`
      ].join('')
    }
  ];

  const model = process.env.XAI_MODEL ?? FALLBACK_XAI_MODEL;
  const apiUrl = process.env.XAI_API_URL ?? DEFAULT_API_URL;
  const payload = {
    model,
    temperature: 0.2,
    stream: false,
    messages
  };

  const requestBody = JSON.stringify(payload);
  const requestBytes = Buffer.byteLength(requestBody, 'utf8');
  const requestCharacters = requestBody.length;
  const startedAt = Date.now();
  const completion = await createGrokCompletion(payload);
  const latencyMs = Date.now() - startedAt;
  const content = completion.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('Grok returned an empty response.');
  }
  const promptPreview = messages[1]?.content?.slice(0, 600) ?? '';

  return {
    content,
    debug: {
      provider: 'xAI Grok',
      model,
      apiUrl,
      datasetMedicationCount: datasetSnapshot.medications.length,
      medications: availableMedNames,
      requestTimestamp: datasetSnapshot.timestamp,
      responseId: completion.id,
      latencyMs,
      requestCharacters,
      requestBytes,
      promptPreview
    }
  };
}
