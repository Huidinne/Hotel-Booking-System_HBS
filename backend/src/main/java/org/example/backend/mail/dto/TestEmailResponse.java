package org.example.backend.mail.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestEmailResponse {

    private String status;
    private String message;
    private String recipient;
    private long executionTimeMs;
    private String httpThread;
    private boolean nonBlocking;
}
