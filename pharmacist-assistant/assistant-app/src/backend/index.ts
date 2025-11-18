// Backend server for Pharmacist Assistant

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { existsSync, mkdirSync, appendFileSync } from 'fs';
import { chatWithMedicationAgent } from './agents';
import { getAllMemories } from './memory';

// Setup logging to file
const logDir = path.join(__dirname, '../../logs');
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}
const logFile = path.join(logDir, `server-${new Date().toISOString().split('T')[0]}.log`);

// Override console.log to also write to file
const originalLog = console.log;
const originalError = console.error;
console.log = (...args: any[]) => {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
  const timestamp = new Date().toISOString();
  originalLog(...args);
  try {
    appendFileSync(logFile, `[${timestamp}] ${message}\n`);
  } catch (e) {
    // Ignore file write errors
  }
};
console.error = (...args: any[]) => {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
  const timestamp = new Date().toISOString();
  originalError(...args);
  try {
    appendFileSync(logFile, `[${timestamp}] ERROR: ${message}\n`);
  } catch (e) {
    // Ignore file write errors
  }
};

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  const { message, userId } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Use provided userId or generate a session-based one (for anonymous users)
  const sessionUserId = userId || `session-${req.ip}-${Date.now()}`;

  try {
    const agentResponse = await chatWithMedicationAgent(message, sessionUserId);
    res.json({ response: agentResponse.content, debug: agentResponse.debug });
  } catch (error) {
    console.error('Error processing message:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: msg });
  }
});

// Chat history endpoint
app.get('/api/history', async (req, res) => {
  const userId = req.query.userId as string;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    console.log(`[History] Fetching memories for userId: ${userId}`);
    const memories = await getAllMemories(userId);
    console.log(`[History] Retrieved ${memories.memories.length} total memories`);
    
    // Simple format - metadata contains all the info we need
    const conversations = memories.memories.map((m) => ({
      id: m.metadata?.id?.toString() || m.metadata?.timestamp || Date.now().toString(),
      timestamp: m.metadata?.timestamp || new Date().toISOString(),
      userMessage: m.metadata?.userMessage || '',
      assistantPreview: m.metadata?.assistantResponsePreview || m.memory?.substring(0, 200) || '',
      fullMemory: m.memory
    }));
    
    console.log(`[History] Processed ${conversations.length} conversation memories`);
    res.json({ conversations });
  } catch (error) {
    console.error('Error retrieving history:', error);
    res.status(500).json({ error: 'Failed to retrieve chat history' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Pharmacist Assistant server running on http://localhost:${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/api/health`);
});
