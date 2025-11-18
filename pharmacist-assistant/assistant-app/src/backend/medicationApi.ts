// Medication API client for fetching real drug information
// Uses openFDA API (https://open.fda.gov/) - free public API

import 'dotenv/config';

export interface MedicationApiResult {
  name: string;
  active_ingredient?: string;
  strength_mg?: number;
  dosage_form?: string;
  dosage_instructions?: string;
  common_side_effects?: string[];
  contraindications?: string[];
  requires_prescription?: boolean;
  manufacturer?: string;
  storage_instructions?: string;
  warnings?: string[];
  indications?: string[];
  error?: string;
}

export interface OpenFDAApiCall {
  medicationName: string;
  apiUrl: string;
  status: number;
  statusText: string;
  latencyMs: number;
  success: boolean;
  cached: boolean;
  timestamp: string;
}

// Cache for API responses to reduce API calls
const medicationCache = new Map<string, { data: MedicationApiResult; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Search for medication using openFDA API
 * Falls back to mock data if API fails or medication not found
 * Returns both the result and API call metadata
 */
export async function fetchMedicationFromAPI(
  medicationName: string
): Promise<{ result: MedicationApiResult | null; apiCall: OpenFDAApiCall | null }> {
  const timestamp = new Date().toISOString();
  let apiCall: OpenFDAApiCall | null = null;
  
  try {
    // Check cache first
    const cached = medicationCache.get(medicationName.toLowerCase());
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[MedicationAPI] Using cached data for ${medicationName}`);
      // Return cached result with API call info indicating it was cached
      apiCall = {
        medicationName,
        apiUrl: 'https://api.fda.gov/drug/label.json (cached)',
        status: 200,
        statusText: 'OK (cached)',
        latencyMs: 0,
        success: true,
        cached: true,
        timestamp
      };
      return { result: cached.data, apiCall };
    }

    // Try openFDA API
    // Note: openFDA requires proper search syntax
    const searchTerm = encodeURIComponent(medicationName);
    const apiUrl = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${searchTerm}"+OR+openfda.generic_name:"${searchTerm}"&limit=1`;

    console.log(`[MedicationAPI] Fetching from openFDA: ${medicationName}`);
    const startTime = Date.now();
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Pharmacist-Assistant/1.0'
      }
    });
    const latencyMs = Date.now() - startTime;

    // Create API call metadata
    apiCall = {
      medicationName,
      apiUrl,
      status: response.status,
      statusText: response.statusText,
      latencyMs,
      success: response.ok,
      cached: false,
      timestamp
    };

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.log(`[MedicationAPI] openFDA API returned ${response.status}: ${errorText.substring(0, 200)}`);
      return { result: null, apiCall };
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      console.log(`[MedicationAPI] No results from openFDA for ${medicationName}`);
      apiCall.success = false;
      apiCall.statusText = 'No results found';
      return { result: null, apiCall };
    }

    const drug = data.results[0];
    const openfda = drug.openfda || {};
    
    // Extract information from FDA label
    const result: MedicationApiResult = {
      name: medicationName,
      active_ingredient: openfda.substance_name?.[0] || openfda.generic_name?.[0] || medicationName,
      dosage_form: openfda.product_type?.[0] || drug.dosage_and_administration?.[0]?.split(' ')[0] || 'tablet',
      manufacturer: openfda.manufacturer_name?.[0] || 'Unknown',
      requires_prescription: drug.prescription || drug.rx || false,
      storage_instructions: drug.how_supplied?.[0] || drug.storage_and_handling?.[0] || 'Store at room temperature',
      warnings: drug.warnings || drug.warnings_and_cautions || [],
      indications: drug.indications_and_usage || [],
      common_side_effects: extractSideEffects(drug),
      contraindications: extractContraindications(drug),
      dosage_instructions: drug.dosage_and_administration?.[0] || drug.dosage?.[0] || undefined
    };

    // Extract strength if available
    // active_ingredient can be an array or string in FDA data
    const activeIngredientStr = Array.isArray(drug.active_ingredient) 
      ? drug.active_ingredient[0] 
      : (typeof drug.active_ingredient === 'string' ? drug.active_ingredient : '');
    
    if (activeIngredientStr && typeof activeIngredientStr === 'string') {
      const strengthMatch = activeIngredientStr.match(/(\d+)\s*mg/i);
      if (strengthMatch) {
        result.strength_mg = parseInt(strengthMatch[1]);
      }
    }
    
    // Also try to extract from dosage_and_administration or other fields
    if (!result.strength_mg && drug.dosage_and_administration) {
      const dosageText = Array.isArray(drug.dosage_and_administration) 
        ? drug.dosage_and_administration[0] 
        : drug.dosage_and_administration;
      if (typeof dosageText === 'string') {
        const strengthMatch = dosageText.match(/(\d+)\s*mg/i);
        if (strengthMatch) {
          result.strength_mg = parseInt(strengthMatch[1]);
        }
      }
    }

    // Cache the result
    medicationCache.set(medicationName.toLowerCase(), {
      data: result,
      timestamp: Date.now()
    });

    console.log(`[MedicationAPI] Successfully fetched data for ${medicationName}`);
    return { result, apiCall };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error(`[MedicationAPI] Error fetching medication data for ${medicationName}:`, errorMsg);
    if (errorStack) {
      console.error(`[MedicationAPI] Stack trace:`, errorStack);
    }
    
    // Create API call metadata for error case
    apiCall = {
      medicationName,
      apiUrl: `https://api.fda.gov/drug/label.json (error)`,
      status: 0,
      statusText: errorMsg,
      latencyMs: 0,
      success: false,
      cached: false,
      timestamp
    };
    
    return { result: null, apiCall };
  }
}

