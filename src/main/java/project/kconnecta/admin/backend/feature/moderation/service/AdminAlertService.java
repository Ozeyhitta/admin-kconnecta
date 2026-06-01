package project.kconnecta.admin.backend.feature.moderation.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.admin.backend.common.enums.AlertStatus;
import project.kconnecta.admin.backend.common.enums.AlertType;
import project.kconnecta.admin.backend.exception.ResourceNotFoundException;
import project.kconnecta.admin.backend.feature.moderation.dto.ViolationResult;
import project.kconnecta.admin.backend.feature.moderation.entity.AdminAlert;
import project.kconnecta.admin.backend.feature.moderation.repository.AdminAlertRepository;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminAlertService {

    private static final int DEDUP_WINDOW_MINUTES = 10;

    private final AdminAlertRepository adminAlertRepository;

    @Transactional
    public AdminAlert createIfNotExists(ViolationResult violation) {
        LocalDateTime dedupSince = LocalDateTime.now().minusMinutes(DEDUP_WINDOW_MINUTES);
        boolean exists = adminAlertRepository.existsByUserIdAndTypeAndCreatedAtAfter(
                violation.getUserId(), violation.getAlertType(), dedupSince);
        if (exists) {
            return null;
        }
        AdminAlert alert = AdminAlert.builder()
                .userId(violation.getUserId())
                .messageId(violation.getMessageId())
                .conversationId(violation.getConversationId())
                .type(violation.getAlertType())
                .severity(violation.getSeverity())
                .title(violation.getAlertTitle())
                .description(violation.getAlertDescription())
                .build();
        return adminAlertRepository.save(alert);
    }

    @Transactional(readOnly = true)
    public Page<AdminAlert> findAlerts(AlertStatus status, AlertType type, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        if (status != null && type != null) {
            return adminAlertRepository.findByStatusAndType(status, type, pageable);
        } else if (status != null) {
            return adminAlertRepository.findByStatus(status, pageable);
        } else if (type != null) {
            return adminAlertRepository.findByType(type, pageable);
        } else {
            return adminAlertRepository.findAll(pageable);
        }
    }

    @Transactional
    public AdminAlert resolve(UUID id, String resolvedBy) {
        AdminAlert alert = findByIdOrThrow(id);
        alert.setStatus(AlertStatus.RESOLVED);
        alert.setResolvedAt(LocalDateTime.now());
        alert.setResolvedBy(resolvedBy);
        return adminAlertRepository.save(alert);
    }

    @Transactional
    public AdminAlert dismiss(UUID id) {
        AdminAlert alert = findByIdOrThrow(id);
        alert.setStatus(AlertStatus.DISMISSED);
        alert.setResolvedAt(LocalDateTime.now());
        return adminAlertRepository.save(alert);
    }

    @Transactional(readOnly = true)
    public AdminAlert findById(UUID id) {
        return findByIdOrThrow(id);
    }

    private AdminAlert findByIdOrThrow(UUID id) {
        return adminAlertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AdminAlert not found: " + id));
    }
}
