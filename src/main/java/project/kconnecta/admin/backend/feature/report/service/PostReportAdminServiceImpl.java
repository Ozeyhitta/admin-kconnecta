package project.kconnecta.admin.backend.feature.report.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import project.kconnecta.admin.backend.exception.ResourceNotFoundException;
import project.kconnecta.admin.backend.feature.report.dto.response.PostReportAdminResponse;
import project.kconnecta.admin.backend.feature.report.repository.PostReportAdminRepository;

import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PostReportAdminServiceImpl implements PostReportAdminService {
    private final PostReportAdminRepository postReportAdminRepository;

    @Override
    public Page<PostReportAdminResponse> getReports(int page, int size, String sortBy, String sortDir, String search, UUID postId) {
        Sort.Direction direction = Sort.Direction.fromString(sortDir.toUpperCase());
        Set<String> validFields = Set.of("createdAt");
        String safeField = validFields.contains(sortBy) ? sortBy : "createdAt";
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, safeField));

        String pattern = (search != null && !search.isBlank())
                ? "%" + search.trim().toLowerCase(java.util.Locale.ROOT) + "%"
                : null;

        return postReportAdminRepository.findAllFiltered(pattern, postId, pageable)
                .map(PostReportAdminResponse::from);
    }

    @Override
    public PostReportAdminResponse getReportById(UUID id) {
        return postReportAdminRepository.findByIdWithDetails(id)
                .map(PostReportAdminResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Post report not found: " + id));
    }
}
