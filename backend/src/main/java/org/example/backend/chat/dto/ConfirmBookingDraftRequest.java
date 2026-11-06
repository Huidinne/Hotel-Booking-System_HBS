package org.example.backend.chat.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request xác nhận bản nháp đặt phòng từ thẻ Chat UI:
 * POST /api/v1/chat/booking/confirm
 * Yêu cầu: Khách hàng tự bấm xác nhận (kèm draftId + idempotencyKey chống lặp).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Yêu cầu xác nhận tạo đơn đặt phòng từ bản nháp Chatbot")
public class ConfirmBookingDraftRequest {

    @NotBlank(message = "draftId không được để trống")
    @Schema(description = "Mã bản nháp đặt phòng", example = "draft-7d2d31e9-4e76-46b0-9df1-863a3a70a8d6")
    private String draftId;

    @NotBlank(message = "idempotencyKey không được để trống")
    @Schema(description = "Khóa chống trùng lặp request (Client tự sinh UUID cho mỗi lần bấm)", example = "idem-9a8b7c6d-1234-5678")
    private String idempotencyKey;

    @NotBlank(message = "Phương thức thanh toán không được để trống")
    @Schema(description = "Phương thức thanh toán (VNPAY hoặc CASH)", example = "VNPAY")
    private String paymentMethod;

    @Schema(description = "Ghi chú bổ sung của khách hàng", example = "Nhận phòng muộn lúc 16:00")
    private String note;
}

