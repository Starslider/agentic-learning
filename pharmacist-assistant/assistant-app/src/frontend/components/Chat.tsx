// Chat component for interacting with the assistant

import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface OpenFDAApiCall {
  medicationName: string;
  apiUrl: string;
  status: number;
  statusText: string;
  latencyMs: number;
  success: boolean;
  cached: boolean;
  timestamp: string;
}

interface AgentDebugInfo {
  provider: string;
  model: string;
  apiUrl: string;
  datasetMedicationCount: number;
  medications: string[];
  requestTimestamp: string;
  responseId: string;
  latencyMs?: number;
  requestCharacters?: number;
  requestBytes?: number;
  promptPreview?: string;
  openFDAApiCalls?: OpenFDAApiCall[];
}

interface AgentDebugEntry extends AgentDebugInfo {
  receivedAt: string;
}

interface ChatHistoryItem {
  id: string;
  timestamp: string;
  userMessage: string;
  assistantPreview: string;
  fullMemory: string;
}

const Chat: React.FC = () => {
  // Get or create userId from localStorage
  const getUserId = (): string => {
    let userId = localStorage.getItem('pharmacist-assistant-userId');
    if (!userId) {
      userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('pharmacist-assistant-userId', userId);
    }
    return userId;
  };

  const [userId] = useState<string>(getUserId());
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      text: "Hello! I'm your Pharmacist Assistant. I can help you find information about medications like Ibuprofen, Aspirin, and Loratadine. You can ask me about:\n\n• Medication details and dosage\n• Stock availability\n• Prescription requirements\n\nHow can I assist you today?",
      sender: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [latestDebug, setLatestDebug] = useState<AgentDebugEntry | null>(null);
  const [debugHistory, setDebugHistory] = useState<AgentDebugEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch chat history when sidebar opens
  useEffect(() => {
    if (historyOpen) {
      const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
          const response = await fetch(`/api/history?userId=${encodeURIComponent(userId)}`);
          if (response.ok) {
            const data = await response.json();
            setChatHistory(data.conversations || []);
          }
        } catch (error) {
          console.error('Error fetching history:', error);
        } finally {
          setLoadingHistory(false);
        }
      };
      fetchHistory();
    }
  }, [historyOpen, userId]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: input, userId })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: Date.now() + 1,
        text: data.response,
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      if (data.debug) {
        const debugEntry: AgentDebugEntry = {
          ...data.debug,
          receivedAt: new Date().toISOString()
        };
        setLatestDebug(debugEntry);
        setDebugHistory(prev => [debugEntry, ...prev].slice(0, 5));
      }
      // Refresh history if sidebar is open
      if (historyOpen) {
        const fetchHistory = async () => {
          try {
            const response = await fetch(`/api/history?userId=${encodeURIComponent(userId)}`);
            if (response.ok) {
              const data = await response.json();
              setChatHistory(data.conversations || []);
            }
          } catch (error) {
            console.error('Error fetching history:', error);
          }
        };
        fetchHistory();
      }
    } catch (error) {
      console.error('Error:', error);
      setLatestDebug(null);
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: '❌ Sorry, there was an error processing your message. Please try again.',
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessage = (text: string) => {
    // Simple markdown-like formatting
    return text
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('## ')) {
          return <h3 key={i}>{line.substring(3)}</h3>;
        } else if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i}><strong>{line.substring(2, line.length - 2)}</strong></p>;
        } else if (line.startsWith('• ')) {
          return <li key={i}>{line.substring(2)}</li>;
        } else if (line === '---') {
          return <hr key={i} />;
        } else if (line.includes('**')) {
          // Bold text within line
          const parts = line.split('**');
          return (
            <p key={i}>
              {parts.map((part, j) =>
                j % 2 === 1 ? <strong key={j}>{part}</strong> : part
              )}
            </p>
          );
        } else if (line.trim()) {
          return <p key={i}>{line}</p>;
        }
        return <br key={i} />;
      });
  };

  const formatBytes = (bytes?: number) => {
    if (bytes === undefined || bytes === null) return '—';
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="chat-wrapper">
      {/* History Sidebar */}
      <div className={`history-sidebar ${historyOpen ? 'open' : ''}`}>
        <div className="history-header">
          <h3>📜 Chat History</h3>
          <button 
            className="close-history-btn"
            onClick={() => setHistoryOpen(false)}
            aria-label="Close history"
          >
            ✕
          </button>
        </div>
        <div className="history-content">
          {loadingHistory ? (
            <div className="history-loading">Loading history...</div>
          ) : chatHistory.length === 0 ? (
            <div className="history-empty">
              <p>No chat history yet.</p>
              <p>Start a conversation to see it here!</p>
            </div>
          ) : (
            <div className="history-list">
              {chatHistory.map((item) => (
                <div 
                  key={item.id} 
                  className="history-item"
                  onClick={() => {
                    // Parse and display the conversation
                    const userMsg = item.userMessage;
                    const assistantMsg = item.assistantPreview + '...';
                    setMessages([
                      {
                        id: 0,
                        text: "Hello! I'm your Pharmacist Assistant. I can help you find information about medications like Ibuprofen, Aspirin, and Loratadine. You can ask me about:\n\n• Medication details and dosage\n• Stock availability\n• Prescription requirements\n\nHow can I assist you today?",
                        sender: 'assistant',
                        timestamp: new Date()
                      },
                      {
                        id: 1,
                        text: userMsg,
                        sender: 'user',
                        timestamp: new Date(item.timestamp)
                      },
                      {
                        id: 2,
                        text: assistantMsg,
                        sender: 'assistant',
                        timestamp: new Date(item.timestamp)
                      }
                    ]);
                    setHistoryOpen(false);
                  }}
                >
                  <div className="history-item-header">
                    <span className="history-time">
                      {new Date(item.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="history-item-preview">
                    <strong>Q:</strong> {item.userMessage.substring(0, 60)}
                    {item.userMessage.length > 60 ? '...' : ''}
                  </div>
                  <div className="history-item-preview assistant-preview">
                    <strong>A:</strong> {item.assistantPreview.substring(0, 80)}
                    {item.assistantPreview.length > 80 ? '...' : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="chat-container">
        {/* History Toggle Button */}
        <button 
          className="history-toggle-btn"
          onClick={() => setHistoryOpen(!historyOpen)}
          aria-label="Toggle chat history"
        >
          {historyOpen ? '✕' : '📜'}
        </button>

        <div className="messages-container">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.sender}`}>
            <div className="message-avatar">
              {msg.sender === 'user' ? '👤' : '💊'}
            </div>
            <div className="message-content">
              <div className="message-header">
                <span className="message-sender">
                  {msg.sender === 'user' ? 'You' : 'Pharmacist Assistant'}
                </span>
                <span className="message-time">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="message-text">
                {formatMessage(msg.text)}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="message assistant">
            <div className="message-avatar">💊</div>
            <div className="message-content">
              <div className="message-header">
                <span className="message-sender">Pharmacist Assistant</span>
              </div>
              <div className="message-text typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="input-container">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask about medications, stock availability, or prescription requirements..."
          disabled={loading}
          rows={2}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="send-button"
        >
          {loading ? '⏳' : '📤'}
        </button>
      </div>

      <div className="debug-panel">
        <div className="debug-panel-header">
          <div>
            <h3>🔍 Agent Debug</h3>
            <p>Verify requests to xAI Grok API and OpenFDA API.</p>
          </div>
          {latestDebug && (
            <span className="debug-timestamp">
              Last call at{' '}
              {new Date(latestDebug.receivedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
          )}
        </div>

        {latestDebug ? (
          <>
            <div className="debug-grid">
              <div>
                <span className="debug-label">Provider</span>
                <strong>{latestDebug.provider}</strong>
              </div>
              <div>
                <span className="debug-label">Model</span>
                <strong>{latestDebug.model}</strong>
              </div>
              <div>
                <span className="debug-label">Response ID</span>
                <span>{latestDebug.responseId}</span>
              </div>
              <div>
                <span className="debug-label">Latency</span>
                <span>{latestDebug.latencyMs ? `${latestDebug.latencyMs} ms` : '—'}</span>
              </div>
              <div>
                <span className="debug-label">Payload Size</span>
                <span>{formatBytes(latestDebug.requestBytes)} ({latestDebug.requestCharacters ?? '—'} chars)</span>
              </div>
              <div>
                <span className="debug-label">API URL</span>
                <span className="debug-url">{latestDebug.apiUrl}</span>
              </div>
            </div>

            <div className="debug-medications">
              <strong>Queried medications ({latestDebug.datasetMedicationCount})</strong>
              <p>{latestDebug.medications.join(', ') || 'No medications queried'}</p>
            </div>

            {latestDebug.openFDAApiCalls && latestDebug.openFDAApiCalls.length > 0 && (
              <details className="debug-details" open>
                <summary>
                  <strong>OpenFDA API Calls ({latestDebug.openFDAApiCalls.length})</strong>
                </summary>
                <div style={{ marginTop: '12px' }}>
                  {latestDebug.openFDAApiCalls.map((apiCall, index) => (
                    <div
                      key={`${apiCall.medicationName}-${apiCall.timestamp}-${index}`}
                      style={{
                        background: apiCall.success ? '#1e3a1e' : '#3a1e1e',
                        border: `1px solid ${apiCall.success ? '#2d5a2d' : '#5a2d2d'}`,
                        borderRadius: '6px',
                        padding: '12px',
                        marginBottom: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ color: apiCall.success ? '#4ec9b0' : '#f48771' }}>
                          {apiCall.medicationName}
                        </strong>
                        <span style={{ fontSize: '12px', color: '#858585' }}>
                          {apiCall.cached ? '📦 Cached' : '🌐 API'}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '12px' }}>
                        <div>
                          <span style={{ color: '#858585' }}>Status:</span>{' '}
                          <span style={{ color: apiCall.success ? '#4ec9b0' : '#f48771' }}>
                            {apiCall.status} {apiCall.statusText}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#858585' }}>Latency:</span>{' '}
                          <span>{apiCall.latencyMs} ms</span>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <span style={{ color: '#858585' }}>URL:</span>{' '}
                          <span className="debug-url" style={{ fontSize: '11px', wordBreak: 'break-all' }}>
                            {apiCall.apiUrl}
                          </span>
                        </div>
                        <div style={{ gridColumn: '1 / -1', fontSize: '11px', color: '#858585' }}>
                          {new Date(apiCall.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {latestDebug.promptPreview && (
              <details className="debug-details">
                <summary>Prompt preview</summary>
                <pre>{latestDebug.promptPreview}</pre>
              </details>
            )}

            <details className="debug-details">
              <summary>Raw debug JSON</summary>
              <pre>{JSON.stringify(latestDebug, null, 2)}</pre>
            </details>

            {debugHistory.length > 1 && (
              <details className="debug-details">
                <summary>Recent history ({debugHistory.length - 1} earlier calls)</summary>
                <ul>
                  {debugHistory.slice(1).map(entry => (
                    <li key={`${entry.responseId}-${entry.receivedAt}`}>
                      {new Date(entry.receivedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}{' '}
                      — {entry.model} ({formatBytes(entry.requestBytes)})
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        ) : (
          <p className="debug-empty">No API calls yet. Send a question to see Grok activity.</p>
        )}
      </div>
      </div>
    </div>
  );
};

export default Chat;
