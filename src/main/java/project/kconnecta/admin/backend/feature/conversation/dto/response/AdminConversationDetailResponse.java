package project.kconnecta.admin.backend.feature.conversation.dto.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class AdminConversationDetailResponse {
    String id;
    AdminConversationSummaryResponse summary;
    List<AdminChatMessageResponse> messages;
}

