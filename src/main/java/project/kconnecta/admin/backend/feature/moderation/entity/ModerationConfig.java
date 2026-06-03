package project.kconnecta.admin.backend.feature.moderation.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "moderation_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModerationConfig {

    @Id
    @Column(length = 100)
    private String key;

    @Column(nullable = false, length = 255)
    private String value;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
