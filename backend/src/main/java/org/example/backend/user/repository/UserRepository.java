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

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    long countByRole(Role role);

    long countByIsActiveTrue();

    long countByIsActiveFalse();

    long countByRoleAndIsActiveTrue(Role role);

    @Query("""
            SELECT u FROM User u
            WHERE (:role IS NULL OR u.role = :role)
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
