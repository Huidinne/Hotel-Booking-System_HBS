package org.example.backend.audit;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.backend.audit.entity.AuditAction;
import org.example.backend.audit.entity.AuditLog;
import org.example.backend.audit.repository.AuditLogRepository;
import org.example.backend.audit.service.AuditLogService;
import org.example.backend.audit.util.AuditLogSecuritySanitizer;
import org.example.backend.auth.security.JwtProvider;
import org.example.backend.user.entity.Role;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Kiểm thử toàn diện module Audit Log (SRS §FR-16):
 * 1. Cơ chế làm sạch dữ liệu nhạy cảm (Security Sanitization: không lưu password, token, mask số tài khoản).
 * 2. Lưu vết và tra cứu AuditLog qua Service / Repository.
 * 3. Phân quyền API tra cứu: Admin truy cập thành công (200), Role khác bị chặn (403 Forbidden).
 */
@SpringBootTest
@AutoConfigureMockMvc
class AuditLogIntegrationTest {

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
    private AuditLogService auditLogService;

    private User adminUser;
    private User receptionistUser;
    private User customerUser;
    private String adminToken;
    private String receptionistToken;
    private String customerToken;

    @BeforeEach
    void setUp() {
        auditLogRepository.deleteAll();
        userRepository.deleteAll();

        adminUser = userRepository.save(User.builder()
                .email("admin_audit@hotel.com")
                .password(passwordEncoder.encode("Pass@123"))
                .fullName("Quản Trị Viên")
                .phone("0901111111")
                .role(Role.ROLE_ADMIN)
                .build());

        receptionistUser = userRepository.save(User.builder()
                .email("recep_audit@hotel.com")
                .password(passwordEncoder.encode("Pass@123"))
                .fullName("Lễ Tân Khách Sạn")
                .phone("0902222222")
                .role(Role.ROLE_RECEPTIONIST)
                .build());

        customerUser = userRepository.save(User.builder()
                .email("cust_audit@hotel.com")
                .password(passwordEncoder.encode("Pass@123"))
                .fullName("Khách Hàng")
                .phone("0903333333")
                .role(Role.ROLE_CUSTOMER)
                .build());

        adminToken = jwtProvider.generateAccessToken(adminUser);
        receptionistToken = jwtProvider.generateAccessToken(receptionistUser);
        customerToken = jwtProvider.generateAccessToken(customerUser);
    }

    // ═════════════════════════════════════════════════════════════════════
    // 1. TIÊU CHÍ AN TOÀN THÔNG TIN (SECURITY SANITIZATION & MASKING)
    // ═════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("Security: Tự động loại bỏ password/token và mask số tài khoản ngân hàng")
    void testSensitiveDataIsSanitizedAndMasked() throws Exception {
        Map<String, Object> sensitivePayload = Map.of(
                "password", "SecretPassword@123",
                "accessToken", "eyJhbGciOiJIUzI1NiIsIn...",
                "apiKey", "live_secret_key_abcdef",
                "accountNumber", "0123456789",
                "bankName", "Vietcombank",
                "accountHolder", "NGUYEN VAN A"
        );

        String sanitizedJson = AuditLogSecuritySanitizer.sanitizeToJson(sensitivePayload, objectMapper);
        assertNotNull(sanitizedJson);

        JsonNode root = objectMapper.readTree(sanitizedJson);

        // Password & Token phải bị REDACTED
        assertEquals("[REDACTED]", root.path("password").asText());
        assertEquals("[REDACTED]", root.path("accessToken").asText());
        assertEquals("[REDACTED]", root.path("apiKey").asText());

        // Số tài khoản ngân hàng phải bị mask, chỉ giữ 4 số cuối
        String maskedBank = root.path("accountNumber").asText();
        assertTrue(maskedBank.startsWith("******"));
        assertTrue(maskedBank.endsWith("6789"));
        assertFalse(maskedBank.contains("012345"));

        // Dữ liệu an toàn không bị ảnh hưởng
        assertEquals("Vietcombank", root.path("bankName").asText());
        assertEquals("NGUYEN VAN A", root.path("accountHolder").asText());
    }

