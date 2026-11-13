package org.example.backend.common.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.example.backend.auth.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.IpAddressMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Spring Security cấu hình chính:
 * - Stateless JWT (không dùng session)
 * - CSRF disabled (REST API)
 * - CORS cho frontend localhost:5173
 * - Phân quyền endpoint theo SRS §11.7
 * - @PreAuthorize enabled cho method-level security
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        // Trả 401 JSON khi request đến endpoint yêu cầu auth mà không có/sai token
                        .authenticationEntryPoint(jwtAuthenticationEntryPoint())
                )
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints
                        .requestMatchers("/api/v1/auth/register", "/api/v1/auth/login",
                                "/api/v1/auth/refresh").permitAll()
                        .requestMatchers("/api/v1/health", "/error").permitAll()

                        // [SP1-OPS-02] Chỉ mở công khai Actuator Health Check
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        // [SP3-1111] Prometheus endpoint chỉ cho phép scrape nội bộ (Docker/localhost) hoặc ROLE_ADMIN
                        .requestMatchers("/actuator/prometheus").access(prometheusAccessManager())
                        // Các endpoint actuator còn lại (/actuator/info, /actuator/metrics) bảo mật yêu cầu xác thực
                        .requestMatchers("/actuator/**").authenticated()

                        .requestMatchers("/api/v1/test/email/**").permitAll()
                        .requestMatchers("/api/v1/chat/booking/confirm").authenticated()
                        .requestMatchers("/api/v1/chat/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/room-types/**").permitAll()

                        // Hóa đơn demo cho phép xem kiểm thử không cần đăng nhập
                        .requestMatchers(HttpMethod.GET,
                                "/api/v1/bookings/BK-DEMO-2026/invoice-pdf",
                                "/api/v1/bookings/code/BK-DEMO-2026/invoice-pdf").permitAll()

                        // Swagger / OpenAPI documentation
                        .requestMatchers("/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html").permitAll()

                        // Quản lý & Xác nhận giao dịch thanh toán VietQR (Admin & Receptionist)
                        .requestMatchers("/api/v1/admin/payments/**").hasAnyRole("ADMIN", "RECEPTIONIST")

                        // Quản trị viên hệ thống (Admin Only)
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")

                        // Tất cả request khác yêu cầu đăng nhập
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    /**
     * Custom AuthenticationEntryPoint: trả 401 JSON thay vì redirect hay 403.
     * Được gọi khi request đến endpoint protected mà không có / sai Bearer token.
     */
    @Bean
    public AuthenticationEntryPoint jwtAuthenticationEntryPoint() {
        return (request, response, authException) -> {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");

            Map<String, Object> body = Map.of(
                    "timestamp", LocalDateTime.now().toString(),
                    "status", 401,
                    "error", "Unauthorized",
                    "message", "Bạn cần đăng nhập để truy cập tài nguyên này",
                    "path", request.getRequestURI()
            );

            new ObjectMapper().writeValue(response.getWriter(), body);
        };
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173", "http://localhost:5174", "http://localhost", "http://127.0.0.1:5173", "http://127.0.0.1:5174"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With"));
        config.setAllowCredentials(true); // Cho phép gửi cookie (refresh token)
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    private static final List<IpAddressMatcher> INTERNAL_NETWORK_MATCHERS = List.of(
            new IpAddressMatcher("172.16.0.0/12"),
            new IpAddressMatcher("10.0.0.0/8"),
            new IpAddressMatcher("192.168.0.0/16")
    );

    private static final List<IpAddressMatcher> LOOPBACK_MATCHERS = List.of(
            new IpAddressMatcher("127.0.0.1/32"),
            new IpAddressMatcher("::1/128")
    );

    private static final List<String> INTERNAL_SCRAPE_HOSTS = List.of(
            "backend", "hotel-backend", "localhost", "127.0.0.1"
    );

    /**
     * Chỉ cho phép truy cập /actuator/prometheus nếu là ROLE_ADMIN đã xác thực
     * hoặc request scrape nội bộ trực tiếp từ mạng Docker / localhost (không qua proxy công khai).
     */
    private AuthorizationManager<RequestAuthorizationContext> prometheusAccessManager() {
        return (authenticationSupplier, context) -> {
            Authentication authentication = authenticationSupplier.get();
            if (authentication != null
                    && authentication.isAuthenticated()
                    && !(authentication instanceof AnonymousAuthenticationToken)) {
                boolean isAdmin = authentication.getAuthorities().stream()
                        .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
                return new AuthorizationDecision(isAdmin);
            }
            return new AuthorizationDecision(isInternalPrometheusScrape(context.getRequest()));
        };
    }

    private boolean isInternalPrometheusScrape(HttpServletRequest request) {
        // Không tin cậy request đi qua reverse proxy hoặc từ bên ngoài chuyển tiếp vào
        if (request.getHeader("X-Forwarded-For") != null
                || request.getHeader("Forwarded") != null
                || request.getHeader("X-Real-IP") != null) {
            return false;
        }

        String hostHeader = request.getHeader("Host");
        if (hostHeader == null || hostHeader.isBlank()) {
            return false;
        }
        String hostWithoutPort = hostHeader.trim().toLowerCase().split(":")[0];

        if (LOOPBACK_MATCHERS.stream().anyMatch(m -> m.matches(request))) {
            return INTERNAL_SCRAPE_HOSTS.contains(hostWithoutPort);
        }

        String remoteAddr = request.getRemoteAddr();
        boolean isInternalContainerIp = INTERNAL_NETWORK_MATCHERS.stream().anyMatch(m -> m.matches(request))
                && remoteAddr != null
                && !remoteAddr.endsWith(".1");

        return isInternalContainerIp
                && ("backend".equals(hostWithoutPort) || "hotel-backend".equals(hostWithoutPort));
    }
}
