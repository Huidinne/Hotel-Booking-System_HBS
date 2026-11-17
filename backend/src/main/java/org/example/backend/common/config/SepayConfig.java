package org.example.backend.common.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Cấu hình kết nối và bảo mật Webhook từ cổng thanh toán SePay.
 */
@Configuration
@ConfigurationProperties(prefix = "sepay")
@Getter
@Setter
public class SepayConfig {

    /** Khóa bí mật API Key xác thực Webhook gửi từ SePay (Authorization: Apikey <key>) */
    private String webhookApiKey = "hbs_sepay_secret_key_2026";
}
