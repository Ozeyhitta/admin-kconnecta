package project.kconnecta.admin.backend.feature.notification.service;

import java.util.List;
import java.util.UUID;

public interface NotificationAdminService {
    void send(UUID accountId, String text);
    void sendToMany(List<UUID> accountIds, String text);
    void broadcast(String text);
}
