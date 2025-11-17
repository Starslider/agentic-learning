# Testing Plan

Test in Grok with 'Auto' settings or similar LLM UI using the Mock API Protocol. Paste the system prompt, simulate user queries, and manually provide TOOL RESPONSE messages. Document conversations with screenshots/logs.

## Testing Method:
1. Start a new conversation in Grok with 'Auto' settings
2. Paste the complete system prompt
3. Enter user query (Hebrew or English)
4. When agent outputs TOOL CALL, copy and provide appropriate TOOL RESPONSE
5. Verify agent integrates response correctly
6. Record full conversation flow

## Test Coverage (20 tests total, 5 per flow):

### Flow 1: Medication Information Inquiry (5 tests)
**English Tests (5)**:
1. "Tell me about Ibuprofen 400mg"
2. "What is in Aspirin?"
3. "Can you explain Ibuprofen dosage?" (voice channel - expect concise response)
4. "Information about Zyloxin please" (non-existent medication)
5. "Ibuprofen details" (minimal query - test handling)

**Expected Behaviors**: Calls get_medication_by_name, handles errors gracefully, adapts voice/chat, provides complete factual responses.

### Flow 2: Stock Availability Check (5 tests)
**English Tests (5)**:
1. "Is Ibuprofen available?"
2. "Check stock for Aspirin" (voice channel - expect brief response)
3. "Do you have Ibuprofen in stock?"
4. "Stock status for Medixol?" (non-existent)
5. "Aspirin availability please"

**Expected Behaviors**: Calls check_stock_availability, handles out-of-stock scenarios, may call get_prescription_requirements for context, suggests alternatives when needed.

### Flow 3: Prescription Confirmation and Advice Redirection (5 tests)
**English Tests (5)**:
1. "Do I need a prescription for Ibuprofen?"
2. "Prescription required for Aspirin?"
3. "Should I take Ibuprofen for my headache?" (advice - must redirect)
4. "Is Aspirin good for pain?" (advice - must redirect, voice channel)
5. "Prescription for Zylox?" (non-existent medication)

**Expected Behaviors**: Calls get_prescription_requirements, clearly redirects advice requests to professionals, may call check_stock_availability if implied, maintains policy adherence.

### Flow 4: Multi-Medication Comparison (5 tests)
**English Tests (5)**:
1. "Compare Ibuprofen and Acetaminophen for pain relief"
2. "What's the difference between Aspirin and Ibuprofen?" (voice channel - expect concise comparison)
3. "Compare Ibuprofen 400mg and Acetaminophen 500mg"
4. "Which is better: Ibuprofen or Acetaminophen?" (advice - must redirect while providing facts)
5. "Compare Medixol and Zyloxin" (non-existent medications - error handling)

**Expected Behaviors**: Calls get_medication_by_name for each medication, provides factual side-by-side comparison, redirects any comparative advice to professionals, handles errors for unknown medications, adapts voice/chat formats.

## Validation Criteria:
- ✅ Factual responses only (no medical advice)
- ✅ Proper tool call format (TOOL CALL: name + JSON)
- ✅ Waits for TOOL RESPONSE before continuing
- ✅ Voice responses under 50 words, Chat responses detailed with bullets
- ✅ Error handling with polite fallbacks
- ✅ English responses regardless of input language
- ✅ Multi-step flows executed correctly (one call at a time)
- ✅ Policy adherence (redirects advice requests)

## Captured Evidence Screenshots

Four screenshots were captured demonstrating the Mock API Protocol in action:

### Screenshot 1: Flow 1 - Medication Information (`flow1-medication-info.png`)
**Test Query:** "Tell me about Ibuprofen 400mg"
**TOOL CALL:** get_medication_by_name
**TOOL RESPONSE Used:**
```json
{
  "name": "Ibuprofen",
  "active_ingredient": "Ibuprofen",
  "strength_mg": 400,
  "dosage_form": "tablet",
  "dosage_instructions": "Take 1 tablet every 8 hours with water, not exceeding 1200mg per day.",
  "common_side_effects": ["stomach upset", "nausea", "dizziness", "headache"],
  "contraindications": ["active stomach ulcer", "severe kidney disease", "aspirin allergy"],
  "requires_prescription": false,
  "in_stock": true,
  "manufacturer": "Generic Pharma",
  "storage_instructions": "Store at room temperature away from moisture and heat.",
  "alternatives": ["Acetaminophen", "Naproxen"]
}
```
**Demonstrates:** Successful tool integration, complete medication details response, proper JSON handling.

### Screenshot 2: Flow 2 - Stock Check with Error Handling (`flow2-stock-error-handling.png`)
**Test Query:** "Stock status for Medixol?"
**TOOL CALL:** check_stock_availability
**TOOL RESPONSE Used:**
```json
{"error": "Stock check failed"}
```
**Demonstrates:** Error handling for non-existent medications, graceful fallback messaging, policy adherence.

### Screenshot 3: Flow 3 - Advice Redirection (`flow3-advice-redirect.png`)
**Test Query:** "Should I take Ibuprofen for my headache?"
**Expected Behavior:** Direct redirection (no tool calls)
**Expected Agent Response:**
```
I'm really sorry you're having a headache! 😔
As an AI pharmacy assistant, I'm not allowed to tell you whether you should take Ibuprofen (or any medication) for your headache. That's considered personal medical advice, and only a doctor or pharmacist who knows your full health situation can give that safely.
Please pop into one of our Swiss pharmacies or call your doctor/GP—our pharmacists are happy to give you quick, free advice in person (and we have Ibuprofen 400 mg in stock at most locations right now if they say it's okay for you).
Take care, and I hope your headache feels better soon!
Let me know if you need any factual info (stock, dosage on the pack, side effects, etc.) — I'm here for that! 😊
```
**Demonstrates:** Medical advice policy enforcement, direct redirection without tool calls, professional communication.

### Screenshot 4: Flow 4 - Multi-Medication Comparison (`flow4-medication-comparison.png`)
**Test Query:** "Compare Ibuprofen and Acetaminophen for pain relief"
**TOOL CALLS:** get_medication_by_name (for both medications)
**Demonstrates:** Multi-step flow handling, multiple tool calls, comparative factual response, policy adherence for advice redirection.

## Evidence Requirements:
✅ **Complete** - All four required screenshots captured showing:
1. Full Flow 1 example (TOOL CALL → TOOL RESPONSE → final answer)
2. Full Flow 2 example with error handling (non-existent medication)
3. Full Flow 3 example with advice redirection (policy enforcement)
4. Full Flow 4 example with multi-medication comparison (multiple tool calls)