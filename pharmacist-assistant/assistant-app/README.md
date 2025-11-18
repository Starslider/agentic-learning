# Pharmacist Assistant Chat Application

A TypeScript-based AI-powered chat application that provides factual information about medications using an LLM agent, real-time API integration, and RAG (Retrieval-Augmented Generation) for semantic search.

## Features

- 🤖 **LLM-Powered Agent**: Uses xAI Grok API for intelligent medication information retrieval and response generation
- 💊 **Real Medication Data**: Integrates with OpenFDA API to fetch real medication information for ANY medication (not limited to a hardcoded list)
- 🔍 **RAG System**: Retrieval-Augmented Generation with semantic search to find relevant medications based on meaning, not just exact name matches
- 💾 **Conversation Memory**: SQLite-based memory system stores conversation history for context-aware responses
- 📜 **Chat History**: Sidebar panel to view and retrieve past conversations
- 🎨 **Dark Theme UI**: Modern dark theme interface inspired by Cursor IDE, full-height chat window
- 🔧 **Debug Panel**: Real-time visibility into xAI Grok and OpenFDA API calls, including latency, status, and payload information
- 📊 **Smart Medication Extraction**: Automatically extracts medication names from user queries using pattern matching
- ⚡ **API-First Architecture**: Queries medications on-demand via OpenFDA API, with intelligent caching
- 📝 **Concise Responses**: Short, user-friendly answers focusing on essential information (2-4 sentences)
- 🧪 **Evaluation Script**: Built-in testing script to verify functionality

## Technology Stack

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, TypeScript, Parcel
- **LLM**: xAI Grok API (grok-3 model)
- **APIs**: OpenFDA API for medication data
- **Database**: SQLite (better-sqlite3) for memory and RAG storage
- **Embeddings**: OpenAI API (optional) or fallback TF-IDF for RAG
- **Containerization**: Docker (multi-stage build)

## Project Structure

```
assistant-app/
├── src/
│   ├── backend/
│   │   ├── index.ts          # Express server with logging
│   │   ├── agents.ts         # LLM agent logic with Grok integration
│   │   ├── tools.ts          # Medication API integration
│   │   ├── grokClient.ts     # xAI Grok API client
│   │   ├── medicationApi.ts  # OpenFDA API client with caching
│   │   ├── memory.ts         # SQLite-based conversation memory
│   │   └── rag.ts            # RAG system for semantic search
│   └── frontend/
│       ├── index.html        # HTML template with dark theme styles
│       ├── index.tsx         # React entry point
│       ├── App.tsx           # Main app component
│       └── components/
│           └── Chat.tsx      # Chat interface with history sidebar
├── data/                     # SQLite databases (gitignored)
│   ├── conversations.db     # Conversation memory
│   └── rag_embeddings.db    # RAG vector store
├── logs/                     # Server logs (gitignored)
├── eval.js                   # Evaluation script
├── Dockerfile                # Multi-stage Docker build
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript config for backend
└── tsconfig.frontend.json   # TypeScript config for frontend
```

## Setup and Installation

### Prerequisites

- Node.js 18+ (for local development)
- Docker (for containerized deployment)

### Environment

Create a `.env` file in the `assistant-app` directory with your API credentials:

```env
# Required: xAI Grok API for LLM responses
XAI_API_KEY=your-xai-grok-api-key
XAI_MODEL=grok-3
# Optional override (defaults to https://api.x.ai/v1/chat/completions)
# XAI_API_URL=https://api.x.ai/v1/chat/completions

# Optional: OpenAI API for better RAG embeddings (falls back to simple method if not set)
OPENAI_API_KEY=your-openai-api-key

# Optional: OpenFDA API key for higher rate limits (works without it)
OPENFDA_API_KEY=your-openfda-api-key

# Optional: Disable medication API (default: true)
# USE_MEDICATION_API=false
```

> **Security note**: Never commit your real API keys to Git. Keep `.env` out of version control.

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build the application**:
   ```bash
   npm run build
   npm run build:frontend
   ```

