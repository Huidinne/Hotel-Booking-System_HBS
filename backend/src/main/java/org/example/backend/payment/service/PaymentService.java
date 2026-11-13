package org.example.backend.payment.service;

import org.example.backend.audit.annotation.Auditable;
import org.example.backend.audit.entity.AuditAction;
import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.entity.BookingStatus;
import org.example.backend.booking.entity.PaymentMethod;
import org.example.backend.booking.entity.PaymentStatus;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.common.config.VietQrConfig;
import org.example.backend.common.exception.AppException;
import org.example.backend.mail.service.EmailService;
import org.example.backend.mail.service.PdfInvoiceService;
import org.example.backend.payment.dto.*;
import org.example.backend.payment.entity.PaymentTransaction;
import org.example.backend.payment.entity.TransactionStatus;
import org.example.backend.payment.repository.PaymentLedgerSpecification;
import org.example.backend.payment.repository.PaymentTransactionRepository;
import org.example.backend.room.entity.RoomStatus;
import org.example.backend.room.entity.RoomType;
import org.example.backend.room.repository.RoomRepository;
import org.example.backend.room.repository.RoomTypeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Service xử lý thanh toán VietQR và nghiệp vụ đối soát/hoàn cọc:
 * - Sinh mã VietQR thanh toán cọc ngân hàng (50% hoặc toàn bộ)
 * - Tiếp nhận và duyệt/từ chối giao dịch chuyển khoản VietQR cho Lễ tân/Admin
 * - Danh sách và xác nhận hoàn cọc thủ công cho Lễ tân
 * - Quản lý Sổ cái Giao dịch (Payment Ledger)
 */
