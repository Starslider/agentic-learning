# Swiss Health Insurance Assistant - Edge Cases & Testing

## 1. Data Input Edge Cases

### 1.1 Age Boundaries
**Edge Case:** Very young or very old ages
- **Test Input:** "I'm 0 years old" or "I'm 150 years old"
- **Expected:** Agent should handle gracefully, ask for valid age
- **Why it matters:** API may have age restrictions (typically 0-120)

### 1.2 Invalid Age Format
**Edge Case:** Non-numeric age input
- **Test Input:** "I'm twenty-five years old"
- **Expected:** Agent should parse text to number or ask for numeric format
- **Why it matters:** Voice mode may transcribe numbers as words

### 1.3 Missing Sex Parameter
**Edge Case:** User provides all info except sex
- **Test Input:** "I'm 30, live in Zurich 8000, budget 3000 francs"
- **Expected:** Agent must ask specifically for sex (male/female)
- **Why it matters:** Sex is required for API call

### 1.4 Ambiguous Gender Terms
**Edge Case:** User says "man" or "woman" instead of "male" or "female"
- **Test Input:** "I'm a man" or "I'm a woman"
- **Expected:** Agent should map to "male" or "female" for API
- **Why it matters:** Natural language variations

## 2. Location Edge Cases

### 2.1 Border PLZ Codes
**Edge Case:** PLZ codes near canton borders
- **Test Input:** PLZ 8200 (Schaffhausen, near German border)
- **Expected:** Correctly identify canton, provide accurate premiums
- **Why it matters:** Border regions may have different premium structures

### 2.2 Invalid PLZ Format
**Edge Case:** PLZ with wrong number of digits
- **Test Input:** "PLZ 800" or "PLZ 80000"
- **Expected:** Ask for valid 4-digit Swiss PLZ
- **Why it matters:** API requires exact format

### 2.3 Non-Swiss PLZ
**Edge Case:** German, Austrian, or other postal codes
- **Test Input:** "PLZ 10115" (Berlin) or "1010" (Vienna)
- **Expected:** Politely redirect to Swiss PLZ only
- **Why it matters:** Agent is Swiss-only

### 2.4 Town Name Variations
**Edge Case:** Different spellings or languages
- **Test Input:** "Genève" vs "Geneva" vs "Genf"
- **Expected:** Handle all variations, convert to correct PLZ
- **Why it matters:** Switzerland has multiple official languages

### 2.5 Small Village Names
**Edge Case:** Very small towns not in OpenPLZ database
- **Test Input:** "Hinterrhein" or other tiny villages
- **Expected:** Ask for PLZ directly if town not found
- **Why it matters:** Not all villages may be in the database

### 2.6 Multiple PLZ for Same Town
**Edge Case:** Large cities with many postal codes
- **Test Input:** "Zurich" (has 8000-8099)
- **Expected:** Present options or use most common (8000)
- **Why it matters:** Premiums can vary by specific PLZ

## 3. Budget Edge Cases

### 3.1 Extremely Low Budget
**Edge Case:** Unrealistic low annual budget
- **Test Input:** "100 swiss francs per year"
- **Expected:** Explain realistic range (2400-7200), still show cheapest options
- **Why it matters:** User may be confused about costs

### 3.2 Extremely High Budget
**Edge Case:** Very high annual budget
- **Test Input:** "50,000 swiss francs per year"
- **Expected:** Show all options, note that budget exceeds typical premiums
- **Why it matters:** User may be confused or testing

### 3.3 Monthly vs Annual Confusion
**Edge Case:** User provides monthly when asked for annual
- **Test Input:** "300 francs" when asked for annual budget
- **Expected:** Clarify if monthly or annual, convert appropriately
- **Why it matters:** Common user confusion

### 3.4 Currency Confusion
**Edge Case:** User mentions EUR or USD
- **Test Input:** "3000 euros per year"
- **Expected:** Clarify that only Swiss francs are used
- **Why it matters:** International users may be confused

## 4. Voice Mode Edge Cases

### 4.1 Background Noise Interference
**Edge Case:** Misheard numbers or words
- **Test Input:** "Eight thousand" heard as "eighty thousand"
- **Expected:** Confirm back to user, catch unrealistic values
- **Why it matters:** Voice recognition errors

### 4.2 Interruptions Mid-Flow
**Edge Case:** User interrupts during data collection
- **Test Input:** Agent asks "How old are you?" User says "Wait, what?"
- **Expected:** Repeat question, maintain patience
- **Why it matters:** Natural conversation flow

### 4.3 Changing Mind Mid-Conversation
**Edge Case:** User provides info then corrects it
- **Test Input:** "I'm 30... actually I'm 31"
- **Expected:** Use most recent information
- **Why it matters:** Users may self-correct

### 4.4 Spelling Out PLZ
**Edge Case:** User spells digits individually
- **Test Input:** "Eight, zero, zero, zero"
- **Expected:** Recognize as 8000
- **Why it matters:** Voice mode may require spelling

## 5. API Response Edge Cases

### 5.1 No Results Found
**Edge Case:** API returns empty results
- **Test Input:** Very specific combination that yields no matches
- **Expected:** Inform user, suggest broadening criteria
- **Why it matters:** Some combinations may not exist

### 5.2 API Timeout
**Edge Case:** API takes too long to respond
- **Test Input:** (Simulated slow connection)
- **Expected:** Inform user, suggest retry
- **Why it matters:** Network issues happen

### 5.3 Partial API Response
**Edge Case:** API returns incomplete data
- **Test Input:** (Simulated partial response)
- **Expected:** Show available data, note limitations
- **Why it matters:** Data quality issues

