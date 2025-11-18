// RAG (Retrieval-Augmented Generation) module for medication information
// Uses embeddings to enable semantic search over medication data

import Database from 'better-sqlite3';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import 'dotenv/config';

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'rag_embeddings.db');

interface MedicationDocument {
  id: number;
  name: string;
  content: string; // Text representation of medication info
  embedding: string; // JSON string of embedding vector
  metadata: string; // JSON string of additional metadata
  created_at: string;
}

let db: Database.Database | null = null;

function initializeDatabase(): Database.Database {
  if (!db) {
    console.log(`[RAG] Initializing database at: ${dbPath}`);
    db = new Database(dbPath);
    
    // Enable WAL mode
    db.pragma('journal_mode = WAL');
    
    // Create medications table with embeddings
    db.exec(`
      CREATE TABLE IF NOT EXISTS medication_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create index on name for quick lookups
    try {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_name ON medication_documents(name)`);
    } catch (e) {
      // Index might already exist
    }
    
    console.log(`[RAG] Database initialized successfully`);
  }
  return db;
}

// Initialize on module load
initializeDatabase();

/**
 * Generate embedding for text using OpenAI API or fallback to simple text similarity
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (apiKey) {
    try {
      console.log(`[RAG] Generating embedding using OpenAI API`);
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small', // Small, efficient model
          input: text
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error(`[RAG] OpenAI embedding failed, using fallback:`, error);
      // Fall through to fallback
    }
  }
  
  // Fallback: Simple TF-IDF-like vector based on word frequencies
  // This is a basic implementation - for production, use proper embeddings
  console.log(`[RAG] Using fallback embedding (simple text similarity)`);
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const wordFreq: { [key: string]: number } = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });
  
  // Create a simple 128-dimensional vector based on word frequencies
  const vector: number[] = new Array(128).fill(0);
  const wordKeys = Object.keys(wordFreq);
  wordKeys.forEach((word, idx) => {
    const hash = word.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = hash % 128;
    vector[index] += wordFreq[word] / wordKeys.length;
  });
  
  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return magnitude > 0 ? vector.map(v => v / magnitude) : vector;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) return 0;
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  return denominator > 0 ? dotProduct / denominator : 0;
}

/**
 * Store medication document with embedding
 */
export async function storeMedicationDocument(
  name: string,
  medicationData: any
): Promise<void> {
  try {
    const database = initializeDatabase();
    
    // Create text representation of medication for embedding
    const contentParts: string[] = [
      `Medication: ${name}`,
      medicationData.active_ingredient ? `Active ingredient: ${medicationData.active_ingredient}` : '',
      medicationData.indications?.[0] ? `Used for: ${medicationData.indications[0]}` : '',
      medicationData.dosage_form ? `Form: ${medicationData.dosage_form}` : '',
      medicationData.common_side_effects?.length ? `Side effects: ${medicationData.common_side_effects.slice(0, 3).join(', ')}` : '',
      medicationData.requires_prescription ? 'Requires prescription' : 'Over-the-counter'
    ].filter(Boolean);
    
    const content = contentParts.join('. ');
    
    // Generate embedding
    const embedding = await generateEmbedding(content);
    
    // Check if document already exists
    const existing = database.prepare('SELECT id FROM medication_documents WHERE name = ?').get(name);
    
    if (existing) {
      // Update existing
      database.prepare(`
        UPDATE medication_documents 
        SET content = ?, embedding = ?, metadata = ?, created_at = CURRENT_TIMESTAMP
        WHERE name = ?
      `).run(content, JSON.stringify(embedding), JSON.stringify(medicationData), name);
      console.log(`[RAG] Updated medication document: ${name}`);
    } else {
      // Insert new
      database.prepare(`
        INSERT INTO medication_documents (name, content, embedding, metadata)
        VALUES (?, ?, ?, ?)
      `).run(name, content, JSON.stringify(embedding), JSON.stringify(medicationData));
      console.log(`[RAG] Stored medication document: ${name}`);
    }
  } catch (error) {
    console.error(`[RAG] Error storing medication document:`, error);
    // Don't throw - RAG is optional enhancement
  }
}

/**
 * Retrieve relevant medications using semantic search
 */
export async function retrieveRelevantMedications(
  query: string,
  limit: number = 5
): Promise<Array<{ name: string; content: string; metadata: any; similarity: number }>> {
  try {
    const database = initializeDatabase();
    
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);
    
    // Get all documents
    const documents = database.prepare('SELECT name, content, embedding, metadata FROM medication_documents').all() as any[];
    
    if (documents.length === 0) {
      return [];
    }
    
    // Calculate similarity for each document
    const results = documents.map(doc => {
      try {
        const docEmbedding = JSON.parse(doc.embedding || '[]');
        const similarity = cosineSimilarity(queryEmbedding, docEmbedding);
        return {
          name: doc.name,
          content: doc.content,
          metadata: JSON.parse(doc.metadata || '{}'),
          similarity
        };
      } catch (error) {
        console.error(`[RAG] Error processing document ${doc.name}:`, error);
        return null;
      }
    }).filter((r): r is NonNullable<typeof r> => r !== null);
    
    // Sort by similarity and return top results
    results.sort((a, b) => b.similarity - a.similarity);
    
    const topResults = results.slice(0, limit).filter(r => r.similarity > 0.3); // Minimum similarity threshold
    
    console.log(`[RAG] Retrieved ${topResults.length} relevant medications for query: "${query}"`);
    return topResults;
  } catch (error) {
    console.error(`[RAG] Error retrieving medications:`, error);
    return [];
  }
}

/**
 * Get medication document by name (exact match)
 */
export function getMedicationDocument(name: string): any | null {
  try {
    const database = initializeDatabase();
    const doc = database.prepare('SELECT * FROM medication_documents WHERE name = ?').get(name) as any;
    
    if (doc) {
      return {
        name: doc.name,
        content: doc.content,
        metadata: JSON.parse(doc.metadata || '{}')
      };
    }
    return null;
  } catch (error) {
    console.error(`[RAG] Error getting medication document:`, error);
    return null;
  }
}

