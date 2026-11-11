package org.example.backend.controller;

import org.example.backend.auth.security.JwtProvider;
import org.example.backend.user.entity.Role;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.actuate.observability.AutoConfigureObservability;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
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
@AutoConfigureObservability(tracing = false)
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

    @Test
    @DisplayName("[SP3-1111] /actuator/prometheus từ public IP / thiếu token phải trả về 401 Unauthorized")
    void shouldBlockPrometheusFromPublicHostWithoutToken() throws Exception {
        mockMvc.perform(get("/actuator/prometheus")
                        .with(request -> {
                            request.setRemoteAddr("203.0.113.10");
                            return request;
                        })
                        .header("Host", "221.121.4.97:8080"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("[SP3-1111] /actuator/prometheus qua Docker gateway (.1) dù giả mạo Host nội bộ vẫn bị chặn 401")
    void shouldBlockPrometheusFromBridgeGatewayEvenWithInternalHostHeader() throws Exception {
        mockMvc.perform(get("/actuator/prometheus")
                        .with(request -> {
                            request.setRemoteAddr("172.18.0.1");
                            return request;
                        })
                        .header("Host", "backend:8080"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("[SP3-1111] /actuator/prometheus cho phép Prometheus container trong Docker network nội bộ scrape 200 OK")
    void shouldAllowPrometheusFromInternalDockerContainer() throws Exception {
        mockMvc.perform(get("/actuator/prometheus")
                        .with(request -> {
                            request.setRemoteAddr("172.18.0.5");
                            return request;
                        })
                        .header("Host", "backend:8080"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("# HELP")));
    }

    @Test
    @DisplayName("[SP3-1111] /actuator/prometheus cho phép ROLE_ADMIN có token hợp lệ truy cập 200 OK")
    void shouldAllowPrometheusWithAdminToken() throws Exception {
        mockMvc.perform(get("/actuator/prometheus")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("jvm_")));
    }
}
