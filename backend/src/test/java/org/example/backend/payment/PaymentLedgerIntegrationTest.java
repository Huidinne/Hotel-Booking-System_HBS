package org.example.backend.payment;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.backend.audit.entity.AuditAction;
import org.example.backend.audit.entity.AuditLog;
import org.example.backend.audit.repository.AuditLogRepository;
import org.example.backend.auth.security.JwtProvider;
import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.entity.BookingStatus;
import org.example.backend.booking.entity.PaymentMethod;
import org.example.backend.booking.entity.PaymentStatus;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.mail.service.EmailService;
import org.example.backend.payment.dto.ConfirmRefundRequest;
import org.example.backend.payment.dto.PaymentTransactionType;
import org.example.backend.payment.dto.RecordCounterPaymentRequest;
import org.example.backend.payment.entity.PaymentTransaction;
import org.example.backend.payment.entity.TransactionStatus;
import org.example.backend.payment.repository.PaymentTransactionRepository;
import org.example.backend.room.entity.RoomType;
import org.example.backend.room.repository.RoomRepository;
import org.example.backend.room.repository.RoomTypeRepository;
import org.example.backend.user.entity.Role;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiểm thử tích hợp Sổ Cái Thanh Toán & Dòng Tiền Thực Thu (SRS §FR-19, SP3-1111-ANH):
 * 1. Ghi nhận cọc VNPay IPN & Kiểm tra Idempotency (không double count).
 * 2. Ghi nhận thu quầy (Cash/POS) với thời điểm thực tế, không bịa timestamp cũ.
 * 3. Ghi nhận xuất hoàn tiền (Refund Outflow) vào payment_transactions.
 * 4. Truy vấn Sổ Cái theo khoảng ngày và tính toán Dòng tiền ròng (Net Cash Flow).
 * 5. Validate ngày (startDate > endDate trả về HTTP 400).
 * 6. Phân quyền RBAC (Admin 200, Receptionist 403 vào sổ cái admin).
 */
