# Swiss Health Insurance Cost Assistant Agent

An AI-powered assistant specializing in Swiss mandatory health insurance (Grundversicherung) costs and information, using official Swiss government health insurance data.

## Overview

This agent integrates with the primai-okp-api.fly.dev API to provide factual information about Swiss health insurance premiums, coverage options, and policy details. It focuses exclusively on mandatory basic health insurance (Grundversicherung) and provides accurate, factual information without giving financial advice or recommendations.

## Features

- **Premium Comparisons** - Compare monthly costs across different insurers and models
- **Deductible Information** - Understand available franchise options and their impact on premiums
- **Model Comparisons** - Information about Standard, HMO, Hausarzt, and Telmed models
- **Household Quotes** - Get quotes for multiple family members
- **Regional Variations** - Premium information based on Swiss postal codes and cantons
- **Town Name Support** - Automatically converts Swiss town/city names to postal codes using OpenPLZ API

## Agent Requirements

- Provide factual information about Swiss health insurance costs and coverage
- Explain Grundversicherung coverage and deductible options
- Calculate estimated premiums using official API data
- No financial advice, no insurer recommendations, no purchase encouragement
- Redirect to insurance professionals for advice requests
- Focus exclusively on Swiss mandatory health insurance
- All costs displayed in CHF (Swiss Francs) as monthly premiums
- **Interactive data collection**: When users ask about offerings, collect age, sex, PLZ, and desired premium before providing calculations
- **TOOL_CALL usage**: ALWAYS output TOOL_CALL: tool_name followed by JSON parameters when gathering API data - NEVER provide data without first calling the tool
- **Comprehensive options**: Always provide lists including both cheapest and most expensive available options
- **Canton verification**: Always verify and correctly identify the canton for given PLZ codes

## API Integration

The agent uses the following endpoints:

**Swiss Health Insurance API (primai-okp-api.fly.dev):**
- `/v1/compare` - Premium comparisons across insurers
- `/v1/models` - Available insurance models
- `/v1/deductibles` - Available deductibles by age
- `/v1/household/compare` - Multi-person household quotes
- `/v1/query` - Natural language queries about Swiss health insurance

**OpenPLZ API (openplzapi.org):**
- Swiss town/city name to postal code conversion for enhanced user experience

## Quality Assurance

### Test Coverage
The agent has been thoroughly tested with 27 comprehensive test cases covering:
- ✅ Basic cost inquiries and data collection
- ✅ Interactive conversation flows
- ✅ Safety and compliance boundaries
- ✅ Technical scenarios (franchises, models, households)
- ✅ Edge cases and error handling
- ✅ Multilingual and international user scenarios

### Test Results
**Overall Success Rate: 95% (26/27 tests passing)**

**Key Improvements Implemented:**
- Swiss postal code validation
- Realistic premium range expectations (CHF 2,400-7,200 annually)
- Household data collection process
- Enhanced Swiss-only focus messaging
- Better edge case handling and validation
- Annual to monthly premium conversion

### Files
- `prompt.md` - Complete system prompt with Swiss health insurance focus and API tool definitions
- `README.md` - This documentation file
- `test-cases.md` - Comprehensive test suite with results and improvement tracking

## Usage

The agent is designed to work with Grok and integrates with the official Swiss health insurance premium API. It provides accurate information about Grundversicherung costs and options.

### Interactive Workflow

When users ask about health insurance offerings or costs, the agent follows this interactive process:

1. **Data Collection**: Asks for four key pieces of information:
   - Age
   - Sex (male or female)
   - Postal code (PLZ) in Switzerland or town/city name
   - Desired annual premium amount (in CHF)

2. **Location Processing**: If town name provided, outputs TOOL_CALL: get_plz_from_town to convert to PLZ using OpenPLZ API

3. **Canton Verification**: Outputs TOOL_CALL: get_canton_from_plz to verify correct canton for PLZ

4. **Conversion**: Converts annual premium to monthly (÷12) for API calculations

5. **Calculation**: Outputs TOOL_CALL: get_premium_comparison to query the API and provide personalized premium comparisons

6. **Comprehensive Results**: Provides complete list of options including both cheapest and most expensive available

Example interaction:
```
User: "How much does health insurance cost?"
Agent: "I need your age, sex, PLZ or town name, and desired annual premium amount..."

User: "I'm 30, male, live in Zurich, can afford 2400 CHF/year"
Agent: "Let me convert Zurich to PLZ... verify canton... then check options..."
TOOL_CALL: get_plz_from_town
{"town": "Zurich"}
TOOL_CALL: get_canton_from_plz
{"plz": "8000"}
TOOL_CALL: get_premium_comparison
{"age": 30, "sex": "male", "plz": "8000", "limit": 10}
Agent: "Based on Zurich canton data, here are your options:
Cheapest: KPT at CHF 385/month
Most expensive: Helsana at CHF 472/month
[Full list of options]"
```

## Important Notes

- All premium information comes from official Swiss health insurance data
- Grundversicherung is mandatory for all Swiss residents
- Users provide annual premium budgets, agent displays monthly costs in CHF
- The agent never provides financial advice or policy recommendations
- Users are always directed to consult licensed insurance professionals or comparis.ch for personalized advice
- Premiums vary by canton, age, deductible choice, and insurance model