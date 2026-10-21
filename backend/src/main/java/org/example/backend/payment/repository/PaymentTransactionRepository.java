package org.example.backend.payment.repository;

import org.example.backend.payment.entity.PaymentTransaction;
import org.example.backend.payment.entity.TransactionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {

    /** Tìm giao dịch theo mã nội bộ */
    Optional<PaymentTransaction> findByTransactionCode(String transactionCode);

    /** Tìm giao dịch theo mã VNPay — dùng cho kiểm tra idempotent IPN */
    Optional<PaymentTransaction> findByVnpTransactionNo(String vnpTransactionNo);

    /** Danh sách giao dịch của booking */
    List<PaymentTransaction> findByBookingId(Long bookingId);

    /** Tính tổng số tiền đã thanh toán thành công cho booking */
    @Query("""
            SELECT COALESCE(SUM(pt.amount), 0) FROM PaymentTransaction pt
            WHERE pt.booking.id = :bookingId
            AND pt.status = org.example.backend.payment.entity.TransactionStatus.SUCCESS
            """)
    BigDecimal sumSuccessfulPayments(@Param("bookingId") Long bookingId);

    /** Danh sách giao dịch PENDING đã hết hạn — dùng cho cronjob */
    @Query("""
            SELECT pt FROM PaymentTransaction pt
            WHERE pt.status = org.example.backend.payment.entity.TransactionStatus.PENDING
            AND pt.expiresAt IS NOT NULL
            AND pt.expiresAt < CURRENT_TIMESTAMP
            """)
    List<PaymentTransaction> findExpiredPendingTransactions();
}
