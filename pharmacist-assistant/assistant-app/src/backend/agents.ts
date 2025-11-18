// Grok-powered agent logic for Pharmacist Assistant

import { getMedicationDataset, getMedicationByName } from './tools';
import {
  createGrokCompletion,
  DEFAULT_API_URL,
  FALLBACK_XAI_MODEL,
  GrokMessage
} from './grokClient';
import { getRelevantMemories, storeConversation } from './memory';
import { storeMedicationDocument, retrieveRelevantMedications } from './rag';

interface OpenFDAApiCall {
  medicationName: string;
  apiUrl: string;
  status: number;
  statusText: string;
  latencyMs: number;
  success: boolean;
  cached: boolean;
  timestamp: string;
}

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
  openFDAApiCalls: OpenFDAApiCall[];
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

How to use medication data:
- The system queries medication information from the openFDA API on-demand for ANY medication the user asks about.
- You do NOT have a pre-populated list of medications. The medication dataset provided is empty because
  medications are queried individually via API when needed.
- When a user asks about a medication, the system will automatically query the openFDA API to retrieve
  real medication information including: active ingredients, dosage forms, dosage instructions,
  side effects, contraindications, prescription requirements, manufacturer, and storage instructions.
- If the API returns data for the medication, present it clearly with all available information.
- If the API cannot find the medication (returns an error), inform the user that the medication
  was not found in the FDA database and suggest they verify the medication name spelling or
  consult with a pharmacist for assistance.
- You can answer questions about ANY medication - the system will look it up via API automatically.

Response guidelines (chat channel):
- **Keep responses SHORT and CONCISE** - aim for 2-4 sentences maximum, only include essential information.
- Focus on the most useful information for a normal person:
  - What the medication is used for (brief indication)
  - Whether it requires a prescription (yes/no)
  - Most common side effects (2-3 key ones only)
  - Basic dosage form (if available)
- **DO NOT** include:
  - Detailed technical information
  - Full manufacturer details
  - Extensive storage instructions
  - Long lists of warnings or contraindications
  - Verbose dosage and administration details
