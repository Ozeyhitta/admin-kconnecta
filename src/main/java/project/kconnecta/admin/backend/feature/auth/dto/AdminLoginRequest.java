package project.kconnecta.admin.backend.feature.auth.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class AdminLoginRequest {
    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String password;
}
