package project.kconnecta.admin.backend.feature.notification.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import project.kconnecta.admin.backend.entity.User;
import project.kconnecta.admin.backend.exception.ResourceNotFoundException;
import project.kconnecta.admin.backend.feature.user.repository.UserRepository;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationAdminServiceImpl implements NotificationAdminService {

    private final UserRepository userRepository;
    private final RestTemplate restTemplate;

    @Value("${user-service.url:http://localhost:8080}")
    private String userServiceUrl;

    @Value("${user-service.internal-key:kconnecta-internal-secret}")
    private String internalKey;

    @Override
    public void send(UUID accountId, String text) {
        UUID userId = resolveUserId(accountId);
        post("/api/internal/notifications/send", Map.of("recipientUserId", userId, "text", text));
    }

    @Override
    public void sendToMany(List<UUID> accountIds, String text) {
        for (UUID accountId : accountIds) {
            send(accountId, text);
        }
    }

    @Override
    public void broadcast(String text) {
        post("/api/internal/notifications/broadcast", Map.of("text", text));
    }

    private UUID resolveUserId(UUID accountId) {
        User user = userRepository.findByAccount_Id(accountId)
                .or(() -> userRepository.findById(accountId))
                .orElseThrow(() -> new ResourceNotFoundException("User not found for id: " + accountId));
        return user.getId();
    }

    private void post(String path, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Internal-Key", internalKey);
        restTemplate.postForEntity(userServiceUrl + path, new HttpEntity<>(body, headers), Void.class);
    }
}
