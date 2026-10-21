package org.example.backend.payment;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.backend.auth.security.JwtProvider;
import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.entity.BookingStatus;
import org.example.backend.booking.entity.PaymentMethod;
import org.example.backend.booking.entity.PaymentStatus;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.booking.repository.BookingRoomRepository;
import org.example.backend.common.config.VnPayConfig;
import org.example.backend.payment.dto.ConfirmRefundRequest;
import org.example.backend.payment.entity.PaymentTransaction;
import org.example.backend.payment.entity.TransactionStatus;
import org.example.backend.payment.repository.PaymentTransactionRepository;
import org.example.backend.payment.util.VnPayUtil;
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
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiểm thử tích hợp quy trình Thanh toán VNPay & Hoàn tiền theo SRS §2.4 & §11.5:
 * - Xác thực chữ ký HMAC-SHA512
 * - Xử lý trùng lặp IPN (Idempotent)
 * - Xác nhận hoàn cọc thủ công cho Lễ tân
 */
@SpringBootTest
@AutoConfigureMockMvc
class PaymentIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private VnPayConfig vnPayConfig;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private PaymentTransactionRepository paymentTransactionRepository;

    @Autowired
    private BookingRoomRepository bookingRoomRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtProvider jwtProvider;

    private User customer;
    private User receptionist;
    private RoomType roomType;
    private Booking testBooking;
    private PaymentTransaction testTxn;
    private String receptionistToken;

    @BeforeEach
    void setUp() {
        paymentTransactionRepository.deleteAll();
        bookingRoomRepository.deleteAll();
        bookingRepository.deleteAll();
        roomRepository.deleteAll();
        roomTypeRepository.deleteAll();
        userRepository.deleteAll();

        customer = userRepository.save(User.builder()
                .email("cust_pay@hotel.com")
                .password("hash")
                .fullName("Customer Pay")
                .phone("0908888888")
                .role(Role.ROLE_CUSTOMER)
                .build());

        receptionist = userRepository.save(User.builder()
                .email("recep_pay@hotel.com")
                .password("hash")
                .fullName("Receptionist Pay")
                .phone("0907777777")
                .role(Role.ROLE_RECEPTIONIST)
                .build());

        receptionistToken = jwtProvider.generateAccessToken(receptionist);

        roomType = roomTypeRepository.save(RoomType.builder()
                .name("VIP Room Pay")
                .capacity(2)
                .basePrice(BigDecimal.valueOf(2000000))
                .isActive(true)
                .build());

        testBooking = bookingRepository.save(Booking.builder()
                .bookingCode("BK-PAY-001")
                .user(customer)
                .roomType(roomType)
                .quantity(1)
                .guests(2)
                .checkInDate(LocalDate.now().plusDays(5))
                .checkOutDate(LocalDate.now().plusDays(7))
                .pricePerNight(BigDecimal.valueOf(2000000))
                .totalPrice(BigDecimal.valueOf(4000000))
                .depositAmount(BigDecimal.valueOf(2000000))
                .bookingStatus(BookingStatus.PENDING)
                .paymentStatus(PaymentStatus.UNPAID)
                .paymentMethod(PaymentMethod.VNPAY)
                .holdExpiresAt(LocalDateTime.now().plusMinutes(15))
                .build());

        testTxn = paymentTransactionRepository.save(PaymentTransaction.builder()
                .booking(testBooking)
                .transactionCode("TXN-PAY-001")
                .amount(BigDecimal.valueOf(2000000))
                .paymentMethod(PaymentMethod.VNPAY)
                .status(TransactionStatus.PENDING)
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .build());
    }

    @Test
    @DisplayName("IPN: Chữ ký hợp lệ + Mã phản hồi 00 → Booking chuyển CONFIRMED, Transaction SUCCESS")
    void testIpnValidSignatureSuccess() throws Exception {
        Map<String, String> ipnParams = new HashMap<>();
        ipnParams.put("vnp_TxnRef", testTxn.getTransactionCode());
        ipnParams.put("vnp_Amount", "200000000"); // 2,000,000 VND * 100
        ipnParams.put("vnp_ResponseCode", "00");
        ipnParams.put("vnp_TransactionNo", "VNP-TEST-123456");

        String hashData = VnPayUtil.buildHashData(ipnParams);
        String secureHash = VnPayUtil.hmacSHA512(vnPayConfig.getHashSecret(), hashData);

        mockMvc.perform(get("/api/v1/payments/vnpay-ipn")
                        .param("vnp_TxnRef", testTxn.getTransactionCode())
                        .param("vnp_Amount", "200000000")
                        .param("vnp_ResponseCode", "00")
                        .param("vnp_TransactionNo", "VNP-TEST-123456")
                        .param("vnp_SecureHash", secureHash))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.RspCode").value("00"))
                .andExpect(jsonPath("$.Message").value("Confirm Success"));

        Booking updatedBooking = bookingRepository.findById(testBooking.getId()).orElseThrow();
        assertEquals(BookingStatus.CONFIRMED, updatedBooking.getBookingStatus());
        assertEquals(PaymentStatus.PARTIALLY_PAID, updatedBooking.getPaymentStatus());

        PaymentTransaction updatedTxn = paymentTransactionRepository.findById(testTxn.getId()).orElseThrow();
        assertEquals(TransactionStatus.SUCCESS, updatedTxn.getStatus());
        assertEquals("VNP-TEST-123456", updatedTxn.getVnpTransactionNo());
    }

    @Test
    @DisplayName("IPN: Sai chữ ký HMAC-SHA512 → RspCode 97 (Invalid Checksum)")
    void testIpnInvalidSignature() throws Exception {
        mockMvc.perform(get("/api/v1/payments/vnpay-ipn")
                        .param("vnp_TxnRef", testTxn.getTransactionCode())
                        .param("vnp_Amount", "200000000")
                        .param("vnp_ResponseCode", "00")
                        .param("vnp_TransactionNo", "VNP-TEST-999")
                        .param("vnp_SecureHash", "INVALIDSIGNATURE123456789"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.RspCode").value("97"))
                .andExpect(jsonPath("$.Message").value("Invalid Checksum"));
    }

    @Test
    @DisplayName("IPN: Xử lý trùng lặp (Idempotent) → RspCode 02 (Order already confirmed)")
    void testIpnIdempotency() throws Exception {
        // Cập nhật giao dịch đã SUCCESS từ trước
        testTxn.setStatus(TransactionStatus.SUCCESS);
        paymentTransactionRepository.save(testTxn);

        Map<String, String> ipnParams = new HashMap<>();
        ipnParams.put("vnp_TxnRef", testTxn.getTransactionCode());
        ipnParams.put("vnp_Amount", "200000000");
        ipnParams.put("vnp_ResponseCode", "00");
        ipnParams.put("vnp_TransactionNo", "VNP-TEST-DUPLICATE");

        String hashData = VnPayUtil.buildHashData(ipnParams);
        String secureHash = VnPayUtil.hmacSHA512(vnPayConfig.getHashSecret(), hashData);

        mockMvc.perform(get("/api/v1/payments/vnpay-ipn")
                        .param("vnp_TxnRef", testTxn.getTransactionCode())
                        .param("vnp_Amount", "200000000")
                        .param("vnp_ResponseCode", "00")
                        .param("vnp_TransactionNo", "VNP-TEST-DUPLICATE")
                        .param("vnp_SecureHash", secureHash))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.RspCode").value("02"))
                .andExpect(jsonPath("$.Message").value("Order already confirmed"));
    }

    @Test
    @DisplayName("Lễ tân xác nhận hoàn tiền (POST /receptionist/refunds/{id}/confirm) → REFUNDED")
    void testConfirmRefundSuccess() throws Exception {
        // Chuẩn bị booking REFUND_PENDING
        testBooking.setBookingStatus(BookingStatus.CANCELLED);
        testBooking.setPaymentStatus(PaymentStatus.REFUND_PENDING);
        testBooking.setRefundAmount(BigDecimal.valueOf(1000000));
        testBooking.setBankAccountNumber("0071001234567");
        testBooking.setBankName("VCB");
        testBooking.setBankAccountHolder("NGUYEN VAN A");
        bookingRepository.save(testBooking);

        ConfirmRefundRequest request = ConfirmRefundRequest.builder()
                .referenceNote("Đã chuyển khoản qua app VCB mã FT123456")
                .build();

        mockMvc.perform(post("/api/v1/receptionist/refunds/" + testBooking.getId() + "/confirm")
                        .header("Authorization", "Bearer " + receptionistToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.paymentStatus").value("REFUNDED"))
                .andExpect(jsonPath("$.data.accountNumberMasked").value("**** **** 4567"));

        Booking updated = bookingRepository.findById(testBooking.getId()).orElseThrow();
        assertEquals(PaymentStatus.REFUNDED, updated.getPaymentStatus());
    }
}
