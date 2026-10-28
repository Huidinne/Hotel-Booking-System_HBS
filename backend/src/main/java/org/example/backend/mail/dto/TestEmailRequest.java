package org.example.backend.mail.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestEmailRequest {

    @NotBlank(message = "Email người nhận không được để trống")
    @Email(message = "Định dạng email không hợp lệ")
    private String to;

    private String subject;

    private String message;

    private boolean withAttachment;
}
