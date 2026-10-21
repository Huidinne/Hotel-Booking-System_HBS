package org.example.backend.common.schedule;

import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.entity.BookingStatus;
import org.example.backend.booking.entity.PaymentStatus;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.payment.entity.PaymentTransaction;
import org.example.backend.payment.entity.TransactionStatus;
import org.example.backend.payment.repository.PaymentTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled Jobs tự động xử lý booking theo SRS §2.6:
 *
 * 1. autoCancelExpiredBookings() — chạy mỗi 5 phút:
 *    - Hủy booking PENDING quá hold_expires_at (VNPay: 15 phút, CASH: 24h/18:00)
 *    - Đánh dấu giao dịch VNPay PENDING tương ứng → EXPIRED
 *
 * 2. processNoShow() — chạy lúc 12:05 hàng ngày:
 *    - Tìm booking CONFIRMED đã qua ngày check-in và chưa CHECKED_IN
 *    - Chuyển sang NO_SHOW, xử lý tài chính theo chính sách SRS §2.6
 */
@Component
@EnableScheduling
public class BookingScheduler {

    private static final Logger log = LoggerFactory.getLogger(BookingScheduler.class);

    private final BookingRepository bookingRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;

    public BookingScheduler(BookingRepository bookingRepository,
                            PaymentTransactionRepository paymentTransactionRepository) {
        this.bookingRepository = bookingRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;
    }

    /**
     * Auto-cancel booking PENDING quá hạn hold_expires_at.
     * Chạy mỗi 5 phút (SRS §2.6: "Cronjob chạy định kỳ mỗi 5-15 phút").
     */
    @Scheduled(fixedRate = 300_000) // 5 phút
    @Transactional
    public void autoCancelExpiredBookings() {
        LocalDateTime now = LocalDateTime.now();
        List<Booking> expiredBookings = bookingRepository.findExpiredPendingBookings(now);

        if (expiredBookings.isEmpty()) return;

        log.info("[Scheduler] Auto-cancel: tìm thấy {} booking PENDING hết hạn", expiredBookings.size());

        for (Booking booking : expiredBookings) {
            try {
                String reason = determineExpiredReason(booking);
                booking.setBookingStatus(BookingStatus.CANCELLED);
                booking.setCancellationReason(reason);
                booking.setCancelledAt(now);
                bookingRepository.save(booking);

                // Đánh dấu giao dịch VNPay PENDING tương ứng → EXPIRED
                List<PaymentTransaction> pendingTxns =
                        paymentTransactionRepository.findByBookingId(booking.getId());
                for (PaymentTransaction txn : pendingTxns) {
                    if (txn.getStatus() == TransactionStatus.PENDING) {
                        txn.setStatus(TransactionStatus.EXPIRED);
                        paymentTransactionRepository.save(txn);
                    }
                }

                log.info("[Scheduler] Đã hủy booking {} — Lý do: {}", booking.getBookingCode(), reason);
            } catch (Exception e) {
                log.error("[Scheduler] Lỗi khi hủy booking {}: {}",
                        booking.getBookingCode(), e.getMessage());
            }
        }
    }

    /**
     * Xử lý No-Show: booking CONFIRMED đã qua 12:00 ngày check-in+1 mà chưa CHECKED_IN.
     * Chạy lúc 12:05 hàng ngày theo múi giờ Asia/Ho_Chi_Minh.
     */
    @Scheduled(cron = "0 5 12 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void processNoShow() {
        LocalDate today = LocalDate.now();
        // Tìm booking CONFIRMED có ngày check-in < hôm nay (đã qua ngày)
        List<Booking> noShowCandidates = bookingRepository.findNoShowCandidates(today);

        if (noShowCandidates.isEmpty()) return;

        log.info("[Scheduler] No-Show: tìm thấy {} booking cần xử lý", noShowCandidates.size());

        for (Booking booking : noShowCandidates) {
            try {
                booking.setBookingStatus(BookingStatus.NO_SHOW);

                // Nếu khách đã trả 100% → hoàn tiền các đêm còn lại
                BigDecimalSumResult totalPaidResult = sumPaid(booking.getId());
                if (totalPaidResult.amount().compareTo(booking.getTotalPrice()) >= 0) {
                    // Hoàn = totalPrice - depositAmount (50%)
                    booking.setRefundAmount(
                            booking.getTotalPrice().subtract(booking.getDepositAmount()));
                    booking.setPaymentStatus(PaymentStatus.REFUND_PENDING);
                }

                bookingRepository.save(booking);
                log.info("[Scheduler] Đã đánh dấu No-Show booking {}", booking.getBookingCode());
            } catch (Exception e) {
                log.error("[Scheduler] Lỗi khi xử lý No-Show booking {}: {}",
                        booking.getBookingCode(), e.getMessage());
            }
        }
    }

    // ─── Helpers ────────────────────────────────────────────────────

    private String determineExpiredReason(Booking booking) {
        return switch (booking.getPaymentMethod()) {
            case VNPAY -> "PAYMENT_EXPIRED";
            case CASH, BANK_TRANSFER -> "UNCONFIRMED_TIMEOUT";
        };
    }

    /** Tính tổng tiền đã thanh toán thành công cho booking */
    private BigDecimalSumResult sumPaid(Long bookingId) {
        java.math.BigDecimal total = paymentTransactionRepository.sumSuccessfulPayments(bookingId);
        return new BigDecimalSumResult(total != null ? total : java.math.BigDecimal.ZERO);
    }

    record BigDecimalSumResult(java.math.BigDecimal amount) {}
}
