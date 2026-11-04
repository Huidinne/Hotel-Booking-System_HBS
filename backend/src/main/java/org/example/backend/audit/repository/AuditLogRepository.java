package org.example.backend.audit.repository;

import org.example.backend.audit.entity.AuditAction;
import org.example.backend.audit.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository quản lý truy vấn nhật ký thao tác `audit_logs`.
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long>, JpaSpecificationExecutor<AuditLog> {

    List<AuditLog> findByTargetTypeAndTargetIdOrderByCreatedAtDesc(String targetType, String targetId);

    List<AuditLog> findByActorEmailOrderByCreatedAtDesc(String actorEmail);

    Page<AuditLog> findByAction(AuditAction action, Pageable pageable);
}

