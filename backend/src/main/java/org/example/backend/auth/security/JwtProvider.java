package org.example.backend.auth.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.example.backend.user.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

/**
 * JWT token provider — sinh và xác thực Access Token & Refresh Token.
 * Sử dụng thuật toán HS256 (HMAC-SHA256) với secret key từ application.yaml.
 */
@Component
public class JwtProvider {

    private final SecretKey secretKey;
    private final long accessExpirationMs;
    private final long refreshExpirationMs;

    public JwtProvider(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-expiration-ms}") long accessExpirationMs,
            @Value("${app.jwt.refresh-expiration-ms}") long refreshExpirationMs) {
        this.secretKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
        this.accessExpirationMs = accessExpirationMs;
        this.refreshExpirationMs = refreshExpirationMs;
    }

    /**
     * Sinh Access Token chứa email, role, userId.
     * Thời hạn: 30 phút (cấu hình qua app.jwt.access-expiration-ms).
     */
    public String generateAccessToken(User user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + accessExpirationMs);

        return Jwts.builder()
                .subject(user.getEmail())
                .claim("role", user.getRole().name())
                .claim("userId", user.getId())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(secretKey)
                .compact();
    }

    /**
     * Sinh Refresh Token — chỉ chứa email, dùng để cấp lại Access Token.
     * Thời hạn: 7 ngày (cấu hình qua app.jwt.refresh-expiration-ms).
     */
    public String generateRefreshToken(User user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + refreshExpirationMs);

        return Jwts.builder()
                .subject(user.getEmail())
                .claim("type", "refresh")
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(secretKey)
                .compact();
    }

    /** Lấy email từ token (subject claim) */
    public String getEmailFromToken(String token) {
        return parseClaims(token).getPayload().getSubject();
    }

    /** Lấy thời gian hết hạn Access Token (tính bằng giây) */
    public long getAccessExpirationSeconds() {
        return accessExpirationMs / 1000;
    }

    /**
     * Xác thực token: chữ ký hợp lệ, chưa hết hạn.
     * @return true nếu token hợp lệ
     */
    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Jws<Claims> parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token);
    }
}
