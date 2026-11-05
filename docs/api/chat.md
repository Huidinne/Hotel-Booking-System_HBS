# Tài Liệu Hợp Đồng API Chatbot & Tích Hợp Gemini (Grand Aurora)
> **Mã công việc:** `[SP2-BE-03] [Chatbot] Tích hợp Google Gemini API & Quản lý System Prompt - Thành (16h)`  
> **Nhánh phát triển:** `thanh_devBE`  
> **Ngày cập nhật:** 05/11/2026  
> **Người thực hiện:** Phan Thuận Thành (Backend)  
> **Người tiếp nhận Frontend:** Nguyễn Thị Yến (Frontend UI)  

---

## 1. Tổng Quan & Mục Tiêu

Tài liệu này định nghĩa hợp đồng API (API Contract) chuẩn RESTful cho tính năng **Chatbot Tư Vấn Khách Sạn Tự Động** thuộc hệ thống Grand Aurora Luxury Hotel theo đặc tả task **[SP2-BE-03]**. 

- **Mục tiêu kỹ thuật:** Giúp đội ngũ Frontend (Yến) có thể phát triển giao diện Chat Widget độc lập song song mà không bị phụ thuộc vào tiến độ của Backend.
- **Cơ chế hoạt động:**
  1. **Google Gemini AI Client (Spring RestClient):** Kết nối trực tiếp mô hình AI thế hệ mới (`gemini-3.5-flash-lite`) từ Google AI Studio với timeout 10 giây.
  2. **Multi-turn Session Memory:** Tự động duy trì ngữ cảnh các lượt chat gần nhất theo `sessionId` giúp AI trò chuyện thông minh và liền mạch.
  3. **Guardrails & Scope Limitation:** Giới hạn phạm vi chỉ trả lời dịch vụ khách sạn Grand Aurora bằng tiếng Việt; từ chối lịch thiệp các câu hỏi ngoài lề (code, toán học, chính trị...).
  4. **Provider Stub (Mock):** Giả lập tri thức khách sạn (loại phòng, giá tiền, giờ check-in 14:00, buffet sáng, cọc 50% VNPay, hủy theo mốc 14:00) để chạy kiểm thử tự động, CI/CD và hoạt động ngoại tuyến khi mạng chập chờn.

---

## 2. Chi Tiết Endpoint

### `POST /api/v1/chat/message`
- **Mô tả:** Gửi tin nhắn câu hỏi của người dùng và nhận câu trả lời tư vấn từ trợ lý ảo AI.
- **Quyền truy cập:** **Công khai (Public)** — Khách vãng lai chưa đăng nhập vẫn có thể chat để tìm hiểu phòng trước khi đặt.
- **Content-Type:** `application/json`

---

## 3. Cấu Trúc Request

### 3.1. Bảng Tham Số (JSON Body)
| Tên trường | Kiểu dữ liệu | Bắt buộc | Ràng buộc validation | Mô tả chi tiết |
| :--- | :--- | :--- | :--- | :--- |
| `sessionId` | String | Không | Tối đa 100 ký tự | Mã định danh phiên chat. Nếu Client không truyền, Server sẽ tự động cấp một UUID mới (ví dụ: `session-9b1deb4d-...`). Client nên lưu lại mã này vào `sessionStorage` để duy trì ngữ cảnh cuộc trò chuyện. |
| `message` | String | **Có** | `@NotBlank`, 1 – 1000 ký tự | Nội dung câu hỏi của khách hàng. Không được để trống hoặc chỉ chứa khoảng trắng. |

### 3.2. Ví dụ Request:
```json
{
  "sessionId": "session-123e4567-e89b-12d3-a456-426614174000",
  "message": "Khách sạn có những loại phòng nào cho gia đình 4 người?"
}
```

---

## 4. Cấu Trúc Response

### 4.1. Phản Hồi Thành Công (HTTP `200 OK`)
Dữ liệu được bọc trong cấu trúc `ApiResponse<T>` thống nhất của dự án:

```json
{
  "success": true,
  "message": "Phản hồi tin nhắn thành công",
  "data": {
    "sessionId": "session-123e4567-e89b-12d3-a456-426614174000",
    "reply": "Dạ Grand Aurora xin chào quý khách! Đối với gia đình 4 người, khách sạn có hạng phòng Executive Suite Luxury cực kỳ lý tưởng:\n• Giá niêm yết: 1.800.000 VNĐ / đêm\n• Căn hộ gồm 2 phòng ngủ riêng biệt, phòng khách rộng rãi và bồn tắm nằm cao cấp ngắm trọn view biển.\n• Đã bao gồm buffet sáng miễn phí hàng ngày cho 4 người.\nQuý khách có thể bấm chọn phòng ngay trên trang chủ để nhận ưu đãi cọc 50% ạ!",
    "timestamp": "2026-11-04T10:00:00",
    "provider": "gemini",
    "model": "gemini-3.5-flash-lite"
  }
}
```

