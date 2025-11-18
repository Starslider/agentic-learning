// Medication database and tool implementations for Pharmacist Assistant
// Now with API integration for real medication data

import { getMedicationWithFallback, MedicationApiResult, OpenFDAApiCall } from './medicationApi';

export interface Medication {
  name: string;
  active_ingredient: string;
  strength_mg: number;
  dosage_form: string;
  dosage_instructions: string;
  common_side_effects: string[];
  contraindications: string[];
  requires_prescription: boolean;
  in_stock: boolean;
  manufacturer: string;
  storage_instructions: string;
  alternatives: string[];
}

export interface PrescriptionInfo {
  name: string;
  requires_prescription: boolean;
  prescription_type?: string;
  refills_allowed: boolean;
  max_refills?: number;
  age_restrictions: string;
  general_notes: string;
  insurance_coverage: string;
  generic_available: boolean;
}

export interface StockInfo {
  name: string;
  in_stock: boolean;
  quantity?: number;
  expected_restock_date?: string;
  nearby_availability?: { location: string; in_stock: boolean; quantity: number }[];
}

const mockMedications: { [key: string]: Medication } = {
  "Ibuprofen": {
    name: "Ibuprofen",
    active_ingredient: "Ibuprofen",
    strength_mg: 400,
    dosage_form: "tablet",
    dosage_instructions: "Take 1 tablet every 8 hours with water, not exceeding 1200mg per day.",
    common_side_effects: ["stomach upset", "nausea", "dizziness", "headache"],
    contraindications: ["active stomach ulcer", "severe kidney disease", "aspirin allergy"],
    requires_prescription: false,
    in_stock: true,
    manufacturer: "Generic Pharma",
    storage_instructions: "Store at room temperature away from moisture and heat.",
    alternatives: ["Acetaminophen", "Naproxen"]
  },
  "Aspirin": {
    name: "Aspirin",
    active_ingredient: "Acetylsalicylic acid",
    strength_mg: 325,
    dosage_form: "tablet",
    dosage_instructions: "Take 1 tablet daily with water, or as directed by physician.",
    common_side_effects: ["stomach upset", "heartburn", "nausea"],
    contraindications: ["bleeding disorders", "stomach ulcers", "aspirin allergy"],
    requires_prescription: false,
    in_stock: false,
    manufacturer: "Bayer",
    storage_instructions: "Store at room temperature in a dry place.",
    alternatives: ["Ibuprofen", "Naproxen"]
  },
  "Loratadine": {
    name: "Loratadine",
    active_ingredient: "Loratadine",
    strength_mg: 10,
    dosage_form: "tablet",
    dosage_instructions: "Take 1 tablet once daily for allergy relief.",
    common_side_effects: ["headache", "dry mouth"],
    contraindications: ["severe liver disease"],
    requires_prescription: false,
    in_stock: true,
    manufacturer: "Schering-Plough",
    storage_instructions: "Store at room temperature away from moisture.",
    alternatives: ["Cetirizine", "Fexofenadine"]
  }
};

const mockPrescriptions: { [key: string]: PrescriptionInfo } = {
  "Ibuprofen": {
    name: "Ibuprofen",
    requires_prescription: false,
    prescription_type: undefined,
    refills_allowed: false,
    max_refills: undefined,
    age_restrictions: "Not recommended for children under 6 months without physician guidance.",
    general_notes: "Available over-the-counter for adults. Consult a doctor for long-term use exceeding 10 days.",
    insurance_coverage: "typically covered",
    generic_available: true
  },
  "Aspirin": {
    name: "Aspirin",
    requires_prescription: false,
    prescription_type: undefined,
    refills_allowed: false,
    max_refills: undefined,
    age_restrictions: "Not recommended for children under 12 without medical advice.",
    general_notes: "Available over-the-counter. May interact with blood thinners.",
    insurance_coverage: "typically covered",
    generic_available: true
  },
  "Loratadine": {
    name: "Loratadine",
    requires_prescription: false,
    prescription_type: undefined,
    refills_allowed: false,
    max_refills: undefined,
    age_restrictions: "Safe for children 2 years and older.",
    general_notes: "Non-drowsy antihistamine for allergy relief.",
    insurance_coverage: "typically covered",
    generic_available: true
  }
};

