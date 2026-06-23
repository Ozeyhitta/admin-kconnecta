package project.kconnecta.admin.backend.feature.user.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import project.kconnecta.admin.backend.common.enums.AccountStatus;

@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class UpdateStatusRequest {
    @NotNull
    private AccountStatus status;

    /** Optional. When locking (status = BLOCKED), >= 1 means a temporary lock for this many
     *  days; null/absent means an indefinite lock. Ignored when unlocking. */
    private Integer lockDays;
}
