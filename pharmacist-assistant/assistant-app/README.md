# Pharmacist Assistant Chat Application

A TypeScript-based chat application that provides factual information about medications using an agent-based architecture with mock API tools.

## Features

- 💊 **Medication Information**: Get detailed information about medications including dosage, side effects, contraindications, and more
- 📦 **Stock Availability**: Check current stock status and nearby availability
- 📋 **Prescription Requirements**: Learn about prescription requirements, age restrictions, and insurance coverage
- 🤖 **LLM-Powered Agent**: Uses xAI Grok via a server-side agent to interpret questions using your structured medication data
- 🎨 **Modern UI**: Clean, responsive chat interface built with React
- 🐳 **Docker Support**: Easy deployment with containerization

## Supported Medications

Currently supports information about:
- Ibuprofen (400mg)
- Aspirin (325mg)
- Loratadine (10mg)

## Technology Stack

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, TypeScript, Parcel
- **Containerization**: Docker (multi-stage build)

## Project Structure

```
assistant-app/
├── src/
│   ├── backend/
│   │   ├── index.ts          # Express server
│   │   ├── agents.ts         # Agent logic for processing queries
│   │   └── tools.ts          # Mock tool implementations
│   └── frontend/
│       ├── index.html        # HTML template with embedded styles
│       ├── index.tsx         # React entry point
│       ├── App.tsx           # Main app component
│       └── components/
│           └── Chat.tsx      # Chat interface component
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

Create a `.env` file in the `assistant-app` directory with your xAI credentials:

```env
XAI_API_KEY=your-xai-grok-api-key
XAI_MODEL=grok-beta
# Optional override (defaults to https://api.x.ai/v1/chat/completions)
# XAI_API_URL=https://api.x.ai/v1/chat/completions
```

> **Security note**: Never commit your real `XAI_API_KEY` to Git. Keep `.env` out of version control.

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

3. **Start the server** (reads `XAI_API_KEY` and related vars from `.env`):
   ```bash
   npm start
   ```

4. **Access the application**:
   Open your browser and navigate to `http://localhost:3000`

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

### Ask about a medication
```
"Tell me about Ibuprofen"
"What is Aspirin used for?"
```

### Check stock availability
```
"Is Loratadine in stock?"
"Do you have Aspirin available?"
```

### Prescription information
```
"Do I need a prescription for Ibuprofen?"
"What are the prescription requirements for Aspirin?"
```

## Architecture

### Agent Flow

1. **User Input** → User sends a message through the chat interface
2. **Agent Processing** → Agent analyzes the query and determines appropriate action
3. **Tool Selection** → Agent selects relevant tools (medication lookup, stock check, prescription info)
4. **Tool Execution** → Mock tools retrieve data from in-memory database
5. **Response Generation** → Agent formats the results into a user-friendly response
6. **Display** → Response is displayed in the chat interface

### Key Components

- **Express Server** (`src/backend/index.ts`): REST API endpoint for chat messages
- **Agent Logic** (`src/backend/agents.ts`): Query processing and tool orchestration
- **Tools** (`src/backend/tools.ts`): Mock implementations of medication database queries
- **Chat UI** (`src/frontend/components/Chat.tsx`): Interactive chat interface

## API Endpoints

### POST `/api/chat`

Send a message to the assistant.

**Request Body**:
```json
{
  "message": "Is Ibuprofen in stock?"
}
```

**Response**:
```json
{
  "response": "Formatted response with medication information"
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

## Extending the Application

### Adding New Medications

Edit `src/backend/tools.ts` and add entries to:
- `mockMedications`: Medication details
- `mockPrescriptions`: Prescription information
- `mockStock`: Stock availability

### Adding New Tools

1. Create the tool function in `src/backend/tools.ts`
2. Add tool call handling in `src/backend/agents.ts` (`processUserMessage`)
3. Implement tool execution in `simulateToolCalls`
4. Add response formatting in `generateResponseFromToolResults`

## Important Notes

⚕️ **Medical Disclaimer**: This application provides factual medication information only. It does NOT provide medical advice, diagnoses, or treatment recommendations. Users should always consult licensed healthcare professionals for personalized medical guidance.

## License

This project is part of the agentic-learning repository and follows the same license terms.

## Contributing

For guidelines on contributing to this project, please refer to the main repository's CONTRIBUTING.md file.
