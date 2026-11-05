package org.example.backend.audit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.backend.audit.entity.AuditAction;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogResponse {
    private Long id;
    private Long actorId;
    private String actorEmail;
    private String actorRole;
    private AuditAction action;
    private String actionDescription;
    private String targetType;
    private String targetId;
    private String description;
    private Object oldValues;
    private Object newValues;
    private String ipAddress;
    private String userAgent;
    private String status;
    private String errorMessage;
    private LocalDateTime createdAt;
}

