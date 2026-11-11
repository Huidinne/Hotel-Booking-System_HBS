package org.example.backend.payment.repository;

import jakarta.persistence.criteria.Predicate;
import org.example.backend.payment.dto.PaymentLedgerFilter;
import org.example.backend.payment.entity.PaymentTransaction;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Specification hỗ trợ xây dựng dynamic query lọc Sổ Cái Thanh Toán (SRS §FR-19.1).
 * Lọc theo khoảng ngày giao dịch thực tế, loại bút toán, kênh thanh toán và mã đơn.
 */
public class PaymentLedgerSpecification {

    public static Specification<PaymentTransaction> withFilter(PaymentLedgerFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (filter == null) {
                return cb.conjunction();
            }

            // 1. Lọc theo khoảng ngày phát sinh giao dịch thực tế (transactionTime)
            if (filter.getStartDate() != null && filter.getEndDate() != null) {
                LocalDateTime startDateTime = filter.getStartDate().atStartOfDay();
                LocalDateTime endDateTime = filter.getEndDate().atTime(LocalTime.MAX);
                predicates.add(cb.between(root.get("transactionTime"), startDateTime, endDateTime));
            } else if (filter.getStartDate() != null) {
                LocalDateTime startDateTime = filter.getStartDate().atStartOfDay();
                predicates.add(cb.greaterThanOrEqualTo(root.get("transactionTime"), startDateTime));
            } else if (filter.getEndDate() != null) {
                LocalDateTime endDateTime = filter.getEndDate().atTime(LocalTime.MAX);
                predicates.add(cb.lessThanOrEqualTo(root.get("transactionTime"), endDateTime));
            }

            // 2. Lọc theo loại bút toán (DEPOSIT, COUNTER_PAYMENT, REFUND, ADDITIONAL_SERVICE)
            if (filter.getType() != null) {
                predicates.add(cb.equal(root.get("type"), filter.getType()));
            }

            // 3. Lọc theo phương thức thanh toán (VNPAY, CASH, BANK_TRANSFER)
            if (filter.getPaymentMethod() != null) {
                predicates.add(cb.equal(root.get("paymentMethod"), filter.getPaymentMethod()));
            }

            // 4. Lọc theo trạng thái giao dịch (SUCCESS, PENDING, FAILED, EXPIRED)
            if (filter.getStatus() != null) {
                predicates.add(cb.equal(root.get("status"), filter.getStatus()));
            }

            // 5. Lọc theo mã đặt phòng (tìm kiếm gần đúng)
            if (filter.getBookingCode() != null && !filter.getBookingCode().trim().isEmpty()) {
                String pattern = "%" + filter.getBookingCode().trim().toUpperCase() + "%";
                predicates.add(cb.like(cb.upper(root.get("booking").get("bookingCode")), pattern));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

