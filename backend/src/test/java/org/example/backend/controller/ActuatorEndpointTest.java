package org.example.backend.controller;

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
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Kiểm thử Spring Boot Actuator theo yêu cầu task [SP1-OPS-02]:
 * 1. /actuator/health công khai không cần token, trả về UP cho tổng thể, db và diskSpace.
 * 2. /actuator/info và /actuator/metrics bị chặn khi không có token (401 Unauthorized).
 * 3. /actuator/metrics cho phép truy cập khi đã đăng nhập (200 OK).
 */
@SpringBootTest
@AutoConfigureMockMvc
class ActuatorEndpointTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtProvider jwtProvider;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String userToken;

    @BeforeEach
    void setUp() {
        User user = userRepository.findByEmail("actuator_tester@hotel.com")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("actuator_tester@hotel.com")
                        .password(passwordEncoder.encode("Pass@123"))
                        .fullName("Actuator Tester")
                        .phone("0909999999")
                        .role(Role.ROLE_ADMIN)
                        .build()));

        userToken = jwtProvider.generateAccessToken(user);
    }

    @Test
    @DisplayName("[SP1-OPS-02] /actuator/health công khai không cần token, trả về status UP, db UP và diskSpace UP")
    void shouldReturnHealthStatusUpWithDbAndDiskSpace() throws Exception {
        mockMvc.perform(get("/actuator/health")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.components.db.status").value("UP"))
                .andExpect(jsonPath("$.components.diskSpace.status").value("UP"));
    }

    @Test
    @DisplayName("[SP1-OPS-02] /actuator/info không có token phải trả về 401 Unauthorized")
    void shouldBlockInfoWithoutToken() throws Exception {
        mockMvc.perform(get("/actuator/info")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("[SP1-OPS-02] /actuator/metrics không có token phải trả về 401 Unauthorized")
    void shouldBlockMetricsWithoutToken() throws Exception {
        mockMvc.perform(get("/actuator/metrics")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("[SP1-OPS-02] /actuator/metrics có token xác thực phải trả về 200 OK")
    void shouldAllowMetricsWithToken() throws Exception {
        mockMvc.perform(get("/actuator/metrics")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.names").isArray());
    }
}
