package org.example.backend.user;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.backend.audit.entity.AuditAction;
import org.example.backend.audit.entity.AuditLog;
import org.example.backend.audit.repository.AuditLogRepository;
import org.example.backend.auth.dto.LoginRequest;
import org.example.backend.auth.security.JwtProvider;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.booking.repository.BookingRoomRepository;
import org.example.backend.mail.service.EmailService;
import org.example.backend.payment.repository.PaymentTransactionRepository;
import org.example.backend.roomservice.repository.MaintenanceRequestRepository;
import org.example.backend.roomservice.repository.RoomServiceOrderItemRepository;
import org.example.backend.roomservice.repository.RoomServiceOrderRepository;
import org.example.backend.user.dto.AdminUserCreateRequest;
import org.example.backend.user.dto.AdminUserResetPasswordRequest;
import org.example.backend.user.dto.AdminUserStatusUpdateRequest;
import org.example.backend.user.dto.AdminUserUpdateRequest;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AdminUserIntegrationTest {

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
    private AuditLogRepository auditLogRepository;

    @Autowired
    private PaymentTransactionRepository paymentTransactionRepository;

    @Autowired
    private MaintenanceRequestRepository maintenanceRequestRepository;

    @Autowired
    private RoomServiceOrderItemRepository orderItemRepository;

    @Autowired
    private RoomServiceOrderRepository orderRepository;

    @Autowired
    private BookingRoomRepository bookingRoomRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @MockBean
    private EmailService emailService;

    private User adminUser;
    private User receptionistUser;
    private User customerUser;
    private String adminToken;
    private String receptionistToken;
    private String customerToken;

    @BeforeEach
    void setUp() {
        maintenanceRequestRepository.deleteAll();
        orderItemRepository.deleteAll();
        orderRepository.deleteAll();
        paymentTransactionRepository.deleteAll();
        bookingRoomRepository.deleteAll();
        bookingRepository.deleteAll();
        auditLogRepository.deleteAll();
        userRepository.deleteAll();

        adminUser = userRepository.save(User.builder()
                .email("admin@grandaurora.com")
                .password(passwordEncoder.encode("Password@123"))
                .fullName("Quản Trị Viên Chính")
                .phone("0901000001")
                .role(Role.ROLE_ADMIN)
                .isActive(true)
                .build());
        adminToken = jwtProvider.generateAccessToken(adminUser);

        receptionistUser = userRepository.save(User.builder()
                .email("receptionist@grandaurora.com")
                .password(passwordEncoder.encode("Password@123"))
                .fullName("Lễ Tân Ca Sáng")
                .phone("0901000002")
                .role(Role.ROLE_RECEPTIONIST)
                .isActive(true)
                .build());
        receptionistToken = jwtProvider.generateAccessToken(receptionistUser);

        customerUser = userRepository.save(User.builder()
                .email("customer@grandaurora.com")
                .password(passwordEncoder.encode("Password@123"))
                .fullName("Khách Hàng Thân Thiết")
                .phone("0901000003")
                .role(Role.ROLE_CUSTOMER)
                .isActive(true)
                .build());
        customerToken = jwtProvider.generateAccessToken(customerUser);
    }

    @Test
    @DisplayName("RBAC: Chỉ ADMIN mới được truy cập /api/v1/admin/users; Receptionist & Customer bị 403, chưa đăng nhập bị 401")
    void testRbacAdminOnlyAccess() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + receptionistToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(3));
    }

    @Test
    @DisplayName("Admin cấp tài khoản Lễ tân mới -> 201 Created, đăng nhập ngay được và ghi Audit Log đã che mật khẩu")
    void testAdminCreateReceptionistAndLogin() throws Exception {
        AdminUserCreateRequest createReq = AdminUserCreateRequest.builder()
                .email("letan.catoi@grandaurora.com")
                .password("LeTanCaToi@2026")
                .fullName("Nguyễn Thị Lễ Tân Ca Tối")
                .phone("0911223344")
                .role(Role.ROLE_RECEPTIONIST)
                .build();

        mockMvc.perform(post("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.email").value("letan.catoi@grandaurora.com"))
                .andExpect(jsonPath("$.data.role").value("ROLE_RECEPTIONIST"))
                .andExpect(jsonPath("$.data.isActive").value(true))
                .andExpect(jsonPath("$.data.password").doesNotExist());

        // Email trùng phải trả 409 Conflict
        mockMvc.perform(post("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isConflict());

        // Tài khoản Lễ tân vừa được cấp có thể đăng nhập thành công ngay lập tức
        LoginRequest loginReq = new LoginRequest();
        loginReq.setEmail("letan.catoi@grandaurora.com");
        loginReq.setPassword("LeTanCaToi@2026");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.user.role").value("ROLE_RECEPTIONIST"));

        // Kiểm tra Audit Log đã ghi nhận CREATE_USER và che mờ password thành [REDACTED]
        List<AuditLog> logs = auditLogRepository.findByActorEmailOrderByCreatedAtDesc("admin@grandaurora.com");
        assertThat(logs).isNotEmpty();
        AuditLog createLog = logs.stream()
                .filter(l -> l.getAction() == AuditAction.CREATE_USER)
                .findFirst()
                .orElseThrow();
        assertThat(createLog.getTargetType()).isEqualTo("USER");
        assertThat(createLog.getOldValues()).doesNotContain("LeTanCaToi@2026");
        assertThat(createLog.getOldValues()).contains("[REDACTED]");
    }

    @Test
    @DisplayName("Admin lọc & tìm kiếm danh sách tài khoản theo role, isActive, keyword và xem stats")
    void testFilterUsersAndStats() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")
                        .param("role", "ROLE_RECEPTIONIST")
                        .param("keyword", "Ca Sáng")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].email").value("receptionist@grandaurora.com"));

        mockMvc.perform(get("/api/v1/admin/users/stats")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalUsers").value(3))
                .andExpect(jsonPath("$.data.activeUsers").value(3))
                .andExpect(jsonPath("$.data.lockedUsers").value(0))
                .andExpect(jsonPath("$.data.adminCount").value(1))
                .andExpect(jsonPath("$.data.receptionistCount").value(1))
                .andExpect(jsonPath("$.data.customerCount").value(1));
    }

    @Test
    @DisplayName("Admin khóa tài khoản Lễ tân -> chặn đăng nhập (403) và vô hiệu hóa luôn JWT token cũ (401); chống Admin tự khóa chính mình")
    void testLockUnlockAndAntiSelfLockout() throws Exception {
        // 1. Admin không thể tự khóa chính mình -> 400 Bad Request
        AdminUserStatusUpdateRequest lockReq = AdminUserStatusUpdateRequest.builder()
                .isActive(false)
                .build();

        mockMvc.perform(patch("/api/v1/admin/users/" + adminUser.getId() + "/status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(lockReq)))
                .andExpect(status().isBadRequest());

        // 2. Admin không thể tự hạ quyền của chính mình -> 400 Bad Request
        AdminUserUpdateRequest selfDemoteReq = AdminUserUpdateRequest.builder()
                .fullName("Quản Trị Viên Chính")
                .phone("0901000001")
                .role(Role.ROLE_RECEPTIONIST)
                .build();

        mockMvc.perform(put("/api/v1/admin/users/" + adminUser.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(selfDemoteReq)))
                .andExpect(status().isBadRequest());

        // 3. Admin khóa tài khoản Lễ tân -> 200 OK
        mockMvc.perform(patch("/api/v1/admin/users/" + receptionistUser.getId() + "/status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(lockReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isActive").value(false));

        // 4. Token cũ của Lễ tân lập tức bị từ chối (401 Unauthorized)
        mockMvc.perform(get("/api/v1/receptionist/bookings")
                        .header("Authorization", "Bearer " + receptionistToken))
                .andExpect(status().isUnauthorized());

        // 5. Đăng nhập lại bị chặn (403 Forbidden)
        LoginRequest loginReq = new LoginRequest();
        loginReq.setEmail("receptionist@grandaurora.com");
        loginReq.setPassword("Password@123");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isForbidden());

        // 6. Admin mở khóa lại -> Lễ tân đăng nhập bình thường
        AdminUserStatusUpdateRequest unlockReq = AdminUserStatusUpdateRequest.builder()
                .isActive(true)
                .build();

        mockMvc.perform(patch("/api/v1/admin/users/" + receptionistUser.getId() + "/status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(unlockReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isActive").value(true));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Admin đặt lại mật khẩu cho Lễ tân -> mật khẩu mới đăng nhập được, mật khẩu cũ bị từ chối và Audit Log che [REDACTED]")
    void testResetPassword() throws Exception {
        AdminUserResetPasswordRequest resetReq = AdminUserResetPasswordRequest.builder()
                .newPassword("NewSecretPass@999")
                .build();

        mockMvc.perform(post("/api/v1/admin/users/" + receptionistUser.getId() + "/reset-password")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resetReq)))
                .andExpect(status().isOk());

        // Mật khẩu cũ thất bại -> 401
        LoginRequest oldLogin = new LoginRequest();
        oldLogin.setEmail("receptionist@grandaurora.com");
        oldLogin.setPassword("Password@123");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(oldLogin)))
                .andExpect(status().isUnauthorized());

        // Mật khẩu mới thành công -> 200
        LoginRequest newLogin = new LoginRequest();
        newLogin.setEmail("receptionist@grandaurora.com");
        newLogin.setPassword("NewSecretPass@999");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newLogin)))
                .andExpect(status().isOk());

        // Audit Log không lưu mật khẩu mới dạng rõ
        List<AuditLog> logs = auditLogRepository.findByActorEmailOrderByCreatedAtDesc("admin@grandaurora.com");
        AuditLog resetLog = logs.stream()
                .filter(l -> l.getAction() == AuditAction.RESET_USER_PASSWORD)
                .findFirst()
                .orElseThrow();
        assertThat(resetLog.getOldValues()).doesNotContain("NewSecretPass@999");
        assertThat(resetLog.getOldValues()).contains("[REDACTED]");
    }

    @Test
    @DisplayName("Tự động ẩn tài khoản rác từ Load Test (MpLoad/@example.com), Concurrency Test và E2E Test, chỉ hiển thị tài khoản thật")
    void testExcludesLoadAndAutomatedTestUsers() throws Exception {
        userRepository.save(User.builder()
                .email("mp_ew4tfrx2@example.com")
                .password(passwordEncoder.encode("Password@123"))
                .fullName("MpLoad ew4tfrx2")
                .phone("0885333366")
                .role(Role.ROLE_CUSTOMER)
                .isActive(true)
                .build());

        userRepository.save(User.builder()
                .email("concurrency_user1@hotel.com")
                .password(passwordEncoder.encode("Password@123"))
                .fullName("Tester Concurrency 01")
                .phone("0909901")
                .role(Role.ROLE_CUSTOMER)
                .isActive(true)
                .build());

        userRepository.save(User.builder()
                .email("e2e_cust_1794900000@hotel.com")
                .password(passwordEncoder.encode("Password@123"))
                .fullName("E2E Customer")
                .phone("0909999999")
                .role(Role.ROLE_CUSTOMER)
                .isActive(true)
                .build());

        // Danh sách và thống kê vẫn chỉ hiển thị 3 tài khoản thật (admin, receptionist, customer)
        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(3));

        mockMvc.perform(get("/api/v1/admin/users/stats")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalUsers").value(3))
                .andExpect(jsonPath("$.data.customerCount").value(1));
    }
}
