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
            value = "SELECT created_at::date AS day, COUNT(*)::int AS cnt " +
                    "FROM public.user_activity_logs " +
                    "WHERE created_at >= NOW() - INTERVAL '30 days' " +
                    "GROUP BY created_at::date " +
                    "ORDER BY day",
            nativeQuery = true)
    java.util.List<Object[]> getActivityCountByDay();

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
}
