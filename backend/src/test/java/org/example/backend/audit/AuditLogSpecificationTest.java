package org.example.backend.audit;

import org.example.backend.audit.dto.AuditLogFilterRequest;
import org.example.backend.audit.entity.AuditAction;
import org.example.backend.audit.entity.AuditLog;
import org.example.backend.audit.repository.AuditLogRepository;
import org.example.backend.audit.repository.AuditLogSpecification;
import org.example.backend.user.entity.Role;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Kiểm thử đơn vị và tích hợp cho lớp truy vấn động AuditLogSpecification ([SP2-BE-02]):
 * 1. Lọc theo action
 * 2. Lọc theo userEmail (actorEmail)
 * 3. Lọc theo khoảng ngày (startDate, endDate)
 * 4. Lọc kết hợp đa tiêu chí
 */
@SpringBootTest
class AuditLogSpecificationTest {

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        auditLogRepository.deleteAll();

        // Chuẩn bị dữ liệu mẫu với các mốc thời gian và hành động khác nhau
        LocalDateTime now = LocalDateTime.now();

        auditLogRepository.save(AuditLog.builder()
                .actorEmail("receptionist@hotel.com")
                .actorRole("ROLE_RECEPTIONIST")
                .action(AuditAction.CHECK_IN_ASSIGN_ROOM)
                .targetType("BOOKING")
                .targetId("BK-SPEC-001")
                .description("Lễ tân check-in phòng")
                .status("SUCCESS")
                .createdAt(now.minusDays(1))
                .build());

        auditLogRepository.save(AuditLog.builder()
                .actorEmail("admin@hotel.com")
                .actorRole("ROLE_ADMIN")
                .action(AuditAction.UPDATE_PRICE)
                .targetType("ROOM_TYPE")
                .targetId("1")
                .description("Admin cập nhật giá")
                .status("SUCCESS")
                .createdAt(now)
                .build());

        auditLogRepository.save(AuditLog.builder()
                .actorEmail("customer@hotel.com")
                .actorRole("ROLE_CUSTOMER")
                .action(AuditAction.CANCEL_BOOKING)
                .targetType("BOOKING")
                .targetId("BK-SPEC-002")
                .description("Khách hủy đơn")
                .status("FAILED")
                .errorMessage("Hủy quá hạn chính sách")
                .createdAt(now.minusDays(5))
                .build());
    }

    @Test
    @DisplayName("Specification: Lọc chính xác theo action")
    void testFilterByAction() {
        AuditLogFilterRequest filter = AuditLogFilterRequest.builder()
                .action(AuditAction.UPDATE_PRICE)
                .build();

        Specification<AuditLog> spec = AuditLogSpecification.withFilter(filter);
        List<AuditLog> results = auditLogRepository.findAll(spec);

        assertEquals(1, results.size());
        assertEquals("admin@hotel.com", results.get(0).getActorEmail());
        assertEquals(AuditAction.UPDATE_PRICE, results.get(0).getAction());
    }

    @Test
    @DisplayName("Specification: Lọc tìm kiếm gần đúng theo userEmail")
    void testFilterByUserEmail() {
        AuditLogFilterRequest filter = AuditLogFilterRequest.builder()
                .userEmail("receptionist")
                .build();

        Specification<AuditLog> spec = AuditLogSpecification.withFilter(filter);
        List<AuditLog> results = auditLogRepository.findAll(spec);

        assertEquals(1, results.size());
        assertEquals("receptionist@hotel.com", results.get(0).getActorEmail());
        assertEquals("BK-SPEC-001", results.get(0).getTargetId());
    }

    @Test
    @DisplayName("Specification: Lọc theo khoảng ngày startDate và endDate")
    void testFilterByDateRange() {
        LocalDate today = LocalDate.now();
        AuditLogFilterRequest filter = AuditLogFilterRequest.builder()
                .startDate(today.minusDays(2))
                .endDate(today)
                .build();

        Specification<AuditLog> spec = AuditLogSpecification.withFilter(filter);
        List<AuditLog> results = auditLogRepository.findAll(spec);

        // Phải có 2 bản ghi (hôm nay và hôm qua), không lấy bản ghi 5 ngày trước
        assertEquals(2, results.size());
    }

    @Test
    @DisplayName("Specification: Lọc kết hợp toàn bộ (action, userEmail, startDate, endDate)")
    void testFilterAllCombined() {
        LocalDate today = LocalDate.now();
        AuditLogFilterRequest filter = AuditLogFilterRequest.builder()
                .action(AuditAction.CHECK_IN_ASSIGN_ROOM)
                .userEmail("receptionist")
                .startDate(today.minusDays(2))
                .endDate(today)
                .build();

        Specification<AuditLog> spec = AuditLogSpecification.withFilter(filter);
        List<AuditLog> results = auditLogRepository.findAll(spec);

        assertEquals(1, results.size());
        assertEquals("BK-SPEC-001", results.get(0).getTargetId());
    }

    @Test
    @DisplayName("Specification: Filter null trả về toàn bộ danh sách")
    void testNullFilterReturnsAll() {
        Specification<AuditLog> spec = AuditLogSpecification.withFilter(null);
        List<AuditLog> results = auditLogRepository.findAll(spec);

        assertEquals(3, results.size());
    }
}

