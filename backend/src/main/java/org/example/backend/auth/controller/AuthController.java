package org.example.backend.auth.controller;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.example.backend.auth.dto.AuthResponse;
import org.example.backend.auth.dto.LoginRequest;
import org.example.backend.auth.dto.RegisterRequest;
import org.example.backend.auth.service.AuthService;
import org.example.backend.common.response.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;

/**
 * REST Controller cho xác thực & quản lý tài khoản.
 * Endpoints theo SRS §11.2:
 * - POST /api/v1/auth/register  (Public)
 * - POST /api/v1/auth/login     (Public)
 * - POST /api/v1/auth/refresh   (Refresh cookie)
 * - POST /api/v1/auth/logout    (Đã đăng nhập)
 * - GET  /api/v1/auth/me        (Đã đăng nhập)
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final String REFRESH_COOKIE_NAME = "refreshToken";
    private static final int REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 ngày (giây)

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Đăng ký tài khoản Customer mới.
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletResponse response) {

        AuthResponse authResponse = authService.register(request);

        // Set refresh token vào HttpOnly cookie
        setRefreshCookie(response, authService.generateRefreshToken(request.getEmail()));

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Đăng ký thành công", authResponse));
    }

    /**
     * Đăng nhập, trả access token và đặt refresh token vào cookie.
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response) {

        AuthResponse authResponse = authService.login(request);

        // Set refresh token vào HttpOnly cookie
        setRefreshCookie(response, authService.generateRefreshToken(request.getEmail()));

        return ResponseEntity.ok(ApiResponse.ok("Đăng nhập thành công", authResponse));
    }

    /**
     * Cấp access token mới từ refresh cookie.
     */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            HttpServletRequest request,
            HttpServletResponse response) {

        String refreshToken = extractRefreshCookie(request);

        AuthResponse authResponse = authService.refreshToken(refreshToken);

        // Xoay vòng refresh token (sinh token mới)
        String email = authResponse.getUser().getEmail();
        setRefreshCookie(response, authService.generateRefreshToken(email));

        return ResponseEntity.ok(ApiResponse.ok("Token đã được làm mới", authResponse));
    }

    /**
     * Đăng xuất — xóa refresh cookie.
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletResponse response) {
        // Xóa cookie bằng cách set maxAge = 0
        Cookie cookie = new Cookie(REFRESH_COOKIE_NAME, "");
        cookie.setHttpOnly(true);
        cookie.setPath("/api/v1/auth");
        cookie.setMaxAge(0);
        response.addCookie(cookie);

        return ResponseEntity.ok(ApiResponse.ok("Đăng xuất thành công", null));
    }

    /**
     * Lấy thông tin tài khoản hiện tại (yêu cầu đăng nhập).
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AuthResponse.UserDto>> me(Authentication authentication) {
        AuthResponse.UserDto userDto = authService.getCurrentUser(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(userDto));
    }

    // ─── Cookie helpers ─────────────────────────────────────────────

    private void setRefreshCookie(HttpServletResponse response, String refreshToken) {
        Cookie cookie = new Cookie(REFRESH_COOKIE_NAME, refreshToken);
        cookie.setHttpOnly(true);
        cookie.setPath("/api/v1/auth");
        cookie.setMaxAge(REFRESH_COOKIE_MAX_AGE);
        // cookie.setSecure(true);    // Bật khi deploy HTTPS
        // cookie.setAttribute("SameSite", "Strict");
        response.addCookie(cookie);
    }

    private String extractRefreshCookie(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return null;
        }
        return Arrays.stream(request.getCookies())
                .filter(c -> REFRESH_COOKIE_NAME.equals(c.getName()))
                .findFirst()
                .map(Cookie::getValue)
                .orElse(null);
    }
}
