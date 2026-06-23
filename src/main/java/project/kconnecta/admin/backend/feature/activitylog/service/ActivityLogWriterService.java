package project.kconnecta.admin.backend.feature.activitylog.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Inserts rows into {@code user_activity_logs} (shared with User backend).
 * Admin JPA entity is read-only; writes go through JDBC.
 */
@Service
@RequiredArgsConstructor
public class ActivityLogWriterService {

    private final NamedParameterJdbcTemplate jdbc;

    @Transactional
    public void log(UUID userId, String username, String actionType, String metadata) {
        if (userId == null || actionType == null || actionType.isBlank()) {
            return;
        }
        jdbc.update(
                """
                INSERT INTO user_activity_logs (id, user_id, username, action_type, metadata, created_at)
                VALUES (:id, :userId, :username, :actionType, :metadata, :createdAt)
                """,
                new MapSqlParameterSource()
                        .addValue("id", UUID.randomUUID())
                        .addValue("userId", userId)
                        .addValue("username", username)
                        .addValue("actionType", actionType)
                        .addValue("metadata", metadata)
                        .addValue("createdAt", LocalDateTime.now())
        );
    }
}
