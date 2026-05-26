package project.kconnecta.admin.backend.feature.stats.service;

import project.kconnecta.admin.backend.feature.stats.dto.response.DauMauResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.DayCountResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.HourCountResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.OnlineUsersResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.OverviewStatsResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.PeriodCountResponse;

import java.util.List;

public interface StatsAdminService {

    OverviewStatsResponse getOverview();

    OnlineUsersResponse getOnlineUsers();

    List<PeriodCountResponse> getNewUsers(String period);

    DauMauResponse getDauMau();

    List<PeriodCountResponse> getInteractions(String period);

    List<HourCountResponse> getActivityByHour();

    List<DayCountResponse> getActivityByDay();
}
