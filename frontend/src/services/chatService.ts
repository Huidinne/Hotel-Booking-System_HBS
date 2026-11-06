// =============================================================================
// HOTEL BOOKING SYSTEM - CHAT SERVICE (SPRINT 2 FRONTEND)
// File: src/services/chatService.ts
// Handled by: Nguyễn Thị Yến (Frontend)
// API Contract: [SP2-1104-THANH] / [SP2-1105-THANH]
// Official Backend Endpoint: POST /api/v1/chat/message
// =============================================================================

import { apiClient } from './apiClient';
import {
  ChatRequest,
  ChatResponse,
  ChatMessageItem,
} from '../types/chat';

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

  // ===========================================================================
  // SESSION STORAGE MANAGEMENT
  // ===========================================================================

  /**
   * Get current sessionId from sessionStorage if already allocated by backend,
   * or undefined on the first turn so backend can allocate the official sessionId.
   */
  getSessionId(): string | undefined {
    try {
      const sId = sessionStorage.getItem(SESSION_STORAGE_ID_KEY);
      return sId && sId.trim() ? sId.trim() : undefined;
    } catch {
      return undefined;
    }
  }

  setSessionId(sessionId: string): void {
    if (!sessionId || !sessionId.trim()) return;
    try {
      sessionStorage.setItem(SESSION_STORAGE_ID_KEY, sessionId.trim());
    } catch {
      // Ignore sessionStorage exceptions
    }
  }

  /**
   * Get chat messages stored in current session.
   * Validates structure and safely resets any interrupted 'sending' status to 'error'.
   */
  getStoredMessages(): ChatMessageItem[] {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_MESSAGES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((item): item is ChatMessageItem => Boolean(item && typeof item === 'object' && item.id && item.role && item.content))
            .map((item) => {
              // If page was reloaded while sending, convert interrupted status to error
              if (item.status === 'sending') {
                return {
                  ...item,
                  status: 'error',
                  errorMessage: 'Tin nhắn bị gián đoạn do tải lại trang. Vui lòng bấm Thử lại.',
                };
              }
              return item;
            });
        }
      }
    } catch {
      // Discard invalid JSON safely
      try {
        sessionStorage.removeItem(SESSION_STORAGE_MESSAGES_KEY);
      } catch {
        // Ignore
      }
    }
    return [];
  }

  /**
   * Save chat messages to sessionStorage with safety cap (max 50 messages)
   */
  saveStoredMessages(messages: ChatMessageItem[]): void {
    if (!Array.isArray(messages)) return;
    try {
      // Cap at most 50 recent messages to prevent unbounded sessionStorage growth
      const capped = messages.slice(-50);
      sessionStorage.setItem(SESSION_STORAGE_MESSAGES_KEY, JSON.stringify(capped));
    } catch {
      // Ignore sessionStorage quota errors
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
   * Set custom message limit for configuration
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
   * Clear session history: wipes messages, resets count, and clears sessionId
   * Next message will trigger a clean new session from Backend.
   */
  clearSession(): void {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_MESSAGES_KEY);
      sessionStorage.removeItem(SESSION_STORAGE_COUNT_KEY);
      sessionStorage.removeItem(SESSION_STORAGE_ID_KEY);
    } catch {
      // Ignore
    }
  }

  // ===========================================================================
  // SEND MESSAGE (Direct Real Backend API Integration)
  // ===========================================================================

  /**
   * Main messaging method calling Spring Boot POST /api/v1/chat/message directly.
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
    };
    if (currentSessionId) {
      payload.sessionId = currentSessionId;
    }

    // Lock processing mutex
    this.isProcessing = true;

    try {
      let response: ChatResponse;

      // =====================================================================
      // REAL BACKEND API: POST /api/v1/chat/message
      // =====================================================================
      try {
        response = await apiClient.post<ChatResponse>('/chat/message', payload);
      } catch (err: any) {
        const status = err?.status || err?.response?.status;
        const rawMsg = String(
          err?.message ||
          err?.response?.data?.message ||
          err?.data?.message ||
          ''
        );

        let friendlyMsg = 'Không thể kết nối đến máy chủ trợ lý ảo. Vui lòng thử lại sau.';

        if (status === 400) {
          friendlyMsg = rawMsg || 'Nội dung tin nhắn không hợp lệ (tối đa 1000 ký tự).';
        } else if (status === 401 || status === 403) {
          friendlyMsg = 'Phiên làm việc không có quyền truy cập hoặc đã hết hạn.';
        } else if (status === 404) {
          friendlyMsg = 'Không tìm thấy dịch vụ trợ lý ảo AI (Endpoint /api/v1/chat/message 404).';
        } else if (status === 408 || err?.name === 'TimeoutError' || rawMsg.toLowerCase().includes('timeout')) {
          friendlyMsg = 'Yêu cầu phản hồi vượt quá thời gian chờ (Timeout). Vui lòng nhấn Thử lại.';
        } else if (status === 429) {
          friendlyMsg = 'Hệ thống đang tiếp nhận quá nhiều yêu cầu cùng lúc. Vui lòng đợi trong giây lát rồi thử lại.';
        } else if (status >= 500) {
          friendlyMsg = 'Máy chủ trợ lý ảo tạm thời bị gián đoạn. Vui lòng nhấn Thử lại.';
        } else if (
          rawMsg.includes('Failed to fetch') ||
          rawMsg.includes('Network') ||
          rawMsg.includes('AbortError') ||
          rawMsg.includes('chưa bật')
        ) {
          friendlyMsg = 'Không thể kết nối đến máy chủ Backend (Port 8080). Vui lòng kiểm tra kết nối mạng và thử lại.';
        } else if (rawMsg) {
          friendlyMsg = rawMsg;
        }

        const friendlyError = new Error(friendlyMsg) as any;
        friendlyError.status = status;
        friendlyError.originalError = err;
        throw friendlyError;
      }

      // If this was a new valid message, increment the session counter
      if (!isRetry) {
        this.incrementMessageCount();
      }

      // Persist sessionId received from backend
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
