// Simple, reliable memory management using SQLite
// No external dependencies beyond better-sqlite3

import Database from 'better-sqlite3';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'conversations.db');

// Initialize database connection
let db: Database.Database | null = null;

function initializeDatabase(): Database.Database {
  if (!db) {
    console.log(`[Memory] Initializing database at: ${dbPath}`);
    try {
      db = new Database(dbPath);
      
      // Enable foreign keys and WAL mode for better performance
      db.pragma('journal_mode = WAL');
      
      // Create conversations table if it doesn't exist
      db.exec(`
        CREATE TABLE IF NOT EXISTS conversations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          user_message TEXT NOT NULL,
          assistant_response TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create indexes separately - use IF NOT EXISTS syntax that works in newer SQLite
      // If it fails, the index might already exist which is fine
      try {
        db.exec(`CREATE INDEX IF NOT EXISTS idx_user_id ON conversations(user_id)`);
      } catch (e: any) {
        // Index might already exist, that's fine
        if (e && !e.message?.includes('already exists')) {
          console.log('[Memory] Note: Could not create idx_user_id (may already exist)');
        }
      }
      
      try {
        db.exec(`CREATE INDEX IF NOT EXISTS idx_timestamp ON conversations(timestamp)`);
      } catch (e: any) {
        // Index might already exist, that's fine
        if (e && !e.message?.includes('already exists')) {
          console.log('[Memory] Note: Could not create idx_timestamp (may already exist)');
        }
      }
      
      // Verify table exists
      const tableCheck = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='conversations'`).get();
      if (!tableCheck) {
        throw new Error('Failed to create conversations table');
      }
      
      console.log(`[Memory] Conversations table created/verified`);
    } catch (err) {
      console.error('[Memory] Error initializing database:', err);
      // Try to close and recreate if there's a critical error
      if (db) {
        try {
          db.close();
        } catch (closeErr) {
          // Ignore close errors
        }
        db = null;
      }
      throw err;
    }
    
    // Create search index for full-text search (optional, for better performance)
    try {
      db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS conversations_fts USING fts5(
          user_id,
          user_message,
          assistant_response,
          content='conversations',
          content_rowid='id'
        )
      `);
      
      // Trigger to keep FTS index updated
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS conversations_fts_insert AFTER INSERT ON conversations BEGIN
          INSERT INTO conversations_fts(rowid, user_id, user_message, assistant_response)
          VALUES (new.id, new.user_id, new.user_message, new.assistant_response);
        END
      `);
      
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS conversations_fts_delete AFTER DELETE ON conversations BEGIN
          DELETE FROM conversations_fts WHERE rowid = old.id;
        END
      `);
      
      console.log(`[Memory] FTS5 index created`);
    } catch (err) {
      // FTS5 might not be available, that's okay - we'll use regular search
      console.log('[Memory] FTS5 not available, using regular text search:', err instanceof Error ? err.message : String(err));
    }
    
    console.log(`[Memory] Database initialized successfully`);
  }
  return db;
}

function getDatabase(): Database.Database {
  return initializeDatabase();
}

// Initialize database immediately when module loads
initializeDatabase();

export interface MemoryContext {
  memories: Array<{
    memory: string;
    metadata?: Record<string, any>;
  }>;
}

export interface Conversation {
  id: string;
  timestamp: string;
  userMessage: string;
  assistantPreview: string;
  fullMemory: string;
}

/**
 * Store a conversation exchange
 */
export async function storeConversation(
  userId: string,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  try {
    const database = getDatabase();
    const timestamp = new Date().toISOString();
    
    const stmt = database.prepare(`
      INSERT INTO conversations (user_id, user_message, assistant_response, timestamp)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(userId, userMessage, assistantResponse, timestamp);
    
    console.log(`[Memory] Stored conversation for userId: ${userId}`);
  } catch (error) {
    console.error('Error storing conversation:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
    // Don't throw - memory storage failures shouldn't break the chat
  }
}

/**
 * Retrieve relevant conversations for a user based on their query
 * Uses simple text matching - can be enhanced with embeddings later if needed
 */
export async function getRelevantMemories(
  userId: string,
  query: string,
  limit: number = 5
): Promise<MemoryContext> {
  try {
    const database = getDatabase();
    
    // Try FTS5 search first, fallback to regular LIKE search
    try {
      // Use FTS5 for better search if available
      // First check if FTS table exists
      const ftsCheck = database.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='conversations_fts'`).get();
      
      if (ftsCheck) {
        // FTS5 query - need to join with main table to get id and timestamp
        // FTS5 MATCH must be in the FROM clause, not WHERE
        const stmt = database.prepare(`
          SELECT 
            c.id,
            c.user_message,
            c.assistant_response,
            c.timestamp
          FROM conversations c
          INNER JOIN conversations_fts fts ON c.id = fts.rowid
          WHERE fts.user_id = ? 
            AND fts MATCH ?
          LIMIT ?
        `);
        
        const searchTerm = query.trim() ? query : '*';
        const results = stmt.all(userId, searchTerm, limit);
        
        if (results && results.length > 0) {
          return {
            memories: results.map((row: any) => ({
              memory: `User: ${row.user_message}\nAssistant: ${row.assistant_response}`,
              metadata: {
                id: row.id,
                timestamp: row.timestamp,
                userId: userId
              }
            }))
          };
        }
      }
    } catch (ftsError) {
      // FTS5 not available or query failed, fall through to regular search
      console.log('[Memory] FTS5 search failed, using regular search:', ftsError instanceof Error ? ftsError.message : String(ftsError));
    }
    
    // Fallback to regular LIKE search
    try {
      const stmt = database.prepare(`
        SELECT 
          id,
          user_message,
          assistant_response,
          timestamp
        FROM conversations
        WHERE user_id = ? 
          AND (user_message LIKE ? OR assistant_response LIKE ?)
        ORDER BY timestamp DESC
        LIMIT ?
      `);
      
      const likeTerm = `%${query}%`;
      const results = stmt.all(userId, likeTerm, likeTerm, limit);
      
      return {
        memories: results.map((row: any) => ({
          memory: `User: ${row.user_message}\nAssistant: ${row.assistant_response}`,
          metadata: {
            id: row.id,
            timestamp: row.timestamp,
            userId: userId
          }
        }))
      };
    } catch (error) {
      console.error('[Memory] Error in regular search fallback:', error);
      return { memories: [] };
    }
  } catch (error) {
    console.error('Error retrieving memories:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
    return { memories: [] };
  }
}

/**
 * Get all conversations for a user (for history panel)
 */
export async function getAllMemories(userId: string): Promise<MemoryContext> {
  try {
    const database = getDatabase();
    
    const stmt = database.prepare(`
      SELECT 
        id,
        user_message,
        assistant_response,
        timestamp
      FROM conversations
      WHERE user_id = ?
      ORDER BY timestamp DESC
    `);
    
    const results = stmt.all(userId);
    
    return {
      memories: results.map((row: any) => ({
        memory: `User: ${row.user_message}\nAssistant: ${row.assistant_response}`,
        metadata: {
          id: row.id,
          timestamp: row.timestamp,
          userId: userId,
          userMessage: row.user_message,
          assistantResponsePreview: row.assistant_response.substring(0, 200)
        }
      }))
    };
  } catch (error) {
    console.error('Error getting all memories:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
    return { memories: [] };
  }
}

/**
 * Get conversation count for a user (for debugging)
 */
export function getConversationCount(userId: string): number {
  try {
    const database = getDatabase();
    const stmt = database.prepare('SELECT COUNT(*) as count FROM conversations WHERE user_id = ?');
    const result = stmt.get(userId) as { count: number };
    return result.count;
  } catch (error) {
    console.error('Error getting conversation count:', error);
    return 0;
  }
}
