package org.example.backend.audit.annotation;

import org.example.backend.audit.entity.AuditAction;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation đánh dấu phương thức nghiệp vụ cần ghi log vết tự động qua Spring AOP.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Auditable {

    /**
     * Hành động kiểm toán (bắt buộc)
     */
    AuditAction action();

    /**
     * Loại đối tượng tác động (mặc định suy luận từ nghiệp vụ: BOOKING, ROOM, ROOM_TYPE, v.v.)
     */
    String targetType() default "";

    /**
     * Mô tả tóm tắt hành động
     */
    String description() default "";
}