@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final VietQrConfig vietQrConfig;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final BookingRepository bookingRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final RoomRepository roomRepository;

    @Autowired(required = false)
    private EmailService emailService;

    @Autowired(required = false)
    private PdfInvoiceService pdfInvoiceService;

    public PaymentService(VietQrConfig vietQrConfig,
                          PaymentTransactionRepository paymentTransactionRepository,
                          BookingRepository bookingRepository,
                          RoomTypeRepository roomTypeRepository,
                          RoomRepository roomRepository) {
        this.vietQrConfig = vietQrConfig;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.bookingRepository = bookingRepository;
        this.roomTypeRepository = roomTypeRepository;
        this.roomRepository = roomRepository;
    }

    /**
     * Gửi an toàn email xác nhận cọc 50% và đính kèm hóa đơn PDF OpenPDF (SRS §2.4, §FR-15.1).
     * Bọc try-catch không làm sập tiến trình nếu SMTP có sự cố.
     */
    private void sendBookingConfirmationEmailSafely(Booking booking) {
        if (emailService == null) {
            return;
        }
        try {
            String recipientEmail = null;
            String customerName = "Quý khách";
            if (booking.getUser() != null) {
                recipientEmail = booking.getUser().getEmail();
                if (booking.getUser().getFullName() != null && !booking.getUser().getFullName().isBlank()) {
                    customerName = booking.getUser().getFullName();
                }
            }

            if (recipientEmail == null || recipientEmail.isBlank()) {
                log.warn("[PaymentService] Không tìm thấy email khách hàng cho booking [{}], bỏ qua gửi mail xác nhận cọc.",
                        booking.getBookingCode());
                return;
            }

            byte[] pdfBytes = null;
            if (pdfInvoiceService != null) {
                try {
                    pdfBytes = pdfInvoiceService.generateInvoicePdf(booking);
                } catch (Exception pdfEx) {
                    log.warn("[PaymentService] Lỗi khi sinh hóa đơn PDF cọc cho booking [{}]: {}",
                            booking.getBookingCode(), pdfEx.getMessage());
                }
            }

            String roomTypeName = booking.getRoomType() != null ? booking.getRoomType().getName() : "Phòng nghỉ Grand Aurora";
            int quantity = booking.getQuantity() != null ? booking.getQuantity() : 1;
            String checkIn = booking.getCheckInDate() != null ? booking.getCheckInDate().toString() : "";
            String checkOut = booking.getCheckOutDate() != null ? booking.getCheckOutDate().toString() : "";
            long depositAmount = booking.getDepositAmount() != null ? booking.getDepositAmount().longValue() : 0L;
            long totalAmount = booking.getTotalPrice() != null ? booking.getTotalPrice().longValue() : 0L;

            emailService.sendBookingConfirmationEmail(
                    recipientEmail,
                    customerName,
                    booking.getBookingCode(),
                    roomTypeName,
                    quantity,
                    checkIn,
                    checkOut,
                    depositAmount,
                    totalAmount,
                    pdfBytes
            );
            log.info("[PaymentService] Đã kích hoạt gửi Email xác nhận cọc 50% cho booking [{}] tới [{}]",
                    booking.getBookingCode(), recipientEmail);
        } catch (Exception e) {
            log.error("[PaymentService] Gặp lỗi khi gửi email xác nhận cọc cho booking [{}]: {}",
                    booking.getBookingCode(), e.getMessage());
        }
    }

    /**
     * Lễ tân/Admin: Xem danh sách các đơn cần hoàn cọc (REFUND_PENDING).
     */
    @Transactional(readOnly = true)
    public Page<RefundResponse> getPendingRefunds(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("cancelledAt").descending());
        return bookingRepository.findByPaymentStatus(PaymentStatus.REFUND_PENDING, pageable)
                .map(this::toRefundResponse);
    }

    /**
     * Lễ tân/Admin: Xác nhận đã thực hiện chuyển khoản hoàn tiền thủ công ngoài đời thực.
     */
    @Transactional
    @Auditable(action = AuditAction.CONFIRM_REFUND, targetType = "PAYMENT", description = "Xác nhận chuyển khoản hoàn cọc")
    public RefundResponse confirmRefund(Long bookingId, ConfirmRefundRequest request, String receptionistEmail) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy đặt phòng"));

        if (booking.getPaymentStatus() != PaymentStatus.REFUND_PENDING) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Chỉ có thể xác nhận hoàn tiền cho đơn đang ở trạng thái REFUND_PENDING");
        }

        booking.setPaymentStatus(PaymentStatus.REFUNDED);
        String currentNote = booking.getNote() != null ? booking.getNote() + " | " : "";
        booking.setNote(currentNote + "[Hoàn tiền bởi " + receptionistEmail + "]: " + request.getReferenceNote());

        // Ghi nhận bút toán REFUND thực tế vào Sổ Cái payment_transactions (SRS §FR-19.1)
        BigDecimal refundAmt = booking.getRefundAmount() != null && booking.getRefundAmount().compareTo(BigDecimal.ZERO) > 0
                ? booking.getRefundAmount()
                : (booking.getDepositAmount() != null ? booking.getDepositAmount() : BigDecimal.ZERO);

        if (refundAmt.compareTo(BigDecimal.ZERO) > 0) {
            String refundTxnCode = "REFUND-" + booking.getBookingCode() + "-" + System.currentTimeMillis();
            PaymentTransaction refundTxn = PaymentTransaction.builder()
                    .booking(booking)
                    .transactionCode(refundTxnCode)
                    .amount(refundAmt)
                    .paymentMethod(PaymentMethod.BANK_TRANSFER)
                    .status(TransactionStatus.SUCCESS)
                    .type(PaymentTransactionType.REFUND)
                    .responseCode("REFUND_CONFIRMED")
                    .transactionTime(LocalDateTime.now())
                    .actorEmail(receptionistEmail)
                    .referenceNote(request.getReferenceNote() != null ? request.getReferenceNote() : "Chuyển khoản hoàn cọc đơn hủy")
                    .build();
            paymentTransactionRepository.save(refundTxn);
            log.info("[PaymentService] Đã ghi nhận bút toán hoàn cọc Sổ Cái: mã {}, số tiền {}", refundTxnCode, refundAmt);
        }

        booking = bookingRepository.save(booking);
        return toRefundResponse(booking);
    }

    /**
     * Lễ tân/Admin: Ghi nhận giao dịch thu tiền tại quầy thực tế (CASH hoặc POS/BANK_TRANSFER) (SRS §FR-19.1).
     * Ghi đúng thời điểm thực tế, tuyệt đối không suy đoán thu quầy từ giá trị booking.
     */
    @Transactional
    @Auditable(action = AuditAction.CHECK_OUT_SETTLEMENT, targetType = "PAYMENT", description = "Thu tiền tại quầy Lễ tân")
    public PaymentLedgerEntryDTO recordCounterPayment(RecordCounterPaymentRequest request, String receptionistEmail) {
        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy đặt phòng #" + request.getBookingId()));

        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Số tiền thu tại quầy phải lớn hơn 0");
        }

        PaymentTransactionType type = request.getType() != null ? request.getType() : PaymentTransactionType.COUNTER_PAYMENT;
        PaymentMethod method = request.getPaymentMethod() != null ? request.getPaymentMethod() : PaymentMethod.CASH;
        String txnCode = "COUNTER-" + booking.getBookingCode() + "-" + System.currentTimeMillis();

        PaymentTransaction txn = PaymentTransaction.builder()
                .booking(booking)
                .transactionCode(txnCode)
                .amount(request.getAmount())
                .paymentMethod(method)
                .status(TransactionStatus.SUCCESS)
                .type(type)
                .responseCode("COUNTER_CONFIRMED")
                .transactionTime(LocalDateTime.now())
                .actorEmail(receptionistEmail)
                .referenceNote(request.getReferenceNote())
                .build();
        txn = paymentTransactionRepository.save(txn);
        log.info("[PaymentService] Đã ghi nhận thu quầy Sổ Cái: mã {}, số tiền {}, hình thức {}",
                txnCode, request.getAmount(), method);

        // Cập nhật trạng thái thanh toán tổng thể của booking dựa trên tổng thực thu
        BigDecimal totalPaid = paymentTransactionRepository.sumSuccessfulPayments(booking.getId());
        if (booking.getTotalPrice() != null && totalPaid.compareTo(booking.getTotalPrice()) >= 0) {
            booking.setPaymentStatus(PaymentStatus.FULLY_PAID);
        } else if (totalPaid.compareTo(BigDecimal.ZERO) > 0 && booking.getPaymentStatus() == PaymentStatus.UNPAID) {
            booking.setPaymentStatus(PaymentStatus.PARTIALLY_PAID);
        }
        bookingRepository.save(booking);

        return toLedgerEntryDTO(txn);
    }

    /**
     * Admin: Tra cứu Sổ Cái Thanh Toán phân trang kèm bộ lọc và báo cáo dòng tiền ròng (SRS §FR-19.1, §FR-19.2).
     */
    @Transactional(readOnly = true)
    public PaymentLedgerResponse getPaymentLedger(PaymentLedgerFilter filter) {
        if (filter == null) {
            filter = new PaymentLedgerFilter();
        }

        // Validate ngày bắt buộc: startDate <= endDate
        if (filter.getStartDate() != null && filter.getEndDate() != null && filter.getStartDate().isAfter(filter.getEndDate())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Khoảng thời gian không hợp lệ: startDate không được lớn hơn endDate");
        }

        int page = Math.max(0, filter.getPage());
        int size = Math.min(100, Math.max(1, filter.getSize() > 0 ? filter.getSize() : 20));

        // Sort ổn định theo thời gian giao dịch thực tế mới nhất trước
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Order.desc("transactionTime"), Sort.Order.desc("id")));

        Specification<PaymentTransaction> spec = PaymentLedgerSpecification.withFilter(filter);
        Page<PaymentTransaction> pageResult = paymentTransactionRepository.findAll(spec, pageable);

        List<PaymentLedgerEntryDTO> entries = pageResult.getContent().stream()
                .map(this::toLedgerEntryDTO)
                .toList();

        // Tính toán tóm tắt dòng tiền trong kỳ đối soát
        PaymentLedgerSummaryDTO summary = getLedgerSummary(filter.getStartDate(), filter.getEndDate());

        return PaymentLedgerResponse.builder()
                .entries(entries)
                .page(pageResult.getNumber())
                .size(pageResult.getSize())
                .totalElements(pageResult.getTotalElements())
                .totalPages(pageResult.getTotalPages())
                .summary(summary)
                .build();
    }

    /**
     * Thống kê tổng hợp Dòng tiền Sổ Cái trong kỳ (SRS §FR-19.2).
     * Dòng tiền thực thu (Net Cash Flow) = Tổng cọc online + Tổng thu quầy - Tổng đã hoàn cọc.
     */
    @Transactional(readOnly = true)
    public PaymentLedgerSummaryDTO getLedgerSummary(LocalDate startDate, LocalDate endDate) {
        LocalDate start = startDate != null ? startDate : LocalDate.now().withDayOfMonth(1);
        LocalDate end = endDate != null ? endDate : LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth());

        if (start.isAfter(end)) {
            LocalDate temp = start;
            start = end;
            end = temp;
        }

        LocalDateTime startDateTime = start.atStartOfDay();
        LocalDateTime endDateTime = end.atTime(LocalTime.MAX);

        List<PaymentTransaction> txns = paymentTransactionRepository.findSuccessfulTransactionsByTimeBetween(startDateTime, endDateTime);
        if (txns == null) {
            txns = Collections.emptyList();
        }

        BigDecimal depositTotal = BigDecimal.ZERO;
        BigDecimal counterCashTotal = BigDecimal.ZERO;
        BigDecimal counterTransferTotal = BigDecimal.ZERO;
        BigDecimal refundTotal = BigDecimal.ZERO;
        long successCount = 0;

        for (PaymentTransaction pt : txns) {
            BigDecimal amt = pt.getAmount() != null ? pt.getAmount() : BigDecimal.ZERO;
            PaymentTransactionType type = pt.getType() != null ? pt.getType() : PaymentTransactionType.DEPOSIT;
            successCount++;

            switch (type) {
                case DEPOSIT -> depositTotal = depositTotal.add(amt);
                case COUNTER_PAYMENT, ADDITIONAL_SERVICE -> {
                    if (pt.getPaymentMethod() == PaymentMethod.CASH) {
                        counterCashTotal = counterCashTotal.add(amt);
                    } else {
                        counterTransferTotal = counterTransferTotal.add(amt);
                    }
                }
                case REFUND -> refundTotal = refundTotal.add(amt);
            }
        }

        BigDecimal counterTotal = counterCashTotal.add(counterTransferTotal);
        BigDecimal netFlow = depositTotal.add(counterTotal).subtract(refundTotal);
        long failedCount = paymentTransactionRepository.countFailedTransactionsByTimeBetween(startDateTime, endDateTime);

        return PaymentLedgerSummaryDTO.builder()
                .periodStart(start)
                .periodEnd(end)
                .totalDepositOnline(depositTotal)
                .totalCounterCash(counterCashTotal)
                .totalCounterTransfer(counterTransferTotal)
                .totalCounterRevenue(counterTotal)
                .totalRefunded(refundTotal)
                .netCashFlow(netFlow)
                .successfulTransactionCount(successCount)
                .failedTransactionCount(failedCount)
                .build();
    }

    /**
     * Chuyển đổi PaymentTransaction entity sang PaymentLedgerEntryDTO kèm PaymentReferenceDTO
     */
    public PaymentLedgerEntryDTO toLedgerEntryDTO(PaymentTransaction pt) {
        if (pt == null) return null;

        PaymentTransactionType type = pt.getType() != null ? pt.getType() : PaymentTransactionType.DEPOSIT;
        int sign = (type == PaymentTransactionType.REFUND) ? -1 : 1;
        LocalDateTime txTime = pt.getTransactionTime() != null ? pt.getTransactionTime() : pt.getCreatedAt();

        Booking booking = pt.getBooking();
        PaymentReferenceDTO reference = null;
        if (booking != null) {
            String customerName = (booking.getUser() != null && booking.getUser().getFullName() != null)
                    ? booking.getUser().getFullName() : "Khách lưu trú";
            String customerEmail = (booking.getUser() != null) ? booking.getUser().getEmail() : null;
            String customerPhone = (booking.getUser() != null) ? booking.getUser().getPhone() : null;
            String roomTypeName = (booking.getRoomType() != null) ? booking.getRoomType().getName() : "Phòng nghỉ";

            reference = PaymentReferenceDTO.builder()
                    .bookingId(booking.getId())
                    .bookingCode(booking.getBookingCode())
                    .customerName(customerName)
                    .customerEmail(customerEmail)
                    .customerPhone(customerPhone)
                    .roomTypeName(roomTypeName)
                    .checkInDate(booking.getCheckInDate())
                    .checkOutDate(booking.getCheckOutDate())
                    .totalBookingPrice(booking.getTotalPrice())
                    .externalTransactionNo(pt.getVnpTransactionNo())
                    .referenceNote(pt.getReferenceNote())
                    .build();
        }

        return PaymentLedgerEntryDTO.builder()
                .transactionId(pt.getId())
                .transactionCode(pt.getTransactionCode())
                .bookingCode(booking != null ? booking.getBookingCode() : null)
                .type(type)
                .amount(pt.getAmount())
                .cashFlowSign(sign)
                .paymentMethod(pt.getPaymentMethod())
                .status(pt.getStatus())
                .transactionTime(txTime)
                .responseCode(pt.getResponseCode())
                .actorEmail(pt.getActorEmail())
                .reference(reference)
                .build();
    }

    // ─── Helper ──────────────────────────────────────────────────────

    private RefundResponse toRefundResponse(Booking b) {
        return RefundResponse.builder()
                .bookingId(b.getId())
                .bookingCode(b.getBookingCode())
                .customerName(b.getUser().getFullName())
                .customerPhone(b.getUser().getPhone())
                .refundAmount(b.getRefundAmount() != null ? b.getRefundAmount() : BigDecimal.ZERO)
                .bankName(b.getBankName())
                .accountNumberMasked(maskAccountNumber(b.getBankAccountNumber()))
                .accountHolder(b.getBankAccountHolder())
                .paymentStatus(b.getPaymentStatus().name())
                .cancelledAt(b.getCancelledAt())
                .build();
    }

    private String maskAccountNumber(String rawNumber) {
        if (rawNumber == null || rawNumber.length() < 4) {
            return "****";
        }
        return "**** **** " + rawNumber.substring(rawNumber.length() - 4);
    }

    // ═══════════════════════════════════════════════════════════════
    // VIETQR — Thanh toán chuyển khoản ngân hàng qua mã VietQR
    // ═══════════════════════════════════════════════════════════════

    /**
     * Tạo hoặc lấy yêu cầu thanh toán VietQR cho booking (Khách hàng hoặc Lễ tân/Admin).
     */
    @Transactional
    public VietQrPaymentResponse createVietQrPayment(CreateVietQrPaymentRequest request, String userEmail, boolean isAdminOrReceptionist) {
        Booking booking = null;
        if (request.getBookingId() != null) {
            booking = bookingRepository.findById(request.getBookingId())
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy đặt phòng với ID: " + request.getBookingId()));
        } else if (request.getBookingCode() != null && !request.getBookingCode().isBlank()) {
            booking = bookingRepository.findByBookingCode(request.getBookingCode().trim())
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy đặt phòng với mã: " + request.getBookingCode()));
        } else {
            throw new AppException(HttpStatus.BAD_REQUEST, "Cần cung cấp bookingId hoặc bookingCode để tạo thanh toán");
        }

        if (!isAdminOrReceptionist && booking.getUser() != null && !booking.getUser().getEmail().equalsIgnoreCase(userEmail)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Bạn không có quyền truy cập thanh toán của đơn đặt phòng này");
        }

        return createOrGetVietQrPayment(booking, userEmail);
    }

    /**
     * Khởi tạo giao dịch VietQR PENDING cho booking.
     * Tận dụng giao dịch PENDING còn hiệu lực nếu đã tồn tại, tránh sinh trùng lặp.
     */
    @Transactional
    public VietQrPaymentResponse createOrGetVietQrPayment(Booking booking, String actorEmail) {
        if (booking.getBookingStatus() == BookingStatus.CANCELLED) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Đơn đặt phòng này đã bị hủy, không thể tiến hành thanh toán.");
        }
        if (booking.getPaymentStatus() == PaymentStatus.FULLY_PAID) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Đơn đặt phòng này đã được thanh toán toàn bộ.");
        }

        // Số tiền thanh toán: Lấy từ database (tiền cọc 50% hoặc số tiền còn lại)
        BigDecimal amount = booking.getDepositAmount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            amount = booking.getTotalPrice() != null
                    ? booking.getTotalPrice().divide(BigDecimal.valueOf(2), 0, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
        }

        LocalDateTime now = LocalDateTime.now();

        // Kiểm tra xem đã có giao dịch VietQR PENDING nào đang còn hiệu lực không
        Optional<PaymentTransaction> existingPendingOpt = paymentTransactionRepository
                .findFirstByBookingIdAndStatusOrderByCreatedAtDesc(booking.getId(), TransactionStatus.PENDING);

        if (existingPendingOpt.isPresent()) {
            PaymentTransaction existing = existingPendingOpt.get();
            if (existing.getExpiresAt() == null || existing.getExpiresAt().isAfter(now)) {
                // Tái sử dụng giao dịch PENDING đang chờ
                return toVietQrResponse(existing);
            } else {
                // Đã hết hạn -> Cập nhật trạng thái EXPIRED
                existing.setStatus(TransactionStatus.EXPIRED);
                paymentTransactionRepository.save(existing);
            }
        }

        // Tạo giao dịch PENDING mới
        int expireMinutes = vietQrConfig.getExpireMinutes() > 0 ? vietQrConfig.getExpireMinutes() : 15;
        LocalDateTime expiresAt = now.plusMinutes(expireMinutes);
        String transferContent = "HBS" + booking.getId();
        String transactionCode = "VQR-" + booking.getBookingCode() + "-" + System.currentTimeMillis();
        String qrCodeUrl = vietQrConfig.generateQrUrl(amount, transferContent);

        PaymentTransaction txn = PaymentTransaction.builder()
                .booking(booking)
                .transactionCode(transactionCode)
                .amount(amount)
                .paymentMethod(PaymentMethod.VIETQR)
                .status(TransactionStatus.PENDING)
                .type(PaymentTransactionType.DEPOSIT)
                .actorEmail(actorEmail)
                .referenceNote(transferContent)
                .qrCodeUrl(qrCodeUrl)
                .expiresAt(expiresAt)
                .build();
        txn = paymentTransactionRepository.save(txn);

        // Cập nhật booking
        booking.setPaymentMethod(PaymentMethod.VIETQR);
        if (booking.getBookingStatus() == BookingStatus.PENDING) {
            booking.setHoldExpiresAt(expiresAt);
        }
        bookingRepository.save(booking);

        log.info("[VietQR] Đã tạo giao dịch thanh toán VietQR: booking={}, txnCode={}, amount={}, content={}",
                booking.getBookingCode(), transactionCode, amount, transferContent);

        return toVietQrResponse(txn);
    }

    /**
     * Tra cứu chi tiết thanh toán theo Payment ID.
     */
    @Transactional
    public VietQrPaymentResponse getPaymentById(Long paymentId, String userEmail, boolean isAdminOrReceptionist) {
        PaymentTransaction txn = paymentTransactionRepository.findById(paymentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy giao dịch thanh toán #" + paymentId));

        if (!isAdminOrReceptionist && txn.getBooking().getUser() != null
                && !txn.getBooking().getUser().getEmail().equalsIgnoreCase(userEmail)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Bạn không có quyền xem thông tin giao dịch này");
        }

        checkAndMarkExpired(txn);
        return toVietQrResponse(txn);
    }

    /**
     * Tra cứu thanh toán theo Booking ID hoặc Booking Code.
     */
    @Transactional
    public VietQrPaymentResponse getPaymentByBooking(String bookingIdentifier, String userEmail, boolean isAdminOrReceptionist) {
        Booking booking = null;
        if (bookingIdentifier.matches("^\\d+$")) {
            booking = bookingRepository.findById(Long.parseLong(bookingIdentifier)).orElse(null);
        }
        if (booking == null) {
            booking = bookingRepository.findByBookingCode(bookingIdentifier)
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn đặt phòng: " + bookingIdentifier));
        }

        if (!isAdminOrReceptionist && booking.getUser() != null
                && !booking.getUser().getEmail().equalsIgnoreCase(userEmail)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Bạn không có quyền xem giao dịch của đơn này");
        }

        // Tìm giao dịch mới nhất của booking
        Optional<PaymentTransaction> latestTxnOpt = paymentTransactionRepository
                .findFirstByBookingIdOrderByCreatedAtDesc(booking.getId());

        if (latestTxnOpt.isPresent()) {
            PaymentTransaction txn = latestTxnOpt.get();
            checkAndMarkExpired(txn);
            return toVietQrResponse(txn);
        }

        // Nếu chưa có giao dịch nào mà đơn có thể thanh toán -> Khởi tạo thanh toán VietQR
        if (booking.getBookingStatus() != BookingStatus.CANCELLED && booking.getPaymentStatus() != PaymentStatus.FULLY_PAID) {
            return createOrGetVietQrPayment(booking, userEmail);
        }

        throw new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy giao dịch thanh toán cho đơn đặt phòng này");
    }

    /**
     * Kiểm tra trạng thái thanh toán phục vụ polling từ Frontend.
     */
    @Transactional
    public PaymentStatusResponse getPaymentStatus(Long paymentId, String userEmail, boolean isAdminOrReceptionist) {
        PaymentTransaction txn = paymentTransactionRepository.findById(paymentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy giao dịch thanh toán #" + paymentId));

        if (!isAdminOrReceptionist && txn.getBooking().getUser() != null
                && !txn.getBooking().getUser().getEmail().equalsIgnoreCase(userEmail)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Bạn không có quyền truy cập trạng thái thanh toán này");
        }

        checkAndMarkExpired(txn);

        Booking booking = txn.getBooking();
        return PaymentStatusResponse.builder()
                .paymentId(txn.getId())
                .transactionCode(txn.getTransactionCode())
                .status(txn.getStatus().name())
                .bookingStatus(booking != null ? booking.getBookingStatus().name() : null)
                .paymentStatus(booking != null ? booking.getPaymentStatus().name() : null)
                .paidAt(txn.getTransactionTime())
                .rejectionReason(txn.getRejectionReason())
                .build();
    }

    /**
     * Danh sách giao dịch VietQR đang chờ xác nhận đối soát (Admin & Lễ tân).
     */
    @Transactional
    public Page<VietQrPaymentResponse> getPendingVietQrPayments(int page, int size, String search) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), Sort.by("createdAt").descending());

        Specification<PaymentTransaction> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("paymentMethod"), PaymentMethod.VIETQR));
            predicates.add(cb.equal(root.get("status"), TransactionStatus.PENDING));

            if (search != null && !search.isBlank()) {
                String keyword = "%" + search.trim().toLowerCase() + "%";
                jakarta.persistence.criteria.Join<PaymentTransaction, Booking> bookingJoin = root.join("booking");
                jakarta.persistence.criteria.Predicate codeMatch = cb.like(cb.lower(root.get("transactionCode")), keyword);
                jakarta.persistence.criteria.Predicate refMatch = cb.like(cb.lower(root.get("referenceNote")), keyword);
                jakarta.persistence.criteria.Predicate bookingCodeMatch = cb.like(cb.lower(bookingJoin.get("bookingCode")), keyword);
                predicates.add(cb.or(codeMatch, refMatch, bookingCodeMatch));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        Page<PaymentTransaction> pageResult = paymentTransactionRepository.findAll(spec, pageable);

        // Kiểm tra và cập nhật hết hạn nếu có
        return pageResult.map(txn -> {
            checkAndMarkExpired(txn);
            return toVietQrResponse(txn);
        });
    }

    /**
     * Admin/Lễ tân: Xác nhận giao dịch chuyển khoản VietQR thành công sau khi kiểm tra tài khoản thực tế.
     */
    @Transactional
    @Auditable(action = AuditAction.CONFIRM_VIETQR_PAYMENT, targetType = "PAYMENT", description = "Xác nhận chuyển khoản VietQR")
    public VietQrPaymentResponse confirmVietQrPayment(Long paymentId, String actorEmail) {
        PaymentTransaction txn = paymentTransactionRepository.findById(paymentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy giao dịch #" + paymentId));

        if (txn.getStatus() == TransactionStatus.SUCCESS) {
            throw new AppException(HttpStatus.CONFLICT, "Giao dịch này đã được xác nhận thành công trước đó.");
        }
        if (txn.getStatus() == TransactionStatus.FAILED) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Giao dịch này đã bị từ chối trước đó, không thể xác nhận.");
        }

        Booking booking = txn.getBooking();
        LocalDateTime now = LocalDateTime.now();

        // 1. Xử lý trường hợp đối soát muộn (Booking đã bị hủy do timeout trước đó)
        if (booking.getBookingStatus() == BookingStatus.CANCELLED) {
            log.warn("[VietQR] Đơn {} đã bị CANCELLED trước khi đối soát, kiểm tra khả năng tái kích hoạt", booking.getBookingCode());
            RoomType roomType = roomTypeRepository.findByIdForUpdate(booking.getRoomType().getId())
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Loại phòng không tồn tại"));

            int totalActive = roomRepository.countByRoomTypeIdAndStatusNot(roomType.getId(), RoomStatus.MAINTENANCE);
            int booked = bookingRepository.countBookedRooms(
                    roomType.getId(), booking.getCheckInDate(), booking.getCheckOutDate(), now);
            int available = totalActive - booked;

            if (available >= booking.getQuantity()) {
                booking.setBookingStatus(BookingStatus.CONFIRMED);
                booking.setPaymentStatus(PaymentStatus.PARTIALLY_PAID);
                booking.setHoldExpiresAt(null);
                log.info("[VietQR] Tái kích hoạt thành công đơn {}", booking.getBookingCode());
            } else {
                booking.setPaymentStatus(PaymentStatus.REFUND_PENDING);
                booking.setRefundAmount(txn.getAmount());
                log.warn("[VietQR] Phòng đã đầy, chuyển đơn {} sang REFUND_PENDING", booking.getBookingCode());
            }
        } else {
            // Đơn PENDING thông thường
            booking.setBookingStatus(BookingStatus.CONFIRMED);
            booking.setHoldExpiresAt(null);

            BigDecimal currentPaid = paymentTransactionRepository.sumSuccessfulPayments(booking.getId());
            BigDecimal totalPaid = (currentPaid != null ? currentPaid : BigDecimal.ZERO).add(txn.getAmount());

            if (booking.getTotalPrice() != null && totalPaid.compareTo(booking.getTotalPrice()) >= 0) {
                booking.setPaymentStatus(PaymentStatus.FULLY_PAID);
            } else {
                booking.setPaymentStatus(PaymentStatus.PARTIALLY_PAID);
            }
        }
        bookingRepository.save(booking);

        // 2. Cập nhật giao dịch PaymentTransaction
        txn.setStatus(TransactionStatus.SUCCESS);
        txn.setTransactionTime(now);
        txn.setVerifiedBy(actorEmail);
        txn.setVerifiedAt(now);
        txn.setResponseCode("CONFIRMED_MANUAL");
        String currentRefNote = txn.getReferenceNote() != null ? txn.getReferenceNote() : "";
        txn.setReferenceNote(currentRefNote + " [Đã xác nhận thực thu bởi " + actorEmail + "]");
        paymentTransactionRepository.save(txn);

        log.info("[VietQR] Admin/Lễ tân {} đã xác nhận giao dịch {} cho đơn {}",
                actorEmail, txn.getTransactionCode(), booking.getBookingCode());

        // 3. Tự động gửi Email xác nhận đặt phòng và đính kèm hóa đơn PDF
        if (booking.getBookingStatus() == BookingStatus.CONFIRMED) {
            sendBookingConfirmationEmailSafely(booking);
        }

        return toVietQrResponse(txn);
    }

    /**
     * Admin/Lễ tân: Từ chối giao dịch chuyển khoản VietQR nếu tiền không vào tài khoản hoặc sai lệch.
     */
    @Transactional
    @Auditable(action = AuditAction.REJECT_VIETQR_PAYMENT, targetType = "PAYMENT", description = "Từ chối giao dịch VietQR")
    public VietQrPaymentResponse rejectVietQrPayment(Long paymentId, RejectPaymentRequest request, String actorEmail) {
        PaymentTransaction txn = paymentTransactionRepository.findById(paymentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy giao dịch #" + paymentId));

        if (txn.getStatus() == TransactionStatus.SUCCESS) {
            throw new AppException(HttpStatus.CONFLICT, "Không thể từ chối giao dịch đã được xác nhận thành công.");
        }

        LocalDateTime now = LocalDateTime.now();
        txn.setStatus(TransactionStatus.FAILED);
        txn.setRejectionReason(request.getReason());
        txn.setVerifiedBy(actorEmail);
        txn.setVerifiedAt(now);
        txn.setResponseCode("REJECTED_MANUAL");
        paymentTransactionRepository.save(txn);

        log.info("[VietQR] Admin/Lễ tân {} đã từ chối giao dịch {} vì: {}",
                actorEmail, txn.getTransactionCode(), request.getReason());

        return toVietQrResponse(txn);
    }

    private void checkAndMarkExpired(PaymentTransaction txn) {
        if (txn.getStatus() == TransactionStatus.PENDING
                && txn.getExpiresAt() != null
                && txn.getExpiresAt().isBefore(LocalDateTime.now())) {
            txn.setStatus(TransactionStatus.EXPIRED);
            paymentTransactionRepository.save(txn);
        }
    }

    private VietQrPaymentResponse toVietQrResponse(PaymentTransaction txn) {
        Booking booking = txn.getBooking();
        String roomTypeName = (booking != null && booking.getRoomType() != null)
                ? booking.getRoomType().getName() : null;

        String customerName = null;
        String customerEmail = null;
        String customerPhone = null;

        if (booking != null && booking.getUser() != null) {
            customerName = booking.getUser().getFullName();
            customerEmail = booking.getUser().getEmail();
            customerPhone = booking.getUser().getPhone();
        }

        // Tự động sinh hoặc làm mới qrCodeUrl nếu chưa có
        String qrUrl = txn.getQrCodeUrl();
        if ((qrUrl == null || qrUrl.isBlank()) && vietQrConfig.isConfigured()) {
            String transferContent = txn.getReferenceNote() != null ? txn.getReferenceNote() : ("HBS" + (booking != null ? booking.getId() : ""));
            qrUrl = vietQrConfig.generateQrUrl(txn.getAmount(), transferContent);
        }

        return VietQrPaymentResponse.builder()
                .paymentId(txn.getId())
                .bookingId(booking != null ? booking.getId() : null)
                .bookingCode(booking != null ? booking.getBookingCode() : null)
                .roomTypeName(roomTypeName)
                .customerName(customerName)
                .customerEmail(customerEmail)
                .customerPhone(customerPhone)
                .transactionCode(txn.getTransactionCode())
                .transferContent(txn.getReferenceNote())
                .amount(txn.getAmount())
                .paymentMethod(txn.getPaymentMethod().name())
                .status(txn.getStatus().name())
                .qrCodeUrl(qrUrl)
                .bankCode(vietQrConfig.getBankCode())
                .bankAccount(vietQrConfig.getBankAccount())
                .bankAccountName(vietQrConfig.getBankAccountName())
                .vietQrTemplate(vietQrConfig.getTemplate())
                .expiresAt(txn.getExpiresAt())
                .createdAt(txn.getCreatedAt())
                .paidAt(txn.getTransactionTime())
                .verifiedBy(txn.getVerifiedBy())
                .verifiedAt(txn.getVerifiedAt())
                .rejectionReason(txn.getRejectionReason())
                .bankConfigured(vietQrConfig.isConfigured())
                .build();
    }
}