    // ═════════════════════════════════════════════════════════════════════
    // 2. GHI VÀ TRA CỨU LOG QUA SERVICE / REPOSITORY
    // ═════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("Audit Service: Ghi nhận log thao tác nhạy cảm thành công")
    void testRecordAndFindAuditLog() {
        Map<String, Object> oldValues = Map.of("roomNumber", "101", "status", "CLEANING");
        Map<String, Object> newValues = Map.of("roomNumber", "101", "status", "AVAILABLE");

        AuditLog saved = auditLogService.recordAuditLog(
                receptionistUser.getId(),
                receptionistUser.getEmail(),
                "ROLE_RECEPTIONIST",
                AuditAction.CHANGE_ROOM_STATUS,
                "ROOM",
                "101",
                "Chuyển trạng thái phòng sau dọn dẹp",
                oldValues,
                newValues,
                "127.0.0.1",
                "TestRunner/1.0",
                "SUCCESS",
                null
        );

        assertNotNull(saved.getId());
        assertEquals(AuditAction.CHANGE_ROOM_STATUS, saved.getAction());
        assertEquals("ROOM", saved.getTargetType());
        assertEquals("101", saved.getTargetId());

        var logs = auditLogRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("ROOM", "101");
        assertFalse(logs.isEmpty());
        assertEquals(1, logs.size());
        assertEquals("recep_audit@hotel.com", logs.get(0).getActorEmail());
    }

    // ═════════════════════════════════════════════════════════════════════
    // 3. KIỂM THỬ API TRA CỨU AUDIT LOG & PHÂN QUYỀN RBAC (ADMIN ONLY)
    // ═════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("RBAC: Admin truy cập API tra cứu Audit Log -> 200 OK + phân trang")
    void testAdminCanAccessAuditLogsEndpoint() throws Exception {
        // Tạo sẵn 2 log mẫu
        auditLogService.recordAuditLog(
                adminUser.getId(), adminUser.getEmail(), "ROLE_ADMIN",
                AuditAction.UPDATE_PRICE, "ROOM_TYPE", "1",
                "Điều chỉnh giá cơ bản mùa cao điểm",
                Map.of("basePrice", 1000000), Map.of("basePrice", 1200000),
                "127.0.0.1", "Chrome", "SUCCESS", null
        );

        auditLogService.recordAuditLog(
                receptionistUser.getId(), receptionistUser.getEmail(), "ROLE_RECEPTIONIST",
                AuditAction.CHECK_IN_ASSIGN_ROOM, "BOOKING", "BK-12345",
                "Gán phòng 201 cho khách",
                null, Map.of("assignedRooms", "201"),
                "127.0.0.1", "Firefox", "SUCCESS", null
        );

        mockMvc.perform(get("/api/v1/admin/audit-logs")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content", hasSize(2)))
                .andExpect(jsonPath("$.data.totalElements").value(2));
    }

    @Test
    @DisplayName("RBAC: Lễ tân truy cập API Audit Log -> 403 Forbidden")
    void testReceptionistForbiddenOnAuditLogsEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/admin/audit-logs")
                        .header("Authorization", "Bearer " + receptionistToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("RBAC: Khách hàng truy cập API Audit Log -> 403 Forbidden")
    void testCustomerForbiddenOnAuditLogsEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/admin/audit-logs")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("API: Lấy danh mục AuditAction enum phục vụ giao diện lọc -> 200 OK")
    void testGetAuditActionsDropdown() throws Exception {
        mockMvc.perform(get("/api/v1/admin/audit-logs/actions")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(10))))
                .andExpect(jsonPath("$.data[?(@.name == 'CHECK_IN_ASSIGN_ROOM')]").exists())
                .andExpect(jsonPath("$.data[?(@.name == 'CANCEL_BOOKING')]").exists());
    }
}