const mockStock: { [key: string]: StockInfo } = {
  "Ibuprofen": {
    name: "Ibuprofen",
    in_stock: true,
    quantity: 50,
    nearby_availability: [
      { location: "Branch A", in_stock: true, quantity: 15 }
    ]
  },
  "Aspirin": {
    name: "Aspirin",
    in_stock: false,
    expected_restock_date: "2024-12-15",
    nearby_availability: [
      { location: "Branch B", in_stock: true, quantity: 20 }
    ]
  },
  "Loratadine": {
    name: "Loratadine",
    in_stock: true,
    quantity: 30
  }
};

/**
 * Get medication by name - ALWAYS uses API first for any medication
 * This queries the openFDA API for real medication data
 * Returns both the medication and API call metadata
 */
export async function getMedicationByName(
  name: string, 
  strength_mg?: number
): Promise<{ medication: Medication | { error: string }; apiCall: OpenFDAApiCall | null }> {
  console.log(`[Tools] Querying API for medication: ${name}`);
  
  // Always try API first - no hardcoded list dependency
  const { result: apiResult, apiCall } = await getMedicationWithFallback(name);
  
  if (apiResult.error) {
    // API failed - return error (no fallback to hardcoded list)
    console.log(`[Tools] API query failed for ${name}: ${apiResult.error}`);
    return { 
      medication: { error: apiResult.error || "Medication not found in database. Please verify the medication name and try again." },
      apiCall
    };
  }
  
  // Convert API result to Medication format
  const medication: Medication = {
    name: apiResult.name,
    active_ingredient: apiResult.active_ingredient || name,
    strength_mg: apiResult.strength_mg || 0,
    dosage_form: apiResult.dosage_form || 'tablet',
    dosage_instructions: apiResult.dosage_instructions || 'See package insert for dosage information',
    common_side_effects: apiResult.common_side_effects || [],
    contraindications: apiResult.contraindications || [],
    requires_prescription: apiResult.requires_prescription ?? false,
    in_stock: true, // Stock info is separate (would need separate API/service)
    manufacturer: apiResult.manufacturer || 'Unknown',
    storage_instructions: apiResult.storage_instructions || 'Store at room temperature',
    alternatives: [] // Would need additional API call to get alternatives
  };
  
  if (strength_mg && medication.strength_mg !== 0 && medication.strength_mg !== strength_mg) {
    return { 
      medication: { error: `Medication found but strength mismatch. Found: ${medication.strength_mg}mg, requested: ${strength_mg}mg` },
      apiCall
    };
  }
  
  console.log(`[Tools] Successfully retrieved medication data for ${name} from API`);
  return { medication, apiCall };
}

export function checkStockAvailability(name: string): StockInfo | { error: string } {
  // Stock information would need a separate API/service
  // For now, return a generic response indicating stock check is not available via API
  return { 
    name,
    in_stock: true, // Default to in stock, but indicate this is not from real inventory
    error: "Real-time stock information is not available. Please contact the pharmacy directly for current availability."
  };
}

export async function getPrescriptionRequirements(name: string): Promise<PrescriptionInfo | { error: string }> {
  // Try to get prescription info from API first
  const { result: apiResult } = await getMedicationWithFallback(name);
  
  if (apiResult.error) {
    return { error: "Prescription information not available for this medication." };
  }
  
  // Extract prescription requirements from API data
  return {
    name: apiResult.name,
    requires_prescription: apiResult.requires_prescription ?? false,
    prescription_type: apiResult.requires_prescription ? 'prescription' : 'over-the-counter',
    refills_allowed: false, // Would need additional API data
    max_refills: undefined,
    age_restrictions: "See package insert or consult pharmacist",
    general_notes: apiResult.contraindications?.length ? `Contraindications: ${apiResult.contraindications.join(', ')}` : "See package insert for complete information",
    insurance_coverage: "Varies by insurance plan",
    generic_available: true // Would need additional API data
  };
}

// Cache for medication dataset to avoid repeated API calls
let datasetCache: { data: any[]; timestamp: number } | null = null;
const DATASET_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get medication dataset - now returns empty/minimal dataset
 * Since we query the API on-demand for any medication, we don't need to pre-populate
 * This is kept for backward compatibility but the agent should query medications individually
 */
export async function getMedicationDataset() {
  console.log('[Tools] Medication dataset requested - using API-first approach (query medications individually)');
  
  // Return empty dataset - medications are queried on-demand via API
  // This tells the agent that it should use getMedicationByName for any medication query
  return [];
}
