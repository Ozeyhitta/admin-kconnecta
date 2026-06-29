package project.kconnecta.admin.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Ảnh minh chứng được User backend lưu cho một yêu cầu hỗ trợ.
 * Admin chỉ đọc dữ liệu này để phục vụ kiểm tra và phản hồi.
 */
@Entity
@Table(name = "support_request_attachments", schema = "public")
@Getter
@NoArgsConstructor
public class SupportRequestAttachment {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "support_request_id", nullable = false)
    private SupportRequest supportRequest;

    @Column(name = "image_url", nullable = false, columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
