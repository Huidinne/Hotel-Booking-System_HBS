package org.example.backend.payment.repository;

import org.example.backend.payment.entity.PaymentTransaction;
import org.example.backend.payment.entity.TransactionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long>, JpaSpecificationExecutor<PaymentTransaction> {

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

    /** Danh sách giao dịch SUCCESS trong khoảng thời gian — dùng cho Dashboard & Sổ cái tránh findAll */
    @Query("""
            SELECT pt FROM PaymentTransaction pt
            WHERE pt.status = org.example.backend.payment.entity.TransactionStatus.SUCCESS
            AND (
                (pt.transactionTime IS NOT NULL AND pt.transactionTime >= :startDateTime AND pt.transactionTime <= :endDateTime)
                OR (pt.transactionTime IS NULL AND pt.createdAt >= :startDateTime AND pt.createdAt <= :endDateTime)
            )
            ORDER BY COALESCE(pt.transactionTime, pt.createdAt) ASC
            """)
    List<PaymentTransaction> findSuccessfulTransactionsBetween(@Param("startDateTime") java.time.LocalDateTime startDateTime,
                                                               @Param("endDateTime") java.time.LocalDateTime endDateTime);

    /** Danh sách giao dịch SUCCESS theo thời điểm giao dịch thực tế transaction_time (dùng cho Sổ cái & Dashboard) */
    @Query("""
            SELECT pt FROM PaymentTransaction pt
            WHERE pt.status = org.example.backend.payment.entity.TransactionStatus.SUCCESS
            AND (
                (pt.transactionTime IS NOT NULL AND pt.transactionTime >= :startDateTime AND pt.transactionTime <= :endDateTime)
                OR (pt.transactionTime IS NULL AND pt.createdAt >= :startDateTime AND pt.createdAt <= :endDateTime)
            )
            ORDER BY COALESCE(pt.transactionTime, pt.createdAt) ASC
            """)
    List<PaymentTransaction> findSuccessfulTransactionsByTimeBetween(
            @Param("startDateTime") java.time.LocalDateTime startDateTime,
            @Param("endDateTime") java.time.LocalDateTime endDateTime);

    /** Danh sách giao dịch của một mã đặt phòng */
    List<PaymentTransaction> findByBookingBookingCode(String bookingCode);
}