3. **Start the server** (reads API keys from `.env`):
   ```bash
   npm start
   ```

4. **Access the application**:
   Open your browser and navigate to `http://localhost:3000`

5. **Run evaluations** (optional):
   ```bash
   npm run eval
   ```

### Development Mode

For development with hot reloading:

```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
npm run dev:frontend
```

## Docker Deployment

### Build the Docker image

```bash
docker build -t pharmacist-assistant .
```

### Run the container

```bash
docker run -p 3000:3000 pharmacist-assistant
```

The application will be available at `http://localhost:3000`

### Docker Compose (Optional)

Create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  pharmacist-assistant:
    build: .
    ports:
      - "3000:3000"
    restart: unless-stopped
```

Run with:
```bash
docker-compose up -d
```

## Usage Examples

### Ask about any medication (queries OpenFDA API)
```
"Tell me about Ibuprofen"
"What is Aspirin used for?"
"Information about Amtagvi"
"Do you have Metformin?"
"I need information for Actemra"
```

### Semantic search (RAG-powered)
```
"What helps with pain?"           # Finds pain medications
"What's good for allergies?"       # Finds allergy medications
"Medications for inflammation"      # Finds anti-inflammatory drugs
```

### Check stock availability
```
"Is Ibuprofen in stock?"
"Do you have Aspirin available?"
```

### Prescription information
```
"Do I need a prescription for Ibuprofen?"
"What are the prescription requirements for Aspirin?"
```

### View chat history
- Click the history button (📜) in the top-right corner
- View past conversations
- Click any conversation to see full details

## Architecture

### Agent Flow

1. **User Input** → User sends a message through the chat interface
2. **Memory Retrieval** → System retrieves relevant conversation history from SQLite
3. **RAG Search** → Semantic search finds relevant medications from knowledge base
4. **Medication Extraction** → Pattern matching extracts medication names from query
5. **API Queries** → OpenFDA API is queried for extracted medications
6. **RAG Storage** → Retrieved medications are stored with embeddings for future semantic search
7. **LLM Processing** → xAI Grok processes query with context (memory, RAG results, API data)
8. **Response Generation** → Agent generates concise, user-friendly response
9. **Memory Storage** → Conversation is stored in SQLite for future context
10. **Display** → Response is displayed in the chat interface with debug information

### Key Components

- **Express Server** (`src/backend/index.ts`): REST API with file logging, chat and history endpoints
- **Agent Logic** (`src/backend/agents.ts`): LLM-powered agent with Grok integration, medication extraction, RAG integration
- **Grok Client** (`src/backend/grokClient.ts`): xAI Grok API client with error handling
- **Medication API** (`src/backend/medicationApi.ts`): OpenFDA API integration with caching and fallback
- **Tools** (`src/backend/tools.ts`): Medication data transformation and API integration
- **Memory System** (`src/backend/memory.ts`): SQLite-based conversation memory with FTS5 search
- **RAG System** (`src/backend/rag.ts`): Vector embeddings and semantic search for medications
- **Chat UI** (`src/frontend/components/Chat.tsx`): Interactive chat interface with history sidebar and debug panel

## API Endpoints

### POST `/api/chat`

Send a message to the assistant.

**Request Body**:
```json
{
  "message": "Tell me about Ibuprofen",
  "userId": "user-123"  // Optional, auto-generated if not provided
}
```

**Response**:
```json
{
  "response": "Concise medication information response",
  "debug": {
    "provider": "xAI Grok",
    "model": "grok-3",
    "apiUrl": "https://api.x.ai/v1/chat/completions",
    "latencyMs": 1234,
    "requestBytes": 2048,
    "openFDAApiCalls": [
      {
        "medicationName": "Ibuprofen",
        "apiUrl": "https://api.fda.gov/drug/label.json?...",
        "status": 200,
        "latencyMs": 456,
        "success": true,
        "cached": false
      }
    ]
  }
}
```

### GET `/api/history`

Retrieve conversation history for a user.

**Query Parameters**:
- `userId` (required): User identifier

**Response**:
```json
{
  "conversations": [
    {
      "id": "1",
      "timestamp": "2025-11-18T12:00:00.000Z",
      "userMessage": "Tell me about Ibuprofen",
      "assistantPreview": "Ibuprofen is a nonsteroidal anti-inflammatory drug...",
      "fullMemory": "User: Tell me about Ibuprofen\nAssistant: ..."
    }
  ]
}
```

### GET `/api/health`

Health check endpoint.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-18T12:00:00.000Z"
}
```

