package project.kconnecta.admin.backend.feature.support.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.admin.backend.entity.SupportRequest;
import project.kconnecta.admin.backend.entity.User;
import project.kconnecta.admin.backend.exception.ResourceNotFoundException;
import project.kconnecta.admin.backend.feature.notification.service.NotificationAdminService;
import project.kconnecta.admin.backend.feature.support.dto.response.SupportRequestAdminResponse;
import project.kconnecta.admin.backend.feature.support.repository.SupportRequestAdminRepository;
import project.kconnecta.admin.backend.feature.support.service.SupportRequestAdminService;

import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SupportRequestAdminServiceImpl implements SupportRequestAdminService {

    private static final Set<String> VALID_STATUSES = Set.of("PENDING", "IN_PROGRESS", "RESOLVED");

    private final SupportRequestAdminRepository supportRequestAdminRepository;
    private final NotificationAdminService notificationAdminService;

    @Override
    public Page<SupportRequestAdminResponse> getRequests(int page, int size, String sortBy, String sortDir,
                                                         String search, String category, String status) {
        Sort.Direction direction = Sort.Direction.fromString(sortDir.toUpperCase(Locale.ROOT));
        Set<String> validFields = Set.of("createdAt", "status");
        String safeField = validFields.contains(sortBy) ? sortBy : "createdAt";
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, safeField));

        String pattern = (search != null && !search.isBlank())
                ? "%" + search.trim().toLowerCase(Locale.ROOT) + "%"
                : null;
        String categoryFilter = (category != null && !category.isBlank()) ? category.trim().toUpperCase(Locale.ROOT) : null;
        String statusFilter = (status != null && !status.isBlank()) ? status.trim().toUpperCase(Locale.ROOT) : null;

        return supportRequestAdminRepository
                .findAllFiltered(pattern, categoryFilter, statusFilter, pageable)
                .map(SupportRequestAdminResponse::from);
    }

    @Override
    public SupportRequestAdminResponse getRequestById(UUID id) {
        return SupportRequestAdminResponse.from(findRequest(id));
    }

    @Override
    @Transactional
    public SupportRequestAdminResponse updateStatus(UUID id, String status) {
        String normalized = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        if (!VALID_STATUSES.contains(normalized)) {
            throw new IllegalArgumentException("Trạng thái không hợp lệ: " + status);
        }
        SupportRequest request = findRequest(id);
        request.setStatus(normalized);
        return SupportRequestAdminResponse.from(supportRequestAdminRepository.save(request));
    }

    @Override
    @Transactional
    public SupportRequestAdminResponse respond(UUID id, String message, Boolean markResolved) {
        String reply = message == null ? "" : message.trim();
        if (reply.isEmpty()) {
            throw new IllegalArgumentException("Nội dung phản hồi không được để trống");
        }

        SupportRequest request = findRequestForUpdate(id);
        if (!"PENDING".equals(request.getStatus())) {
            throw new IllegalArgumentException("Yêu cầu này đã được xử lý, không thể phản hồi thêm");
        }

        User user = request.getUser();
        if (user == null || user.getId() == null) {
            throw new ResourceNotFoundException("Không tìm thấy người dùng của yêu cầu hỗ trợ");
        }

        boolean resolve = markResolved == null || markResolved;
        request.setStatus(resolve ? "RESOLVED" : "IN_PROGRESS");
        supportRequestAdminRepository.save(request);

        String subject = request.getSubject() == null ? "" : request.getSubject().trim();
        String notificationText = subject.isEmpty()
                ? "Phản hồi yêu cầu hỗ trợ: " + reply
                : "Phản hồi yêu cầu hỗ trợ «" + subject + "»: " + reply;
        notificationAdminService.send(user.getId(), notificationText);

        return SupportRequestAdminResponse.from(request);
    }

    private SupportRequest findRequest(UUID id) {
        return supportRequestAdminRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu hỗ trợ"));
    }

    private SupportRequest findRequestForUpdate(UUID id) {
        return supportRequestAdminRepository.findByIdWithDetailsForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu hỗ trợ"));
    }
}
