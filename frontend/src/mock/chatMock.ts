// =============================================================================
// HOTEL BOOKING SYSTEM - CHAT MOCK ADAPTER (PROVIDER STUB)
// Contract: [SP2-1104-THANH] Section 5 (Stub Provider scenarios)
// =============================================================================

import { ChatMessageRequest, ChatMessageResponse } from '../types/chat';

function generateSessionId(): string {
  return `session-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function mockChatResponse(request: ChatMessageRequest): Promise<ChatMessageResponse> {
  // Simulate network latency (400ms - 700ms)
  await new Promise((resolve) => setTimeout(resolve, 500));

  const query = (request.message || '').toLowerCase().trim();
  const sessionId = request.sessionId || generateSessionId();
  const now = new Date().toISOString().slice(0, 19);

  let reply = '';

  // 1. Check-in & Check-out time
  if (
    query.includes('check-in') ||
    query.includes('check-out') ||
    query.includes('nhận phòng') ||
    query.includes('trả phòng') ||
    query.includes('mấy giờ')
  ) {
    reply =
      'Dạ thời gian nhận và trả phòng tiêu chuẩn tại Grand Aurora như sau ạ:\n' +
      '• Giờ nhận phòng (Check-in): Từ 14:00 chiều.\n' +
      '• Giờ trả phòng (Check-out): Trước 12:00 trưa.\n\n' +
      'Nếu quý khách đến sớm hoặc muốn trả phòng muộn, khách sạn luôn hỗ trợ gửi hành lý miễn phí tại quầy lễ tân tầng 1 ạ!';
  }
  // 2. Breakfast & Hotel Amenities
  else if (
    query.includes('ăn sáng') ||
    query.includes('buffet') ||
    query.includes('bể bơi') ||
    query.includes('hồ bơi') ||
    query.includes('tiện ích') ||
    query.includes('gym')
  ) {
    reply =
      'Dạ các dịch vụ tiện ích đi kèm khi lưu trú tại Grand Aurora gồm có:\n' +
      '• Buffet sáng tự chọn miễn phí: Phục vụ từ 06:30 - 09:30 tại nhà hàng Aurora tầng 2.\n' +
      '• Hồ bơi vô cực ngắm biển: Mở cửa từ 06:00 - 21:00 tại tầng thượng.\n' +
      '• Phòng Gym & Fitness hiện đại: Hoạt động 24/7 dành riêng cho khách lưu trú.\n' +
      '• Wifi tốc độ cao và nước suối miễn phí trong phòng mỗi ngày.';
  }
  // 3. Deposit & Cancellation Policies
  else if (
    query.includes('hủy') ||
    query.includes('cọc') ||
    query.includes('hoàn tiền') ||
    query.includes('chính sách')
  ) {
    reply =
      'Dạ chính sách đặt cọc và hủy phòng của khách sạn rất minh bạch:\n' +
      '• Đặt cọc giữ phòng: 50% tổng tiền phòng khi đặt online.\n' +
      '• Hủy phòng trước >= 24 giờ so với giờ check-in: Hoàn 100% tiền cọc.\n' +
      '• Hủy phòng từ 12 - 24 giờ: Hoàn 70% tiền cọc (phạt 30%).\n' +
      '• Hủy phòng dưới 12 giờ: Hoàn 50% tiền cọc (phạt 50%).\n\n' +
      'Quý khách có thể theo dõi và thực hiện yêu cầu hủy ngay tại trang "Đơn đặt phòng của tôi".';
  }
  // 4. Contact & Location
  else if (
    query.includes('địa chỉ') ||
    query.includes('ở đâu') ||
    query.includes('hotline') ||
    query.includes('liên hệ') ||
    query.includes('số điện thoại')
  ) {
    reply =
      'Dạ thông tin liên hệ chính thức của Grand Aurora Luxury Hotel:\n' +
      '• Địa chỉ: Số 01 Võ Nguyên Giáp, Phường Phước Mỹ, Quận Sơn Trà, TP. Đà Nẵng.\n' +
      '• Hotline tư vấn 24/7: 1900 888 888\n' +
      '• Email hỗ trợ: contact@grandaurora.com\n\n' +
      'Khách sạn nằm ngay mặt biển Mỹ Khê tuyệt đẹp, rất thuận tiện di chuyển tham quan!';
  }
  // 5. Room types & pricing
  else if (
    query.includes('phòng') ||
    query.includes('giá') ||
    query.includes('loại phòng') ||
    query.includes('hạng phòng')
  ) {
    reply =
      'Dạ Grand Aurora xin chào quý khách! Hiện khách sạn có 3 hạng phòng sang trọng sẵn sàng phục vụ:\n' +
      '• Standard Single Room: 500.000 VNĐ / đêm (1 giường đơn, thích hợp công tác & nghỉ ngơi).\n' +
      '• Deluxe Double Room: 950.000 VNĐ / đêm (1 giường đôi lớn, ban công thoáng mát).\n' +
      '• Executive Suite Luxury: 1.800.000 VNĐ / đêm (Căn hộ VIP 2 phòng ngủ, bồn tắm view biển, buffet sáng cho 4 khách).\n\n' +
      'Quý khách có thể xem ảnh và đặt phòng trực tiếp tại mục "Danh sách phòng" trên thanh điều hướng ạ!';
  }
  // 6. General fallback greeting
  else {
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
