package project.kconnecta.admin.backend.feature.activitylog.service;

import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import project.kconnecta.admin.backend.entity.UserActivityLog;
import project.kconnecta.admin.backend.feature.activitylog.dto.response.ActivityLogPageResponse;
import project.kconnecta.admin.backend.feature.activitylog.dto.response.UserActivityLogResponse;
import project.kconnecta.admin.backend.feature.activitylog.repository.UserActivityLogRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ActivityLogAdminServiceImpl implements ActivityLogAdminService {

    private static final Set<String> VALID_SORT_FIELDS = Set.of("createdAt", "username", "actionType");

    private final UserActivityLogRepository repository;

    @Override
    public ActivityLogPageResponse getLogs(
            int page,
            int size,
            String sortBy,
            String sortDir,
            String username,
            String actionType,
            LocalDateTime from,
            LocalDateTime to
    ) {
        Sort.Direction direction = Sort.Direction.fromString(sortDir.toUpperCase());
        String safeSort = VALID_SORT_FIELDS.contains(sortBy) ? sortBy : "createdAt";
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, safeSort));

        Page<UserActivityLogResponse> result = repository
                .findAll(buildSpec(username, actionType, from, to), pageable)
                .map(UserActivityLogResponse::from);

        return ActivityLogPageResponse.builder()
                .content(result.getContent())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .page(result.getNumber())
                .size(result.getSize())
                .build();
    }

    private Specification<UserActivityLog> buildSpec(
            String username,
            String actionType,
            LocalDateTime from,
            LocalDateTime to
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (username != null && !username.isBlank()) {
                predicates.add(cb.like(
                        cb.lower(root.get("username")),
                        "%" + username.trim().toLowerCase() + "%"
                ));
            }
            if (actionType != null && !actionType.isBlank()) {
                predicates.add(cb.equal(root.get("actionType"), actionType));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
