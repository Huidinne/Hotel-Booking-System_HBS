package org.example.backend.chat;

import org.example.backend.chat.prompt.HotelPromptManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HotelPromptManagerTest {

    private final HotelPromptManager promptManager = new HotelPromptManager();

    @Test
    @DisplayName("System Prompt chứa đầy đủ 50% cọc VNPay, mốc hủy 14:00, buffet sáng và các loại phòng")
    void testSystemPrompt_ContainsRequiredBusinessInformation() {
        String prompt = promptManager.getSystemPrompt();

        assertThat(prompt).isNotBlank();
        // Thông tin khách sạn
        assertThat(prompt).contains("Grand Aurora Luxury Hotel");
        assertThat(prompt).contains("Đà Nẵng");
        assertThat(prompt).contains("01 Võ Nguyên Giáp");

        // Các hạng phòng & giá
        assertThat(prompt).contains("Standard Single Room");
        assertThat(prompt).contains("500.000 VNĐ");
        assertThat(prompt).contains("Deluxe Double Room");
        assertThat(prompt).contains("950.000 VNĐ");
        assertThat(prompt).contains("Executive Suite Luxury");
        assertThat(prompt).contains("1.800.000 VNĐ");

        // Tiện ích & buffet
        assertThat(prompt).contains("Buffet");
        assertThat(prompt).contains("06:30 - 09:30");
        assertThat(prompt).contains("hồ bơi vô cực");

        // Cọc 50% VNPay
        assertThat(prompt).contains("50%");
        assertThat(prompt).contains("VNPay");

        // Mốc hủy 14:00
        assertThat(prompt).contains("14:00");
        assertThat(prompt).contains("24 giờ");
        assertThat(prompt).contains("12 giờ");
    }

    @Test
    @DisplayName("Guardrails: Nhận diện chính xác câu hỏi ngoài phạm vi (code, toán, chính trị)")
    void testIsOutOfScope_DetectsOutOfScopeRequests() {
        assertThat(promptManager.isOutOfScope("Viết code Python giải phương trình bậc 2")).isTrue();
        assertThat(promptManager.isOutOfScope("Cho tôi hàm javascript tính fibonacci")).isTrue();
        assertThat(promptManager.isOutOfScope("Tình hình bầu cử chính trị thế giới thế nào?")).isTrue();
        assertThat(promptManager.isOutOfScope("Viết cho tôi một bài thơ tình lãng mạn")).isTrue();

        // Câu hỏi trong phạm vi khách sạn
        assertThat(promptManager.isOutOfScope("Khách sạn có những hạng phòng nào?")).isFalse();
        assertThat(promptManager.isOutOfScope("Mấy giờ nhận phòng và check-out?")).isFalse();
        assertThat(promptManager.isOutOfScope("Chính sách hủy phòng và đặt cọc VNPay thế nào?")).isFalse();
        assertThat(promptManager.isOutOfScope("Tiền phòng có gồm ăn sáng buffet không?")).isFalse();
    }
}

