package org.example.backend.auth.repository;

import org.example.backend.auth.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    /**
     * Tìm bản ghi OTP mới nhất chưa được sử dụng của một địa chỉ email.
     */
    Optional<PasswordResetToken> findFirstByEmailAndIsUsedFalseOrderByCreatedAtDesc(String email);

    /**
     * Tìm bản ghi theo resetToken chưa được sử dụng.
     */
    Optional<PasswordResetToken> findByResetTokenAndIsUsedFalse(String resetToken);

    /**
     * Đếm số lần yêu cầu OTP của một email trong khoảng thời gian (dùng để rate limit).
     */
    @Query("SELECT COUNT(p) FROM PasswordResetToken p WHERE LOWER(p.email) = LOWER(:email) AND p.createdAt >= :afterTime")
    long countRecentRequests(@Param("email") String email, @Param("afterTime") LocalDateTime afterTime);
}