## Key Features Explained

### RAG (Retrieval-Augmented Generation)

The RAG system enables semantic search over medication data:
- **Automatic Storage**: Medications fetched from OpenFDA are automatically stored with embeddings
- **Semantic Search**: Find medications based on meaning (e.g., "pain relief" finds Ibuprofen, Aspirin)
- **Vector Database**: Uses SQLite with embeddings stored as JSON vectors
- **Embedding Options**: Uses OpenAI API if available, falls back to simple TF-IDF method
- **Knowledge Base**: Builds a searchable knowledge base as users query medications

### Memory System

- **SQLite Storage**: Conversations stored in `data/conversations.db`
- **FTS5 Search**: Full-text search for retrieving relevant conversation history
- **Context-Aware**: Provides conversation context to LLM for better responses
- **User Sessions**: Tracks conversations per user ID (stored in localStorage)

### OpenFDA Integration

- **Real-Time Data**: Fetches real medication information from FDA database
- **Any Medication**: Works with ANY medication, not just hardcoded list
- **Intelligent Caching**: 24-hour cache to reduce API calls
- **Graceful Fallback**: Falls back to mock data if API fails
- **Error Handling**: Comprehensive error handling and logging

### Debug Panel

The debug panel shows:
- **xAI Grok API**: Model, latency, payload size, response ID
- **OpenFDA API Calls**: Status, latency, cache status for each medication query
- **Request Details**: Full API URLs, timestamps, and metadata
- **History**: Recent API calls for debugging

## Extending the Application

### Adding New Medications

The system automatically queries OpenFDA for any medication. No manual addition needed! However, you can add mock fallback data in `src/backend/medicationApi.ts` if needed.

### Customizing RAG

- Edit `src/backend/rag.ts` to adjust embedding models or similarity thresholds
- Modify `retrieveRelevantMedications()` to change retrieval logic
- Adjust similarity threshold (currently 0.3) for more/less strict matching

### Adding New Tools

1. Create the tool function in `src/backend/tools.ts`
2. Update `getMedicationByName()` or create new tool functions
3. Integrate tool calls in `src/backend/agents.ts`
4. Update the system prompt to inform the LLM about new tools

## Testing

### Run Evaluations

The application includes an evaluation script to test functionality:

```bash
npm run eval
```

This will test:
- Health check endpoint
- Chat message processing
- Memory storage and retrieval
- API integration
- Error handling

### Manual Testing

1. Start the server: `npm start`
2. Open `http://localhost:3000`
3. Try various medication queries
4. Check the debug panel for API call information
5. Use the history sidebar to view past conversations

## Important Notes

⚕️ **Medical Disclaimer**: This application provides factual medication information only. It does NOT provide medical advice, diagnoses, or treatment recommendations. Users should always consult licensed healthcare professionals for personalized medical guidance.

🔒 **Security**: 
- Never commit API keys to version control
- The `.env` file is gitignored
- All API keys should be kept secure

📊 **Data Storage**:
- Conversation data is stored locally in SQLite
- RAG embeddings are stored locally
- No data is sent to external services except API calls (xAI, OpenFDA, optional OpenAI)

## License

This project is part of the agentic-learning repository and follows the same license terms.

## Contributing

For guidelines on contributing to this project, please refer to the main repository's CONTRIBUTING.md file.
