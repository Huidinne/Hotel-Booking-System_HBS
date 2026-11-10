package org.example.backend.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Collections;
import java.util.List;

/**
 * Payload phản hồi tra cứu Sổ Cái Thanh Toán (SRS §FR-19.1, §FR-19.2).
 * Kết hợp danh sách bút toán phân trang và bản tóm tắt dòng tiền trong khoảng thời gian lọc.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentLedgerResponse {

    /** Danh sách bút toán giao dịch trong trang hiện tại */
    @Builder.Default
    private List<PaymentLedgerEntryDTO> entries = Collections.emptyList();

    /** Trang hiện tại (0-indexed) */
    private int page;

    /** Kích thước trang */
    private int size;

    /** Tổng số bản ghi thỏa mãn điều kiện lọc */
    private long totalElements;

    /** Tổng số trang */
    private int totalPages;

    /** Thống kê tổng hợp dòng tiền của toàn bộ khoảng ngày lọc */
    private PaymentLedgerSummaryDTO summary;
}

