package project.kconnecta.admin.backend.feature.notification.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import project.kconnecta.admin.backend.feature.notification.dto.request.BroadcastNotificationRequest;
import project.kconnecta.admin.backend.feature.notification.dto.request.SendBatchNotificationRequest;
import project.kconnecta.admin.backend.feature.notification.dto.request.SendNotificationRequest;
import project.kconnecta.admin.backend.feature.notification.service.NotificationAdminService;

@RestController
@RequestMapping("/api/v1/admin/notifications")
@RequiredArgsConstructor
public class NotificationAdminController {

    private final NotificationAdminService notificationAdminService;

    @PostMapping("/send")
    public ResponseEntity<Void> send(@Valid @RequestBody SendNotificationRequest request) {
        notificationAdminService.send(request.targetUserId(), request.text());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/send-batch")
    public ResponseEntity<Void> sendBatch(@Valid @RequestBody SendBatchNotificationRequest request) {
        notificationAdminService.sendToMany(request.targetUserIds(), request.text());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/broadcast")
    public ResponseEntity<Void> broadcast(@Valid @RequestBody BroadcastNotificationRequest request) {
        notificationAdminService.broadcast(request.text());
        return ResponseEntity.ok().build();
    }
}
