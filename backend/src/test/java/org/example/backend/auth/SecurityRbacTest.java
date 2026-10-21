package org.example.backend.auth;

import org.example.backend.auth.security.JwtProvider;
import org.example.backend.user.entity.Role;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiểm thử phân quyền RBAC theo ma trận SRS §11.7:
 * - CUSTOMER không được truy cập endpoint RECEPTIONIST hoặc ADMIN (403 Forbidden)
 * - RECEPTIONIST không được truy cập endpoint ADMIN (403 Forbidden)
 * - Không có token truy cập endpoint yêu cầu auth nhận 401 Unauthorized
 */
@SpringBootTest
@AutoConfigureMockMvc
class SecurityRbacTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtProvider jwtProvider;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String customerToken;
    private String receptionistToken;
    private String adminToken;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        User customer = userRepository.save(User.builder()
                .email("cust_rbac@hotel.com")
                .password(passwordEncoder.encode("Pass@123"))
                .fullName("Customer User")
                .phone("0901111111")
                .role(Role.ROLE_CUSTOMER)
                .build());

        User receptionist = userRepository.save(User.builder()
                .email("recep_rbac@hotel.com")
                .password(passwordEncoder.encode("Pass@123"))
                .fullName("Receptionist User")
                .phone("0902222222")
                .role(Role.ROLE_RECEPTIONIST)
                .build());

        User admin = userRepository.save(User.builder()
                .email("admin_rbac@hotel.com")
                .password(passwordEncoder.encode("Pass@123"))
                .fullName("Admin User")
                .phone("0903333333")
                .role(Role.ROLE_ADMIN)
                .build());

        customerToken = jwtProvider.generateAccessToken(customer);
        receptionistToken = jwtProvider.generateAccessToken(receptionist);
        adminToken = jwtProvider.generateAccessToken(admin);
    }

    @Test
    @DisplayName("CUSTOMER truy cập endpoint Lễ tân (/receptionist/bookings) → 403 Forbidden")
    void testCustomerCannotAccessReceptionistEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/receptionist/bookings")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("CUSTOMER truy cập endpoint Admin (/admin/dashboard/summary) → 403 Forbidden")
    void testCustomerCannotAccessAdminEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/admin/dashboard/summary")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("RECEPTIONIST truy cập endpoint Admin (/admin/dashboard/summary) → 403 Forbidden")
    void testReceptionistCannotAccessAdminEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/admin/dashboard/summary")
                        .header("Authorization", "Bearer " + receptionistToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("RECEPTIONIST truy cập endpoint Lễ tân (/receptionist/bookings) → 200 OK")
    void testReceptionistCanAccessReceptionistEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/receptionist/bookings")
                        .header("Authorization", "Bearer " + receptionistToken))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ADMIN truy cập endpoint Admin Dashboard → 200 OK")
    void testAdminCanAccessAdminDashboard() throws Exception {
        mockMvc.perform(get("/api/v1/admin/dashboard/summary")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").exists());
    }

    @Test
    @DisplayName("Chưa đăng nhập truy cập endpoint bảo vệ (/bookings/my-bookings) → 401 Unauthorized JSON")
    void testUnauthenticatedAccessReturns401Json() throws Exception {
        mockMvc.perform(get("/api/v1/bookings/my-bookings"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }
}
