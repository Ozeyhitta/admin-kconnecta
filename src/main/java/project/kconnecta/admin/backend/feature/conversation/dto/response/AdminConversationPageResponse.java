package project.kconnecta.admin.backend.feature.conversation.dto.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class AdminConversationPageResponse {
    List<AdminConversationSummaryResponse> content;
    long totalElements;
    long totalPages;
    int page;
    int size;
}

