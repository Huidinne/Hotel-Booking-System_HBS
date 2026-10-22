package org.example.backend.booking;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.backend.auth.dto.LoginRequest;
import org.example.backend.auth.security.JwtProvider;
import org.example.backend.booking.dto.CancelBookingRequest;
import org.example.backend.booking.dto.CreateBookingRequest;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.booking.repository.BookingRoomRepository;
import org.example.backend.payment.repository.PaymentTransactionRepository;
import org.example.backend.room.entity.Room;
import org.example.backend.room.entity.RoomStatus;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration Tests kiểm thử toàn diện luồng nghiệp vụ Room & Booking theo chuẩn SRS:
 * 1. Xác thực & Phân quyền (Auth & RBAC)
 * 2. Tìm kiếm phòng theo ngày, lọc theo sức chứa/loại phòng
 * 3. Đặt phòng, kiểm tra snapshot giá & tiền cọc 50%
 * 4. Chặn đặt phòng trùng ngày khi hết quota (Overbooking Prevention)
 * 5. Hủy đặt phòng, giải phóng quota phòng cho khách sau
 * 6. Kiểm tra bảo mật không cho phép hủy đơn của người khác
 */
@SpringBootTest
@AutoConfigureMockMvc
class HotelBookingFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtProvider jwtProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private BookingRoomRepository bookingRoomRepository;

    @Autowired
    private PaymentTransactionRepository paymentTransactionRepository;

    private User customer1;
    private User customer2;
    private User receptionist;
    private String customer1Token;
    private String customer2Token;
    private String receptionistToken;
    private RoomType deluxeRoomType;

    @BeforeEach
    void setUp() {
        // Dọn dẹp dữ liệu theo thứ tự ràng buộc khóa ngoại
        paymentTransactionRepository.deleteAll();
        bookingRoomRepository.deleteAll();
        bookingRepository.deleteAll();
        roomRepository.deleteAll();
        roomTypeRepository.deleteAll();
        userRepository.deleteAll();

        // 1. Tạo tài khoản mẫu
        customer1 = userRepository.save(User.builder()
                .email("customer1@flowtest.com")
                .password(passwordEncoder.encode("Pass@123"))
                .fullName("Customer One")
                .phone("0901000001")
                .role(Role.ROLE_CUSTOMER)
                .isActive(true)
                .build());

        customer2 = userRepository.save(User.builder()
                .email("customer2@flowtest.com")
                .password(passwordEncoder.encode("Pass@123"))
                .fullName("Customer Two")
                .phone("0901000002")
                .role(Role.ROLE_CUSTOMER)
                .isActive(true)
                .build());

        receptionist = userRepository.save(User.builder()
                .email("receptionist@flowtest.com")
                .password(passwordEncoder.encode("Pass@123"))
                .fullName("Receptionist User")
                .phone("0902000001")
                .role(Role.ROLE_RECEPTIONIST)
                .isActive(true)
                .build());

        customer1Token = jwtProvider.generateAccessToken(customer1);
        customer2Token = jwtProvider.generateAccessToken(customer2);
        receptionistToken = jwtProvider.generateAccessToken(receptionist);

        // 2. Tạo Loại phòng Deluxe (Giá: 1,000,000 VNĐ, sức chứa 2 khách)
        deluxeRoomType = roomTypeRepository.save(RoomType.builder()
                .name("Deluxe City View Test")
                .capacity(2)
                .basePrice(new BigDecimal("1000000.00"))
                .description("Phòng Deluxe có ban công hướng thành phố")
                .amenities("Wifi, TV 55 inch, Điều hòa, Bồn tắm")
                .isActive(true)
                .build());

        // 3. Tạo duy nhất 1 phòng vật lý (Room 201) cho loại phòng Deluxe này
        roomRepository.save(Room.builder()
                .roomNumber("DLX-201")
                .roomType(deluxeRoomType)
                .floor(2)
                .status(RoomStatus.AVAILABLE)
                .build());
    }

    // ═════════════════════════════════════════════════════════════════════
    // 1. XÁC THỰC & PHÂN QUYỀN (AUTH & RBAC)
    // ═════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("Auth: Đăng nhập đúng mật khẩu -> 200 OK + JWT Bearer token")
    void testLoginSuccess() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("customer1@flowtest.com")
                .password("Pass@123")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.user.email").value("customer1@flowtest.com"))
                .andExpect(jsonPath("$.data.user.role").value("ROLE_CUSTOMER"));
    }

    @Test
    @DisplayName("Auth: Đăng nhập sai mật khẩu -> 401 Unauthorized")
    void testLoginInvalidPassword() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("customer1@flowtest.com")
                .password("WrongPassword")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }

    @Test
    @DisplayName("RBAC: Không có Token truy cập endpoint yêu cầu auth -> 401 Unauthorized")
    void testUnauthenticatedAccess() throws Exception {
        mockMvc.perform(get("/api/v1/bookings/my-bookings"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("RBAC: Customer gọi endpoint của Lễ tân -> 403 Forbidden")
    void testCustomerCannotAccessReceptionistEndpoints() throws Exception {
        mockMvc.perform(get("/api/v1/receptionist/bookings")
                        .header("Authorization", "Bearer " + customer1Token))
                .andExpect(status().isForbidden());
    }

    // ═════════════════════════════════════════════════════════════════════
    // 2. TÌM KIẾM PHÒNG THEO NGÀY & LỌC LOẠI PHÒNG
    // ═════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("Search: Tìm phòng hợp lệ -> 200 OK, trả về số phòng khả dụng chính xác")
    void testSearchAvailableRoomTypesSuccess() throws Exception {
        LocalDate checkIn = LocalDate.now().plusDays(10);
        LocalDate checkOut = LocalDate.now().plusDays(13); // 3 đêm

        mockMvc.perform(get("/api/v1/room-types/search")
                        .param("checkIn", checkIn.toString())
                        .param("checkOut", checkOut.toString())
                        .param("guests", "2")
                        .param("quantity", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].roomTypeId").value(deluxeRoomType.getId()))
                .andExpect(jsonPath("$.data[0].availableRooms").value(1))
                .andExpect(jsonPath("$.data[0].available").value(true));
    }

    @Test
    @DisplayName("Search: Ngày trả phòng không lớn hơn ngày nhận phòng -> 400 Bad Request")
    void testSearchInvalidDateRange() throws Exception {
        LocalDate checkIn = LocalDate.now().plusDays(5);
        LocalDate checkOut = LocalDate.now().plusDays(5); // checkIn == checkOut (0 đêm)

        mockMvc.perform(get("/api/v1/room-types/search")
                        .param("checkIn", checkIn.toString())
                        .param("checkOut", checkOut.toString())
                        .param("guests", "2")
                        .param("quantity", "1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message", containsString("Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm")));
    }

    @Test
    @DisplayName("Search: Lọc số khách vượt quá sức chứa loại phòng -> trả về danh sách rỗng")
    void testSearchGuestsExceedCapacity() throws Exception {
        LocalDate checkIn = LocalDate.now().plusDays(10);
        LocalDate checkOut = LocalDate.now().plusDays(12);

        // Deluxe chỉ chứa 2 khách, tìm 5 khách
        mockMvc.perform(get("/api/v1/room-types/search")
                        .param("checkIn", checkIn.toString())
                        .param("checkOut", checkOut.toString())
                        .param("guests", "5")
                        .param("quantity", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    // ═════════════════════════════════════════════════════════════════════
    // 3. ĐẶT PHÒNG, CHỐNG TRÙNG NGÀY & HỦY PHÒNG (E2E BUSINESS FLOW)
    // ═════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("Booking Flow: Đặt phòng -> Chặn trùng ngày -> Hủy phòng -> Giải phóng quota đặt lại")
    void testCompleteBookingAndOverlapPreventionFlow() throws Exception {
        LocalDate checkIn = LocalDate.now().plusDays(20);
        LocalDate checkOut = LocalDate.now().plusDays(23); // 3 đêm, tổng tiền = 3 * 1,000,000 = 3,000,000 VNĐ

        // -------------------------------------------------------------
        // Bước 1: Customer 1 đặt phòng thành công
        // -------------------------------------------------------------
        CreateBookingRequest bookingReq1 = CreateBookingRequest.builder()
                .roomTypeId(deluxeRoomType.getId())
                .checkIn(checkIn)
                .checkOut(checkOut)
                .quantity(1)
                .guests(2)
                .paymentMethod("CASH")
                .note("Yêu cầu phòng tầng cao yên tĩnh")
                .build();

        MvcResult createResult = mockMvc.perform(post("/api/v1/bookings")
                        .header("Authorization", "Bearer " + customer1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bookingReq1)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.bookingCode").isNotEmpty())
                .andExpect(jsonPath("$.data.totalPrice").value(3000000.0))
                .andExpect(jsonPath("$.data.depositAmount").value(1500000.0)) // 50% tiền cọc
                .andExpect(jsonPath("$.data.bookingStatus").value("PENDING"))
                .andReturn();

        JsonNode responseNode = objectMapper.readTree(createResult.getResponse().getContentAsString());
        String bookingCode1 = responseNode.path("data").path("bookingCode").asText();
        assertNotNull(bookingCode1);

        // -------------------------------------------------------------
        // Bước 2: Customer 2 cố tình đặt cùng loại phòng vào ngày giao nhau
        // (Khách sạn chỉ có 1 phòng Deluxe, đã bị Customer 1 giữ quota [checkIn, checkOut))
        // -------------------------------------------------------------
        CreateBookingRequest overlapBookingReq = CreateBookingRequest.builder()
                .roomTypeId(deluxeRoomType.getId())
                .checkIn(checkIn.plusDays(1)) // Trùng ngày ở giữa
                .checkOut(checkOut)
                .quantity(1)
                .guests(2)
                .paymentMethod("CASH")
                .build();

        mockMvc.perform(post("/api/v1/bookings")
                        .header("Authorization", "Bearer " + customer2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(overlapBookingReq)))
                .andExpect(status().isConflict()) // 409 Conflict chống Overbooking
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message", containsString("Số phòng trống không đủ")));

        // -------------------------------------------------------------
        // Bước 3: Customer 2 đặt vào khoảng ngày KHÔNG trùng (Sau ngày check-out của Customer 1)
        // -------------------------------------------------------------
        CreateBookingRequest nonOverlapBookingReq = CreateBookingRequest.builder()
                .roomTypeId(deluxeRoomType.getId())
                .checkIn(checkOut) // Nhận phòng đúng ngày khách 1 trả phòng
                .checkOut(checkOut.plusDays(2))
                .quantity(1)
                .guests(2)
                .paymentMethod("CASH")
                .build();

        mockMvc.perform(post("/api/v1/bookings")
                        .header("Authorization", "Bearer " + customer2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(nonOverlapBookingReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));

        // -------------------------------------------------------------
        // Bước 4: Bảo mật - Customer 2 cố tình hủy booking của Customer 1 -> 403 Forbidden
        // -------------------------------------------------------------
        CancelBookingRequest maliciousCancelReq = CancelBookingRequest.builder()
                .reason("Cố tình phá hủy booking người khác")
                .build();

        mockMvc.perform(post("/api/v1/bookings/" + bookingCode1 + "/cancel")
                        .header("Authorization", "Bearer " + customer2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(maliciousCancelReq)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message", containsString("Bạn không có quyền")));

        // -------------------------------------------------------------
        // Bước 5: Chính chủ Customer 1 hủy booking của mình
        // -------------------------------------------------------------
        CancelBookingRequest validCancelReq = CancelBookingRequest.builder()
                .reason("Tôi có việc bận đột xuất muốn đổi lịch trình")
                .build();

        mockMvc.perform(post("/api/v1/bookings/" + bookingCode1 + "/cancel")
                        .header("Authorization", "Bearer " + customer1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCancelReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.bookingStatus").value("CANCELLED"))
                .andExpect(jsonPath("$.data.penaltyAmount").value(0.0)); // Chưa thanh toán cọc -> Phạt 0đ

        // -------------------------------------------------------------
        // Bước 6: Sau khi hủy, Quota phòng được giải phóng -> Customer 2 giờ đây có thể đặt lại được
        // -------------------------------------------------------------
        mockMvc.perform(post("/api/v1/bookings")
                        .header("Authorization", "Bearer " + customer2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(overlapBookingReq)))
                .andExpect(status().isCreated()) // Thành công vì quota cũ đã được hủy
                .andExpect(jsonPath("$.success").value(true));
    }
}
