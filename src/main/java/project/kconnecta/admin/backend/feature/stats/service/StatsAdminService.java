package project.kconnecta.admin.backend.feature.stats.service;

import project.kconnecta.admin.backend.feature.stats.dto.response.DauMauResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.DayCountResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.EngagementAnalyticsResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.HourCountResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.InteractionDetailResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.OnlineUsersDetailResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.OnlineUsersResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.OverviewStatsResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.NewUsersAnalyticsResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.PeriodCountResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.SystemOverviewResponse;

import java.time.LocalDate;
import java.util.List;

public interface StatsAdminService {

    SystemOverviewResponse getSystemOverview();

    OverviewStatsResponse getOverview(LocalDate from, LocalDate to, String compareMode);

    NewUsersAnalyticsResponse getNewUsersAnalytics(String groupBy, LocalDate from, LocalDate to);

    OnlineUsersResponse getOnlineUsers();

    OnlineUsersDetailResponse getOnlineUsersDetail();

    List<PeriodCountResponse> getNewUsers(String period, LocalDate from, LocalDate to);

    DauMauResponse getDauMau(LocalDate from, LocalDate to);

    List<PeriodCountResponse> getInteractions(String period, LocalDate from, LocalDate to);

    List<HourCountResponse> getActivityByHour(LocalDate from, LocalDate to);

    List<DayCountResponse> getActivityByDay(LocalDate from, LocalDate to);

    EngagementAnalyticsResponse getEngagementAnalytics(LocalDate from, LocalDate to);

    InteractionDetailResponse getInteractionDetail(
            LocalDate from, LocalDate to, LocalDate date, String actionType);

    InteractionDetailResponse getActivityHourDetail(LocalDate date, int hour);
}