@SpringBootTest
@AutoConfigureMockMvc
class PaymentLedgerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private PaymentTransactionRepository paymentTransactionRepository;

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private JwtProvider jwtProvider;

    @MockBean
    private EmailService emailService;

    private User adminUser;
    private User receptionistUser;
    private User customerUser;
    private String adminToken;
    private String receptionistToken;
    private String customerToken;
    private RoomType roomType;

    @BeforeEach
    void setUp() {
        auditLogRepository.deleteAll();
        paymentTransactionRepository.deleteAll();
        bookingRepository.deleteAll();
        userRepository.deleteAll();

        // 1. Tạo users cho 3 role
        adminUser = userRepository.save(User.builder()
                .email("admin.ledger@grandaurora.com")
                .password("$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF")
                .fullName("Quản trị viên Sổ cái")
                .phone("0901000001")
                .role(Role.ROLE_ADMIN)
                .build());

        receptionistUser = userRepository.save(User.builder()
                .email("receptionist.ledger@grandaurora.com")
                .password("$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF")
                .fullName("Lễ tân Quầy thu ngân")
                .phone("0902000002")
                .role(Role.ROLE_RECEPTIONIST)
                .build());

        customerUser = userRepository.save(User.builder()
                .email("customer.ledger@grandaurora.com")
                .password("$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF")
                .fullName("Khách hàng Đặt phòng")
                .phone("0903000003")
                .role(Role.ROLE_CUSTOMER)
                .build());

        adminToken = jwtProvider.generateAccessToken(adminUser);
        receptionistToken = jwtProvider.generateAccessToken(receptionistUser);
        customerToken = jwtProvider.generateAccessToken(customerUser);

        // 2. Lấy hoặc tạo RoomType
        List<RoomType> types = roomTypeRepository.findAll();
        if (types.isEmpty()) {
            roomType = roomTypeRepository.save(RoomType.builder()
                    .name("Deluxe Ocean View")
                    .basePrice(BigDecimal.valueOf(1000000))
                    .capacity(2)
                    .description("Phòng view biển cao cấp")
                    .isActive(true)
                    .build());
        } else {
            roomType = types.get(0);
        }
    }

    private Booking createTestBooking(String code, BigDecimal totalPrice, BigDecimal deposit) {
        return bookingRepository.save(Booking.builder()
                .bookingCode(code)
                .user(customerUser)
                .roomType(roomType)
                .quantity(1)
                .guests(2)
                .checkInDate(LocalDate.now().plusDays(2))
                .checkOutDate(LocalDate.now().plusDays(4))
                .pricePerNight(totalPrice.divide(BigDecimal.valueOf(2)))
                .totalPrice(totalPrice)
                .depositAmount(deposit)
                .bookingStatus(BookingStatus.CONFIRMED)
                .paymentStatus(PaymentStatus.PARTIALLY_PAID)
                .paymentMethod(PaymentMethod.VIETQR)
                .build());
    }

    // ─── TEST 1: THU CỌC VIETQR & IDEMPOTENCY ─────────────────────────────

    @Test
    @DisplayName("Test 1: Xác nhận VietQR ghi nhận thu cọc đúng thời điểm và không double count khi gọi lại")
    void testVietQrDepositAndIdempotency() throws Exception {
        Booking booking = createTestBooking("BK-LEDGER-001", BigDecimal.valueOf(2000000), BigDecimal.valueOf(1000000));
        String txnCode = "TXN-" + booking.getBookingCode() + "-TEST";

        PaymentTransaction txn = paymentTransactionRepository.save(PaymentTransaction.builder()
                .booking(booking)
                .transactionCode(txnCode)
                .amount(BigDecimal.valueOf(1000000))
                .paymentMethod(PaymentMethod.VIETQR)
                .status(TransactionStatus.PENDING)
                .type(PaymentTransactionType.DEPOSIT)
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .build());

        // Lần 1: Gọi duyệt VietQR thành công
        mockMvc.perform(post("/api/v1/admin/payments/" + txn.getId() + "/confirm")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        PaymentTransaction updatedTxn = paymentTransactionRepository.findByTransactionCode(txnCode).orElseThrow();
        assertEquals(TransactionStatus.SUCCESS, updatedTxn.getStatus());
        assertEquals(PaymentTransactionType.DEPOSIT, updatedTxn.getType());
        assertNotNull(updatedTxn.getTransactionTime());
        // Kiểm tra thời điểm giao dịch là thời điểm thực tế (chênh lệch dưới 5s)
        assertTrue(ChronoUnit.SECONDS.between(updatedTxn.getTransactionTime(), LocalDateTime.now()) < 5);

        // Lần 2: Gọi lại confirm -> Phải trả về HTTP 409 Conflict (đã xử lý trước đó) để chống double count
        mockMvc.perform(post("/api/v1/admin/payments/" + txn.getId() + "/confirm")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isConflict());

        // Xác nhận số tiền không bị nhân đôi
        BigDecimal totalPaid = paymentTransactionRepository.sumSuccessfulPayments(booking.getId());
        assertEquals(0, BigDecimal.valueOf(1000000).compareTo(totalPaid));
    }

    // ─── TEST 2: THU QUẦY LỄ TÂN (COUNTER PAYMENT) ───────────────────────────

    @Test
    @DisplayName("Test 2: Lễ tân ghi nhận thu tiền tại quầy thực tế, đúng timestamp hiện tại, không suy đoán")
    void testRecordCounterPayment() throws Exception {
        Booking booking = createTestBooking("BK-LEDGER-002", BigDecimal.valueOf(2000000), BigDecimal.valueOf(1000000));

        // Đã cọc trước 1.000.000 qua VNPay
        paymentTransactionRepository.save(PaymentTransaction.builder()
                .booking(booking)
                .transactionCode("TXN-DEP-002")
                .amount(BigDecimal.valueOf(1000000))
                .paymentMethod(PaymentMethod.VIETQR)
                .status(TransactionStatus.SUCCESS)
                .type(PaymentTransactionType.DEPOSIT)
                .transactionTime(LocalDateTime.now().minusHours(2))
                .actorEmail(customerUser.getEmail())
                .build());

        RecordCounterPaymentRequest request = RecordCounterPaymentRequest.builder()
                .bookingId(booking.getId())
                .amount(BigDecimal.valueOf(1000000))
                .paymentMethod(PaymentMethod.CASH)
                .type(PaymentTransactionType.COUNTER_PAYMENT)
                .referenceNote("Thu nốt 50% tiền phòng bằng tiền mặt khi khách Check-out")
                .build();

        LocalDateTime beforeCall = LocalDateTime.now().minusSeconds(1);

        mockMvc.perform(post("/api/v1/receptionist/payments/counter")
                        .header("Authorization", "Bearer " + receptionistToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.type").value("COUNTER_PAYMENT"))
                .andExpect(jsonPath("$.data.amount").value(1000000.00))
                .andExpect(jsonPath("$.data.paymentMethod").value("CASH"))
                .andExpect(jsonPath("$.data.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.actorEmail").value(receptionistUser.getEmail()))
                .andExpect(jsonPath("$.data.reference.referenceNote").value("Thu nốt 50% tiền phòng bằng tiền mặt khi khách Check-out"));

        // Kiểm tra trong CSDL: Có 2 giao dịch (1 deposit, 1 counter payment)
        List<PaymentTransaction> txns = paymentTransactionRepository.findByBookingId(booking.getId());
        assertEquals(2, txns.size());
        PaymentTransaction counterTxn = txns.stream()
                .filter(t -> t.getType() == PaymentTransactionType.COUNTER_PAYMENT)
                .findFirst()
                .orElseThrow();
        assertEquals(PaymentTransactionType.COUNTER_PAYMENT, counterTxn.getType());
        assertTrue(counterTxn.getTransactionTime().isAfter(beforeCall));

        // Booking phải được cập nhật sang FULLY_PAID vì đã thu đủ 2.000.000 VNĐ
        Booking reloadedBooking = bookingRepository.findById(booking.getId()).orElseThrow();
        assertEquals(PaymentStatus.FULLY_PAID, reloadedBooking.getPaymentStatus());
    }

    // ─── TEST 3: XUẤT HOÀN TIỀN CỌC (REFUND OUTFLOW) ──────────────────────────

    @Test
    @DisplayName("Test 3: Xác nhận hoàn tiền tự động ghi nhận bút toán REFUND vào payment_transactions")
    void testConfirmRefundRecordsRefundTransaction() throws Exception {
        Booking booking = createTestBooking("BK-LEDGER-003", BigDecimal.valueOf(2000000), BigDecimal.valueOf(1000000));
        booking.setBookingStatus(BookingStatus.CANCELLED);
        booking.setPaymentStatus(PaymentStatus.REFUND_PENDING);
        booking.setRefundAmount(BigDecimal.valueOf(700000)); // Phạt 300k, hoàn 700k
        booking.setBankName("Vietcombank");
        booking.setBankAccountNumber("0123456789");
        booking.setBankAccountHolder("NGUYEN VAN KHIEU");
        bookingRepository.save(booking);

        ConfirmRefundRequest request = new ConfirmRefundRequest("Ủy nhiệm chi VCB số UNC-20261111-9988");

        mockMvc.perform(post("/api/v1/receptionist/refunds/" + booking.getId() + "/confirm")
                        .header("Authorization", "Bearer " + receptionistToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Kiểm tra bút toán REFUND xuất hiện trong payment_transactions
        List<PaymentTransaction> txns = paymentTransactionRepository.findByBookingId(booking.getId());
        PaymentTransaction refundTxn = txns.stream()
                .filter(t -> t.getType() == PaymentTransactionType.REFUND)
                .findFirst()
                .orElse(null);

        assertNotNull(refundTxn, "Phải ghi nhận 1 bản ghi giao dịch loại REFUND trong payment_transactions");
        assertEquals(0, BigDecimal.valueOf(700000).compareTo(refundTxn.getAmount()));
        assertEquals(PaymentMethod.BANK_TRANSFER, refundTxn.getPaymentMethod());
        assertEquals("REFUND_CONFIRMED", refundTxn.getResponseCode());
        assertEquals(receptionistUser.getEmail(), refundTxn.getActorEmail());
        assertNotNull(refundTxn.getTransactionTime());

        // Kiểm tra vết kiểm toán (Audit Log) bắt buộc ghi nhận khi hoàn cọc (SRS §FR-16.1, SP3-1112-ANH)
        List<AuditLog> auditLogs = auditLogRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("PAYMENT", String.valueOf(booking.getId()));
        assertFalse(auditLogs.isEmpty(), "Thao tác hoàn cọc bắt buộc phải ghi vết kiểm toán vào audit_logs");
        assertEquals(AuditAction.CONFIRM_REFUND, auditLogs.get(0).getAction());
        assertEquals(receptionistUser.getEmail(), auditLogs.get(0).getActorEmail());
    }

    // ─── TEST 4: TRUY VẤN SỔ CÁI & TÍNH DÒNG TIỀN THỰC THU (NET CASH FLOW) ────

    @Test
    @DisplayName("Test 4: Admin tra cứu Sổ Cái, dòng tiền ròng Net Cash Flow = Cọc + Thu quầy - Hoàn tiền")
    void testGetPaymentLedgerAndSummary() throws Exception {
        Booking booking = createTestBooking("BK-LEDGER-004", BigDecimal.valueOf(3000000), BigDecimal.valueOf(1500000));

        LocalDateTime now = LocalDateTime.now();

        // 1. Tạo bút toán Cọc Online (+1.500.000)
        paymentTransactionRepository.save(PaymentTransaction.builder()
                .booking(booking)
                .transactionCode("TXN-DEP-001")
                .amount(BigDecimal.valueOf(1500000))
                .paymentMethod(PaymentMethod.VIETQR)
                .status(TransactionStatus.SUCCESS)
                .type(PaymentTransactionType.DEPOSIT)
                .transactionTime(now.minusHours(3))
                .actorEmail(customerUser.getEmail())
                .build());

        // 2. Tạo bút toán Thu quầy Tiền mặt (+1.500.000)
        paymentTransactionRepository.save(PaymentTransaction.builder()
                .booking(booking)
                .transactionCode("COUNTER-CASH-001")
                .amount(BigDecimal.valueOf(1500000))
                .paymentMethod(PaymentMethod.CASH)
                .status(TransactionStatus.SUCCESS)
                .type(PaymentTransactionType.COUNTER_PAYMENT)
                .transactionTime(now.minusHours(2))
                .actorEmail(receptionistUser.getEmail())
                .build());

        // 3. Tạo bút toán Hoàn tiền chi ra (-500.000)
        paymentTransactionRepository.save(PaymentTransaction.builder()
                .booking(booking)
                .transactionCode("REFUND-OUT-001")
                .amount(BigDecimal.valueOf(500000))
                .paymentMethod(PaymentMethod.BANK_TRANSFER)
                .status(TransactionStatus.SUCCESS)
                .type(PaymentTransactionType.REFUND)
                .transactionTime(now.minusHours(1))
                .actorEmail(receptionistUser.getEmail())
                .build());

        LocalDate today = LocalDate.now();

        // Gọi API tra cứu Sổ Cái
        mockMvc.perform(get("/api/v1/admin/payment-ledger")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("startDate", today.toString())
                        .param("endDate", today.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalElements").value(3))
                // Kiểm tra summary dòng tiền
                .andExpect(jsonPath("$.data.summary.totalDepositOnline").value(1500000.00))
                .andExpect(jsonPath("$.data.summary.totalCounterCash").value(1500000.00))
                .andExpect(jsonPath("$.data.summary.totalCounterRevenue").value(1500000.00))
                .andExpect(jsonPath("$.data.summary.totalRefunded").value(500000.00))
                // Dòng tiền thực thu: 1.500.000 + 1.500.000 - 500.000 = 2.500.000 VNĐ
                .andExpect(jsonPath("$.data.summary.netCashFlow").value(2500000.00));
    }

    // ─── TEST 5: VALIDATION NGÀY BẮT LỖI 400 ─────────────────────────────────

    @Test
    @DisplayName("Test 5: Validate ngày: startDate > endDate phải trả về HTTP 400 Bad Request")
    void testInvalidDateRangeThrowsBadRequest() throws Exception {
        LocalDate start = LocalDate.now().plusDays(5);
        LocalDate end = LocalDate.now();

        mockMvc.perform(get("/api/v1/admin/payment-ledger")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("startDate", start.toString())
                        .param("endDate", end.toString()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Khoảng thời gian không hợp lệ: startDate không được lớn hơn endDate"));
    }

    // ─── TEST 6: PHÂN QUYỀN RBAC ─────────────────────────────────────────────

    @Test
    @DisplayName("Test 6: Phân quyền RBAC: Admin vào được Sổ cái, Receptionist & Customer bị 403 Forbidden")
    void testRbacPermissions() throws Exception {
        // 1. Admin vào Sổ cái -> 200 OK
        mockMvc.perform(get("/api/v1/admin/payment-ledger")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // 2. Receptionist vào Sổ cái Admin -> 403 Forbidden
        mockMvc.perform(get("/api/v1/admin/payment-ledger")
                        .header("Authorization", "Bearer " + receptionistToken))
                .andExpect(status().isForbidden());

        // 3. Customer vào API thu quầy của Lễ tân -> 403 Forbidden
        RecordCounterPaymentRequest request = RecordCounterPaymentRequest.builder()
                .bookingId(999L)
                .amount(BigDecimal.valueOf(500000))
                .paymentMethod(PaymentMethod.CASH)
                .build();

        mockMvc.perform(post("/api/v1/receptionist/payments/counter")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    // ─── TEST 7: DÒNG TIỀN RÒNG (NET CASH) CÓ THỂ ÂM KHI HOÀN > THU ─────────

    @Test
    @DisplayName("Test 7: Dòng tiền ròng Net Cash Flow có thể âm khi tổng hoàn tiền lớn hơn tổng thực thu")
    void testNegativeNetCashFlow_WhenRefundExceedsRevenue() throws Exception {
        Booking booking = createTestBooking("BK-LEDGER-007", BigDecimal.valueOf(2000000), BigDecimal.valueOf(500000));
        LocalDateTime now = LocalDateTime.now();

        // 1. Thu cọc online 500.000 VNĐ
        paymentTransactionRepository.save(PaymentTransaction.builder()
                .booking(booking)
                .transactionCode("TXN-DEP-007")
                .amount(BigDecimal.valueOf(500000))
                .paymentMethod(PaymentMethod.VIETQR)
                .status(TransactionStatus.SUCCESS)
                .type(PaymentTransactionType.DEPOSIT)
                .transactionTime(now.minusHours(2))
                .actorEmail(customerUser.getEmail())
                .build());

        // 2. Xuất hoàn tiền cọc cho khách hủy phòng 1.200.000 VNĐ
        paymentTransactionRepository.save(PaymentTransaction.builder()
                .booking(booking)
                .transactionCode("REFUND-007")
                .amount(BigDecimal.valueOf(1200000))
                .paymentMethod(PaymentMethod.BANK_TRANSFER)
                .status(TransactionStatus.SUCCESS)
                .type(PaymentTransactionType.REFUND)
                .transactionTime(now.minusHours(1))
                .actorEmail(receptionistUser.getEmail())
                .build());

        LocalDate today = LocalDate.now();

        // Net cash flow = 500.000 - 1.200.000 = -700.000 VNĐ
        mockMvc.perform(get("/api/v1/admin/payment-ledger")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("startDate", today.toString())
                        .param("endDate", today.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.summary.totalDepositOnline").value(500000.00))
                .andExpect(jsonPath("$.data.summary.totalRefunded").value(1200000.00))
                .andExpect(jsonPath("$.data.summary.netCashFlow").value(-700000.00));
    }

    // ─── TEST 8: KHÔNG CỘNG GIAO DỊCH THẤT BẠI VÀO DÒNG TIỀN ────────────────

    @Test
    @DisplayName("Test 8: Giao dịch FAILED / EXPIRED không được cộng vào dòng tiền và được đếm riêng")
    void testFailedTransactionsExcludedFromCashFlow() throws Exception {
        Booking booking = createTestBooking("BK-LEDGER-008", BigDecimal.valueOf(3000000), BigDecimal.valueOf(1000000));
        LocalDateTime now = LocalDateTime.now();

        // 1. Giao dịch THÀNH CÔNG: 1.000.000 VNĐ
        paymentTransactionRepository.save(PaymentTransaction.builder()
                .booking(booking)
                .transactionCode("TXN-SUCCESS-008")
                .amount(BigDecimal.valueOf(1000000))
                .paymentMethod(PaymentMethod.VIETQR)
                .status(TransactionStatus.SUCCESS)
                .type(PaymentTransactionType.DEPOSIT)
                .transactionTime(now.minusHours(3))
                .actorEmail(customerUser.getEmail())
                .build());

        // 2. Giao dịch THẤT BẠI (Khách hủy thanh toán tại cổng): 5.000.000 VNĐ
        paymentTransactionRepository.save(PaymentTransaction.builder()
                .booking(booking)
                .transactionCode("TXN-FAILED-008")
                .amount(BigDecimal.valueOf(5000000))
                .paymentMethod(PaymentMethod.VIETQR)
                .status(TransactionStatus.FAILED)
                .type(PaymentTransactionType.DEPOSIT)
                .transactionTime(now.minusHours(2))
                .actorEmail(customerUser.getEmail())
                .build());

        // 3. Giao dịch HẾT HẠN (Quá thời hạn giữ phòng): 2.000.000 VNĐ
        paymentTransactionRepository.save(PaymentTransaction.builder()
                .booking(booking)
                .transactionCode("TXN-EXPIRED-008")
                .amount(BigDecimal.valueOf(2000000))
                .paymentMethod(PaymentMethod.VIETQR)
                .status(TransactionStatus.EXPIRED)
                .type(PaymentTransactionType.DEPOSIT)
                .transactionTime(now.minusHours(1))
                .actorEmail(customerUser.getEmail())
                .build());

        LocalDate today = LocalDate.now();

        mockMvc.perform(get("/api/v1/admin/payment-ledger")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("startDate", today.toString())
                        .param("endDate", today.toString()))
                .andExpect(status().isOk())
                // Chỉ tính giao dịch SUCCESS (1.000.000), không cộng 5.000.000 và 2.000.000 thất bại
                .andExpect(jsonPath("$.data.summary.totalDepositOnline").value(1000000.00))
                .andExpect(jsonPath("$.data.summary.netCashFlow").value(1000000.00))
                .andExpect(jsonPath("$.data.summary.successfulTransactionCount").value(1))
                .andExpect(jsonPath("$.data.summary.failedTransactionCount").value(2));
    }

    // ─── TEST 9: ĐỐI SOÁT TỔNG HỢP THEO KỲ KHỚP VỚI FIXTURE NGÀY/THÁNG ────────

    @Test
    @DisplayName("Test 9: Khớp số liệu tổng hợp dòng tiền tháng với Fixture chuẩn")
    void testMonthlyLedgerSummaryMatchesFixture() throws Exception {
        Booking b1 = createTestBooking("BK-FIX-001", BigDecimal.valueOf(3000000), BigDecimal.valueOf(1500000));
        Booking b2 = createTestBooking("BK-FIX-002", BigDecimal.valueOf(2000000), BigDecimal.valueOf(1000000));

        LocalDateTime oct18 = LocalDateTime.of(2026, 10, 18, 10, 15);
        LocalDateTime oct19 = LocalDateTime.of(2026, 10, 19, 9, 0);
        LocalDateTime oct20 = LocalDateTime.of(2026, 10, 20, 14, 0);

        // Giao dịch 1: Cọc VNPay 1.500.000
        paymentTransactionRepository.save(PaymentTransaction.builder()
                .booking(b1)
                .transactionCode("TXN-FIX-001")
                .vnpTransactionNo("VNP-14567890")
                .amount(BigDecimal.valueOf(1500000))
                .paymentMethod(PaymentMethod.VIETQR)
                .status(TransactionStatus.SUCCESS)
                .type(PaymentTransactionType.DEPOSIT)
                .transactionTime(oct18)
                .build());

        // Giao dịch 2: Cọc VNPay 950.000
        paymentTransactionRepository.save(PaymentTransaction.builder()
                .booking(b2)
                .transactionCode("TXN-FIX-002")
                .vnpTransactionNo("VNP-14567999")
                .amount(BigDecimal.valueOf(950000))
                .paymentMethod(PaymentMethod.VIETQR)
                .status(TransactionStatus.SUCCESS)
                .type(PaymentTransactionType.DEPOSIT)
                .transactionTime(oct19)
                .build());

        // Giao dịch 3: Hoàn tiền 250.000
        paymentTransactionRepository.save(PaymentTransaction.builder()
                .booking(b2)
                .transactionCode("REFUND-FIX-003")
                .amount(BigDecimal.valueOf(250000))
                .paymentMethod(PaymentMethod.BANK_TRANSFER)
                .status(TransactionStatus.SUCCESS)
                .type(PaymentTransactionType.REFUND)
                .transactionTime(oct20)
                .build());

        // Tra cứu kỳ tháng 10/2026
        mockMvc.perform(get("/api/v1/admin/payment-ledger/summary")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("startDate", "2026-10-01")
                        .param("endDate", "2026-10-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalDepositOnline").value(2450000.00))
                .andExpect(jsonPath("$.data.totalRefunded").value(250000.00))
                // Net cash flow = 2.450.000 - 250.000 = 2.200.000 VNĐ
                .andExpect(jsonPath("$.data.netCashFlow").value(2200000.00))
                .andExpect(jsonPath("$.data.successfulTransactionCount").value(3))
                .andExpect(jsonPath("$.data.failedTransactionCount").value(0));
    }
}
