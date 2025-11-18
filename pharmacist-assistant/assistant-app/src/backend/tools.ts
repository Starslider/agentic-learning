// Mock database and tool implementations for Pharmacist Assistant

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

export function getMedicationByName(name: string, strength_mg?: number): Medication | { error: string } {
  const med = mockMedications[name];
  if (!med) return { error: "Medication not found" };
  if (strength_mg && med.strength_mg !== strength_mg) return { error: "Medication not found with that strength" };
  return med;
}

export function checkStockAvailability(name: string): StockInfo | { error: string } {
  const stock = mockStock[name];
  if (!stock) return { error: "Stock information not available" };
  return stock;
}

export function getPrescriptionRequirements(name: string): PrescriptionInfo | { error: string } {
  const presc = mockPrescriptions[name];
  if (!presc) return { error: "Prescription information not found" };
  return presc;
}

export function getMedicationDataset() {
  return Object.keys(mockMedications).map((name) => ({
    name,
    medication: mockMedications[name],
    prescription: mockPrescriptions[name] ?? null,
    stock: mockStock[name] ?? null
  }));
}
