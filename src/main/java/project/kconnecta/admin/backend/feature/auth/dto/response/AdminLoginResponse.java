package project.kconnecta.admin.backend.feature.auth.dto.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AdminLoginResponse {
    String token;
    String id;
    String email;
    String role;
}
