package org.example.backend.audit.aspect;

import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.example.backend.audit.annotation.Auditable;
import org.example.backend.audit.entity.AuditAction;
import org.example.backend.audit.service.AuditLogService;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Spring AOP Aspect tự động ghi vết audit_logs khi phương thức có gắn `@Auditable` được thực thi (SRS §FR-16.1).
 */
@Aspect
@Component
public class AuditLogAspect {

    private static final Logger log = LoggerFactory.getLogger(AuditLogAspect.class);

    private final AuditLogService auditLogService;
    private final UserRepository userRepository;

    public AuditLogAspect(AuditLogService auditLogService, UserRepository userRepository) {
        this.auditLogService = auditLogService;
        this.userRepository = userRepository;
    }

    @Around("@annotation(org.example.backend.audit.annotation.Auditable)")
    public Object auditMethod(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        Auditable auditable = method.getAnnotation(Auditable.class);

        AuditAction action = auditable.action();
        String targetType = auditable.targetType().isBlank()
                ? inferTargetType(action, method.getName())
                : auditable.targetType();
        String description = auditable.description().isBlank()
                ? action.getDescription()
                : auditable.description();

        // 1. Trích xuất Actor từ Security Context
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String actorEmail = (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName()))
                ? auth.getName()
                : "ANONYMOUS";

        String actorRole = (auth != null)
                ? auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.joining(","))
                : "ANONYMOUS";

        Long actorId = null;
        if (!"ANONYMOUS".equals(actorEmail)) {
            try {
                actorId = userRepository.findByEmail(actorEmail).map(User::getId).orElse(null);
            } catch (Exception ignored) {
            }
        }

        // 2. Trích xuất HTTP Request Context (IP, User-Agent)
        String ipAddress = null;
        String userAgent = null;
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            HttpServletRequest request = attributes.getRequest();
            ipAddress = getClientIp(request);
            userAgent = request.getHeader("User-Agent");
        }

        // 3. Chuẩn bị dữ liệu đầu vào (old_values / params)
        Object[] args = joinPoint.getArgs();
        String[] paramNames = signature.getParameterNames();
        Map<String, Object> inputParams = new HashMap<>();
        String targetId = null;

        if (paramNames != null && args != null) {
            for (int i = 0; i < args.length; i++) {
                String name = paramNames[i];
                Object val = args[i];
                if (val instanceof Authentication || val instanceof HttpServletRequest) {
                    continue;
                }
                inputParams.put(name, val);

                // Thử trích xuất targetId từ các tham số phổ biến
                if (targetId == null && ("bookingId".equalsIgnoreCase(name)
                        || "bookingCode".equalsIgnoreCase(name)
                        || "roomId".equalsIgnoreCase(name)
                        || "roomTypeId".equalsIgnoreCase(name)
                        || "id".equalsIgnoreCase(name))) {
                    targetId = String.valueOf(val);
                }
            }
        }

        Object result;
        try {
            result = joinPoint.proceed();

            // Nếu chưa tìm thấy targetId, thử trích xuất từ kết quả trả về
            if (targetId == null && result != null) {
                targetId = extractTargetIdFromResult(result);
            }

            try {
                // Ghi nhận log THÀNH CÔNG
                auditLogService.recordAuditLog(
                        actorId,
                        actorEmail,
                        actorRole,
                        action,
                        targetType,
                        targetId,
                        description,
                        inputParams.isEmpty() ? null : inputParams,
                        result,
                        ipAddress,
                        userAgent,
                        "SUCCESS",
                        null
                );
            } catch (Exception auditEx) {
                log.error("Failed to record audit log for success: {}", auditEx.getMessage());
            }

            return result;
        } catch (Throwable ex) {
            try {
                // Ghi nhận log THẤT BÀI
                auditLogService.recordAuditLog(
                        actorId,
                        actorEmail,
                        actorRole,
                        action,
                        targetType,
                        targetId,
                        description,
                        inputParams.isEmpty() ? null : inputParams,
                        null,
                        ipAddress,
                        userAgent,
                        "FAILED",
                        ex.getMessage()
                );
            } catch (Exception auditEx) {
                log.error("Failed to record audit log for failure: {}", auditEx.getMessage());
            }
            throw ex;
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String inferTargetType(AuditAction action, String methodName) {
        String actionName = action.name();
        if (actionName.contains("BOOKING") || actionName.contains("CHECK_IN") || actionName.contains("CHECK_OUT") || actionName.contains("NO_SHOW")) {
            return "BOOKING";
        }
        if (actionName.contains("ROOM_STATUS") || actionName.contains("ROOM")) {
            return "ROOM";
        }
        if (actionName.contains("PRICE") || actionName.contains("ROOM_TYPE")) {
            return "ROOM_TYPE";
        }
        if (actionName.contains("REFUND") || actionName.contains("PAYMENT")) {
            return "PAYMENT";
        }
        return "GENERAL";
    }

    private String extractTargetIdFromResult(Object result) {
        try {
            Method mCode = result.getClass().getMethod("getBookingCode");
            Object code = mCode.invoke(result);
            if (code != null) return code.toString();
        } catch (Exception ignored) {
        }
        try {
            Method mId = result.getClass().getMethod("getId");
            Object id = mId.invoke(result);
            if (id != null) return id.toString();
        } catch (Exception ignored) {
        }
        return null;
    }
}

