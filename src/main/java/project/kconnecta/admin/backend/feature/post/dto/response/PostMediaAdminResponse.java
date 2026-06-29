package project.kconnecta.admin.backend.feature.post.dto.response;

import lombok.Builder;
import lombok.Getter;
import project.kconnecta.admin.backend.common.enums.MediaType;
import project.kconnecta.admin.backend.entity.PostMedia;

import java.util.UUID;

@Getter
@Builder
public class PostMediaAdminResponse {
    private UUID id;
    private MediaType mediaType;
    private String fileUrl;
    private String thumbnailUrl;
    private Integer sortOrder;

    public static PostMediaAdminResponse from(PostMedia media) {
        return PostMediaAdminResponse.builder()
                .id(media.getId())
                .mediaType(media.getMediaType())
                .fileUrl(media.getFileUrl())
                .thumbnailUrl(media.getThumbnailUrl())
                .sortOrder(media.getSortOrder())
                .build();
    }
}
