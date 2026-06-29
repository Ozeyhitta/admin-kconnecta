package project.kconnecta.admin.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Read-only view of a livestream session (table {@code live_sessions}) for the admin panel.
 * Only the columns surfaced in the post detail view are mapped; enums are read as raw
 * strings so the admin module does not need to mirror the user backend's enum classes.
 */
@Entity
@Table(name = "live_sessions", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveSession {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "post_id")
    private UUID postId;

    @Column(name = "title")
    private String title;

    @Column(name = "description")
    private String description;

    @Column(name = "status")
    private String status;

    @Column(name = "playback_url")
    private String playbackUrl;

    @Column(name = "hls_playback_url")
    private String hlsPlaybackUrl;

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    @Column(name = "recording_status")
    private String recordingStatus;

    @Column(name = "recording_duration_sec")
    private Integer recordingDurationSec;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "viewer_count")
    private int viewerCount;

    @Column(name = "peak_viewer_count")
    private int peakViewerCount;

    @Column(name = "total_reaction_count")
    private long totalReactionCount;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
