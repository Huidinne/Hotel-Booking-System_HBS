package org.example.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.EnableAspectJAutoProxy;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

@SpringBootApplication
@EnableAspectJAutoProxy
public class BackendApplication {

    public static void main(String[] args) {
        loadDotenv();
        SpringApplication.run(BackendApplication.class, args);
    }

    /**
     * Tự động nạp các biến môi trường từ file .env vào System Properties nếu chưa được thiết lập.
     * Giúp hệ thống tự động nhận cấu hình Brevo SMTP, Gemini API,... khi chạy local hoặc trong IDE
     * mà không cần điền thẳng secret vào application.yaml (tránh bị GitHub Push Protection chặn).
     */
    private static void loadDotenv() {
        File[] candidates = new File[] {
                new File(".env"),
                new File("../.env"),
                new File("../../.env")
        };
        for (File envFile : candidates) {
            if (envFile.exists() && envFile.isFile()) {
                try (BufferedReader reader = new BufferedReader(new FileReader(envFile, StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        line = line.trim();
                        if (line.isEmpty() || line.startsWith("#")) {
                            continue;
                        }
                        int eqIdx = line.indexOf('=');
                        if (eqIdx > 0) {
                            String key = line.substring(0, eqIdx).trim();
                            String val = line.substring(eqIdx + 1).trim();
                            if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
                                val = val.substring(1, val.length() - 1);
                            }
                            if (System.getProperty(key) == null && System.getenv(key) == null) {
                                System.setProperty(key, val);
                            }
                        }
                    }
                } catch (IOException ignored) {
                }
                break;
            }
        }
    }

}
