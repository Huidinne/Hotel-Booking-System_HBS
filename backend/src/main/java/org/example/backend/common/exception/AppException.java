package org.example.backend.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class AppException extends RuntimeException {
    private final HttpStatus status;

    public AppException(String message) {
        super(message);
        this.status = HttpStatus.BAD_REQUEST;
    }

    public AppException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }
}
