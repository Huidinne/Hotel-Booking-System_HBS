package org.example.backend.audit.repository;

import jakarta.persistence.criteria.Predicate;
import org.example.backend.audit.dto.AuditLogFilterRequest;
import org.example.backend.audit.entity.AuditLog;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Lớp xây dựng câu lệnh truy vấn động (JPA Specification) cho nhật ký thao tác `audit_logs`.
 * Đáp ứng yêu cầu lọc theo SRS §FR-16.2 và checklist thẻ [SP2-BE-02]:
 * - Lọc theo action (AuditAction)
 * - Lọc theo userEmail (actorEmail, tìm kiếm gần đúng không phân biệt hoa/thường)
 * - Lọc theo khoảng ngày startDate & endDate
 * - Lọc mở rộng theo targetType, targetId, status
 */
public class AuditLogSpecification {

    private AuditLogSpecification() {
        // Private constructor to prevent instantiation
    }

    public static Specification<AuditLog> withFilter(AuditLogFilterRequest filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (filter == null) {
                return cb.and(predicates.toArray(new Predicate[0]));
            }

            // 1. Lọc theo khoảng ngày (startDate & endDate)
            if (filter.getStartDate() != null) {
                predicates.add(cb.greaterThanOrEqualTo(
                        root.get("createdAt"),
                        filter.getStartDate().atStartOfDay()
                ));
            }

            if (filter.getEndDate() != null) {
                predicates.add(cb.lessThanOrEqualTo(
                        root.get("createdAt"),
                        filter.getEndDate().atTime(LocalTime.MAX)
                ));
            }

            // 2. Lọc theo userEmail / actorEmail (tìm kiếm gần đúng)
            String searchEmail = filter.getEffectiveEmail();
            if (searchEmail != null && !searchEmail.isBlank()) {
                predicates.add(cb.like(
                        cb.lower(root.get("actorEmail")),
                        "%" + searchEmail.trim().toLowerCase() + "%"
                ));
            }

            // 3. Lọc theo action (loại hành động AuditAction)
            if (filter.getAction() != null) {
                predicates.add(cb.equal(root.get("action"), filter.getAction()));
            }

            // 4. Lọc theo targetType (BOOKING, ROOM, PAYMENT...)
            if (filter.getTargetType() != null && !filter.getTargetType().isBlank()) {
                predicates.add(cb.equal(
                        cb.upper(root.get("targetType")),
                        filter.getTargetType().trim().toUpperCase()
                ));
            }

            // 5. Lọc theo targetId
            if (filter.getTargetId() != null && !filter.getTargetId().isBlank()) {
                predicates.add(cb.equal(root.get("targetId"), filter.getTargetId().trim()));
            }

            // 6. Lọc theo status (SUCCESS / FAILED)
            if (filter.getStatus() != null && !filter.getStatus().isBlank()) {
                predicates.add(cb.equal(
                        cb.upper(root.get("status")),
                        filter.getStatus().trim().toUpperCase()
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

