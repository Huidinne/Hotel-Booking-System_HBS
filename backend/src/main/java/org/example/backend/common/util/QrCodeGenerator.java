package org.example.backend.common.util;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import lombok.extern.slf4j.Slf4j;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * Tiện ích sinh mã QR Code độ phân giải cao phục vụ hóa đơn PDF và Email HTML:
 * - Sử dụng thư viện Google ZXing.
 * - Hỗ trợ xuất byte[] PNG và Base64 Data URI (nhúng trực tiếp vào <img> tag).
 */
@Slf4j
public class QrCodeGenerator {

    private QrCodeGenerator() {
        // Utility class
    }

    /**
     * Sinh mã QR dưới dạng mảng byte PNG.
     *
     * @param content Nội dung cần mã hóa (URL, text, JSON)
     * @param width   Chiều rộng (pixel)
     * @param height  Chiều cao (pixel)
     * @return Mảng byte của ảnh PNG
     */
    public static byte[] generateQrCodePng(String content, int width, int height) {
        try {
            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
            hints.put(EncodeHintType.CHARACTER_SET, StandardCharsets.UTF_8.name());
            hints.put(EncodeHintType.MARGIN, 1);

            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(content, BarcodeFormat.QR_CODE, width, height, hints);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Lỗi khi sinh mã QR cho nội dung [{}]: {}", content, e.getMessage(), e);
            return new byte[0];
        }
    }

    /**
     * Sinh mã QR dưới dạng chuỗi Base64 Data URI để nhúng trực tiếp vào thẻ HTML <img>:
     * vd: "data:image/png;base64,iVBORw0KGgo..."
     */
    public static String generateQrCodeBase64(String content, int width, int height) {
        byte[] pngBytes = generateQrCodePng(content, width, height);
        if (pngBytes.length == 0) {
            return "";
        }
        return "data:image/png;base64," + Base64.getEncoder().encodeToString(pngBytes);
    }
}

