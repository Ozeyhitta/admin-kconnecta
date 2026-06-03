package project.kconnecta.admin.backend.feature.activitylog.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import project.kconnecta.admin.backend.entity.UserActivityLog;

import java.time.LocalDateTime;
import java.util.UUID;

public interface UserActivityLogRepository
        extends JpaRepository<UserActivityLog, UUID>, JpaSpecificationExecutor<UserActivityLog> {

    long countByCreatedAtBetween(LocalDateTime from, LocalDateTime to);

    long countByActionTypeAndCreatedAtBetween(String actionType, LocalDateTime from, LocalDateTime to);

    long countByActionType(String actionType);

    java.util.List<UserActivityLog> findByActionTypeOrderByCreatedAtDesc(
            String actionType,
            org.springframework.data.domain.Pageable pageable);

    // Per-user queries
    long countByUserId(java.util.UUID userId);

    long countByUserIdAndActionType(java.util.UUID userId, String actionType);

    java.util.List<UserActivityLog> findTop15ByUserIdOrderByCreatedAtDesc(java.util.UUID userId);

    @org.springframework.data.jpa.repository.Query(
            value = "SELECT EXTRACT(HOUR FROM created_at)::int AS hour, COUNT(*)::int AS cnt " +
                    "FROM public.user_activity_logs " +
                    "WHERE created_at >= NOW() - INTERVAL '30 days' " +
                    "GROUP BY EXTRACT(HOUR FROM created_at) " +
                    "ORDER BY hour",
            nativeQuery = true)
    java.util.List<Object[]> getActivityCountByHour();

    @org.springframework.data.jpa.repository.Query(
            value = "SELECT EXTRACT(HOUR FROM created_at)::int AS hour, COUNT(*)::int AS cnt " +
                    "FROM public.user_activity_logs " +
                    "WHERE created_at BETWEEN :from AND :to " +
                    "GROUP BY EXTRACT(HOUR FROM created_at) " +
                    "ORDER BY hour",
            nativeQuery = true)
    java.util.List<Object[]> getActivityCountByHourBetween(
            @org.springframework.data.repository.query.Param("from") java.time.LocalDateTime from,
            @org.springframework.data.repository.query.Param("to") java.time.LocalDateTime to);

    @org.springframework.data.jpa.repository.Query(
            value = "SELECT created_at::date AS day, COUNT(*)::int AS cnt " +
                    "FROM public.user_activity_logs " +
                    "WHERE created_at >= NOW() - INTERVAL '30 days' " +
                    "GROUP BY created_at::date " +
                    "ORDER BY day",
            nativeQuery = true)
    java.util.List<Object[]> getActivityCountByDay();

    @org.springframework.data.jpa.repository.Query(
            value = "SELECT created_at::date AS day, COUNT(*)::int AS cnt " +
                    "FROM public.user_activity_logs " +
                    "WHERE created_at BETWEEN :from AND :to " +
                    "GROUP BY created_at::date " +
                    "ORDER BY day",
            nativeQuery = true)
    java.util.List<Object[]> getActivityCountByDayBetween(
            @org.springframework.data.repository.query.Param("from") java.time.LocalDateTime from,
            @org.springframework.data.repository.query.Param("to") java.time.LocalDateTime to);

    // DAU / MAU — distinct active users
    @org.springframework.data.jpa.repository.Query(
            value = "SELECT COUNT(DISTINCT user_id) FROM user_activity_logs " +
                    "WHERE created_at BETWEEN :from AND :to AND user_id IS NOT NULL",
            nativeQuery = true)
    long countDistinctActiveUsersBetween(
            @org.springframework.data.repository.query.Param("from") java.time.LocalDateTime from,
            @org.springframework.data.repository.query.Param("to")   java.time.LocalDateTime to);

    // DAU trend — distinct active users per day, last 30 days
    @org.springframework.data.jpa.repository.Query(
            value = "SELECT created_at::date AS day, COUNT(DISTINCT user_id)::bigint AS cnt " +
                    "FROM user_activity_logs " +
                    "WHERE created_at >= CURRENT_DATE - INTERVAL '29 days' AND user_id IS NOT NULL " +
                    "GROUP BY created_at::date ORDER BY day",
            nativeQuery = true)
    java.util.List<Object[]> getDauByDay();

    @org.springframework.data.jpa.repository.Query(
            value = "SELECT created_at::date AS day, COUNT(DISTINCT user_id)::bigint AS cnt " +
                    "FROM user_activity_logs " +
                    "WHERE created_at BETWEEN :from AND :to AND user_id IS NOT NULL " +
                    "GROUP BY created_at::date ORDER BY day",
            nativeQuery = true)
    java.util.List<Object[]> getDauByDayBetween(
            @org.springframework.data.repository.query.Param("from") java.time.LocalDateTime from,
            @org.springframework.data.repository.query.Param("to") java.time.LocalDateTime to);

    // Interaction events by day (last 30 days)
    @org.springframework.data.jpa.repository.Query(
            value = "SELECT created_at::date AS period, COUNT(*)::bigint AS cnt " +
                    "FROM user_activity_logs " +
                    "WHERE created_at >= CURRENT_DATE - INTERVAL '29 days' " +
                    "  AND action_type IN ('REACTION_ADDED','COMMENT_ADDED','POST_SHARED','POST_CREATED','FRIEND_REQUEST_SENT') " +
                    "GROUP BY created_at::date ORDER BY period",
            nativeQuery = true)
    java.util.List<Object[]> getInteractionsByDay();

    // Interaction events by week (last 12 weeks)
    @org.springframework.data.jpa.repository.Query(
            value = "SELECT DATE_TRUNC('week', created_at)::date AS period, COUNT(*)::bigint AS cnt " +
                    "FROM user_activity_logs " +
                    "WHERE created_at >= CURRENT_DATE - INTERVAL '11 weeks' " +
                    "  AND action_type IN ('REACTION_ADDED','COMMENT_ADDED','POST_SHARED','POST_CREATED','FRIEND_REQUEST_SENT') " +
                    "GROUP BY DATE_TRUNC('week', created_at) ORDER BY period",
            nativeQuery = true)
    java.util.List<Object[]> getInteractionsByWeek();

    // Interaction events by month (last 12 months)
    @org.springframework.data.jpa.repository.Query(
            value = "SELECT DATE_TRUNC('month', created_at)::date AS period, COUNT(*)::bigint AS cnt " +
                    "FROM user_activity_logs " +
                    "WHERE created_at >= CURRENT_DATE - INTERVAL '11 months' " +
                    "  AND action_type IN ('REACTION_ADDED','COMMENT_ADDED','POST_SHARED','POST_CREATED','FRIEND_REQUEST_SENT') " +
                    "GROUP BY DATE_TRUNC('month', created_at) ORDER BY period",
            nativeQuery = true)
    java.util.List<Object[]> getInteractionsByMonth();

    @org.springframework.data.jpa.repository.Query(
            value = "SELECT created_at::date AS period, COUNT(*)::bigint AS cnt " +
                    "FROM user_activity_logs " +
                    "WHERE created_at BETWEEN :from AND :to " +
                    "  AND action_type IN ('REACTION_ADDED','COMMENT_ADDED','POST_SHARED','POST_CREATED','FRIEND_REQUEST_SENT') " +
                    "GROUP BY created_at::date ORDER BY period",
            nativeQuery = true)
    java.util.List<Object[]> getInteractionsByDayBetween(
            @org.springframework.data.repository.query.Param("from") java.time.LocalDateTime from,
            @org.springframework.data.repository.query.Param("to") java.time.LocalDateTime to);

    @org.springframework.data.jpa.repository.Query(
            value = "SELECT DATE_TRUNC('week', created_at)::date AS period, COUNT(*)::bigint AS cnt " +
                    "FROM user_activity_logs " +
                    "WHERE created_at BETWEEN :from AND :to " +
                    "  AND action_type IN ('REACTION_ADDED','COMMENT_ADDED','POST_SHARED','POST_CREATED','FRIEND_REQUEST_SENT') " +
                    "GROUP BY DATE_TRUNC('week', created_at) ORDER BY period",
            nativeQuery = true)
    java.util.List<Object[]> getInteractionsByWeekBetween(
            @org.springframework.data.repository.query.Param("from") java.time.LocalDateTime from,
            @org.springframework.data.repository.query.Param("to") java.time.LocalDateTime to);

    @org.springframework.data.jpa.repository.Query(
            value = "SELECT DATE_TRUNC('month', created_at)::date AS period, COUNT(*)::bigint AS cnt " +
                    "FROM user_activity_logs " +
                    "WHERE created_at BETWEEN :from AND :to " +
                    "  AND action_type IN ('REACTION_ADDED','COMMENT_ADDED','POST_SHARED','POST_CREATED','FRIEND_REQUEST_SENT') " +
                    "GROUP BY DATE_TRUNC('month', created_at) ORDER BY period",
            nativeQuery = true)
    java.util.List<Object[]> getInteractionsByMonthBetween(
            @org.springframework.data.repository.query.Param("from") java.time.LocalDateTime from,
            @org.springframework.data.repository.query.Param("to") java.time.LocalDateTime to);

    /** Interaction counts grouped by action_type within a date range. */
    @org.springframework.data.jpa.repository.Query(
            value = "SELECT action_type, COUNT(*)::bigint AS cnt " +
                    "FROM user_activity_logs " +
                    "WHERE created_at BETWEEN :from AND :to " +
                    "  AND action_type IN ('REACTION_ADDED','COMMENT_ADDED','POST_SHARED','POST_CREATED','FRIEND_REQUEST_SENT') " +
                    "GROUP BY action_type",
            nativeQuery = true)
    java.util.List<Object[]> getInteractionBreakdownBetween(
            @org.springframework.data.repository.query.Param("from") java.time.LocalDateTime from,
            @org.springframework.data.repository.query.Param("to") java.time.LocalDateTime to);

    /** Count LOGIN events for a user within a time window (burst detection). */
    @org.springframework.data.jpa.repository.Query(
            value = "SELECT COUNT(*) FROM user_activity_logs " +
                    "WHERE user_id = :userId AND action_type = 'LOGIN' " +
                    "AND created_at BETWEEN :from AND :to",
            nativeQuery = true)
    long countLoginBurst(
            @org.springframework.data.repository.query.Param("userId") UUID userId,
            @org.springframework.data.repository.query.Param("from") LocalDateTime from,
            @org.springframework.data.repository.query.Param("to") LocalDateTime to);

    @org.springframework.data.jpa.repository.Query(
            value = "SELECT COUNT(*) FROM user_activity_logs " +
                    "WHERE user_id = :userId AND action_type = 'LOGIN_FAILED' " +
                    "AND created_at BETWEEN :from AND :to",
            nativeQuery = true)
    long countFailedLoginBurst(
            @org.springframework.data.repository.query.Param("userId") UUID userId,
            @org.springframework.data.repository.query.Param("from") LocalDateTime from,
            @org.springframework.data.repository.query.Param("to") LocalDateTime to);

    /** True if user has any prior log with same IP before this timestamp. */
    @org.springframework.data.jpa.repository.Query(
            value = "SELECT COUNT(*) > 0 FROM user_activity_logs " +
                    "WHERE user_id = :userId AND ip_address = :ip " +
                    "AND created_at < :before AND ip_address IS NOT NULL",
            nativeQuery = true)
    boolean existsPriorIpForUser(
            @org.springframework.data.repository.query.Param("userId") UUID userId,
            @org.springframework.data.repository.query.Param("ip") String ip,
            @org.springframework.data.repository.query.Param("before") LocalDateTime before);

    @org.springframework.data.jpa.repository.Query(
            value = "SELECT COUNT(*) FROM user_activity_logs WHERE action_type = 'LOGIN_FAILED' " +
                    "AND created_at BETWEEN :from AND :to",
            nativeQuery = true)
    long countFailedLoginsBetween(
            @org.springframework.data.repository.query.Param("from") LocalDateTime from,
            @org.springframework.data.repository.query.Param("to") LocalDateTime to);

    @org.springframework.data.jpa.repository.Query(
            value = "SELECT COUNT(*) FROM user_activity_logs " +
                    "WHERE action_type IN ('MESSAGE_BLOCKED_SPAM','MESSAGE_BLOCKED_KEYWORD') " +
                    "AND created_at BETWEEN :from AND :to",
            nativeQuery = true)
    long countBlockedMessagesBetween(
            @org.springframework.data.repository.query.Param("from") LocalDateTime from,
            @org.springframework.data.repository.query.Param("to") LocalDateTime to);

    @org.springframework.data.jpa.repository.Query(
            value = "SELECT username, COUNT(*) AS cnt FROM user_activity_logs " +
                    "WHERE created_at BETWEEN :from AND :to AND username IS NOT NULL " +
                    "GROUP BY username ORDER BY cnt DESC LIMIT 1",
            nativeQuery = true)
    java.util.List<Object[]> findTopActiveUserBetween(
            @org.springframework.data.repository.query.Param("from") LocalDateTime from,
            @org.springframework.data.repository.query.Param("to") LocalDateTime to);
}
