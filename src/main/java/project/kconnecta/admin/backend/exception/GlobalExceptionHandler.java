package project.kconnecta.admin.backend.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "timestamp", LocalDateTime.now().toString(),
                "status", 404,
                "error", "Not Found",
                "message", ex.getMessage()
        ));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String message = "Invalid value for parameter '" + ex.getName() + "'";
        if (ex.getRequiredType() != null && ex.getRequiredType().equals(java.util.UUID.class)) {
            message = "Invalid user id: expected UUID format";
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "timestamp", LocalDateTime.now().toString(),
                "status", 400,
                "error", "Bad Request",
                "message", message
        ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .findFirst()
                .orElse("Validation failed");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "timestamp", LocalDateTime.now().toString(),
                "status", 400,
                "error", "Bad Request",
                "message", message
        ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "timestamp", LocalDateTime.now().toString(),
                "status", 400,
                "error", "Bad Request",
                "message", ex.getMessage()
        ));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException ex) {
        int status = ex.getStatusCode().value();
        String reason = ex.getReason() != null ? ex.getReason() : HttpStatus.valueOf(status).getReasonPhrase();
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of(
                "timestamp", LocalDateTime.now().toString(),
                "status", status,
                "error", HttpStatus.valueOf(status).getReasonPhrase(),
                "message", reason
        ));
    }

    // User backend returned an error status (4xx/5xx) on an internal call.
    @ExceptionHandler(RestClientResponseException.class)
    public ResponseEntity<Map<String, Object>> handleUpstreamError(RestClientResponseException ex) {
        int upstream = ex.getStatusCode().value();
        String body = ex.getResponseBodyAsString();
        log.error("User backend call failed: status={} body={}", upstream, truncateForLog(body), ex);
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
                "timestamp", LocalDateTime.now().toString(),
                "status", 502,
                "error", "Bad Gateway",
                "message", describeUpstreamFailure(upstream, body)
        ));
    }

    // Could not reach the User backend at all (wrong USER_SERVICE_URL, service down, timeout).
    @ExceptionHandler(ResourceAccessException.class)
    public ResponseEntity<Map<String, Object>> handleUpstreamUnreachable(ResourceAccessException ex) {
        log.error("User backend unreachable: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
                "timestamp", LocalDateTime.now().toString(),
                "status", 502,
                "error", "Bad Gateway",
                "message", "Không gọi được User backend: " + ex.getMessage()
        ));
    }

    // Fallback 500 — never expose internal exception messages to clients
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex) {
        if (isClientDisconnect(ex)) {
            log.debug("Client disconnected before the response was completed: {}", ex.getMessage());
            return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
        }

        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "timestamp", LocalDateTime.now().toString(),
                "status", 500,
                "error", "Internal Server Error",
                "message", "An internal server error occurred"
        ));
    }

    private boolean isClientDisconnect(Throwable ex) {
        Throwable current = ex;
        while (current != null) {
            if (current instanceof IOException) {
                String message = String.valueOf(current.getMessage()).toLowerCase(java.util.Locale.ROOT);
                if (message.contains("aborted")
                        || message.contains("broken pipe")
                        || message.contains("connection reset")
                        || message.contains("forcibly closed")) {
                    return true;
                }
            }
            current = current.getCause();
        }
        return false;
    }

    private static String describeUpstreamFailure(int upstreamStatus, String body) {
        String normalized = body == null ? "" : body.toLowerCase(java.util.Locale.ROOT);
        if (upstreamStatus == 503 && normalized.contains("service suspended")) {
            return "User backend trên Render đang bị tạm dừng (Service Suspended). "
                    + "Vào Render Dashboard → resume service user-kconnecta, hoặc đặt USER_SERVICE_URL=http://localhost:8080 khi chạy local.";
        }
        if (upstreamStatus == 503) {
            return "User backend không khả dụng (HTTP 503). Kiểm tra Render hoặc USER_SERVICE_URL.";
        }
        if (body == null || body.isBlank()) {
            return "User backend trả về HTTP " + upstreamStatus + " (không có nội dung phản hồi).";
        }
        if (normalized.contains("<html")) {
            return "User backend trả về HTTP " + upstreamStatus + " (phản hồi HTML — thường là service down/suspended trên hosting).";
        }
        String trimmed = body.length() > 300 ? body.substring(0, 300) + "…" : body;
        return "User backend trả về HTTP " + upstreamStatus + ": " + trimmed;
    }

    private static String truncateForLog(String body) {
        if (body == null || body.isBlank()) {
            return "(no body)";
        }
        return body.length() > 500 ? body.substring(0, 500) + "…" : body;
    }
}
