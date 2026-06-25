package project.kconnecta.admin.backend.feature.notification.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.admin.backend.common.enums.NotificationType;
import project.kconnecta.admin.backend.entity.User;
import project.kconnecta.admin.backend.exception.ResourceNotFoundException;
import project.kconnecta.admin.backend.feature.notification.entity.AdminNotification;
import project.kconnecta.admin.backend.feature.notification.repository.AdminNotificationRepository;
import project.kconnecta.admin.backend.feature.notification.service.NotificationAdminService;
import project.kconnecta.admin.backend.feature.user.repository.UserRepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationAdminServiceImpl implements NotificationAdminService {

    private final UserRepository userRepository;
    private final AdminNotificationRepository notificationRepository;

    @Override
    @Transactional
    public void send(UUID accountId, String text) {
        String content = text == null ? "" : text.trim();
        if (content.isEmpty()) {
            throw new IllegalArgumentException("Notification text is required");
        }

        User recipient = resolveRecipient(accountId);
        AdminNotification notification = AdminNotification.builder()
                .recipient(recipient)
                .type(NotificationType.SYSTEM)
                .content(content)
                .isRead(false)
                .isActioned(false)
                .build();
        notificationRepository.save(notification);
        log.info("Saved SYSTEM notification for user {}", recipient.getId());
    }

    @Override
    @Transactional
    public void sendToMany(List<UUID> accountIds, String text) {
        if (accountIds == null || accountIds.isEmpty()) {
            throw new IllegalArgumentException("At least one recipient is required");
        }
        for (UUID accountId : accountIds) {
            send(accountId, text);
        }
    }

    @Override
    @Transactional
    public void broadcast(String text) {
        String content = text == null ? "" : text.trim();
        if (content.isEmpty()) {
            throw new IllegalArgumentException("Notification text is required");
        }
        int inserted = notificationRepository.broadcastToAll(content, NotificationType.SYSTEM.name());
        log.info("Broadcast SYSTEM notification to {} users", inserted);
    }

    private User resolveRecipient(UUID accountOrUserId) {
        return userRepository.findByAccount_Id(accountOrUserId)
                .or(() -> userRepository.findById(accountOrUserId))
                .orElseThrow(() -> new ResourceNotFoundException("User not found for id: " + accountOrUserId));
    }
}
