package org.example.backend.payment.service;

import org.example.backend.audit.annotation.Auditable;
import org.example.backend.audit.entity.AuditAction;
import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.entity.BookingStatus;
import org.example.backend.booking.entity.PaymentMethod;
import org.example.backend.booking.entity.PaymentStatus;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.common.config.VnPayConfig;
import org.example.backend.common.exception.AppException;
import org.example.backend.mail.service.EmailService;
import org.example.backend.mail.service.PdfInvoiceService;
import org.example.backend.payment.dto.*;
import org.example.backend.payment.entity.PaymentTransaction;
import org.example.backend.payment.entity.TransactionStatus;
import org.example.backend.payment.repository.PaymentLedgerSpecification;
import org.example.backend.payment.repository.PaymentTransactionRepository;
import org.example.backend.payment.util.VnPayUtil;
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
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Service xử lý tích hợp VNPay Sandbox và nghiệp vụ đối soát/hoàn cọc:
 * - Sinh URL thanh toán cọc VNPay (50%)
 * - Xử lý Webhook IPN từ VNPay (Idempotency, Late IPN check)
 * - Xác thực kết quả Return URL
 * - Danh sách và xác nhận hoàn cọc thủ công cho Lễ tân
 */
@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);
    private static final DateTimeFormatter VNP_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final VnPayConfig vnPayConfig;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final BookingRepository bookingRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final RoomRepository roomRepository;

    @Autowired(required = false)
    private EmailService emailService;

    @Autowired(required = false)
    private PdfInvoiceService pdfInvoiceService;

    public PaymentService(VnPayConfig vnPayConfig,
                          PaymentTransactionRepository paymentTransactionRepository,
                          BookingRepository bookingRepository,
                          RoomTypeRepository roomTypeRepository,
                          RoomRepository roomRepository) {
        this.vnPayConfig = vnPayConfig;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.bookingRepository = bookingRepository;
        this.roomTypeRepository = roomTypeRepository;
        this.roomRepository = roomRepository;
    }

    /**
     * Tạo giao dịch PENDING và sinh URL chuyển hướng VNPay Sandbox (SRS §2.4).
     */
    @Transactional
    public String createPaymentUrl(Booking booking, String ipAddress) {
        String transactionCode = "TXN-" + booking.getBookingCode() + "-" + System.currentTimeMillis();
        LocalDateTime expiresAt = booking.getHoldExpiresAt() != null
                ? booking.getHoldExpiresAt()
                : LocalDateTime.now().plusMinutes(15);

        // Lưu bản ghi PaymentTransaction PENDING
        PaymentTransaction transaction = PaymentTransaction.builder()
                .booking(booking)
                .transactionCode(transactionCode)
                .amount(booking.getDepositAmount())
                .paymentMethod(PaymentMethod.VNPAY)
                .status(TransactionStatus.PENDING)
                .type(PaymentTransactionType.DEPOSIT)
                .actorEmail(booking.getUser() != null ? booking.getUser().getEmail() : "customer@grandaurora.com")
                .referenceNote("Tạo lệnh thanh toán cọc 50% qua cổng VNPay Sandbox")
                .expiresAt(expiresAt)
                .build();
        paymentTransactionRepository.save(transaction);

        // Chuẩn bị tham số VNPay v2.1.0
        long amountInVndUnits = booking.getDepositAmount().multiply(BigDecimal.valueOf(100)).longValue();
        String createDate = LocalDateTime.now().format(VNP_DATE_FORMAT);
        String expireDate = expiresAt.format(VNP_DATE_FORMAT);

        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_Version", "2.1.0");
        vnpParams.put("vnp_Command", "pay");
        vnpParams.put("vnp_TmnCode", vnPayConfig.getTmnCode());
        vnpParams.put("vnp_Amount", String.valueOf(amountInVndUnits));
        vnpParams.put("vnp_CurrCode", "VND");
        vnpParams.put("vnp_TxnRef", transactionCode);
        vnpParams.put("vnp_OrderInfo", "Dat coc phong " + booking.getBookingCode());
        vnpParams.put("vnp_OrderType", "other");
        vnpParams.put("vnp_Locale", "vn");
        vnpParams.put("vnp_ReturnUrl", vnPayConfig.getReturnUrl());
        vnpParams.put("vnp_IpAddr", (ipAddress != null && !ipAddress.isBlank()) ? ipAddress : "127.0.0.1");
        vnpParams.put("vnp_CreateDate", createDate);
        vnpParams.put("vnp_ExpireDate", expireDate);

        List<String> fieldNames = new ArrayList<>(vnpParams.keySet());
        Collections.sort(fieldNames);

        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();
        Iterator<String> itr = fieldNames.iterator();
        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = vnpParams.get(fieldName);
            if (fieldValue != null && !fieldValue.isEmpty()) {
                hashData.append(fieldName);
                hashData.append('=');
                hashData.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII));

                query.append(URLEncoder.encode(fieldName, StandardCharsets.US_ASCII));
                query.append('=');
                query.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII));

                if (itr.hasNext()) {
                    query.append('&');
                    hashData.append('&');
                }
            }
        }

        String secureHash = VnPayUtil.hmacSHA512(vnPayConfig.getHashSecret(), hashData.toString());
        query.append("&vnp_SecureHash=").append(secureHash);

        return vnPayConfig.getPayUrl() + "?" + query;
    }

    /**
     * Xử lý IPN Webhook Server-to-Server từ VNPay (SRS §2.4, §4.2).
     *
     * Mã phản hồi trả lại VNPay:
     * - 00: Confirm Success
     * - 01: Order not found
     * - 02: Order already confirmed (Idempotent)
     * - 04: Invalid Amount
     * - 97: Invalid Checksum
     */
    @Transactional
    public Map<String, String> processIpn(Map<String, String> params) {
        log.info("[VNPay IPN] Nhận callback với TxnRef: {}", params.get("vnp_TxnRef"));

        // 1. Kiểm tra chữ ký HMAC-SHA512
        if (!VnPayUtil.verifySignature(params, vnPayConfig.getHashSecret())) {
            log.warn("[VNPay IPN] Chữ ký không hợp lệ");
            return Map.of("RspCode", "97", "Message", "Invalid Checksum");
        }

        String transactionCode = params.get("vnp_TxnRef");
        Optional<PaymentTransaction> txnOpt = paymentTransactionRepository.findByTransactionCode(transactionCode);
        if (txnOpt.isEmpty()) {
            log.warn("[VNPay IPN] Không tìm thấy giao dịch: {}", transactionCode);
            return Map.of("RspCode", "01", "Message", "Order not found");
        }

        PaymentTransaction transaction = txnOpt.get();

        // 2. Kiểm tra số tiền
        long vnpAmount = Long.parseLong(params.get("vnp_Amount")) / 100;
        if (vnpAmount != transaction.getAmount().longValue()) {
            log.warn("[VNPay IPN] Số tiền không khớp: nhận {}, hệ thống {}",
                    vnpAmount, transaction.getAmount());
            return Map.of("RspCode", "04", "Message", "Invalid Amount");
        }

        // 3. Chống xử lý lặp (Idempotent)
        if (transaction.getStatus() == TransactionStatus.SUCCESS) {
            log.info("[VNPay IPN] Giao dịch đã được xử lý trước đó: {}", transactionCode);
            return Map.of("RspCode", "02", "Message", "Order already confirmed");
        }

        String responseCode = params.get("vnp_ResponseCode");
        String vnpTransactionNo = params.get("vnp_TransactionNo");
        Booking booking = transaction.getBooking();

        if ("00".equals(responseCode)) {
            // Thanh toán thành công
            log.info("[VNPay IPN] Thanh toán thành công cho đơn {}", booking.getBookingCode());

            // 4. Xử lý Late IPN (nếu đơn đã bị hủy do timeout trước đó)
            if (booking.getBookingStatus() == BookingStatus.CANCELLED) {
                log.warn("[VNPay IPN] Đơn {} đã bị CANCELLED, tiến hành kiểm tra Late IPN", booking.getBookingCode());
                RoomType roomType = roomTypeRepository.findByIdForUpdate(booking.getRoomType().getId())
                        .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Loại phòng không tồn tại"));

                int totalActive = roomRepository.countByRoomTypeIdAndStatusNot(roomType.getId(), RoomStatus.MAINTENANCE);
                int booked = bookingRepository.countBookedRooms(
                        roomType.getId(), booking.getCheckInDate(), booking.getCheckOutDate(), LocalDateTime.now());
                int available = totalActive - booked;

                if (available >= booking.getQuantity()) {
                    // Còn phòng -> Kích hoạt lại
                    booking.setBookingStatus(BookingStatus.CONFIRMED);
                    booking.setPaymentStatus(PaymentStatus.PARTIALLY_PAID);
                    booking.setHoldExpiresAt(null);
                    log.info("[VNPay IPN] Tái kích hoạt thành công đơn {}", booking.getBookingCode());
                } else {
                    // Hết phòng -> Tuyệt đối không overbooking, chuyển REFUND_PENDING
                    booking.setPaymentStatus(PaymentStatus.REFUND_PENDING);
                    booking.setRefundAmount(transaction.getAmount());
                    log.warn("[VNPay IPN] Đã hết phòng, chuyển đơn {} sang REFUND_PENDING", booking.getBookingCode());
                }
            } else {
                // Đơn PENDING thông thường
                booking.setBookingStatus(BookingStatus.CONFIRMED);
                booking.setPaymentStatus(PaymentStatus.PARTIALLY_PAID);
                booking.setHoldExpiresAt(null);
            }

            transaction.setType(PaymentTransactionType.DEPOSIT);
            transaction.setStatus(TransactionStatus.SUCCESS);
            transaction.setVnpTransactionNo(vnpTransactionNo);
            transaction.setResponseCode(responseCode);
            transaction.setTransactionTime(LocalDateTime.now());
            transaction.setActorEmail(booking.getUser() != null ? booking.getUser().getEmail() : "customer@grandaurora.com");
            transaction.setReferenceNote("Thanh toán cọc 50% VNPay thành công - Mã GD VNPay: " + vnpTransactionNo);
        } else {
            // Thanh toán thất bại hoặc khách hủy
            log.warn("[VNPay IPN] Thanh toán không thành công, mã phản hồi: {}", responseCode);
            transaction.setStatus(TransactionStatus.FAILED);
            transaction.setResponseCode(responseCode);
        }

        paymentTransactionRepository.save(transaction);
        bookingRepository.save(booking);

        // Gửi email xác nhận đặt phòng và hóa đơn cọc 50% khi VNPay thanh toán thành công
        if (booking.getBookingStatus() == BookingStatus.CONFIRMED && "00".equals(responseCode)) {
            sendBookingConfirmationEmailSafely(booking);
        }

        return Map.of("RspCode", "00", "Message", "Confirm Success");
    }

    /**
     * Gửi an toàn email xác nhận cọc 50% và đính kèm hóa đơn PDF OpenPDF (SRS §2.4, §FR-15.1).
     * Bọc try-catch không làm sập tiến trình IPN nếu SMTP có sự cố.
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
            log.info("[PaymentService] Đã kích hoạt gửi Email xác nhận cọc 50% VNPay cho booking [{}] tới [{}]",
                    booking.getBookingCode(), recipientEmail);
        } catch (Exception e) {
            log.error("[PaymentService] Gặp lỗi khi gửi email xác nhận cọc cho booking [{}]: {}",
                    booking.getBookingCode(), e.getMessage());
        }
    }

    /**
     * Xác thực kết quả trả về trình duyệt từ VNPay (Return URL).
     */
    @Transactional(readOnly = true)
    public VnPayReturnResponse processReturn(Map<String, String> params) {
        boolean validSignature = VnPayUtil.verifySignature(params, vnPayConfig.getHashSecret());
        String transactionCode = params.get("vnp_TxnRef");
        String responseCode = params.get("vnp_ResponseCode");
        String vnpTransactionNo = params.get("vnp_TransactionNo");
        long amount = params.get("vnp_Amount") != null ? Long.parseLong(params.get("vnp_Amount")) / 100 : 0;

        PaymentTransaction transaction = paymentTransactionRepository.findByTransactionCode(transactionCode)
                .orElse(null);

        String bookingCode = transaction != null ? transaction.getBooking().getBookingCode() : "UNKNOWN";
        boolean success = validSignature && "00".equals(responseCode);
        String message = success ? "Giao dịch thanh toán thành công"
                : (!validSignature ? "Chữ ký không hợp lệ" : "Giao dịch thất bại (mã: " + responseCode + ")");

        return VnPayReturnResponse.builder()
                .bookingCode(bookingCode)
                .transactionCode(transactionCode)
                .vnpTransactionNo(vnpTransactionNo)
                .amount(BigDecimal.valueOf(amount))
                .responseCode(responseCode)
                .success(success)
                .message(message)
                .build();
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
}
