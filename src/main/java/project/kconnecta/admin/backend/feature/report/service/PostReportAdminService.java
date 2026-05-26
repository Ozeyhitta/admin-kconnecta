package project.kconnecta.admin.backend.feature.report.service;

import org.springframework.data.domain.Page;
import project.kconnecta.admin.backend.feature.report.dto.response.PostReportAdminResponse;

import java.util.UUID;

public interface PostReportAdminService {
    Page<PostReportAdminResponse> getReports(int page, int size, String sortBy, String sortDir, String search, UUID postId);
    PostReportAdminResponse getReportById(UUID id);
}