### 5.4 API Returns Single Result
**Edge Case:** Only one insurer available for criteria
- **Test Input:** Very specific model/franchise combination
- **Expected:** Show the one result, explain it's the only option
- **Why it matters:** Limited options in some scenarios

## 6. Household Edge Cases

### 6.1 Large Families
**Edge Case:** 5+ family members
- **Test Input:** "Quotes for my family of 8"
- **Expected:** Systematically collect data for each, provide total
- **Why it matters:** Complex data collection

### 6.2 Mixed Ages (Children + Adults)
**Edge Case:** Family with children under 18
- **Test Input:** Ages 35, 33, 10, 8, 5
- **Expected:** Handle different age bands correctly
- **Why it matters:** Children have different franchises

### 6.3 Incomplete Household Data
**Edge Case:** User provides partial family info
- **Test Input:** "Me, my wife, and two kids" (no specific ages)
- **Expected:** Ask for each person's details systematically
- **Why it matters:** Need complete data for accurate quotes

## 7. Franchise/Model Edge Cases

### 7.1 Invalid Franchise Amount
**Edge Case:** User requests non-standard franchise
- **Test Input:** "I want 1500 franchise"
- **Expected:** Show available franchises (300, 500, 1000, 1500, 2000, 2500)
- **Why it matters:** Only specific franchises are valid

### 7.2 Model Confusion
**Edge Case:** User doesn't understand model types
- **Test Input:** "What's the difference between HMO and Standard?"
- **Expected:** Explain briefly, offer to show both
- **Why it matters:** User education needed

### 7.3 Accident Coverage Confusion
**Edge Case:** User asks about accident coverage
- **Test Input:** "Do I need accident coverage?"
- **Expected:** Explain it's included by default, redirect to professional for advice
- **Why it matters:** Common question, but agent can't advise

## 8. Language & Communication Edge Cases

### 8.1 Mixed Language Input
**Edge Case:** User mixes German/French/Italian with English
- **Test Input:** "Ich bin 30, male, Zürich"
- **Expected:** Respond in English, handle mixed input gracefully
- **Why it matters:** Swiss users may mix languages

### 8.2 Abbreviations
**Edge Case:** User uses abbreviations
- **Test Input:** "ZH" instead of "Zurich", "GE" instead of "Geneva"
- **Expected:** Recognize common canton abbreviations
- **Why it matters:** Common Swiss shorthand

### 8.3 Formal vs Informal
**Edge Case:** Very formal or very casual language
- **Test Input:** "Good day, I require information" vs "Hey, how much?"
- **Expected:** Maintain consistent professional tone
- **Why it matters:** Different user styles

## 9. Context & Memory Edge Cases

### 9.1 Referring to Previous Info
**Edge Case:** User references earlier conversation
- **Test Input:** "What about for my wife?" (after getting own quote)
- **Expected:** Remember context, ask for wife's details
- **Why it matters:** Natural conversation flow

### 9.2 Comparison Requests
**Edge Case:** User wants to compare scenarios
- **Test Input:** "Show me with 2500 franchise vs 300 franchise"
- **Expected:** Make two separate API calls, present comparison
- **Why it matters:** Common user need

### 9.3 Follow-up Questions
**Edge Case:** User asks for more details on specific insurer
- **Test Input:** "Tell me more about KPT"
- **Expected:** Use natural_language_query tool or explain limitations
- **Why it matters:** User wants deeper information

## 10. Compliance & Safety Edge Cases

### 10.1 Advice Seeking
**Edge Case:** User asks for recommendation
- **Test Input:** "Which one should I choose?"
- **Expected:** Firmly redirect to professional, provide info only
- **Why it matters:** Legal/compliance boundaries

### 10.2 Purchase Intent
**Edge Case:** User wants to buy immediately
- **Test Input:** "I want to buy the KPT plan now"
- **Expected:** Explain agent provides info only, direct to insurer/broker
- **Why it matters:** Agent doesn't facilitate purchases

### 10.3 Medical Questions
**Edge Case:** User asks about coverage for specific conditions
- **Test Input:** "Does this cover my diabetes medication?"
- **Expected:** Explain Grundversicherung basics, redirect to professional
- **Why it matters:** Medical advice is out of scope

### 10.4 Comparison with Other Countries
**Edge Case:** User compares to home country
- **Test Input:** "This is more expensive than in the US"
- **Expected:** Acknowledge, stay focused on Swiss info
- **Why it matters:** Keep scope limited

## Testing Checklist

### Priority 1 (Critical)
- [ ] Missing sex parameter
- [ ] Invalid PLZ format
- [ ] API timeout/error
- [ ] Advice-seeking questions
- [ ] No API results found

### Priority 2 (Important)
- [ ] Age boundaries (0, 120+)
- [ ] Town name variations
- [ ] Multiple PLZ for same town
- [ ] Extremely low/high budget
- [ ] Monthly vs annual confusion
- [ ] Large families (5+)

### Priority 3 (Nice to Have)
- [ ] Mixed language input
- [ ] Voice interruptions
- [ ] Changing mind mid-conversation
- [ ] Abbreviations
- [ ] Follow-up questions
- [ ] Comparison requests

## How to Test

### Manual Testing
1. **Text Mode:** Use chat interface with test inputs above
2. **Voice Mode:** Use voice interface, test pronunciation and recognition
3. **Mixed Mode:** Switch between text and voice mid-conversation

### Automated Testing
1. Create test scripts with expected inputs/outputs
2. Verify TOOL_CALL is always made before data presentation
3. Check that actual API data is used (not fabricated)
4. Validate error handling for each edge case

### Success Criteria
- Agent never fabricates data
- Agent always calls appropriate tools
- Agent handles errors gracefully
- Agent maintains compliance boundaries
- User receives accurate, helpful information
