package org.example.backend.chat.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO phản hồi tin nhắn từ Chatbot Grand Aurora:
 * POST /api/v1/chat/message -> data
 * Hỗ trợ cả câu trả lời tự nhiên (reply) lẫn dữ liệu có cấu trúc để render thẻ UI (cardType, cardData)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Dữ liệu phản hồi tin nhắn từ trợ lý ảo Grand Aurora")
public class ChatResponse {

    @Schema(description = "Mã định danh phiên chat", example = "session-123e4567-e89b-12d3-a456-426614174000")
    private String sessionId;

    @Schema(description = "Nội dung phản hồi tư vấn của trợ lý ảo", example = "Dạ chào quý khách! Khách sạn Grand Aurora có hạng phòng Executive Suite Luxury rất phù hợp cho gia đình 4 người...")
    private String reply;

    @Schema(description = "Thời điểm phản hồi", example = "2026-11-04T10:00:00")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime timestamp;

    @Schema(description = "Nhà cung cấp AI xử lý (gemini, stub hoặc guardrail)", example = "gemini")
    private String provider;

    @Schema(description = "Phiên bản mô hình AI (nếu dùng Gemini)", example = "gemini-3.5-flash-lite")
    private String model;

    @Schema(description = "Loại thẻ tương tác UI: NONE, ROOM_OPTIONS, BOOKING_QUOTE, BOOKING_DRAFT, LOGIN_REQUIRED", example = "ROOM_OPTIONS")
    @Builder.Default
    private String cardType = "NONE";

    @Schema(description = "Dữ liệu có cấu trúc tương ứng với cardType để Frontend render thẻ xác nhận hoặc danh sách phòng")
    private Object cardData;

    @Schema(description = "Tuyên bố từ chối trách nhiệm: Trợ lý ảo chỉ đóng vai trò tư vấn thông tin", example = "Lưu ý: Trợ lý ảo Grand Aurora chỉ đóng vai trò tư vấn và hỗ trợ thông tin tham khảo...")
    @Builder.Default
    private String disclaimer = "Lưu ý: Trợ lý ảo Grand Aurora chỉ đóng vai trò tư vấn và hỗ trợ thông tin tham khảo. Đơn đặt phòng và giao dịch thanh toán chỉ có giá trị pháp lý chính thức khi quý khách chủ động xác nhận và giao dịch thành công trên website.";
}