- Start with a brief acknowledgment (1 sentence).
- Use simple bullet points only if absolutely necessary (max 3-4 items).
- Keep the tone neutral and professional.
- All responses must be in English, regardless of input language.
- Always end with a brief medical disclaimer (1 sentence) and offer of further assistance (1 sentence).
`;

/**
 * Extract potential medication names from user message
 * Improved pattern matching to avoid false positives
 */
function extractMedicationNames(message: string): string[] {
  const medicationNames: string[] = [];
  
  // Expanded list of common words to exclude (not medications)
  const commonWords = new Set([
    'the', 'this', 'that', 'these', 'those', 'what', 'which', 'how', 'when', 'where', 'why',
    'i', 'you', 'he', 'she', 'we', 'they', 'it', 'me', 'him', 'her', 'us', 'them',
    'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'can', 'could', 'will', 'would', 'should', 'may', 'might', 'must', 'need', 'needs', 'needed',
    'about', 'for', 'with', 'from', 'into', 'onto', 'upon', 'over', 'under', 'through', 'during',
    'and', 'or', 'but', 'so', 'if', 'then', 'else', 'because', 'since', 'while', 'until',
    'hi', 'hello', 'hey', 'please', 'thanks', 'thank', 'yes', 'no', 'ok', 'okay',
    'information', 'details', 'info', 'data', 'help', 'tell', 'know', 'want', 'get', 'find',
    'do', 'you', 'have', 'has', 'had', 'can', 'could', 'will', 'would', 'should'
  ]);
  
  // Common phrases to exclude (not medication names)
  const commonPhrases = [
    'do you have', 'do you', 'can i', 'can you', 'will you', 'would you', 'should i',
    'i need', 'i want', 'i have', 'i am', 'i\'m', 'i was', 'i will', 'i would',
    'tell me', 'give me', 'show me', 'help me', 'let me'
  ];
  
  // Helper function to check if a phrase is a common phrase
  const isCommonPhrase = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    return commonPhrases.some(phrase => lowerText.includes(phrase));
  };
  
  // Helper function to check if a word is likely a medication name
  const isLikelyMedication = (word: string): boolean => {
    if (word.length < 3) return false;
    if (commonWords.has(word.toLowerCase())) return false;
    // Medication names are usually at least 4 characters or uncommon 3-letter words
    if (word.length < 4 && !/^[A-Z][a-z]{2}$/.test(word)) return false;
    // Don't match common English words
    const commonEnglishWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'];
    if (commonEnglishWords.includes(word.toLowerCase())) return false;
    return true;
  };
  
  // Pattern 1: "information about X", "details about X", "tell me about X"
  const aboutPattern = /(?:information|details|tell\s+me|know)\s+about\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)/gi;
  let match;
  while ((match = aboutPattern.exec(message)) !== null) {
    const name = match[1].trim();
    if (isLikelyMedication(name) && !isCommonPhrase(name)) {
      medicationNames.push(name);
    }
  }
  
  // Pattern 2: "X information", "X details", "X side effects" (medication name comes first)
  const infoPattern = /([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)\s+(?:information|details|side\s+effects|dosage|prescription|info)/gi;
  while ((match = infoPattern.exec(message)) !== null) {
    const name = match[1].trim();
    // Split into words and check each - only add if it's a single medication name, not a phrase
    const nameWords = name.split(/\s+/);
    if (nameWords.length === 1 && isLikelyMedication(name) && !isCommonPhrase(name)) {
      medicationNames.push(name);
    } else if (nameWords.length > 1) {
      // For multi-word, only add if all words are likely medications (not common phrases)
      const allWordsValid = nameWords.every(w => isLikelyMedication(w) && !commonWords.has(w.toLowerCase()));
      if (allWordsValid && !isCommonPhrase(name)) {
        medicationNames.push(name);
      }
    }
  }
  
  // Pattern 3: "what is X", "what's X"
  const whatPattern = /(?:what\s+is|what's)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)/gi;
  while ((match = whatPattern.exec(message)) !== null) {
    const name = match[1].trim();
    if (isLikelyMedication(name) && !isCommonPhrase(name)) {
      medicationNames.push(name);
    }
  }
  
  // Pattern 4: "do you have X", "can I get X", "is X available" - extract X (only the medication name)
  const questionPattern = /(?:do\s+you\s+have|can\s+i\s+get|is|are)\s+([A-Z][A-Za-z]+)(?:\s+available|\s+in\s+stock|\s+here)?/gi;
  while ((match = questionPattern.exec(message)) !== null) {
    const name = match[1].trim();
    if (isLikelyMedication(name) && !isCommonPhrase(name)) {
      medicationNames.push(name);
    }
  }
  
  // Pattern 5: "information for X", "details for X" - extract X (only the medication name)
  const forPattern = /(?:information|details|info)\s+for\s+([A-Z][A-Za-z]+)/gi;
  while ((match = forPattern.exec(message)) !== null) {
    const name = match[1].trim();
    if (isLikelyMedication(name) && !isCommonPhrase(name)) {
      medicationNames.push(name);
    }
  }
  
  // Pattern 6: Look for capitalized words after "about" keyword
  const aboutIndex = message.toLowerCase().indexOf('about');
  if (aboutIndex !== -1) {
    const afterAbout = message.substring(aboutIndex + 5).trim();
    const firstWord = afterAbout.split(/\s+/)[0];
    if (firstWord && 
        /^[A-Z][A-Za-z]+$/.test(firstWord) && 
        isLikelyMedication(firstWord) &&
        !isCommonPhrase(firstWord) &&
        !medicationNames.includes(firstWord)) {
      medicationNames.push(firstWord);
    }
  }
  
  // Pattern 7: Look for standalone capitalized words that are clearly medication names
  // Only if they appear after common medication question patterns
  const words = message.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[.,!?;:]$/, ''); // Remove punctuation
    const prevWords = i >= 2 ? words.slice(i - 2, i).join(' ').toLowerCase() : '';
    
    // Only consider if it's a single capitalized word that:
    // 1. Is at least 4 characters
    // 2. Appears after common medication question patterns
    // 3. Is not a common word or phrase
    if (word.length >= 4 && 
        /^[A-Z][A-Za-z]*$/.test(word) &&
        (prevWords.includes('do you have') || 
         prevWords.includes('can i get') ||
         prevWords.includes('tell me about') ||
         prevWords.includes('information about') ||
         prevWords.includes('details about') ||
         prevWords.includes('information for') ||
         prevWords.includes('details for')) &&
        isLikelyMedication(word) &&
        !isCommonPhrase(word) &&
        !medicationNames.includes(word)) {
      medicationNames.push(word);
    }
  }
  
  // Pattern 8: Fallback - look for any capitalized word that looks like a medication name
  // This catches simple queries like "Ibuprofen" or "Tell me about Aspirin"
  if (medicationNames.length === 0) {
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[.,!?;:]$/, '');
      if (word.length >= 4 && 
          /^[A-Z][A-Za-z]+$/.test(word) &&
          isLikelyMedication(word) &&
          !isCommonPhrase(word) &&
          !commonWords.has(word.toLowerCase())) {
        medicationNames.push(word);
        break; // Only take the first likely medication name as fallback
      }
    }
  }
  
  // Remove duplicates and filter out any remaining common words/phrases
  const uniqueNames = [...new Set(medicationNames)].filter(name => {
    const lowerName = name.toLowerCase();
    return name.length >= 3 && 
           !commonWords.has(lowerName) &&
           !isCommonPhrase(name) &&
           isLikelyMedication(name);
  });
  
  return uniqueNames;
}

/**
 * Filter medication data to show only the most useful information for a normal person
 */
function filterMedicationDataForUser(medication: any): any {
  return {
    name: medication.name,
    indication: medication.indications?.[0] || medication.dosage_instructions?.split('.')[0] || 'See package insert',
    requires_prescription: medication.requires_prescription ?? false,
    common_side_effects: medication.common_side_effects?.slice(0, 3) || [], // Only top 3
    dosage_form: medication.dosage_form || undefined
  };
}

export async function chatWithMedicationAgent(
  userMessage: string,
  userId: string = 'anonymous'
): Promise<AgentResult> {
  // Retrieve relevant memories for context
  const memoryContext = await getRelevantMemories(userId, userMessage, 5);
  const memoryContextText = memoryContext.memories.length > 0
    ? `\n\nRelevant conversation history:\n${memoryContext.memories.map((m, i) => `${i + 1}. ${m.memory}`).join('\n')}`
    : '';

  // RAG: Retrieve relevant medications using semantic search
  // Use RAG when no explicit medication name is extracted, or to find similar medications
  let ragContext = '';
  
  // Try RAG retrieval if we have stored medications and the query seems medication-related
  const ragResults = await retrieveRelevantMedications(userMessage, 3);
  if (ragResults.length > 0) {
    ragContext = `\n\nSemantically similar medications found in knowledge base:\n${ragResults.map((r, i) => 
      `${i + 1}. ${r.name} (relevance: ${(r.similarity * 100).toFixed(1)}%): ${r.content}`
    ).join('\n')}`;
    console.log(`[Agent] RAG retrieved ${ragResults.length} relevant medications`);
  }

  // Extract medication names from user message and query API
  const potentialMedNames = extractMedicationNames(userMessage);
  console.log(`[Agent] Extracted potential medication names: ${potentialMedNames.join(', ')}`);
  
  const queriedMedications: any[] = [];
  const openFDAApiCalls: OpenFDAApiCall[] = [];
  
  // Query API for each potential medication
  for (const medName of potentialMedNames) {
    try {
      console.log(`[Agent] Querying API for: ${medName}`);
      const { medication, apiCall } = await getMedicationByName(medName);
      
      // Track API call
      if (apiCall) {
        openFDAApiCalls.push(apiCall);
      }
      
      if (!('error' in medication)) {
        // Store medication in RAG database for future semantic search
        storeMedicationDocument(medName, medication).catch(err => {
          console.error(`[Agent] Failed to store medication in RAG:`, err);
        });
        
        // Filter medication data to show only useful information
        const filteredMedication = filterMedicationDataForUser(medication);
        queriedMedications.push({
          name: medName,
          medication: filteredMedication,
          prescription: null, // Would need separate query
          stock: null // Would need separate query
        });
        console.log(`[Agent] Successfully retrieved data for ${medName}`);
      } else {
        console.log(`[Agent] Could not retrieve data for ${medName}: ${medication.error}`);
      }
    } catch (error) {
      console.error(`[Agent] Error querying medication ${medName}:`, error);
    }
  }
  
  // Build dataset snapshot with queried medications
  const datasetSnapshot = {
    timestamp: new Date().toISOString(),
    medications: queriedMedications,
    note: queriedMedications.length > 0 
      ? `Queried ${queriedMedications.length} medication(s) from openFDA API based on user message.`
      : "No medications were identified in the user message, or API queries returned no results. The system can query ANY medication via API when mentioned."
  };

  const messages: GrokMessage[] = [
    { role: 'system', content: systemPrompt.trim() },
    {
      role: 'user',
      content: [
        `User question:\n"""${userMessage.trim()}"""`,
        memoryContextText,
        ragContext,
        `\nMedication data (queried from openFDA API - filtered for user-friendly information):`,
        queriedMedications.length > 0
          ? `The system has queried the openFDA API and retrieved essential information for: ${potentialMedNames.join(', ')}.\n`
          : `No medications were automatically identified in the user's message. If the user is asking about a medication, you should inform them that the system can look up ANY medication via the openFDA API.\n`,
        ragContext ? `Note: The system also found semantically similar medications above that might be relevant.\n` : '',
        `IMPORTANT: Only provide the essential information shown below. Keep your response SHORT (2-4 sentences max).\n`,
        `Filtered medication data (JSON):\n${JSON.stringify(datasetSnapshot, null, 2)}`
      ].filter(Boolean).join('')
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

  // Store conversation in memory (async, don't wait)
  storeConversation(userId, userMessage, content).catch(err => {
    console.error('Failed to store conversation memory:', err);
  });

  return {
    content,
    debug: {
      provider: 'xAI Grok',
      model,
      apiUrl,
      datasetMedicationCount: datasetSnapshot.medications.length,
      medications: queriedMedications.map(m => m.name),
      requestTimestamp: datasetSnapshot.timestamp,
      responseId: completion.id,
      latencyMs,
      requestCharacters,
      requestBytes,
      promptPreview,
      openFDAApiCalls
    }
  };
}
