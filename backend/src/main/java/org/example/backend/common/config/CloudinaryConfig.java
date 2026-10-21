package org.example.backend.common.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

/**
 * Cấu hình kết nối Cloudinary Java SDK theo SRS §4.1.
 */
@Configuration
public class CloudinaryConfig {

    @Value("${cloudinary.cloud-name:demo_cloud}")
    private String cloudName;

    @Value("${cloudinary.api-key:demo_key}")
    private String apiKey;

    @Value("${cloudinary.api-secret:demo_secret}")
    private String apiSecret;

    @Bean
    public Cloudinary cloudinary() {
        Map<String, String> config = ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret,
                "secure", true
        );
        return new Cloudinary(config);
    }
}
