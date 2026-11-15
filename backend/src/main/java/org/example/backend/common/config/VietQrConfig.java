package org.example.backend.common.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Cấu hình thông tin tài khoản ngân hàng nhận tiền và chuẩn tạo mã VietQR từ application.yaml.
 */
@Configuration
@ConfigurationProperties(prefix = "vietqr")
@Getter
@Setter
public class VietQrConfig {

    /** Mã ngân hàng (ví dụ: ICB, MB, VCB, BIDV, TCB...) */
    private String bankCode;

    /** Số tài khoản nhận tiền */
    private String bankAccount;

    /** Tên chủ tài khoản nhận tiền */
    private String bankAccountName;

    /** Template hiển thị VietQR (compact2, compact, qr_only, print) */
    private String template = "compact2";

    /** Thời hạn thanh toán tính theo phút (mặc định 15 phút) */
    private int expireMinutes = 15;

    /**
     * Kiểm tra thông tin tài khoản ngân hàng đã được cấu hình đầy đủ hay chưa.
     */
    public boolean isConfigured() {
        return bankCode != null && !bankCode.isBlank()
                && bankAccount != null && !bankAccount.isBlank();
    }

    /**
     * Sinh URL hình ảnh mã QR theo chuẩn VietQR Quick Link (https://vietqr.io).
     * Cú pháp chuẩn: https://img.vietqr.io/image/<BANK_CODE>-<BANK_ACCOUNT>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<ADD_INFO>&accountName=<ACCOUNT_NAME>
     */
    public String generateQrUrl(BigDecimal amount, String addInfo) {
        if (!isConfigured()) {
            return null;
        }

        String safeTemplate = (template != null && !template.isBlank()) ? template.trim() : "compact2";
        long safeAmount = amount != null ? amount.longValue() : 0L;

        StringBuilder sb = new StringBuilder();
        sb.append("https://img.vietqr.io/image/")
                .append(bankCode.trim())
                .append("-")
                .append(bankAccount.trim())
                .append("-")
                .append(safeTemplate)
                .append(".png")
                .append("?amount=").append(safeAmount);

        if (addInfo != null && !addInfo.isBlank()) {
            sb.append("&addInfo=").append(URLEncoder.encode(addInfo.trim(), StandardCharsets.UTF_8));
        }

        if (bankAccountName != null && !bankAccountName.isBlank()) {
            sb.append("&accountName=").append(URLEncoder.encode(bankAccountName.trim(), StandardCharsets.UTF_8));
        }

        return sb.toString();
    }
}
