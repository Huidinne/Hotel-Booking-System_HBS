package org.example.backend.audit.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.TextNode;

import java.util.Iterator;
import java.util.Map;
import java.util.Set;

/**
 * Tiện ích làm sạch dữ liệu nhạy cảm trước khi lưu vào Audit Log (Security Whitelist & Masking).
 * Tiêu chí: Tuyệt đối không lưu token, mật khẩu hay số tài khoản đầy đủ.
 */
public class AuditLogSecuritySanitizer {

    private static final Set<String> SENSITIVE_BLACK_LIST = Set.of(
            "password", "rawpassword", "newpassword", "oldpassword",
            "token", "accesstoken", "refreshtoken", "jwt",
            "secret", "apikey", "pin", "cvv", "vnp_hashsecret"
    );

    private static final Set<String> BANK_ACCOUNT_FIELDS = Set.of(
            "accountnumber", "bankaccountnumber", "cardnumber"
    );

    private static final Set<String> CITIZEN_ID_FIELDS = Set.of(
            "citizenid", "idcard", "nationalid", "passportnumber"
    );

    /**
     * Làm sạch đối tượng bất kỳ thành chuỗi JSON đã mask dữ liệu nhạy cảm.
     */
    public static String sanitizeToJson(Object object, ObjectMapper objectMapper) {
        if (object == null) {
            return null;
        }
        try {
            JsonNode tree = objectMapper.valueToTree(object);
            JsonNode sanitized = sanitizeNode(tree);
            return objectMapper.writeValueAsString(sanitized);
        } catch (Exception e) {
            return "{\"warning\": \"Could not serialize audit data safely\"}";
        }
    }

    private static JsonNode sanitizeNode(JsonNode node) {
        if (node == null) return null;

        if (node.isObject()) {
            ObjectNode objectNode = (ObjectNode) node;
            Iterator<Map.Entry<String, JsonNode>> fields = objectNode.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                String fieldName = entry.getKey().toLowerCase().replace("_", "").replace("-", "");
                JsonNode child = entry.getValue();

                if (SENSITIVE_BLACK_LIST.contains(fieldName)) {
                    entry.setValue(new TextNode("[REDACTED]"));
                } else if (BANK_ACCOUNT_FIELDS.contains(fieldName) && child.isTextual()) {
                    entry.setValue(new TextNode(maskBankAccount(child.asText())));
                } else if (CITIZEN_ID_FIELDS.contains(fieldName) && child.isTextual()) {
                    entry.setValue(new TextNode(maskCitizenId(child.asText())));
                } else if (child.isContainerNode()) {
                    sanitizeNode(child);
                }
            }
            return objectNode;
        } else if (node.isArray()) {
            ArrayNode arrayNode = (ArrayNode) node;
            for (int i = 0; i < arrayNode.size(); i++) {
                sanitizeNode(arrayNode.get(i));
            }
            return arrayNode;
        }
        return node;
    }

    /**
     * Che số tài khoản ngân hàng, chỉ hiển thị tối đa 4 chữ số cuối.
     * Ví dụ: "0123456789" -> "******6789"
     */
    public static String maskBankAccount(String accountNumber) {
        if (accountNumber == null || accountNumber.isBlank()) {
            return accountNumber;
        }
        String trimmed = accountNumber.trim();
        int len = trimmed.length();
        if (len <= 4) {
            return "****";
        }
        String last4 = trimmed.substring(len - 4);
        return "*".repeat(Math.max(4, len - 4)) + last4;
    }

    /**
     * Che số CCCD/CMND, chỉ hiển thị tối đa 3 chữ số cuối.
     */
    public static String maskCitizenId(String citizenId) {
        if (citizenId == null || citizenId.isBlank()) {
            return citizenId;
        }
        String trimmed = citizenId.trim();
        int len = trimmed.length();
        if (len <= 3) {
            return "***";
        }
        return "*".repeat(len - 3) + trimmed.substring(len - 3);
    }
}

