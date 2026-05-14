package project.kconnecta.admin.backend.feature.user.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import project.kconnecta.admin.backend.common.enums.AccountRole;

@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class UpdateRoleRequest {
    @NotNull
    private AccountRole role;
}
