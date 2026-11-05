// =============================================================================
// HOTEL BOOKING SYSTEM - CHAT TYPE DEFINITIONS (SPRINT 2)
// File: src/types/chat.ts
// =============================================================================

export type MessageRole = 'user' | 'assistant';

export type MessageStatus = 'sending' | 'sent' | 'error';

export interface ChatMessageItem {
  id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  timestamp: string;
  errorMessage?: string;
  isRetry?: boolean;
  provider?: string;
  model?: string;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  sessionId: string;
  reply: string;
  timestamp: string;
  provider: 'gemini' | 'stub' | string;
  model: string;
}

// Supported simulation error modes for testing Stub API without backend
export type StubSimulationMode = 'NONE' | 'PROVIDER_ERROR' | 'TIMEOUT';

export interface ChatSessionState {
  sessionId: string;
  messages: ChatMessageItem[];
  messageCount: number;
  messageLimit: number;
}
