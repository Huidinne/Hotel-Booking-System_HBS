package org.example.backend.payment;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.backend.auth.security.JwtProvider;
import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.entity.BookingStatus;
import org.example.backend.booking.entity.PaymentMethod;
import org.example.backend.booking.entity.PaymentStatus;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.common.config.VietQrConfig;
import org.example.backend.mail.service.EmailService;
import org.example.backend.mail.service.PdfInvoiceService;
import org.example.backend.payment.dto.CreateVietQrPaymentRequest;
import org.example.backend.payment.dto.RejectPaymentRequest;
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

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class VietQrPaymentIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtProvider jwtProvider;

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

    @MockBean
    private EmailService emailService;

    @MockBean
    private PdfInvoiceService pdfInvoiceService;

    private User customerUser;
    private User otherCustomerUser;
    private User adminUser;
    private String customerToken;
    private String otherCustomerToken;
    private String adminToken;
    private RoomType roomType;

    @BeforeEach
    void setUp() {
        vietQrConfig.setBankCode("ICB");
        vietQrConfig.setBankAccount("100888888888");
        vietQrConfig.setBankAccountName("NGUYEN VAN A");
        vietQrConfig.setTemplate("compact2");
        vietQrConfig.setExpireMinutes(15);

        customerUser = userRepository.findByEmail("vietqr.customer@test.com")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("vietqr.customer@test.com")
                        .password("hashed_pw")
                        .fullName("Nguyễn Khách Hàng")
                        .phone("0981112233")
                        .role(Role.ROLE_CUSTOMER)
                        .isActive(true)
                        .build()));

        otherCustomerUser = userRepository.findByEmail("other.customer@test.com")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("other.customer@test.com")
                        .password("hashed_pw")
                        .fullName("Khách Khác")
                        .phone("0982223344")
                        .role(Role.ROLE_CUSTOMER)
                        .isActive(true)
                        .build()));

        adminUser = userRepository.findByEmail("vietqr.admin@test.com")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("vietqr.admin@test.com")
                        .password("hashed_pw")
                        .fullName("Admin Duyệt")
                        .phone("0983334455")
                        .role(Role.ROLE_ADMIN)
                        .isActive(true)
                        .build()));

        customerToken = "Bearer " + jwtProvider.generateAccessToken(customerUser);
        otherCustomerToken = "Bearer " + jwtProvider.generateAccessToken(otherCustomerUser);
        adminToken = "Bearer " + jwtProvider.generateAccessToken(adminUser);

        roomType = roomTypeRepository.findAll().stream().findFirst().orElseGet(() ->
                roomTypeRepository.save(RoomType.builder()
                        .name("Phòng Deluxe VietQR")
                        .basePrice(BigDecimal.valueOf(1000000))
                        .capacity(2)
                        .build()));
    }

    private Booking createTestBooking(User owner) {
        return bookingRepository.save(Booking.builder()
                .bookingCode("BK-VQR-" + System.currentTimeMillis())
                .user(owner)
                .roomType(roomType)
                .quantity(1)
                .guests(2)
                .checkInDate(LocalDate.now().plusDays(5))
                .checkOutDate(LocalDate.now().plusDays(7))
                .pricePerNight(BigDecimal.valueOf(1000000))
                .totalPrice(BigDecimal.valueOf(2000000))
                .depositAmount(BigDecimal.valueOf(1000000))
                .bookingStatus(BookingStatus.PENDING)
                .paymentStatus(PaymentStatus.UNPAID)
                .paymentMethod(PaymentMethod.VIETQR)
                .holdExpiresAt(LocalDateTime.now().plusMinutes(15))
                .build());
    }

    @Test
    @DisplayName("Khách hàng tạo yêu cầu thanh toán VietQR thành công: sinh mã QR và nội dung chuyển khoản duy nhất")
    void testCreateVietQrPayment_Success() throws Exception {
        Booking booking = createTestBooking(customerUser);

        CreateVietQrPaymentRequest req = CreateVietQrPaymentRequest.builder()
                .bookingCode(booking.getBookingCode())
                .build();

        mockMvc.perform(post("/api/v1/payments/vietqr")
                        .header("Authorization", customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.bookingCode").value(booking.getBookingCode()))
                .andExpect(jsonPath("$.data.amount").value(1000000))
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.transferContent").value("HBS" + booking.getId()))
                .andExpect(jsonPath("$.data.bankAccount").value("100888888888"))
                .andExpect(jsonPath("$.data.qrCodeUrl").value(containsString("img.vietqr.io")));
    }

    @Test
    @DisplayName("Bảo mật: Khách hàng không được truy cập thanh toán của booking người khác")
    void testAccessOtherUserPayment_Forbidden() throws Exception {
        Booking booking = createTestBooking(customerUser);

        CreateVietQrPaymentRequest req = CreateVietQrPaymentRequest.builder()
                .bookingCode(booking.getBookingCode())
                .build();

        mockMvc.perform(post("/api/v1/payments/vietqr")
                        .header("Authorization", otherCustomerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Admin đối soát và xác nhận thanh toán VietQR: cập nhật Booking CONFIRMED và chống xác nhận lặp")
    void testConfirmVietQrPayment_FullFlow() throws Exception {
        Booking booking = createTestBooking(customerUser);

        // 1. Tạo thanh toán VietQR
        CreateVietQrPaymentRequest req = CreateVietQrPaymentRequest.builder()
                .bookingId(booking.getId())
                .build();

        String responseStr = mockMvc.perform(post("/api/v1/payments/vietqr")
                        .header("Authorization", customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        Long paymentId = objectMapper.readTree(responseStr).path("data").path("paymentId").asLong();

        // 2. Admin xem danh sách pending
        mockMvc.perform(get("/api/v1/admin/payments/pending")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", not(empty())));

        // 3. Admin xác nhận thanh toán thành công
        mockMvc.perform(put("/api/v1/admin/payments/" + paymentId + "/confirm")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.verifiedBy").value(adminUser.getEmail()));

        // Kiểm tra booking trong DB đã chuyển sang CONFIRMED & PARTIALLY_PAID
        Booking updatedBooking = bookingRepository.findById(booking.getId()).orElseThrow();
        assertEquals(BookingStatus.CONFIRMED, updatedBooking.getBookingStatus());
        assertEquals(PaymentStatus.PARTIALLY_PAID, updatedBooking.getPaymentStatus());

        // 4. Kiểm tra chống xác nhận trùng lặp (Idempotent)
        mockMvc.perform(put("/api/v1/admin/payments/" + paymentId + "/confirm")
                        .header("Authorization", adminToken))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("Admin từ chối giao dịch VietQR không hợp lệ kèm lý do")
    void testRejectVietQrPayment_Success() throws Exception {
        Booking booking = createTestBooking(customerUser);

        CreateVietQrPaymentRequest req = CreateVietQrPaymentRequest.builder()
                .bookingId(booking.getId())
                .build();

        String responseStr = mockMvc.perform(post("/api/v1/payments/vietqr")
                        .header("Authorization", customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        Long paymentId = objectMapper.readTree(responseStr).path("data").path("paymentId").asLong();

        RejectPaymentRequest rejectReq = RejectPaymentRequest.builder()
                .reason("Không nhận được tiền vào tài khoản thực tế sau 24h")
                .build();

        mockMvc.perform(put("/api/v1/admin/payments/" + paymentId + "/reject")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(rejectReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("FAILED"))
                .andExpect(jsonPath("$.data.rejectionReason").value("Không nhận được tiền vào tài khoản thực tế sau 24h"));
    }
}
