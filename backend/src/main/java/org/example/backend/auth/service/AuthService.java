package org.example.backend.auth.service;

import org.example.backend.auth.dto.AuthResponse;
import org.example.backend.auth.dto.LoginRequest;
import org.example.backend.auth.dto.RegisterRequest;
import org.example.backend.auth.security.JwtProvider;
import org.example.backend.common.exception.AppException;
import org.example.backend.user.entity.Role;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service xử lý nghiệp vụ xác thực: đăng ký, đăng nhập, làm mới token.
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final AuthenticationManager authenticationManager;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtProvider jwtProvider,
                       AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtProvider = jwtProvider;
        this.authenticationManager = authenticationManager;
    }

    /**
     * Đăng ký tài khoản Customer mới.
     * - Email phải duy nhất
     * - Mật khẩu được mã hóa BCrypt
     * - Role mặc định: ROLE_CUSTOMER
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // Kiểm tra email đã tồn tại
        if (userRepository.existsByEmail(request.getEmail().trim().toLowerCase())) {
            throw new AppException(HttpStatus.CONFLICT, "Email đã được sử dụng");
        }

        // Tạo user mới
        User user = User.builder()
                .email(request.getEmail().trim().toLowerCase())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .phone(request.getPhone().trim())
                .role(Role.ROLE_CUSTOMER)
                .isActive(true)
                .build();

        user = userRepository.save(user);

        return buildAuthResponse(user);
    }

    /**
     * Đăng nhập — xác thực email/password, trả JWT tokens.
     */
    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getEmail().trim().toLowerCase(),
                            request.getPassword()
                    )
            );
        } catch (BadCredentialsException e) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không chính xác");
        }

        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Tài khoản không tồn tại"));

        if (!user.getIsActive()) {
            throw new AppException(HttpStatus.FORBIDDEN, "Tài khoản đã bị vô hiệu hóa");
        }

        return buildAuthResponse(user);
    }

    /**
     * Làm mới Access Token từ Refresh Token.
     */
    public AuthResponse refreshToken(String refreshToken) {
        if (refreshToken == null || !jwtProvider.validateToken(refreshToken)) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Refresh token không hợp lệ hoặc đã hết hạn");
        }

        String email = jwtProvider.getEmailFromToken(refreshToken);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Tài khoản không tồn tại"));

        return buildAuthResponse(user);
    }

    /**
     * Lấy thông tin user hiện tại từ email (đã xác thực qua JWT).
     */
    public AuthResponse.UserDto getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Tài khoản không tồn tại"));

        return toUserDto(user);
    }

    /**
     * Sinh Refresh Token (dùng cho cookie HttpOnly).
     */
    public String generateRefreshToken(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Tài khoản không tồn tại"));
        return jwtProvider.generateRefreshToken(user);
    }

    // ─── Private helpers ────────────────────────────────────────────

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtProvider.generateAccessToken(user);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .expiresIn(jwtProvider.getAccessExpirationSeconds())
                .user(toUserDto(user))
                .build();
    }

    private AuthResponse.UserDto toUserDto(User user) {
        return AuthResponse.UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .role(user.getRole().name())
                .build();
    }
}
