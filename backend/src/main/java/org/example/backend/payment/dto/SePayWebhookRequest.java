package org.example.backend.payment.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.math.BigDecimal;

/**
 * Payload dữ liệu Webhook gửi từ SePay khi có biến động số dư tài khoản ngân hàng.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SePayWebhookRequest {

    /** ID giao dịch trên hệ thống SePay */
    private Long id;

    /** Tên ngân hàng (ví dụ: BIDV, Vietcombank, MBBank...) */
    private String gateway;

    /** Thời điểm diễn ra giao dịch (yyyy-MM-dd HH:mm:ss) */
    @JsonProperty("transactionDate")
    private String transactionDate;

    /** Số tài khoản nhận tiền */
    @JsonProperty("accountNumber")
    private String accountNumber;

    /** Tài khoản định danh phụ (nếu có) */
    @JsonProperty("subAccount")
    private String subAccount;

    /** Mã thanh toán nhận diện tự động từ nội dung */
    private String code;

    /** Toàn bộ nội dung chuyển khoản từ ngân hàng */
    private String content;

    /** Loại giao dịch: "in" (tiền vào) hoặc "out" (tiền ra) */
    @JsonProperty("transferType")
    private String transferType;

    /** Số tiền giao dịch */
    @JsonProperty("transferAmount")
    private BigDecimal transferAmount;

    /** Số dư lũy kế sau giao dịch */
    private BigDecimal accumulated;

    /** Mã tham chiếu giao dịch độc nhất từ ngân hàng (chống xử lý trùng lặp) */
    @JsonProperty("referenceCode")
    private String referenceCode;
}
