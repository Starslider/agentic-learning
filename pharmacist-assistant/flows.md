# Multi-Step Flows Design

Four distinct multi-step flows are designed, each with sequences, tool usage, responses, and voice vs. chat adaptations.

## Flow 1: Medication Information Inquiry
- **Description**: User asks for details on a medication (e.g., "Tell me about Ibuprofen 400mg").
- **Sequence**:
  1. Call `get_medication_by_name` with name and strength.
  2. Summarize facts (active ingredient, dosage, prescription status).
  3. If stock-related, optionally call `check_stock_availability`.
  4. Respond with info; redirect if advice-seeking.
- **Visualization**:
  ```mermaid
  flowchart TD
      A[User asks for medication details] --> B[Agent calls get_medication_by_name]
      B --> C[Receive response]
      C --> D[Summarize facts: active ingredient, dosage, prescription]
      D --> E{Stock-related?}
      E -->|Yes| F[Call check_stock_availability]
      E -->|No| G[Respond with info]
      F --> G
      G --> H[Redirect if advice-seeking]
      H --> I[End]
  ```
- **Voice vs. Chat**:
  - Voice: "Ibuprofen 400mg contains ibuprofen. Take one tablet every eight hours with water. No prescription needed. Available in stock."
  - Chat: Bullet-point details: "- Active Ingredient: Ibuprofen\n- Dosage: Take 1 tablet every 8 hours...\n- Requires Prescription: No\n- In Stock: Yes."
- **Tool Usage**: TOOL CALL: get_medication_by_name {"name": "Ibuprofen", "strength_mg": 400}

## Flow 2: Stock Availability Check
- **Description**: User checks stock (e.g., "Is Ibuprofen available?").
- **Sequence**:
  1. Call `check_stock_availability` with medication.
  2. If out of stock, suggest alternatives.
  3. Confirm prescription if relevant via `get_prescription_requirements`.
  4. End with offer to assist further.
- **Visualization**:
  ```mermaid
  flowchart TD
      A[User checks stock] --> B[Agent calls check_stock_availability]
      B --> C[Receive response]
      C --> D{Out of stock?}
      D -->|Yes| E[Suggest alternatives]
      D -->|No| F[Confirm availability]
      E --> G[Call get_prescription_requirements if relevant]
      F --> G
      G --> H[End with offer to assist]
  ```
- **Voice vs. Chat**:
  - Voice: "Ibuprofen is out of stock. Check with staff for alternatives."
  - Chat: "Stock Status: Out of stock. Requires prescription? No. Please check back later or ask about alternatives."
- **Tool Usage**: TOOL CALL: check_stock_availability {"name": "Ibuprofen", "strength_mg": 400}

## Flow 3: Prescription Confirmation and Advice Redirection
- **Description**: User asks about prescription needs and seeks advice (e.g., "Do I need a prescription for Ibuprofen? Is it safe for pain?").
- **Sequence**:
  1. Evaluate query for medical advice content.
  2. If advice-seeking: Directly redirect to healthcare professionals (no tool calls).
  3. If factual prescription inquiry: Call `get_prescription_requirements` for status.
  4. Provide factual response only; never give medical advice.
  5. If stock check implied, optionally call `check_stock_availability`.
  6. Always suggest consulting a professional for advice.
- **Visualization**:
  ```mermaid
  flowchart TD
      A[User asks about prescription/advice] --> B{Evaluates for medical advice?}
      B -->|Yes - Advice seeking| C[Direct redirection - No tools]
      B -->|No - Factual inquiry| D[Call get_prescription_requirements]
      D --> E[Receive response]
      E --> F[Provide factual response]
      F --> G{Stock check implied?}
      G -->|Yes| H[Call check_stock_availability]
      G -->|No| I[Suggest consulting professional]
      H --> I
      C --> J[End]
      I --> J
  ```
- **Voice vs. Chat**:
  - Voice: "Ibuprofen doesn't require a prescription. For pain advice, see a doctor."
  - Chat: "Prescription Required: No. General Notes: Over-the-counter. I cannot provide medical advice. Consult a healthcare professional."
- **Tool Usage**: 
  - For factual queries: TOOL CALL: get_prescription_requirements {"name": "Ibuprofen"}
  - For advice queries: **No tool calls** - Direct policy enforcement

## Flow 4: Multi-Medication Comparison
- **Description**: User wants to compare medications (e.g., "Compare Ibuprofen and Acetaminophen for pain relief").
- **Sequence**:
  1. Parse query to identify medications to compare.
  2. Call `get_medication_by_name` for each medication.
  3. Optionally check stock availability for both.
  4. Provide factual comparison of key attributes (active ingredients, dosage, prescription status).
  5. Redirect any comparative advice to healthcare professionals.
  6. Suggest consulting pharmacist for personalized guidance.
- **Visualization**:
  ```mermaid
  flowchart TD
      A[User requests medication comparison] --> B[Parse medications to compare]
      B --> C[Call get_medication_by_name for Med1]
      C --> D[Call get_medication_by_name for Med2]
      D --> E[Receive responses]
      E --> F{Stock comparison requested?}
      F -->|Yes| G[Call check_stock_availability for both]
      F -->|No| H[Provide factual comparison]
      G --> H
      H --> I[Redirect comparative advice]
      I --> J[Suggest consulting professional]
      J --> K[End]
  ```
- **Voice vs. Chat**:
  - Voice: "Ibuprofen and Acetaminophen both relieve pain. Ibuprofen requires no prescription, Acetaminophen also OTC. Both in stock. See pharmacist for which suits you best."
  - Chat: "**Comparison: Ibuprofen vs Acetaminophen**\n- **Active Ingredients**: Ibuprofen vs Acetaminophen\n- **Prescription Required**: Both OTC\n- **Common Uses**: Pain relief for both\n- **Stock Status**: Both available\n\nI cannot recommend which is better for your specific needs. Please consult a healthcare professional."
- **Tool Usage**: 
  - TOOL CALL: get_medication_by_name {"name": "Ibuprofen", "strength_mg": 400}
  - TOOL CALL: get_medication_by_name {"name": "Acetaminophen", "strength_mg": 500}
  - Optional: TOOL CALL: check_stock_availability (for each medication)