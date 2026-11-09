/**
 * =============================================================================
 * HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
 * Task: [SP2-1109-TRUNG]
 * Suite 04: Chatbot & Real-time Consultation Flow E2E
 * Endpoints:
 *   - POST /api/v1/chat/message
 * =============================================================================
 */

import { ENDPOINTS } from '../config.js';
import { api, log, testState } from '../utils/api-client.js';
import testData from '../fixtures/test-data.json' with { type: 'json' };

export async function runChatSuite() {
  log.suite('04 - Chatbot Tư vấn Đặt phòng & Phiên Hội thoại (Chat Flow)');
  const results = { passed: 0, failed: 0 };

  const assert = (condition, name, detail = '') => {
    if (condition) {
      log.pass(name, detail);
      results.passed++;
    } else {
      log.fail(name, detail);
      results.failed++;
    }
  };

  const sessionId = testState.sessionId;

  // 1. Gửi tin nhắn chào hỏi & tư vấn cơ bản tới Chatbot
  const greetingPayload = {
    sessionId: sessionId,
    message: testData.chat.greetingMessage
  };

  try {
    const chatRes = await api.post(ENDPOINTS.CHAT_MESSAGE, greetingPayload);
    const hasValidReply = chatRes.status === 200 && chatRes.data?.data?.reply && typeof chatRes.data.data.reply === 'string';
    const replySnippet = (chatRes.data?.data?.reply || '').slice(0, 45) + '...';

    assert(hasValidReply, 'Gửi tin nhắn tư vấn & nhận phản hồi từ Chatbot (POST /chat/message)', `Trả lời: "${replySnippet}"`);
  } catch (err) {
    assert(false, 'Gửi tin nhắn tư vấn & nhận phản hồi từ Chatbot', err.message);
  }

  // 2. Gửi câu hỏi tra cứu phòng tự động (Kích hoạt Tool Function Calling)
  const roomQueryPayload = {
    sessionId: sessionId,
    message: testData.chat.roomQueryMessage
  };

  try {
    const toolChatRes = await api.post(ENDPOINTS.CHAT_MESSAGE, roomQueryPayload, {
      'Authorization': testState.customerToken ? `Bearer ${testState.customerToken}` : ''
    });

    const isToolReplyValid = toolChatRes.status === 200 && toolChatRes.data?.data?.reply;
    const isSessionMaintained = toolChatRes.data?.data?.sessionId === sessionId;

    assert(isToolReplyValid && isSessionMaintained, 'Duy trì ngữ cảnh phiên hội thoại (Session State Consistency)', `Session: ${sessionId}`);
  } catch (err) {
    assert(false, 'Duy trì ngữ cảnh phiên hội thoại', err.message);
  }

  return results;
}

