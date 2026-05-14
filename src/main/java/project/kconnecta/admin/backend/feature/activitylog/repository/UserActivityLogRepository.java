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
}