/**
 * Extract side effects from FDA label
 */
function extractSideEffects(drug: any): string[] {
  const sideEffects: string[] = [];
  
  if (drug.adverse_reactions) {
    const reactions = Array.isArray(drug.adverse_reactions) 
      ? drug.adverse_reactions 
      : [drug.adverse_reactions];
    
    reactions.forEach((reaction: any) => {
      if (typeof reaction === 'string') {
        // Try to extract common side effects from text
        const commonEffects = ['nausea', 'headache', 'dizziness', 'fatigue', 'diarrhea', 'stomach upset'];
        commonEffects.forEach(effect => {
          if (reaction.toLowerCase().includes(effect) && !sideEffects.includes(effect)) {
            sideEffects.push(effect);
          }
        });
      }
    });
  }
  
  return sideEffects.length > 0 ? sideEffects : ['See package insert for complete list'];
}

/**
 * Extract contraindications from FDA label
 */
function extractContraindications(drug: any): string[] {
  const contraindications: string[] = [];
  
  if (drug.contraindications) {
    const contras = Array.isArray(drug.contraindications)
      ? drug.contraindications
      : [drug.contraindications];
    
    contras.forEach((contra: any) => {
      if (typeof contra === 'string') {
        // Extract key contraindications
        const commonContras = ['pregnancy', 'allergy', 'liver disease', 'kidney disease', 'bleeding'];
        commonContras.forEach(term => {
          if (contra.toLowerCase().includes(term) && !contraindications.includes(term)) {
            contraindications.push(term);
          }
        });
      }
    });
  }
  
  return contraindications.length > 0 ? contraindications : ['See package insert for complete list'];
}

/**
 * Get medication with fallback to mock data
 * Returns both the result and API call metadata
 */
export async function getMedicationWithFallback(
  medicationName: string
): Promise<{ result: MedicationApiResult; apiCall: OpenFDAApiCall | null }> {
  // Try API first
  const { result: apiResult, apiCall } = await fetchMedicationFromAPI(medicationName);
  
  if (apiResult && !apiResult.error) {
    return { result: apiResult, apiCall };
  }
  
  // Fallback to mock data for common medications
  console.log(`[MedicationAPI] Using fallback data for ${medicationName}`);
  return { result: getMockMedication(medicationName), apiCall };
}

/**
 * Mock medication data as fallback
 */
function getMockMedication(name: string): MedicationApiResult {
  const mockData: { [key: string]: MedicationApiResult } = {
    "ibuprofen": {
      name: "Ibuprofen",
      active_ingredient: "Ibuprofen",
      strength_mg: 400,
      dosage_form: "tablet",
      dosage_instructions: "Take 1 tablet every 8 hours with water, not exceeding 1200mg per day.",
      common_side_effects: ["stomach upset", "nausea", "dizziness", "headache"],
      contraindications: ["active stomach ulcer", "severe kidney disease", "aspirin allergy"],
      requires_prescription: false,
      manufacturer: "Generic Pharma",
      storage_instructions: "Store at room temperature away from moisture and heat."
    },
    "aspirin": {
      name: "Aspirin",
      active_ingredient: "Acetylsalicylic acid",
      strength_mg: 325,
      dosage_form: "tablet",
      dosage_instructions: "Take 1 tablet daily with water, or as directed by physician.",
      common_side_effects: ["stomach upset", "heartburn", "nausea"],
      contraindications: ["bleeding disorders", "stomach ulcers", "aspirin allergy"],
      requires_prescription: false,
      manufacturer: "Bayer",
      storage_instructions: "Store at room temperature in a dry place."
    },
    "loratadine": {
      name: "Loratadine",
      active_ingredient: "Loratadine",
      strength_mg: 10,
      dosage_form: "tablet",
      dosage_instructions: "Take 1 tablet once daily for allergy relief.",
      common_side_effects: ["headache", "dry mouth"],
      contraindications: ["severe liver disease"],
      requires_prescription: false,
      manufacturer: "Schering-Plough",
      storage_instructions: "Store at room temperature away from moisture."
    }
  };
  
  const normalizedName = name.toLowerCase();
  return mockData[normalizedName] || {
    name,
    error: "Medication information not available. Please consult a pharmacist."
  };
}

