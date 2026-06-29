package project.kconnecta.admin.backend.feature.live.dto.response;

import lombok.Builder;
import lombok.Getter;
import project.kconnecta.admin.backend.entity.LiveSession;

import java.time.LocalDateTime;

@Getter
@Builder
public class LiveSessionAdminResponse {

    private String id;
    private String title;
    private String description;
    private String status;
    private String recordingStatus;
    private String playbackUrl;
    private String hlsPlaybackUrl;
    private String thumbnailUrl;
    private Integer recordingDurationSec;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private int viewerCount;
    private int peakViewerCount;
    private long totalReactionCount;
    private LocalDateTime createdAt;

    public static LiveSessionAdminResponse from(LiveSession session) {
        return LiveSessionAdminResponse.builder()
                .id(session.getId().toString())
                .title(session.getTitle())
                .description(session.getDescription())
                .status(session.getStatus())
                .recordingStatus(session.getRecordingStatus())
                .playbackUrl(session.getPlaybackUrl())
                .hlsPlaybackUrl(session.getHlsPlaybackUrl())
                .thumbnailUrl(session.getThumbnailUrl())
                .recordingDurationSec(session.getRecordingDurationSec())
                .startedAt(session.getStartedAt())
                .endedAt(session.getEndedAt())
                .viewerCount(session.getViewerCount())
                .peakViewerCount(session.getPeakViewerCount())
                .totalReactionCount(session.getTotalReactionCount())
                .createdAt(session.getCreatedAt())
                .build();
    }
}
