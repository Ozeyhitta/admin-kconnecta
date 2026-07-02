package project.kconnecta.admin.backend.feature.conversation.dto.request;

import lombok.Data;

@Data
public class UpdateStatusRequest {
    private String status;
    private String reason;
}
