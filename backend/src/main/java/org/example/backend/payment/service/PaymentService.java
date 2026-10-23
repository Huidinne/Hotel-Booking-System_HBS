package org.example.backend.payment.service;

import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.entity.BookingStatus;
import org.example.backend.booking.entity.PaymentMethod;
import org.example.backend.booking.entity.PaymentStatus;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.common.config.VnPayConfig;
import org.example.backend.common.exception.AppException;
import org.example.backend.payment.dto.ConfirmRefundRequest;
import org.example.backend.payment.dto.RefundResponse;
import org.example.backend.payment.dto.VnPayReturnResponse;
import org.example.backend.payment.entity.PaymentTransaction;
import org.example.backend.payment.entity.TransactionStatus;
import org.example.backend.payment.repository.PaymentTransactionRepository;
import org.example.backend.payment.util.VnPayUtil;
import org.example.backend.room.entity.RoomStatus;
import org.example.backend.room.entity.RoomType;
import org.example.backend.room.repository.RoomRepository;
import org.example.backend.room.repository.RoomTypeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
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

            transaction.setStatus(TransactionStatus.SUCCESS);
            transaction.setVnpTransactionNo(vnpTransactionNo);
            transaction.setResponseCode(responseCode);
            transaction.setTransactionTime(LocalDateTime.now());
        } else {
            // Thanh toán thất bại hoặc khách hủy
            log.warn("[VNPay IPN] Thanh toán không thành công, mã phản hồi: {}", responseCode);
            transaction.setStatus(TransactionStatus.FAILED);
            transaction.setResponseCode(responseCode);
        }

        paymentTransactionRepository.save(transaction);
        bookingRepository.save(booking);

        return Map.of("RspCode", "00", "Message", "Confirm Success");
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

        booking = bookingRepository.save(booking);
        return toRefundResponse(booking);
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
