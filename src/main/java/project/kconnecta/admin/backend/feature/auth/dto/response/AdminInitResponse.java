package project.kconnecta.admin.backend.feature.auth.dto.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AdminInitResponse {
    String message;
    String email;
    String id;
}
