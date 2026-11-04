// =============================================================================
// HOTEL BOOKING SYSTEM - CHAT SERVICE
// File: src/services/chatService.ts
// Contract: [SP2-1104-THANH] [Chatbot] Contract Chat API và cấu hình Gemini
// =============================================================================

import { apiClient } from './apiClient';
import { ChatMessageRequest, ChatMessageResponse } from '../types/chat';
import { mockChatResponse } from '../mock/chatMock';

const SESSION_STORAGE_KEY = 'chat_session_id';

class ChatService {
  /**
   * Mode configuration:
   * - forceMock: If true, always use client-side Mock Adapter (offline/stub testing).
   * - If false, attempts real backend API (/api/v1/chat/message). If backend is offline
   *   or returns a network connection failure, gracefully falls back to Mock Adapter
   *   to guarantee zero downtime for end-users.
   */
  private forceMock: boolean = false;

  constructor() {
    // Check if user or environment specified mock mode preference
    try {
      const savedMode = localStorage.getItem('hbs_chat_force_mock');
      if (savedMode !== null) {
        this.forceMock = savedMode === 'true';
      }
    } catch {
      this.forceMock = false;
    }
  }

  isMockMode(): boolean {
    return this.forceMock;
  }

  setMockMode(enable: boolean): void {
    this.forceMock = enable;
    try {
      localStorage.setItem('hbs_chat_force_mock', String(enable));
    } catch {
      // Ignore storage errors
    }
  }

  getSessionId(): string | null {
    try {
      return localStorage.getItem(SESSION_STORAGE_KEY) || sessionStorage.getItem(SESSION_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  setSessionId(sessionId: string): void {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
      sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    } catch {
      // Ignore storage errors
    }
  }

  clearSession(): void {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Send chat message to backend or mock provider according to SP2-1104-THANH contract.
   *
   * @param message Text query from user (1-1000 characters)
   * @param sessionId Optional session identifier to maintain conversation context
   * @returns Promise<ChatMessageResponse>
   */
  async sendMessage(message: string, sessionId?: string): Promise<ChatMessageResponse> {
    const cleanMessage = (message || '').trim();

    // Client-side validation enforcing contract constraints
    if (!cleanMessage) {
      throw new Error('Nội dung tin nhắn không được để trống');
    }
    if (cleanMessage.length > 1000) {
      throw new Error('Nội dung tin nhắn không được vượt quá 1000 ký tự');
    }

    const currentSessionId = sessionId || this.getSessionId() || undefined;

    const payload: ChatMessageRequest = {
      message: cleanMessage,
      sessionId: currentSessionId,
    };

    // If explicit mock mode is enabled, resolve via Mock Adapter
    if (this.forceMock) {
      const mockResult = await mockChatResponse(payload);
      if (mockResult.sessionId) {
        this.setSessionId(mockResult.sessionId);
      }
      return mockResult;
    }

    // Otherwise, call real Backend API: POST /api/v1/chat/message
    try {
      const response = await apiClient.post<ChatMessageResponse>('/chat/message', payload);

      if (response && response.sessionId) {
        this.setSessionId(response.sessionId);
      }

      return response;
    } catch (error: any) {
      console.warn('[chatService] Backend API call failed, evaluating resilient fallback:', error);

      // If backend is unavailable (e.g. 503, 404, or network failure), fall back to Mock Adapter
      const isNetworkOrOffline =
        !error.status ||
        error.status === 503 ||
        error.status === 404 ||
        error.status === 502 ||
        (error.message && error.message.includes('kết nối'));

      if (isNetworkOrOffline) {
        console.info('[chatService] Resiliently switching to Stub Provider (Mock Adapter)');
        const fallbackResult = await mockChatResponse(payload);
        if (fallbackResult.sessionId) {
          this.setSessionId(fallbackResult.sessionId);
        }
        return fallbackResult;
      }

      // Re-throw genuine application errors (e.g. 400 Bad Request, 429 Rate Limit)
      throw error;
    }
  }
}

export const chatService = new ChatService();
