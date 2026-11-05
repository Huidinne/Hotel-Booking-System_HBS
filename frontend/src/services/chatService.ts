// =============================================================================
// HOTEL BOOKING SYSTEM - CHAT SERVICE (SPRINT 2 FRONTEND)
// File: src/services/chatService.ts
// Handled by: Nguyễn Thị Yến (Frontend)
// API Contract reference: [SP2-1104-THANH]
// =============================================================================

import { apiClient } from './apiClient';
import {
  ChatRequest,
  ChatResponse,
  ChatMessageItem,
  StubSimulationMode,
} from '../types/chat';
import { stubChatApi } from '../mock/chatMock';

// Keys stored strictly in sessionStorage (lifetime: current browser tab/session only)
const SESSION_STORAGE_ID_KEY = 'hbs_chat_session_id';
const SESSION_STORAGE_MESSAGES_KEY = 'hbs_chat_messages';
const SESSION_STORAGE_COUNT_KEY = 'hbs_chat_message_count';
const SESSION_STORAGE_LIMIT_KEY = 'hbs_chat_message_limit';

export const DEFAULT_SESSION_MESSAGE_LIMIT = 20;

class ChatService {
  /**
   * Concurrency lock / Logic-level duplicate submission protection
   */
  private isProcessing: boolean = false;

  /**
   * Toggle between Stub API and Real Backend API
   * Currently FALSE because Backend API by Thành is in progress
   */
  private useRealApi: boolean = false;

  /**
   * Simulation mode for QA/Testing without backend
   */
  private simulationMode: StubSimulationMode = 'NONE';

  // ===========================================================================
  // SESSION STORAGE MANAGEMENT
  // ===========================================================================

  /**
   * Get current sessionId from sessionStorage or initialize a new one
   */
  getSessionId(): string {
    try {
      let sId = sessionStorage.getItem(SESSION_STORAGE_ID_KEY);
      if (!sId) {
        sId = `session-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem(SESSION_STORAGE_ID_KEY, sId);
      }
      return sId;
    } catch {
      return `session-${Date.now().toString(36)}`;
    }
  }

  setSessionId(sessionId: string): void {
    try {
      sessionStorage.setItem(SESSION_STORAGE_ID_KEY, sessionId);
    } catch {
      // Ignore sessionStorage exceptions
    }
  }

  /**
   * Get chat messages stored in current session
   */
  getStoredMessages(): ChatMessageItem[] {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_MESSAGES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore
    }
    return [];
  }

  /**
   * Save chat messages to sessionStorage
   */
  saveStoredMessages(messages: ChatMessageItem[]): void {
    try {
      sessionStorage.setItem(SESSION_STORAGE_MESSAGES_KEY, JSON.stringify(messages));
    } catch {
      // Ignore
    }
  }

  /**
   * Get number of valid messages sent in current session
   */
  getMessageCount(): number {
    try {
      const count = sessionStorage.getItem(SESSION_STORAGE_COUNT_KEY);
      return count ? parseInt(count, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Increment message count (only for NEW user queries, NOT retries)
   */
  incrementMessageCount(): number {
    const current = this.getMessageCount() + 1;
    try {
      sessionStorage.setItem(SESSION_STORAGE_COUNT_KEY, current.toString());
    } catch {
      // Ignore
    }
    return current;
  }

  /**
   * Get configured message limit for current session
   */
  getMessageLimit(): number {
    try {
      const limit = sessionStorage.getItem(SESSION_STORAGE_LIMIT_KEY);
      if (limit) {
        const parsed = parseInt(limit, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {
      // Ignore
    }
    return DEFAULT_SESSION_MESSAGE_LIMIT;
  }

  /**
   * Set custom message limit for testing or configuration
   */
  setMessageLimit(limit: number): void {
    try {
      sessionStorage.setItem(SESSION_STORAGE_LIMIT_KEY, limit.toString());
    } catch {
      // Ignore
    }
  }

  /**
   * Check if user reached session message limit
   */
  isLimitReached(): boolean {
    return this.getMessageCount() >= this.getMessageLimit();
  }

  /**
   * Remaining message quota
   */
  getRemainingMessages(): number {
    const remaining = this.getMessageLimit() - this.getMessageCount();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Clear session history: wipes messages, resets count, and generates new sessionId
   */
  clearSession(): void {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_MESSAGES_KEY);
      sessionStorage.removeItem(SESSION_STORAGE_COUNT_KEY);
      // Generate a new fresh session ID
      const newSessionId = `session-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem(SESSION_STORAGE_ID_KEY, newSessionId);
    } catch {
      // Ignore
    }
  }

  // ===========================================================================
  // SIMULATION & API CONFIGURATION
  // ===========================================================================

  getSimulationMode(): StubSimulationMode {
    return this.simulationMode;
  }

  setSimulationMode(mode: StubSimulationMode): void {
    this.simulationMode = mode;
  }

  isUsingRealApi(): boolean {
    return this.useRealApi;
  }

  setUseRealApi(enable: boolean): void {
    this.useRealApi = enable;
  }

  // ===========================================================================
  // SEND MESSAGE (With duplicate locking & rate limit validation)
  // ===========================================================================

  /**
   * Main messaging method.
   * Throws an error immediately if a request is already in-flight (Concurrency Guard).
   */
  async sendMessage(
    message: string,
    sessionId?: string,
    isRetry: boolean = false
  ): Promise<ChatResponse> {
    const clean = (message || '').trim();

    // 1. Validation checks
    if (!clean) {
      throw new Error('Nội dung tin nhắn không được để trống.');
    }
    if (clean.length > 1000) {
      throw new Error('Nội dung tin nhắn không được vượt quá 1000 ký tự.');
    }

    // 2. Concurrency duplicate prevention
    if (this.isProcessing) {
      throw new Error('Đang có yêu cầu đang được xử lý. Vui lòng chờ phản hồi.');
    }

    // 3. Session rate limit check (only for new queries, not retries)
    if (!isRetry && this.isLimitReached()) {
      throw new Error(
        `Đã đạt giới hạn tin nhắn của phiên (${this.getMessageLimit()}/${this.getMessageLimit()}). Vui lòng bấm "Xóa lịch sử" để bắt đầu phiên mới.`
      );
    }

    const currentSessionId = sessionId || this.getSessionId();
    const payload: ChatRequest = {
      message: clean,
      sessionId: currentSessionId,
    };

    // Lock processing mutex
    this.isProcessing = true;

    try {
      let response: ChatResponse;

      if (this.useRealApi) {
        // =====================================================================
        // BACKEND API INTEGRATION POINT (Phan Thuận Thành handover)
        // POST /api/v1/chat/message
        // =====================================================================
        response = await apiClient.post<ChatResponse>('/chat/message', payload);
      } else {
        // =====================================================================
        // STUB API / MOCK ADAPTER (Zero backend dependency)
        // =====================================================================
        response = await stubChatApi(payload, {
          simulationMode: this.simulationMode,
        });
      }

      // If this was a new valid message, increment the session counter
      if (!isRetry) {
        this.incrementMessageCount();
      }

      // Persist any sessionId received from backend or stub
      if (response && response.sessionId) {
        this.setSessionId(response.sessionId);
      }

      return response;
    } finally {
      // Always release mutex
      this.isProcessing = false;
    }
  }

  isBusy(): boolean {
    return this.isProcessing;
  }
}

export const chatService = new ChatService();
