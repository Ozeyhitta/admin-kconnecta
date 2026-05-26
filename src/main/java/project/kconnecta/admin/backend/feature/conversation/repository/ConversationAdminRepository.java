package project.kconnecta.admin.backend.feature.conversation.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import project.kconnecta.admin.backend.feature.conversation.dto.response.AdminChatMessageResponse;
import project.kconnecta.admin.backend.feature.conversation.dto.response.AdminConversationSummaryResponse;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class ConversationAdminRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public List<AdminConversationSummaryResponse> findSummaries(
            String searchQuery,
            String sortColumn,
            String sortDirection,
            int limit,
            int offset
    ) {
        MapSqlParameterSource params = baseParams(searchQuery)
                .addValue("limit", limit)
                .addValue("offset", offset);

        return jdbc.query(
                summarySql() + " ORDER BY " + sortColumn + " " + sortDirection + " NULLS LAST LIMIT :limit OFFSET :offset",
                params,
                (rs, rowNum) -> mapSummary(rs)
        );
    }

    public long countSummaries(String searchQuery) {
        MapSqlParameterSource params = baseParams(searchQuery);
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM (" + summarySql() + ") x", params, Long.class);
        return total != null ? total : 0L;
    }

    public Optional<AdminConversationSummaryResponse> findSummaryByUserPair(UUID user1Id, UUID user2Id) {
        MapSqlParameterSource params = baseParams(null)
                .addValue("user1Id", user1Id)
                .addValue("user2Id", user2Id);

        try {
            AdminConversationSummaryResponse summary = jdbc.queryForObject(
                    summarySql() + " AND pairs.user1_id = :user1Id AND pairs.user2_id = :user2Id",
                    params,
                    (rs, rowNum) -> mapSummary(rs)
            );
            return Optional.ofNullable(summary);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public List<AdminChatMessageResponse> findMessagesByUserPair(UUID user1Id, UUID user2Id, int limit) {
        MapSqlParameterSource params = baseParams(null)
                .addValue("user1Id", user1Id)
                .addValue("user2Id", user2Id)
                .addValue("limit", limit);

        return jdbc.query("""
                SELECT
                    m.id,
                    m.sender_id,
                    s.username AS sender_username,
                    s.full_name AS sender_full_name,
                    s.avatar_url AS sender_avatar_url,
                    m.receiver_id,
                    r.username AS receiver_username,
                    r.full_name AS receiver_full_name,
                    r.avatar_url AS receiver_avatar_url,
                    m.content,
                    m.created_at,
                    COALESCE(m.delivered, false) AS delivered,
                    COALESCE(m.seen, false) AS seen,
                    COALESCE(m.deleted, false) AS deleted
                FROM chat_messages m
                JOIN users s ON s.id = m.sender_id
                JOIN users r ON r.id = m.receiver_id
                WHERE m.conversation_id IS NULL
                  AND (
                    (m.sender_id = :user1Id AND m.receiver_id = :user2Id)
                    OR
                    (m.sender_id = :user2Id AND m.receiver_id = :user1Id)
                  )
                ORDER BY m.created_at DESC
                LIMIT :limit
                """, params, (rs, rowNum) -> mapMessage(rs));
    }

    private MapSqlParameterSource baseParams(String q) {
        String query = q == null || q.isBlank() ? null : "%" + q.trim().toLowerCase() + "%";
        return new MapSqlParameterSource().addValue("q", query, Types.VARCHAR);
    }

    private String summarySql() {
        return """
                WITH private_messages AS (
                    SELECT
                        CASE WHEN sender_id::text < receiver_id::text THEN sender_id ELSE receiver_id END AS user1_id,
                        CASE WHEN sender_id::text < receiver_id::text THEN receiver_id ELSE sender_id END AS user2_id,
                        id,
                        sender_id,
                        receiver_id,
                        content,
                        created_at,
                        COALESCE(seen, false) AS seen
                    FROM chat_messages
                    WHERE conversation_id IS NULL
                      AND receiver_id IS NOT NULL
                ),
                pairs AS (
                    SELECT
                        user1_id,
                        user2_id,
                        COUNT(*) AS message_count,
                        COUNT(*) FILTER (WHERE seen = false) AS unread_count,
                        MAX(created_at) AS last_message_at
                    FROM private_messages
                    GROUP BY user1_id, user2_id
                ),
                last_messages AS (
                    SELECT DISTINCT ON (pm.user1_id, pm.user2_id)
                        pm.user1_id,
                        pm.user2_id,
                        pm.content AS last_message_content,
                        pm.sender_id AS last_message_sender_id
                    FROM private_messages pm
                    ORDER BY pm.user1_id, pm.user2_id, pm.created_at DESC, pm.id DESC
                )
                SELECT
                    pairs.user1_id::text || '_' || pairs.user2_id::text AS id,
                    pairs.user1_id,
                    u1.username AS user1_username,
                    u1.full_name AS user1_full_name,
                    u1.avatar_url AS user1_avatar_url,
                    pairs.user2_id,
                    u2.username AS user2_username,
                    u2.full_name AS user2_full_name,
                    u2.avatar_url AS user2_avatar_url,
                    pairs.message_count,
                    pairs.unread_count,
                    last_messages.last_message_content,
                    last_messages.last_message_sender_id,
                    pairs.last_message_at
                FROM pairs
                JOIN users u1 ON u1.id = pairs.user1_id
                JOIN users u2 ON u2.id = pairs.user2_id
                JOIN last_messages ON last_messages.user1_id = pairs.user1_id
                                  AND last_messages.user2_id = pairs.user2_id
                WHERE (CAST(:q AS text) IS NULL
                    OR LOWER(COALESCE(u1.username, '') || ' ' || COALESCE(u1.full_name, '') || ' ' ||
                             COALESCE(u2.username, '') || ' ' || COALESCE(u2.full_name, '')) LIKE CAST(:q AS text))
                """;
    }

    private AdminConversationSummaryResponse mapSummary(ResultSet rs) throws SQLException {
        return AdminConversationSummaryResponse.builder()
                .id(rs.getString("id"))
                .user1Id(rs.getObject("user1_id", UUID.class))
                .user1Username(rs.getString("user1_username"))
                .user1FullName(rs.getString("user1_full_name"))
                .user1AvatarUrl(rs.getString("user1_avatar_url"))
                .user2Id(rs.getObject("user2_id", UUID.class))
                .user2Username(rs.getString("user2_username"))
                .user2FullName(rs.getString("user2_full_name"))
                .user2AvatarUrl(rs.getString("user2_avatar_url"))
                .messageCount(rs.getLong("message_count"))
                .unreadCount(rs.getLong("unread_count"))
                .lastMessageContent(rs.getString("last_message_content"))
                .lastMessageSenderId(rs.getObject("last_message_sender_id", UUID.class))
                .lastMessageAt(rs.getObject("last_message_at", LocalDateTime.class))
                .build();
    }

    private AdminChatMessageResponse mapMessage(ResultSet rs) throws SQLException {
        return AdminChatMessageResponse.builder()
                .id(rs.getObject("id", UUID.class))
                .senderId(rs.getObject("sender_id", UUID.class))
                .senderUsername(rs.getString("sender_username"))
                .senderFullName(rs.getString("sender_full_name"))
                .senderAvatarUrl(rs.getString("sender_avatar_url"))
                .receiverId(rs.getObject("receiver_id", UUID.class))
                .receiverUsername(rs.getString("receiver_username"))
                .receiverFullName(rs.getString("receiver_full_name"))
                .receiverAvatarUrl(rs.getString("receiver_avatar_url"))
                .content(rs.getString("content"))
                .createdAt(rs.getObject("created_at", LocalDateTime.class))
                .delivered(rs.getBoolean("delivered"))
                .seen(rs.getBoolean("seen"))
                .deleted(rs.getBoolean("deleted"))
                .build();
    }
}

