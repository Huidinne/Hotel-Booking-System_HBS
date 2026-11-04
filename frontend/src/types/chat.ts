// =============================================================================
// HOTEL BOOKING SYSTEM - CHAT TYPE DEFINITIONS
// Contract: [SP2-1104-THANH] [Chatbot] Contract Chat API và cấu hình Gemini
// =============================================================================

export interface ChatMessageRequest {
  sessionId?: string;
  message: string;
}

export interface ChatMessageResponse {
  sessionId: string;
  reply: string;
  timestamp: string;
  provider: 'gemini' | 'stub' | string;
  model: string;
}

export type MessageSender = 'user' | 'bot';

export interface ChatMessageItem {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'error';
  provider?: string;
  model?: string;
}
