package org.example.backend.chat.tools;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Kết quả thực thi một tool trong hệ thống:
 * - summaryMessage: Chuỗi tóm tắt kết quả nghiệp vụ (để model dùng sinh câu trả lời tự nhiên)
 * - cardType: Loại thẻ giao diện hiển thị cho Frontend (NONE, ROOM_OPTIONS, BOOKING_QUOTE, BOOKING_DRAFT, LOGIN_REQUIRED)
 * - cardData: Dữ liệu có cấu trúc chi tiết (danh sách phòng, báo giá, hoặc bản nháp)
 * - errorMessage: Thông báo lỗi nếu tham số sai, ngày quá khứ, hết phòng, v.v.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToolCallResult {
    private String toolName;
    @Builder.Default
    private boolean success = true;
    private String summaryMessage;
    @Builder.Default
    private String cardType = "NONE";
    private Object cardData;
    private String errorMessage;

    public static ToolCallResult error(String toolName, String errorMessage) {
        return ToolCallResult.builder()
                .toolName(toolName)
                .success(false)
                .summaryMessage(errorMessage)
                .errorMessage(errorMessage)
                .cardType("NONE")
                .build();
    }
}

