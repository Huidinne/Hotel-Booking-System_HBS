package org.example.backend.user.repository;

import org.example.backend.user.entity.Role;
import org.example.backend.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Điều kiện lọc bỏ các tài khoản rác sinh tự động từ Load Test / Concurrency Test / E2E Test
     * (MpLoad / @example.com / concurrency_user* / e2e_* / smoke_*).
     */
    String REAL_USER_PREDICATE = """
            LOWER(u.email) NOT LIKE '%@example.com'
            AND LOCATE('mp_', LOWER(u.email)) <> 1
            AND LOCATE('concurrency_user', LOWER(u.email)) <> 1
            AND LOCATE('e2e_', LOWER(u.email)) <> 1
            AND LOCATE('smoke_', LOWER(u.email)) <> 1
            AND LOCATE('loadtest', LOWER(u.email)) <> 1
            AND LOCATE('mpload', LOWER(u.fullName)) <> 1
            AND LOCATE('tester concurrency', LOWER(u.fullName)) <> 1
            """;

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    long countByRoleAndIsActiveTrue(Role role);

    @Query("SELECT COUNT(u) FROM User u WHERE " + REAL_USER_PREDICATE)
    long countRealUsers();

    @Query("SELECT COUNT(u) FROM User u WHERE u.isActive = true AND " + REAL_USER_PREDICATE)
    long countActiveRealUsers();

    @Query("SELECT COUNT(u) FROM User u WHERE u.isActive = false AND " + REAL_USER_PREDICATE)
    long countLockedRealUsers();

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role AND " + REAL_USER_PREDICATE)
    long countRealUsersByRole(@Param("role") Role role);

    @Query("SELECT u FROM User u WHERE " + REAL_USER_PREDICATE + """
              AND (:role IS NULL OR u.role = :role)
              AND (:isActive IS NULL OR u.isActive = :isActive)
              AND (:keyword IS NULL OR :keyword = ''
                   OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(u.phone) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """)
    Page<User> searchAdminUsers(@Param("keyword") String keyword,
                                @Param("role") Role role,
                                @Param("isActive") Boolean isActive,
                                Pageable pageable);
}
