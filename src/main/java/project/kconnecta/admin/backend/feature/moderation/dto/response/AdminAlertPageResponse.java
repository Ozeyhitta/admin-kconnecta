package project.kconnecta.admin.backend.feature.moderation.dto.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class AdminAlertPageResponse {
    List<AdminAlertResponse> content;
    long totalElements;
    int totalPages;
    int page;
    int size;
}