#### Giải thích các trường dữ liệu `data`:
- `sessionId`: Mã phiên trò chuyện hiện tại để Client lưu lại gửi tiếp ở các câu hỏi sau.
- `reply`: Câu trả lời được định dạng Markdown / văn bản xuống dòng từ trợ lý ảo.
- `timestamp`: Thời điểm Server sinh phản hồi theo chuẩn ISO-8601 (`yyyy-MM-dd'T'HH:mm:ss`).
- `provider`: `"gemini"` (nếu gọi AI thật), `"stub"` (nếu dùng dữ liệu giả lập), hoặc `"guardrail"` (nếu câu hỏi nằm ngoài phạm vi khách sạn).
- `model`: Phiên bản mô hình AI xử lý (`gemini-3.5-flash-lite`, `stub-mock-provider`, hoặc `safety-guardrail`).

---

### 4.2. Các Mã Lỗi (Error Responses)

#### A. Lỗi Dữ Liệu Đầu Vào (HTTP `400 Bad Request`)
Xảy ra khi `message` để trống hoặc vượt quá 1000 ký tự:
```json
{
  "timestamp": "2026-11-04T10:05:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Nội dung tin nhắn không được để trống",
  "path": "/api/v1/chat/message"
}
```

#### B. Giới Hạn Tần Suất Gọi API (HTTP `429 Too Many Requests`)
Xảy ra khi vượt quá giới hạn quota của Google Gemini:
```json
{
  "timestamp": "2026-11-04T10:06:00",
  "status": 429,
  "error": "Too Many Requests",
  "message": "Gemini API đang bị giới hạn tần suất yêu cầu (429 Rate Limit). Vui lòng thử lại sau.",
  "path": "/api/v1/chat/message"
}
```

#### C. Dịch Vụ AI Quá Tải / Bảo Trì (HTTP `503 Service Unavailable`)
```json
{
  "timestamp": "2026-11-04T10:07:00",
  "status": 503,
  "error": "Service Unavailable",
  "message": "Dịch vụ Gemini AI hiện đang quá tải hoặc bảo trì (503). Vui lòng thử lại sau.",
  "path": "/api/v1/chat/message"
}
```

---

## 5. Kịch Bản Dữ Liệu Mẫu Cho Frontend Test (Stub Provider)

Khi chưa có mạng hoặc không cấu hình API key, Provider Stub sẵn sàng phản hồi các câu hỏi nghiệp vụ sau:

| Chủ đề kiểm thử | Câu hỏi mẫu của người dùng | Ý chính trong câu phản hồi của Bot |
| :--- | :--- | :--- |
| **Giá & Loại phòng** | *"Khách sạn có những phòng nào, giá bao nhiêu?"* | Liệt kê đủ 3 hạng phòng: Standard Single (500k), Deluxe Double (950k), Executive Suite (1.8tr). |
| **Giờ Check-in/out** | *"Mấy giờ nhận phòng và trả phòng?"* | Check-in từ 14:00, Check-out trước 12:00 trưa; hỗ trợ gửi hành lý miễn phí. |
| **Ăn sáng & Tiện ích** | *"Tiền phòng có gồm ăn sáng và bể bơi không?"* | Đã bao gồm buffet sáng tự chọn 06:30 - 09:30, hồ bơi vô cực và gym 24/7. |
| **Chính sách cọc & hủy (mốc 14:00)** | *"Chính sách cọc VNPay và hoàn hủy thế nào?"* | Cọc 50% qua VNPay; hủy trước >= 24h so với mốc 14:00 ngày nhận phòng hoàn 100% cọc; 12h - 24h phạt 30%; dưới 12h phạt 50%. |
| **Rào chắn phạm vi (Guardrail)** | *"Viết code Python giúp tôi với"* | Từ chối lịch sự, nêu rõ chỉ hỗ trợ thông tin khách sạn Grand Aurora. |
| **Liên hệ & Địa chỉ** | *"Khách sạn ở đâu, có hotline không?"* | 01 Võ Nguyên Giáp, Sơn Trà, Đà Nẵng; Hotline 1900 888 888. |

---

## 6. Hướng Dẫn Tích Hợp Frontend (Dành cho Yến)

Trong service gọi API của Frontend (`chatService.ts` hoặc tương đương):

```typescript
import { apiClient } from './apiClient';

export interface ChatMessageRequest {
  sessionId?: string;
  message: string;
}

export interface ChatMessageResponse {
  sessionId: string;
  reply: string;
  timestamp: string;
  provider: string;
  model: string;
}

export const chatService = {
  async sendMessage(message: string, sessionId?: string): Promise<ChatMessageResponse> {
    const res = await apiClient.post<ChatMessageResponse>('/chat/message', {
      sessionId: sessionId || localStorage.getItem('chat_session_id') || undefined,
      message,
    });
    
    // Lưu lại sessionId để tiếp tục ngữ cảnh
    if (res?.sessionId) {
      localStorage.setItem('chat_session_id', res.sessionId);
    }
    return res;
  }
};
```

