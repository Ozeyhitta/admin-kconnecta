package project.kconnecta.admin.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Yêu cầu trợ giúp / hỗ trợ do người dùng gửi (ghi từ User backend, đọc/cập nhật ở Admin).
 * Bảng dùng chung: public.support_requests.
 */
@Entity
@Table(name = "support_requests", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupportRequest {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "contact_email", length = 255)
    private String contactEmail;

    @Column(nullable = false, length = 30)
    private String category;

    @Column(nullable = false, length = 150)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    /** PENDING | IN_PROGRESS | RESOLVED */
    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
