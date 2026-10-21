package org.example.backend.payment.util;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Utility băm chữ ký điện tử HMAC-SHA512 và xử lý URL tham số theo đặc tả VNPay v2.1.0.
 */
public class VnPayUtil {

    private VnPayUtil() {}

    /**
     * Băm dữ liệu bằng thuật toán HMAC-SHA512.
     *
     * @param key  Khóa bí mật (vnp_HashSecret)
     * @param data Chuỗi dữ liệu cần băm (hashData)
     * @return Chuỗi Hex chữ hoa
     */
    public static String hmacSHA512(String key, String data) {
        try {
            if (key == null || data == null) {
                throw new IllegalArgumentException("Key và data không được null");
            }
            Mac hmac512 = Mac.getInstance("HmacSHA512");
            SecretKeySpec secretKey = new SecretKeySpec(
                    key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
            hmac512.init(secretKey);
            byte[] result = hmac512.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(2 * result.length);
            for (byte b : result) {
                sb.append(String.format("%02x", b & 0xff));
            }
            return sb.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("Lỗi khi tạo chữ ký HMAC-SHA512: " + ex.getMessage(), ex);
        }
    }

    /**
     * Sắp xếp và nối chuỗi tham số để tạo hashData và queryString.
     */
    public static String buildHashData(Map<String, String> params) {
        List<String> fieldNames = new ArrayList<>(params.keySet());
        Collections.sort(fieldNames);

        StringBuilder hashData = new StringBuilder();
        Iterator<String> itr = fieldNames.iterator();
        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = params.get(fieldName);
            if (fieldValue != null && !fieldValue.isEmpty()) {
                hashData.append(fieldName);
                hashData.append('=');
                hashData.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII));
                if (itr.hasNext()) {
                    hashData.append('&');
                }
            }
        }
        return hashData.toString();
    }

    /**
     * Xác thực chữ ký trả về từ VNPay (IPN / Return).
     */
    public static boolean verifySignature(Map<String, String> fields, String secretKey) {
        String vnpSecureHash = fields.get("vnp_SecureHash");
        if (vnpSecureHash == null || vnpSecureHash.isEmpty()) {
            return false;
        }

        Map<String, String> checkFields = new HashMap<>(fields);
        checkFields.remove("vnp_SecureHash");
        checkFields.remove("vnp_SecureHashType");

        String hashData = buildHashData(checkFields);
        String calculatedHash = hmacSHA512(secretKey, hashData);

        return calculatedHash.equalsIgnoreCase(vnpSecureHash);
    }
}
