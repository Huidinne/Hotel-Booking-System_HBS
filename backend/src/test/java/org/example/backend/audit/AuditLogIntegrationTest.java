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

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

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
        assertEquals("SUCCESS", saved.getStatus());
        assertNull(saved.getErrorMessage());

        var logs = auditLogRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("ROOM", "101");
        assertFalse(logs.isEmpty());
        assertEquals(1, logs.size());
        assertEquals("recep_audit@hotel.com", logs.get(0).getActorEmail());
    }

    @Test
    @DisplayName("Acceptance Criteria: Thay đổi thất bại do lỗi nghiệp vụ ghi status=FAILED và KHÔNG tạo log SUCCESS")
    void testBusinessFailureRecordsFailedStatusAndNeverCreatesSuccessLog() {
        // Giả lập một thao tác thất bại do vi phạm điều kiện nghiệp vụ (ví dụ: Check-in khi chưa thanh toán hoặc phòng hỏng)
        String businessErrorMessage = "Lỗi nghiệp vụ: Phòng 102 đang trong tình trạng bảo trì, không thể bàn giao";
        Map<String, Object> attemptParams = Map.of("bookingCode", "BK-ERROR-01", "assignedRoom", "102");

        AuditLog failedLog = auditLogService.recordAuditLog(
                receptionistUser.getId(),
                receptionistUser.getEmail(),
                "ROLE_RECEPTIONIST",
                AuditAction.CHECK_IN_ASSIGN_ROOM,
                "BOOKING",
                "BK-ERROR-01",
                "Thử check-in phòng nhưng thất bại do lỗi nghiệp vụ",
                attemptParams,
                null, // new_values phải là null khi thất bại
                "127.0.0.1",
                "PostmanRuntime/7.39.0",
                "FAILED",
                businessErrorMessage
        );

        assertNotNull(failedLog.getId());
        assertEquals("FAILED", failedLog.getStatus());
        assertEquals(businessErrorMessage, failedLog.getErrorMessage());
        assertNull(failedLog.getNewValues());

        // Kiểm tra tiêu chí nghiệm thu nghiêm ngặt:
        // 1. Phải tìm thấy log FAILED trong DB
        var failedLogs = auditLogRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("BOOKING", "BK-ERROR-01");
        assertEquals(1, failedLogs.size());
        assertEquals("FAILED", failedLogs.get(0).getStatus());

        // 2. Tuyệt đối KHÔNG có bất kỳ bản ghi nào có trạng thái SUCCESS cho target này
        boolean hasSuccessLog = failedLogs.stream()
                .anyMatch(log -> "SUCCESS".equalsIgnoreCase(log.getStatus()));
        assertFalse(hasSuccessLog, "Tiêu chí nghiệm thu vi phạm: Thao tác thất bại nhưng lại tồn tại log SUCCESS!");
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

    @Test
    @DisplayName("API: Lọc kết hợp action, userEmail và khoảng ngày")
    void testFilterCombinedActionEmailAndDate() throws Exception {
        LocalDate today = LocalDate.now();

        // Log 1: Khớp toàn bộ
        auditLogService.recordAuditLog(
                receptionistUser.getId(), receptionistUser.getEmail(), "ROLE_RECEPTIONIST",
                AuditAction.CHECK_IN_ASSIGN_ROOM, "BOOKING", "BK-MATCH-01",
                "Khớp bộ lọc", null, Map.of("room", "101"),
                "127.0.0.1", "Chrome", "SUCCESS", null
        );

        // Log 2: Khác action (CANCEL_BOOKING)
        auditLogService.recordAuditLog(
                receptionistUser.getId(), receptionistUser.getEmail(), "ROLE_RECEPTIONIST",
                AuditAction.CANCEL_BOOKING, "BOOKING", "BK-OTHER-02",
                "Khác action", null, null,
                "127.0.0.1", "Chrome", "SUCCESS", null
        );

        // Log 3: Khác email (admin)
        auditLogService.recordAuditLog(
                adminUser.getId(), adminUser.getEmail(), "ROLE_ADMIN",
                AuditAction.CHECK_IN_ASSIGN_ROOM, "BOOKING", "BK-OTHER-03",
                "Khác email", null, Map.of("room", "102"),
                "127.0.0.1", "Chrome", "SUCCESS", null
        );

        mockMvc.perform(get("/api/v1/admin/audit-logs")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("action", "CHECK_IN_ASSIGN_ROOM")
                        .param("userEmail", "recep_audit")
                        .param("startDate", today.minusDays(1).toString())
                        .param("endDate", today.plusDays(1).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].targetId").value("BK-MATCH-01"))
                .andExpect(jsonPath("$.data.content[0].action").value("CHECK_IN_ASSIGN_ROOM"))
                .andExpect(jsonPath("$.data.content[0].actorEmail").value(receptionistUser.getEmail()));
    }

    @Test
    @DisplayName("Validate Ngày: startDate > endDate phải trả về HTTP 400 Bad Request")
    void testInvalidDateRangeThrowsBadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/admin/audit-logs")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("startDate", "2026-11-10")
                        .param("endDate", "2026-11-01"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message", containsString("startDate")));
    }

    @Test
    @DisplayName("Edge Case: Lọc không có dữ liệu trả về mảng rỗng và totalElements=0")
    void testNoMatchingDataReturnsEmptyList() throws Exception {
        mockMvc.perform(get("/api/v1/admin/audit-logs")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("userEmail", "nobody_exists@hotel.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalElements").value(0))
                .andExpect(jsonPath("$.data.content", hasSize(0)));
    }

    @Test
    @DisplayName("Phân trang: Kiểm tra phân trang không trùng lặp (Disjoint pagination)")
    void testPaginationNoDuplicates() throws Exception {
        // Tạo 15 bản ghi audit log
        for (int i = 1; i <= 15; i++) {
            auditLogService.recordAuditLog(
                    adminUser.getId(), adminUser.getEmail(), "ROLE_ADMIN",
                    AuditAction.UPDATE_PRICE, "ROOM_TYPE", String.valueOf(i),
                    "Audit log item #" + i,
                    null, Map.of("itemIndex", i),
                    "127.0.0.1", "TestRunner", "SUCCESS", null
            );
        }

        // Lấy trang 0 (size 10)
        String page0Response = mockMvc.perform(get("/api/v1/admin/audit-logs")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(15))
                .andExpect(jsonPath("$.data.content", hasSize(10)))
                .andReturn().getResponse().getContentAsString();

        // Lấy trang 1 (size 10)
        String page1Response = mockMvc.perform(get("/api/v1/admin/audit-logs")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(15))
                .andExpect(jsonPath("$.data.content", hasSize(5)))
                .andReturn().getResponse().getContentAsString();

        JsonNode page0Node = objectMapper.readTree(page0Response).path("data").path("content");
        JsonNode page1Node = objectMapper.readTree(page1Response).path("data").path("content");

        Set<Long> page0Ids = new HashSet<>();
        for (JsonNode item : page0Node) {
            page0Ids.add(item.path("id").asLong());
        }

        Set<Long> page1Ids = new HashSet<>();
        for (JsonNode item : page1Node) {
            page1Ids.add(item.path("id").asLong());
        }

        assertEquals(10, page0Ids.size());
        assertEquals(5, page1Ids.size());

        // Kiểm tra không có ID nào trùng lặp giữa trang 0 và trang 1
        for (Long id : page1Ids) {
            assertFalse(page0Ids.contains(id), "Phát hiện ID bị trùng giữa trang 0 và trang 1: " + id);
        }
    }
}

