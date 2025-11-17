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
**Overall Success Rate: 97% (28/29 tests passing)**

**Key Improvements Implemented:**
- Swiss postal code validation with error handling
- Realistic premium range expectations (CHF 2,400-7,200 annually / CHF 200-600 monthly)
- Household data collection process with systematic member tracking
- Enhanced Swiss-only focus messaging with polite redirects
- Better edge case handling and validation (invalid PLZ, extreme values)
- Annual to monthly premium conversion (user provides annual, displays monthly)
- Town name to PLZ conversion with OpenPLZ API integration
- Canton verification for location accuracy
- Comprehensive option listing (cheapest to most expensive)

### Files
- `prompt.md` - Complete system prompt with Swiss health insurance focus and API tool definitions
- `README.md` - This documentation file
- `test-cases.md` - Comprehensive test suite with results and improvement tracking

## Usage

The agent is designed to work with Grok and integrates with the official Swiss health insurance premium API. It provides accurate information about Grundversicherung costs and options.

### Quick Reference

**Required User Information:**
- Age (e.g., 30)
- Sex (male or female)
- Location (PLZ like 8000 or town name like "Zurich")
- Annual budget (CHF 2400-7200)

**Agent Capabilities:**
- ✅ Premium comparisons across insurers
- ✅ Franchise (deductible) information
- ✅ Insurance model explanations (Standard, HMO, Hausarzt, Telmed)
- ✅ Household quotes for families
- ✅ Town name to PLZ conversion
- ✅ Canton verification
- ❌ Financial advice or recommendations
- ❌ Purchase facilitation
- ❌ Non-Swiss insurance information

**Typical Premium Ranges:**
- Annual: CHF 2,400 - 7,200
- Monthly: CHF 200 - 600
- Varies by: age, canton, franchise, model

### Interactive Workflow

When users ask about health insurance offerings or costs, the agent follows this interactive process:

1. **Data Collection**: Asks for four key pieces of information:
   - Age (integer, e.g., 30)
   - Sex (male or female)
   - Postal code (PLZ) in Switzerland (4 digits, 1000-9999) or town/city name
   - Desired annual premium amount (in CHF, typically 2400-7200)

2. **Location Processing**: If town name provided, outputs TOOL_CALL: get_plz_from_town to convert to PLZ using OpenPLZ API
   - Handles multiple PLZ results by presenting options to user
   - Uses most common/central PLZ as default if user doesn't specify

3. **Canton Verification**: Outputs TOOL_CALL: get_canton_from_plz to verify correct canton for PLZ
   - Ensures location accuracy for premium calculations
   - Displays canton name in results for transparency

4. **Conversion**: Converts annual premium to monthly (÷12) for API calculations
   - User provides: annual budget (e.g., 3000 CHF/year)
   - Agent calculates: monthly equivalent (e.g., 250 CHF/month)
   - Results display: monthly premiums in CHF

5. **Calculation**: Outputs TOOL_CALL: get_premium_comparison to query the API and provide personalized premium comparisons
   - Never provides data without calling the tool first
   - Uses actual API response data only

6. **Comprehensive Results**: Provides complete list of options including both cheapest and most expensive available
   - Shows insurer name, model type, franchise amount, and monthly premium
   - Clearly identifies lowest and highest cost options
   - Includes disclaimer about estimates and actual costs

7. **Error Handling**: Gracefully manages API failures, invalid inputs, and edge cases
   - Provides clear error messages
   - Suggests alternatives (e.g., comparis.ch)
   - Validates Swiss postal codes and redirects non-Swiss inquiries

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

- All premium information comes from official Swiss health insurance data via primai-okp-api.fly.dev
- Grundversicherung is mandatory for all Swiss residents
- Users provide annual premium budgets (CHF 2400-7200), agent displays monthly costs in CHF (CHF 200-600)
- The agent never provides financial advice or policy recommendations
- Users are always directed to consult licensed insurance professionals or comparis.ch for personalized advice
- Premiums vary by canton, age, deductible (franchise) choice, and insurance model
- All TOOL_CALL operations are mandatory before providing any data to prevent fabrication
- Canton verification ensures location accuracy for premium calculations
- Town names are automatically converted to PLZ codes using OpenPLZ API
- API errors are handled gracefully with clear user guidance