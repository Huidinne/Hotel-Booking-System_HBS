package org.example.backend.payment;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.entity.BookingStatus;
import org.example.backend.booking.entity.PaymentMethod;
import org.example.backend.booking.entity.PaymentStatus;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.common.config.SepayConfig;
import org.example.backend.common.config.VietQrConfig;
import org.example.backend.mail.service.EmailService;
import org.example.backend.mail.service.PdfInvoiceService;
import org.example.backend.payment.dto.SePayWebhookRequest;
import org.example.backend.payment.entity.PaymentTransaction;
import org.example.backend.payment.entity.TransactionStatus;
import org.example.backend.payment.repository.PaymentTransactionRepository;
import org.example.backend.room.entity.RoomType;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SePayWebhookIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private PaymentTransactionRepository paymentTransactionRepository;

    @Autowired
    private VietQrConfig vietQrConfig;

    @Autowired
    private SepayConfig sepayConfig;

    @MockBean
    private EmailService emailService;

    @MockBean
    private PdfInvoiceService pdfInvoiceService;

    private User testUser;
    private RoomType testRoomType;

    @BeforeEach
    void setUp() {
        vietQrConfig.setBankCode("970418");
        vietQrConfig.setBankAccount("8861339506");
        vietQrConfig.setBankAccountName("NGUYEN THI YEN");
        sepayConfig.setWebhookApiKey("test_secret_api_key");

        testUser = userRepository.findByEmail("sepay.test@example.com")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("sepay.test@example.com")
                        .password("hashed_pw")
                        .fullName("Nguyễn SePay Test")
                        .phone("0988776655")
                        .role(Role.ROLE_CUSTOMER)
                        .isActive(true)
                        .build()));

        testRoomType = roomTypeRepository.findAll().stream()
                .filter(RoomType::getIsActive)
                .findFirst()
                .orElseGet(() -> roomTypeRepository.save(RoomType.builder()
                        .name("Phòng Deluxe SePay Test")
                        .basePrice(BigDecimal.valueOf(1000000))
                        .capacity(2)
                        .isActive(true)
                        .build()));
    }

    private Booking createPendingBooking(String bookingCode, BigDecimal totalPrice, BigDecimal depositAmount) {
        Booking booking = Booking.builder()
                .bookingCode(bookingCode)
                .user(testUser)
                .roomType(testRoomType)
                .quantity(1)
                .guests(2)
                .paymentMethod(PaymentMethod.VIETQR)
                .checkInDate(LocalDate.now().plusDays(2))
                .checkOutDate(LocalDate.now().plusDays(4))
                .pricePerNight(BigDecimal.valueOf(1000000))
                .totalPrice(totalPrice)
                .depositAmount(depositAmount)
                .bookingStatus(BookingStatus.PENDING)
                .paymentStatus(PaymentStatus.UNPAID)
                .holdExpiresAt(LocalDateTime.now().plusMinutes(15))
                .build();
        booking = bookingRepository.save(booking);

        PaymentTransaction txn = PaymentTransaction.builder()
                .booking(booking)
                .transactionCode("VQR-" + bookingCode + "-" + System.currentTimeMillis())
                .amount(depositAmount)
                .paymentMethod(PaymentMethod.VIETQR)
                .status(TransactionStatus.PENDING)
                .referenceNote("HBS" + booking.getId())
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .build();
        paymentTransactionRepository.save(txn);

        return booking;
    }

    @Test
    @DisplayName("Webhook SePay hợp lệ -> Tự động chuyển Payment SUCCESS & Booking CONFIRMED")
    void testSePayWebhook_Success_AutoConfirmsPaymentAndBooking() throws Exception {
        Booking booking = createPendingBooking("BK-SEPAY-01", BigDecimal.valueOf(2000000), BigDecimal.valueOf(1000000));
        String refCode = "FT_SEPAY_" + System.currentTimeMillis();

        SePayWebhookRequest request = SePayWebhookRequest.builder()
                .id(12345L)
                .gateway("BIDV")
                .accountNumber("8861339506")
                .transferType("in")
                .transferAmount(BigDecimal.valueOf(1000000))
                .content("HBS" + booking.getId() + " Chuyen tien coc")
                .code("HBS" + booking.getId())
                .referenceCode(refCode)
                .build();

        mockMvc.perform(post("/api/v1/webhooks/sepay")
                        .header("Authorization", "Apikey test_secret_api_key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Kiểm tra cơ sở dữ liệu
        Booking updatedBooking = bookingRepository.findById(booking.getId()).orElseThrow();
        assertEquals(BookingStatus.CONFIRMED, updatedBooking.getBookingStatus());
        assertEquals(PaymentStatus.PARTIALLY_PAID, updatedBooking.getPaymentStatus());

        PaymentTransaction updatedTxn = paymentTransactionRepository.findByVnpTransactionNo(refCode).orElseThrow();
        assertEquals(TransactionStatus.SUCCESS, updatedTxn.getStatus());
        assertEquals("SYSTEM_SEPAY", updatedTxn.getVerifiedBy());
        assertEquals("SEPAY_AUTO", updatedTxn.getResponseCode());
        assertNotNull(updatedTxn.getVerifiedAt());
    }

    @Test
    @DisplayName("Webhook SePay chống xử lý trùng lặp (Idempotent với referenceCode)")
    void testSePayWebhook_Idempotency_DuplicateReferenceCode() throws Exception {
        Booking booking = createPendingBooking("BK-SEPAY-02", BigDecimal.valueOf(2000000), BigDecimal.valueOf(1000000));
        String refCode = "FT_SEPAY_DUP_" + System.currentTimeMillis();

        SePayWebhookRequest request = SePayWebhookRequest.builder()
                .id(22222L)
                .gateway("BIDV")
                .accountNumber("8861339506")
                .transferType("in")
                .transferAmount(BigDecimal.valueOf(1000000))
                .content("HBS" + booking.getId() + " Chuyen tien coc")
                .referenceCode(refCode)
                .build();

        // Gửi lần 1 -> Thành công
        mockMvc.perform(post("/api/v1/webhooks/sepay")
                        .header("Authorization", "Apikey test_secret_api_key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Gửi lần 2 -> Trả về 200 OK với thông báo Already processed
        mockMvc.perform(post("/api/v1/webhooks/sepay")
                        .header("Authorization", "Apikey test_secret_api_key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Already processed"));
    }

    @Test
    @DisplayName("Webhook SePay sai API Key -> Trả về 401 Unauthorized")
    void testSePayWebhook_InvalidApiKey_Returns401() throws Exception {
        SePayWebhookRequest request = SePayWebhookRequest.builder()
                .id(99999L)
                .transferType("in")
                .transferAmount(BigDecimal.valueOf(500000))
                .content("HBS999")
                .build();

        mockMvc.perform(post("/api/v1/webhooks/sepay")
                        .header("Authorization", "Apikey wrong_api_key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Webhook SePay giao dịch tiền ra (transferType = out) -> Bỏ qua an toàn")
    void testSePayWebhook_IgnoredOutgoing() throws Exception {
        SePayWebhookRequest request = SePayWebhookRequest.builder()
                .id(88888L)
                .transferType("out")
                .transferAmount(BigDecimal.valueOf(500000))
                .content("Rut tien mat")
                .build();

        mockMvc.perform(post("/api/v1/webhooks/sepay")
                        .header("Authorization", "Apikey test_secret_api_key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Ignored outgoing transfer"));
    }

    @Test
    @DisplayName("SSE Stream Endpoint mở kết nối thành công và không yêu cầu JWT")
    void testSseStreamEndpoint_PermitAll() throws Exception {
        Booking booking = createPendingBooking("BK-SEPAY-SSE", BigDecimal.valueOf(1000000), BigDecimal.valueOf(500000));
        PaymentTransaction txn = paymentTransactionRepository.findByBookingId(booking.getId()).get(0);

        mockMvc.perform(get("/api/v1/payments/" + txn.getId() + "/stream")
                        .accept(MediaType.TEXT_EVENT_STREAM_VALUE))
                .andExpect(status().isOk());
    }
}
