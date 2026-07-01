package project.kconnecta.admin.backend.integration;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.UUID;

/** Gọi User backend (internal API) — thu hồi phiên khi admin khóa tài khoản. */
@Component
@RequiredArgsConstructor
@Slf4j
public class UserBackendSessionClient {

    private final RestTemplate restTemplate;

    @Value("${user-service.url:http://localhost:8080}")
    private String userServiceUrl;

    @Value("${user-service.internal-key:kconnecta-internal-secret}")
    private String internalKey;

    public void revokeAllSessions(UUID userId) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Internal-Key", internalKey);
            restTemplate.exchange(
                    userServiceUrl + "/api/internal/users/" + userId + "/revoke-sessions",
                    HttpMethod.POST,
                    new HttpEntity<>(headers),
                    Void.class);
        } catch (Exception e) {
        }
    }
    public void sendResetPasswordEmail(UUID userId) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Internal-Key", internalKey);
            restTemplate.exchange(
                    userServiceUrl + "/api/internal/users/" + userId + "/send-reset-password-email",
                    HttpMethod.POST,
                    new HttpEntity<>(headers),
                    Void.class);
        } catch (Exception e) {
            log.warn("Could not send reset password email on user backend for userId={}: {}", userId, e.getMessage());
            throw new RuntimeException("Không thể gửi email đặt lại mật khẩu: " + e.getMessage());
        }
    }
}
