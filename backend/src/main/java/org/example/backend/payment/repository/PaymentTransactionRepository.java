package org.example.backend.payment.repository;

import org.example.backend.booking.entity.PaymentMethod;
import org.example.backend.payment.entity.PaymentTransaction;
import org.example.backend.payment.entity.TransactionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    /** Danh sách giao dịch của booking sắp xếp mới nhất */
    List<PaymentTransaction> findByBookingIdOrderByCreatedAtDesc(Long bookingId);

    /** Lấy giao dịch PENDING mới nhất của booking */
    Optional<PaymentTransaction> findFirstByBookingIdAndStatusOrderByCreatedAtDesc(Long bookingId, TransactionStatus status);

    /** Lấy giao dịch mới nhất của booking */
    Optional<PaymentTransaction> findFirstByBookingIdOrderByCreatedAtDesc(Long bookingId);

    /** Phân trang các giao dịch theo phương thức và trạng thái */
    Page<PaymentTransaction> findByPaymentMethodAndStatus(PaymentMethod paymentMethod, TransactionStatus status, Pageable pageable);

    /** Phân trang các giao dịch theo phương thức */
    Page<PaymentTransaction> findByPaymentMethod(PaymentMethod paymentMethod, Pageable pageable);

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

    /** Đếm số giao dịch thất bại hoặc hết hạn trong khoảng thời gian */
    @Query("""
            SELECT COUNT(pt) FROM PaymentTransaction pt
            WHERE pt.status IN (
                org.example.backend.payment.entity.TransactionStatus.FAILED,
                org.example.backend.payment.entity.TransactionStatus.EXPIRED
            )
            AND (
                (pt.transactionTime IS NOT NULL AND pt.transactionTime >= :startDateTime AND pt.transactionTime <= :endDateTime)
                OR (pt.transactionTime IS NULL AND pt.createdAt >= :startDateTime AND pt.createdAt <= :endDateTime)
            )
            """)
    long countFailedTransactionsByTimeBetween(
            @Param("startDateTime") java.time.LocalDateTime startDateTime,
            @Param("endDateTime") java.time.LocalDateTime endDateTime);

    /** Danh sách giao dịch của một mã đặt phòng */
    List<PaymentTransaction> findByBookingBookingCode(String bookingCode);
}
