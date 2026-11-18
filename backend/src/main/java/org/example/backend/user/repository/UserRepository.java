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
     * Điều kiện lọc chỉ giữ lại các tài khoản thật:
     * - Luôn hiển thị tài khoản nội bộ (ROLE_ADMIN, ROLE_RECEPTIONIST).
     * - Với ROLE_CUSTOMER: tự động ẩn các tài khoản rác sinh từ Load Test / Concurrency Test / E2E / Postman / Test thủ công
     *   (@example.com, @test.com, mp_*, concurrency_user*, e2e_*, smoke_*, postman_*, load*, stress*, jmeter*, test*, dummy*, fake*).
     */
    String REAL_USER_PREDICATE = """
            (u.role <> org.example.backend.user.entity.Role.ROLE_CUSTOMER OR (
                LOWER(u.email) NOT LIKE '%@example.com'
                AND LOWER(u.email) NOT LIKE '%@example.org'
                AND LOWER(u.email) NOT LIKE '%@test.com'
                AND LOWER(u.email) NOT LIKE '%@test.local'
                AND LOWER(u.email) NOT LIKE '%@fake.com'
                AND LOWER(u.email) NOT LIKE '%@dummy.com'
                AND LOCATE('mp_', LOWER(u.email)) <> 1
                AND LOCATE('concurrency_user', LOWER(u.email)) <> 1
                AND LOCATE('e2e_', LOWER(u.email)) <> 1
                AND LOCATE('smoke_', LOWER(u.email)) <> 1
                AND LOCATE('postman_', LOWER(u.email)) <> 1
                AND LOCATE('loadtest', LOWER(u.email)) <> 1
                AND LOCATE('load_', LOWER(u.email)) <> 1
                AND LOCATE('stress_', LOWER(u.email)) <> 1
                AND LOCATE('jmeter', LOWER(u.email)) <> 1
                AND LOCATE('perf_', LOWER(u.email)) <> 1
                AND LOCATE('qa_', LOWER(u.email)) <> 1
                AND LOCATE('test', LOWER(u.email)) <> 1
                AND LOCATE('_test', LOWER(u.email)) = 0
                AND LOCATE('test_', LOWER(u.email)) = 0
                AND LOCATE('+test', LOWER(u.email)) = 0
                AND LOCATE('dummy', LOWER(u.email)) <> 1
                AND LOCATE('fake', LOWER(u.email)) <> 1
                AND LOCATE('mpload', LOWER(u.fullName)) <> 1
                AND LOCATE('tester', LOWER(u.fullName)) <> 1
                AND LOCATE('test ', LOWER(u.fullName)) <> 1
                AND LOWER(u.fullName) <> 'test'
                AND LOCATE('postman', LOWER(u.fullName)) <> 1
                AND LOCATE('e2e', LOWER(u.fullName)) <> 1
                AND LOCATE('smoke', LOWER(u.fullName)) <> 1
                AND LOCATE('load', LOWER(u.fullName)) <> 1
                AND LOCATE('stress', LOWER(u.fullName)) <> 1
                AND LOCATE('jmeter', LOWER(u.fullName)) <> 1
                AND LOCATE('dummy', LOWER(u.fullName)) <> 1
                AND LOCATE('fake', LOWER(u.fullName)) <> 1
            ))
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
