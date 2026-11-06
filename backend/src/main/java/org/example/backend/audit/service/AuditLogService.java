package org.example.backend.audit.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.criteria.Predicate;
import org.example.backend.audit.dto.AuditLogFilterRequest;
import org.example.backend.audit.dto.AuditLogResponse;
import org.example.backend.audit.entity.AuditAction;
import org.example.backend.audit.entity.AuditLog;
import org.example.backend.audit.repository.AuditLogRepository;
import org.example.backend.audit.repository.AuditLogSpecification;
import org.example.backend.audit.util.AuditLogSecuritySanitizer;
import org.example.backend.common.exception.AppException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Service xử lý ghi và tra cứu nhật ký thao tác `audit_logs` (SRS §FR-16).
 */
@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public AuditLogService(AuditLogRepository auditLogRepository, ObjectMapper objectMapper) {
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Ghi log thao tác mới với transaction riêng biệt (REQUIRES_NEW)
     * để không ảnh hưởng transaction nghiệp vụ nếu có ngoại lệ.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog recordAuditLog(Long actorId,
                                  String actorEmail,
                                  String actorRole,
                                  AuditAction action,
                                  String targetType,
                                  String targetId,
                                  String description,
                                  Object rawOldValues,
                                  Object rawNewValues,
                                  String ipAddress,
                                  String userAgent,
                                  String status,
                                  String errorMessage) {

        String sanitizedOldValues = AuditLogSecuritySanitizer.sanitizeToJson(rawOldValues, objectMapper);
        String sanitizedNewValues = AuditLogSecuritySanitizer.sanitizeToJson(rawNewValues, objectMapper);

        AuditLog log = AuditLog.builder()
                .actorId(actorId)
                .actorEmail(actorEmail != null && !actorEmail.isBlank() ? actorEmail : "ANONYMOUS")
                .actorRole(actorRole != null ? actorRole : "UNKNOWN")
                .action(action)
                .targetType(targetType != null ? targetType : "GENERAL")
                .targetId(targetId)
                .description(description != null ? description : action.getDescription())
                .oldValues(sanitizedOldValues)
                .newValues(sanitizedNewValues)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .status(status != null ? status : "SUCCESS")
                .errorMessage(errorMessage)
                .createdAt(LocalDateTime.now())
                .build();

        return auditLogRepository.save(log);
    }

    /**
     * Tra cứu danh sách nhật ký thao tác với bộ lọc đa tiêu chí (dành cho Admin).
     */
    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getAuditLogs(AuditLogFilterRequest filter, int page, int size) {
        // 1. Validate logic ngày tháng
        if (filter != null && filter.getStartDate() != null && filter.getEndDate() != null) {
            if (filter.getStartDate().isAfter(filter.getEndDate())) {
                throw new AppException(HttpStatus.BAD_REQUEST,
                        "Khoảng thời gian không hợp lệ: startDate (" + filter.getStartDate() +
                        ") không được lớn hơn endDate (" + filter.getEndDate() + ")");
            }
        }

        // 2. Giới hạn kích thước trang (size) và sắp xếp ổn định mới nhất trước (Stable sort: createdAt DESC, id DESC)
        int validatedSize = size <= 0 ? 20 : Math.min(size, 100);
        int validatedPage = Math.max(0, page);
        Pageable pageable = PageRequest.of(validatedPage, validatedSize,
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));

        // 3. Sử dụng AuditLogSpecification lọc động theo tiêu chí (SRS §FR-16.2 & [SP2-BE-02])
        Specification<AuditLog> spec = AuditLogSpecification.withFilter(filter);
        return auditLogRepository.findAll(spec, pageable).map(this::toResponse);
    }

    /**
     * Tra cứu lịch sử thao tác của một đối tượng cụ thể (ví dụ bookingCode BK-123).
     */
    @Transactional(readOnly = true)
    public List<AuditLogResponse> getAuditLogsByTarget(String targetType, String targetId) {
        return auditLogRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDesc(targetType, targetId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private AuditLogResponse toResponse(AuditLog log) {
        Object parsedOld = parseJsonOrRaw(log.getOldValues());
        Object parsedNew = parseJsonOrRaw(log.getNewValues());

        return AuditLogResponse.builder()
                .id(log.getId())
                .actorId(log.getActorId())
                .actorEmail(log.getActorEmail())
                .actorRole(log.getActorRole())
                .action(log.getAction())
                .actionDescription(log.getAction().getDescription())
                .targetType(log.getTargetType())
                .targetId(log.getTargetId())
                .description(log.getDescription())
                .oldValues(parsedOld)
                .newValues(parsedNew)
                .ipAddress(log.getIpAddress())
                .userAgent(log.getUserAgent())
                .status(log.getStatus())
                .errorMessage(log.getErrorMessage())
                .createdAt(log.getCreatedAt())
                .build();
    }

    private Object parseJsonOrRaw(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readTree(json);
        } catch (Exception e) {
            return json;
        }
    }
}

