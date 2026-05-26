package project.kconnecta.admin.backend.feature.post.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import project.kconnecta.admin.backend.common.enums.PostStatus;

@Getter
public class UpdatePostStatusRequest {

    @NotNull
    private PostStatus status;
}
