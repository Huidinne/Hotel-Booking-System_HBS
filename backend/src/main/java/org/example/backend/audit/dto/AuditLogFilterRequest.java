package org.example.backend.audit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.backend.audit.entity.AuditAction;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogFilterRequest {

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate startDate;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate endDate;

    private String userEmail;
    private String actorEmail;
    private AuditAction action;
    private String targetType;
    private String targetId;
    private String status;

    public String getEffectiveEmail() {
        if (userEmail != null && !userEmail.isBlank()) {
            return userEmail.trim();
        }
        if (actorEmail != null && !actorEmail.isBlank()) {
            return actorEmail.trim();
        }
        return null;
    }
}

