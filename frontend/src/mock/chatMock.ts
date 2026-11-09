// =============================================================================
// HOTEL BOOKING SYSTEM - CHAT MOCK ADAPTER / STUB API
// File: src/mock/chatMock.ts
// Contract: [SP2-1104-THANH] Section 5 (Stub Provider Scenarios & Error Emulation)
// =============================================================================

import { ChatRequest, ChatResponse, StubSimulationMode } from '../types/chat';

function generateSessionId(): string {
  return `session-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

export interface MockOptions {
  simulationMode?: StubSimulationMode;
  timeoutMs?: number;
  delayMs?: number;
}

export async function stubChatApi(
  request: ChatRequest,
  options: MockOptions = {}
): Promise<ChatResponse> {
  const {
    simulationMode = 'NONE',
    delayMs = 600,
    timeoutMs = 4000,
  } = options;

  const rawMessage = (request.message || '').trim();
  const lowerMsg = rawMessage.toLowerCase();

  // 1. Detect simulation trigger from options or message test flags (for development testing)
  const isSimulatedError =
    simulationMode === 'PROVIDER_ERROR' ||
    lowerMsg.includes('#error') ||
    lowerMsg.includes('#provider-error');

  const isSimulatedTimeout =
    simulationMode === 'TIMEOUT' ||
    lowerMsg.includes('#timeout');

  // 2. Handle Timeout Simulation
  if (isSimulatedTimeout) {
    await new Promise((resolve) => setTimeout(resolve, timeoutMs));
    const timeoutErr = new Error(
      'Yêu cầu phản hồi vượt quá thời gian chờ (Timeout). Vui lòng thử lại.'
    ) as any;
    timeoutErr.name = 'TimeoutError';
    timeoutErr.status = 408;
    throw timeoutErr;
  }

  // 3. Handle Provider Error Simulation (e.g. 503 / 429)
  if (isSimulatedError) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const providerErr = new Error(
      'Dịch vụ trợ lý ảo AI tạm thời gián đoạn (503 Service Unavailable). Vui lòng nhấn Thử lại.'
    ) as any;
    providerErr.name = 'ProviderError';
    providerErr.status = 503;
    throw providerErr;
  }

  // 4. Normal Simulated Network Latency
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  const sessionId = request.sessionId || generateSessionId();
  const now = new Date().toISOString();

  let reply = '';

  // Hotel Domain Knowledge Base
  if (
    lowerMsg.includes('check-in') ||
    lowerMsg.includes('check-out') ||
    lowerMsg.includes('nhận phòng') ||
    lowerMsg.includes('trả phòng') ||
    lowerMsg.includes('mấy giờ')
  ) {
    reply =
      'Dạ thời gian nhận và trả phòng tiêu chuẩn tại Grand Aurora như sau ạ:\n' +
      '• Giờ nhận phòng (Check-in): Từ 14:00 chiều.\n' +
      '• Giờ trả phòng (Check-out): Trước 12:00 trưa.\n\n' +
      'Khách sạn luôn hỗ trợ gửi hành lý miễn phí tại sảnh lễ tân tầng 1 nếu quý khách đến sớm hoặc trả phòng muộn!';
  } else if (
    lowerMsg.includes('ăn sáng') ||
    lowerMsg.includes('buffet') ||
    lowerMsg.includes('bể bơi') ||
    lowerMsg.includes('hồ bơi') ||
    lowerMsg.includes('tiện ích') ||
    lowerMsg.includes('gym')
  ) {
    reply =
      'Dạ các dịch vụ tiện ích đi kèm khi lưu trú tại Grand Aurora gồm có:\n' +
      '• Buffet sáng tự chọn miễn phí: Phục vụ từ 06:30 - 09:30 tại nhà hàng Aurora tầng 2.\n' +
      '• Hồ bơi vô cực ngắm biển: Mở cửa từ 06:00 - 21:00 tại tầng thượng.\n' +
      '• Phòng Gym & Fitness hiện đại: Hoạt động 24/7 dành riêng cho khách lưu trú.\n' +
      '• Wifi tốc độ cao và nước suối miễn phí trong phòng mỗi ngày.';
  } else if (
    lowerMsg.includes('hủy') ||
    lowerMsg.includes('cọc') ||
    lowerMsg.includes('hoàn tiền') ||
    lowerMsg.includes('chính sách')
  ) {
    reply =
      'Dạ chính sách đặt cọc và hủy phòng của khách sạn rất minh bạch:\n' +
      '• Đặt cọc giữ phòng: 50% tổng tiền phòng khi đặt online.\n' +
      '• Hủy phòng trước >= 24 giờ: Hoàn 100% tiền cọc.\n' +
      '• Hủy phòng từ 12 - 24 giờ: Hoàn 70% tiền cọc (phạt 30%).\n' +
      '• Hủy phòng dưới 12 giờ: Hoàn 50% tiền cọc (phạt 50%).\n\n' +
      'Quý khách có thể theo dõi và thực hiện yêu cầu hủy ngay tại trang "Đơn đặt phòng của tôi".';
  } else if (
    lowerMsg.includes('địa chỉ') ||
    lowerMsg.includes('ở đâu') ||
    lowerMsg.includes('hotline') ||
    lowerMsg.includes('liên hệ') ||
    lowerMsg.includes('số điện thoại')
  ) {
    reply =
      'Dạ thông tin liên hệ chính thức của Grand Aurora Luxury Hotel:\n' +
      '• Địa chỉ: Số 10 Trần Phú, Quận Hà Đông, TP. Hà Nội (cạnh Ga tàu điện Phùng Khoang).\n' +
      '• Hotline tư vấn 24/7: 1900 888 888\n' +
      '• Email hỗ trợ: contact@grandaurora.com\n\n' +
      'Khách sạn tọa lạc ngay mặt đường Trần Phú sầm uất, kết nối trực tiếp tuyến đường sắt đô thị Cát Linh - Hà Đông rất thuận tiện di chuyển!';
  } else if (
    lowerMsg.includes('phòng') ||
    lowerMsg.includes('giá') ||
    lowerMsg.includes('loại phòng') ||
    lowerMsg.includes('hạng phòng')
  ) {
    reply =
      'Dạ Grand Aurora xin chào quý khách! Hiện khách sạn có 3 hạng phòng sang trọng sẵn sàng phục vụ:\n' +
      '• Standard Single Room: 500.000 VNĐ / đêm (1 giường đơn, thích hợp công tác).\n' +
      '• Deluxe Double Room: 950.000 VNĐ / đêm (1 giường đôi lớn, ban công thoáng mát).\n' +
      '• Executive Suite Luxury: 1.800.000 VNĐ / đêm (Căn hộ VIP 2 phòng ngủ, bồn tắm view biển, buffet sáng cho 4 khách).\n\n' +
      'Quý khách có thể xem ảnh và đặt phòng trực tiếp tại mục "Danh sách phòng" trên thanh điều hướng ạ!';
  } else {
    reply =
      'Dạ Grand Aurora xin kính chào quý khách! Em là trợ lý ảo hỗ trợ thông tin khách sạn.\n' +
      'Em có thể hỗ trợ quý khách về:\n' +
      '1. Tra cứu giá phòng & loại phòng phù hợp\n' +
      '2. Giờ nhận / trả phòng & gửi hành lý\n' +
      '3. Thực đơn buffet sáng, hồ bơi & tiện ích\n' +
      '4. Chính sách đặt cọc, hoàn tiền hủy phòng\n' +
      '5. Địa chỉ và số hotline khách sạn\n\n' +
      'Quý khách muốn tìm hiểu thông tin nào trên đây ạ?';
  }

  return {
    sessionId,
    reply,
    timestamp: now,
    provider: 'stub',
    model: 'stub-mock-provider',
  };
}
