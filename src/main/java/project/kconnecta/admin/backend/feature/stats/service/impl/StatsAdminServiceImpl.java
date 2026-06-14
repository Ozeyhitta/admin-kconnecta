package project.kconnecta.admin.backend.feature.stats.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import project.kconnecta.admin.backend.common.enums.AccountStatus;
import project.kconnecta.admin.backend.feature.activitylog.repository.UserActivityLogRepository;
import project.kconnecta.admin.backend.feature.comment.repository.CommentAdminRepository;
import project.kconnecta.admin.backend.feature.post.repository.PostAdminRepository;
import project.kconnecta.admin.backend.feature.report.repository.PostReportAdminRepository;
import project.kconnecta.admin.backend.feature.stats.dto.response.AnalyticsChartPoint;
import project.kconnecta.admin.backend.feature.stats.dto.response.AnalyticsInsight;
import project.kconnecta.admin.backend.feature.stats.dto.response.DauMauAnalyticsResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.DauMauResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.DauMauSummary;
import project.kconnecta.admin.backend.feature.stats.dto.response.DauMauTrendPointResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.DayCountResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.EngagementAnalyticsResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.HourCountResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.InteractionAnalyticsResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.InteractionBreakdownItem;
import project.kconnecta.admin.backend.feature.stats.dto.response.InteractionSummary;
import project.kconnecta.admin.backend.feature.stats.dto.response.NewUsersAnalyticsResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.NewUsersChartPoint;
import project.kconnecta.admin.backend.feature.stats.dto.response.NewUsersInsight;
import project.kconnecta.admin.backend.feature.stats.dto.response.NewUsersSummary;
import project.kconnecta.admin.backend.feature.stats.dto.response.OnlineUsersResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.OverviewStatsResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.PeriodCountResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.SystemOverviewResponse;
import project.kconnecta.admin.backend.feature.stats.service.StatsAdminService;
import project.kconnecta.admin.backend.feature.user.repository.AccountRepository;
import project.kconnecta.admin.backend.feature.user.repository.UserRepository;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StatsAdminServiceImpl implements StatsAdminService {

    private final AccountRepository accountRepository;
    private final UserActivityLogRepository activityLogRepository;
    private final UserRepository userRepository;
    private final PostAdminRepository postRepository;
    private final CommentAdminRepository commentRepository;
    private final PostReportAdminRepository reportRepository;

    // ── Constants ──────────────────────────────────────────────────────────────

    private static final Map<String, String> ACTION_LABELS = Map.of(
            "POST_CREATED",        "Bài đăng",
            "COMMENT_ADDED",       "Bình luận",
            "REACTION_ADDED",      "Cảm xúc",
            "POST_SHARED",         "Chia sẻ",
            "FRIEND_REQUEST_SENT", "Kết bạn"
    );
    private static final double DOMINANT_INTERACTION_PCT = 40.0;
    private static final double INTERACTION_DROP_PCT     = -30.0;
    private static final int    MAX_INSIGHTS             = 5;
    private static final int    MAU_MIN_SAMPLE           = 20;
    private static final int    ONLINE_WINDOW_MINUTES    = 15;

    // ── SystemOverview (no date filter) ───────────────────────────────────────

    @Override
    public SystemOverviewResponse getSystemOverview() {
        LocalDateTime onlineSince = onlineSince();
        return SystemOverviewResponse.builder()
                .totalUsers(accountRepository.count())
                .activeUsers(accountRepository.countByStatus(AccountStatus.ACTIVE))
                .lockedUsers(accountRepository.countByStatus(AccountStatus.BLOCKED))
                .onlineUsersNow(userRepository.countOnlineSince(onlineSince))
                .totalPosts(postRepository.count())
                .totalComments(commentRepository.count())
                .totalReports(reportRepository.count())
                .build();
    }

    // ── Overview (time-filtered) ───────────────────────────────────────────────

    @Override
    public OverviewStatsResponse getOverview(LocalDate from, LocalDate to, String compareMode) {
        DateRange current  = resolveRange(from, to);
        DateRange previous = resolveCompareRange(current, compareMode);
        LocalDateTime thirtyAgo  = current.to().minusDays(30);
        LocalDateTime onlineSince = onlineSince();

        long newUsersThisWeek = accountRepository.countByCreatedAtBetween(current.from(), current.to());
        long newUsersLastWeek = accountRepository.countByCreatedAtBetween(previous.from(), previous.to());
        double userGrowthPct  = growthPercent(newUsersThisWeek, newUsersLastWeek);

        long postsThisWeek = activityLogRepository.countByActionTypeAndCreatedAtBetween(
                "POST_CREATED", current.from(), current.to());
        long postsLastWeek = activityLogRepository.countByActionTypeAndCreatedAtBetween(
                "POST_CREATED", previous.from(), previous.to());
        double postsGrowthPct = growthPercent(postsThisWeek, postsLastWeek);

        long dau = activityLogRepository.countDistinctActiveUsersBetween(current.from(), current.to());
        long mau = activityLogRepository.countDistinctActiveUsersBetween(thirtyAgo, current.to());
        double dauMauRatio = mau == 0 ? 0.0 : Math.round(dau * 1000.0 / mau) / 10.0;

        return OverviewStatsResponse.builder()
                .totalUsers(accountRepository.count())
                .activeUsers(accountRepository.countByStatus(AccountStatus.ACTIVE))
                .inactiveUsers(accountRepository.countByStatus(AccountStatus.BLOCKED))
                .newUsersLast30Days(newUsersThisWeek)
                .newUsersThisWeek(newUsersThisWeek)
                .newUsersLastWeek(newUsersLastWeek)
                .userGrowthPercent(userGrowthPct)
                .dau(dau)
                .mau(mau)
                .dauMauRatio(dauMauRatio)
                .onlineUsersNow(userRepository.countOnlineSince(onlineSince))
                .activityToday(activityLogRepository.countByCreatedAtBetween(current.from(), current.to()))
                .activityLast7Days(activityLogRepository.countByCreatedAtBetween(current.from(), current.to()))
                .loginsToday(activityLogRepository.countByActionTypeAndCreatedAtBetween(
                        "LOGIN", current.from(), current.to()))
                .postsToday(activityLogRepository.countByActionTypeAndCreatedAtBetween(
                        "POST_CREATED", current.from(), current.to()))
                .commentsToday(activityLogRepository.countByActionTypeAndCreatedAtBetween(
                        "COMMENT_ADDED", current.from(), current.to()))
                .sharesToday(activityLogRepository.countByActionTypeAndCreatedAtBetween(
                        "POST_SHARED", current.from(), current.to()))
                .reactionsToday(activityLogRepository.countByActionTypeAndCreatedAtBetween(
                        "REACTION_ADDED", current.from(), current.to()))
                .friendRequestsToday(activityLogRepository.countByActionTypeAndCreatedAtBetween(
                        "FRIEND_REQUEST_SENT", current.from(), current.to()))
                .postsThisWeek(postsThisWeek)
                .postsLastWeek(postsLastWeek)
                .postsGrowthPercent(postsGrowthPct)
                .build();
    }

    @Override
    public OnlineUsersResponse getOnlineUsers() {
        return OnlineUsersResponse.builder()
                .online(userRepository.countOnlineSince(onlineSince()))
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private LocalDateTime onlineSince() {
        return LocalDateTime.now().minusMinutes(ONLINE_WINDOW_MINUTES);
    }

    // ── New users chart ────────────────────────────────────────────────────────

    @Override
    public List<PeriodCountResponse> getNewUsers(String period, LocalDate from, LocalDate to) {
        DateRange range = resolveRange(from, to);
        return mapPeriodRows(switch (period) {
            case "week"  -> accountRepository.countNewUsersByWeekBetween(range.from(), range.to());
            case "month" -> accountRepository.countNewUsersByMonthBetween(range.from(), range.to());
            default      -> accountRepository.countNewUsersByDayBetween(range.from(), range.to());
        });
    }

    // ── DAU / MAU ─────────────────────────────────────────────────────────────

    @Override
    public DauMauResponse getDauMau(LocalDate from, LocalDate to) {
        DateRange range     = resolveRange(from, to);
        LocalDateTime thirtyAgo = range.to().minusDays(30);

        long dau   = activityLogRepository.countDistinctActiveUsersBetween(range.from(), range.to());
        long mau   = activityLogRepository.countDistinctActiveUsersBetween(thirtyAgo, range.to());
        double ratio = mau == 0 ? 0.0 : Math.round(dau * 1000.0 / mau) / 10.0;

        List<DauMauTrendPointResponse> dauTrend = activityLogRepository
                .getDauByDayBetween(range.from(), range.to()).stream()
                .map(r -> DauMauTrendPointResponse.builder()
                        .day(r[0].toString())
                        .count(((Number) r[1]).longValue())
                        .build())
                .toList();

        return DauMauResponse.builder()
                .dau(dau).mau(mau).dauMauRatio(ratio).dauTrend(dauTrend)
                .build();
    }

    // ── Interactions ──────────────────────────────────────────────────────────

    @Override
    public List<PeriodCountResponse> getInteractions(String period, LocalDate from, LocalDate to) {
        DateRange range = resolveRange(from, to);
        return mapPeriodRows(switch (period) {
            case "week"  -> activityLogRepository.getInteractionsByWeekBetween(range.from(), range.to());
            case "month" -> activityLogRepository.getInteractionsByMonthBetween(range.from(), range.to());
            default      -> activityLogRepository.getInteractionsByDayBetween(range.from(), range.to());
        });
    }

    // ── Activity by hour / day ─────────────────────────────────────────────────

    @Override
    public List<HourCountResponse> getActivityByHour(LocalDate from, LocalDate to) {
        DateRange range = resolveRange(from, to);
        return activityLogRepository.getActivityCountByHourBetween(range.from(), range.to()).stream()
                .map(r -> HourCountResponse.builder()
                        .hour(((Number) r[0]).intValue())
                        .count(((Number) r[1]).longValue())
                        .build())
                .toList();
    }

    @Override
    public List<DayCountResponse> getActivityByDay(LocalDate from, LocalDate to) {
        DateRange range = resolveRange(from, to);
        return activityLogRepository.getActivityCountByDayBetween(range.from(), range.to()).stream()
                .map(r -> DayCountResponse.builder()
                        .day(r[0].toString())
                        .count(((Number) r[1]).longValue())
                        .build())
                .toList();
    }

    // ── New Users Analytics ────────────────────────────────────────────────────

    @Override
    public NewUsersAnalyticsResponse getNewUsersAnalytics(String groupBy, LocalDate from, LocalDate to) {
        DateRange current  = resolveRange(from, to);
        DateRange previous = buildPreviousPeriod(current);

        List<Object[]> rawCurrent  = fetchRawNewUsers(groupBy, current);
        List<Object[]> rawPrevious = fetchRawNewUsers(groupBy, previous);

        List<NewUsersChartPoint> chartData = buildNewUsersChartData(rawCurrent, groupBy, current);

        long currentTotal  = chartData.stream().mapToLong(NewUsersChartPoint::getCount).sum();
        long previousTotal = rawPrevious.stream().mapToLong(r -> ((Number) r[1]).longValue()).sum();

        long days      = ChronoUnit.DAYS.between(current.from().toLocalDate(), current.to().toLocalDate()) + 1;
        double avg     = days > 0 ? (double) currentTotal / days : 0.0;

        NewUsersChartPoint peak   = chartData.stream().max(Comparator.comparingLong(NewUsersChartPoint::getCount)).orElse(null);
        NewUsersChartPoint lowest = chartData.stream().min(Comparator.comparingLong(NewUsersChartPoint::getCount)).orElse(null);

        Double growthRate;
        String trendStatus;
        if (previousTotal == 0) {
            growthRate  = null;
            trendStatus = currentTotal > 0 ? "Có phát sinh mới" : "Không có tăng trưởng";
        } else {
            growthRate  = Math.round((currentTotal - previousTotal) * 1000.0 / previousTotal) / 10.0;
            trendStatus = growthRate >= 50  ? "Tăng mạnh"
                        : growthRate >= 10  ? "Tăng"
                        : growthRate >= -10 ? "Ổn định"
                        : growthRate >= -30 ? "Giảm"
                        : "Giảm mạnh";
        }

        NewUsersSummary summary = NewUsersSummary.builder()
                .totalNewUsers(currentTotal)
                .averagePerDay(Math.round(avg * 100.0) / 100.0)
                .peakDay(peak   != null ? peak.getDate()   : null)
                .peakCount(peak != null ? peak.getCount()  : 0)
                .lowestDay(lowest   != null ? lowest.getDate()  : null)
                .lowestCount(lowest != null ? lowest.getCount() : 0)
                .currentPeriodCount(currentTotal)
                .previousPeriodCount(previousTotal)
                .growthRate(growthRate)
                .trendStatus(trendStatus)
                .build();

        return NewUsersAnalyticsResponse.builder()
                .summary(summary)
                .chartData(chartData)
                .insights(buildNewUsersInsights(chartData, currentTotal, previousTotal, growthRate, avg, peak))
                .build();
    }

    private List<Object[]> fetchRawNewUsers(String groupBy, DateRange range) {
        return switch (groupBy) {
            case "week"  -> accountRepository.countNewUsersByWeekBetween(range.from(), range.to());
            case "month" -> accountRepository.countNewUsersByMonthBetween(range.from(), range.to());
            default      -> accountRepository.countNewUsersByDayBetween(range.from(), range.to());
        };
    }

    private List<NewUsersChartPoint> buildNewUsersChartData(List<Object[]> raw, String groupBy, DateRange range) {
        Map<String, Long> map = raw.stream().collect(Collectors.toMap(
                r -> r[0].toString().substring(0, 10),
                r -> ((Number) r[1]).longValue(),
                (a, b) -> a + b
        ));
        LocalDate from = range.from().toLocalDate();
        LocalDate to   = range.to().toLocalDate();
        List<NewUsersChartPoint> result = new ArrayList<>();

        if ("week".equals(groupBy)) {
            LocalDate weekStart = from.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            while (!weekStart.isAfter(to)) {
                LocalDate weekEnd = weekStart.plusDays(6);
                String key   = weekStart.toString();
                String label = String.format("%02d/%02d–%02d/%02d",
                        weekStart.getDayOfMonth(), weekStart.getMonthValue(),
                        weekEnd.getDayOfMonth(), weekEnd.getMonthValue());
                result.add(NewUsersChartPoint.builder().date(key).label(label).count(map.getOrDefault(key, 0L)).build());
                weekStart = weekStart.plusWeeks(1);
            }
        } else if ("month".equals(groupBy)) {
            LocalDate monthStart = from.withDayOfMonth(1);
            while (!monthStart.isAfter(to)) {
                String key   = monthStart.toString();
                String label = String.format("%02d/%d", monthStart.getMonthValue(), monthStart.getYear());
                result.add(NewUsersChartPoint.builder().date(key).label(label).count(map.getOrDefault(key, 0L)).build());
                monthStart = monthStart.plusMonths(1);
            }
        } else {
            LocalDate cur = from;
            while (!cur.isAfter(to)) {
                String key   = cur.toString();
                String label = String.format("%02d/%02d", cur.getDayOfMonth(), cur.getMonthValue());
                result.add(NewUsersChartPoint.builder().date(key).label(label).count(map.getOrDefault(key, 0L)).build());
                cur = cur.plusDays(1);
            }
        }
        return result;
    }

    private List<NewUsersInsight> buildNewUsersInsights(
            List<NewUsersChartPoint> chartData, long total, long prevTotal,
            Double growthRate, double avgPerDay, NewUsersChartPoint peak) {

        List<NewUsersInsight> insights = new ArrayList<>();

        if (total == 0) {
            insights.add(NewUsersInsight.builder().type("trend").level("warning")
                    .title("Không có người dùng mới")
                    .message("Không có người dùng mới trong kỳ này.").build());
            return insights;
        }
        if (growthRate != null && growthRate <= -30) {
            insights.add(NewUsersInsight.builder().type("trend").level("warning")
                    .title("Người dùng mới giảm mạnh")
                    .message(String.format("Số người dùng mới giảm %.1f%% so với kỳ trước.", Math.abs(growthRate))).build());
        } else if (growthRate != null && growthRate >= 50) {
            insights.add(NewUsersInsight.builder().type("trend").level("success")
                    .title("Người dùng mới tăng mạnh")
                    .message(String.format("Số người dùng mới tăng %.1f%% so với kỳ trước.", growthRate)).build());
        }
        int maxZeroRun = 0, curRun = 0;
        for (NewUsersChartPoint p : chartData) {
            curRun = p.getCount() == 0 ? curRun + 1 : 0;
            if (curRun > maxZeroRun) maxZeroRun = curRun;
        }
        if (maxZeroRun >= 7) {
            insights.add(NewUsersInsight.builder().type("gap").level("warning")
                    .title("Khoảng trống đăng ký")
                    .message(String.format("Có %d ngày liên tiếp không có đăng ký mới.", maxZeroRun)).build());
        }
        if (peak != null && avgPerDay > 0 && peak.getCount() >= avgPerDay * 2) {
            insights.add(NewUsersInsight.builder().type("peak").level("info")
                    .title("Đăng ký tăng đột biến")
                    .message(String.format("Ngày %s có %d người dùng mới — gấp %.1f lần trung bình.",
                            peak.getLabel(), peak.getCount(), peak.getCount() / avgPerDay)).build());
        } else if (peak != null && peak.getCount() > 0) {
            insights.add(NewUsersInsight.builder().type("peak").level("info")
                    .title("Ngày đăng ký cao nhất")
                    .message(String.format("Ngày %s có %d người dùng mới, cao nhất trong kỳ.",
                            peak.getLabel(), peak.getCount())).build());
        }
        int n = chartData.size();
        if (n >= 3) {
            long d1 = chartData.get(n - 3).getCount();
            long d2 = chartData.get(n - 2).getCount();
            long d3 = chartData.get(n - 1).getCount();
            if (d2 <= d1 && d3 <= d2) {
                insights.add(NewUsersInsight.builder().type("slowdown").level("info")
                        .title("Tốc độ đăng ký đang chậm lại")
                        .message("3 kỳ gần nhất liên tiếp giảm hoặc không tăng.").build());
            }
        }
        return insights;
    }

    // ── Engagement Analytics ──────────────────────────────────────────────────

    @Override
    public EngagementAnalyticsResponse getEngagementAnalytics(LocalDate from, LocalDate to) {
        DateRange current  = resolveRange(from, to);
        DateRange previous = buildPreviousPeriod(current);
        LocalDate today    = LocalDate.now();
        LocalDate rangeTo  = current.to().toLocalDate();

        Map<String, Long> dauByDay = activityLogRepository.getDauByDayBetween(current.from(), current.to())
                .stream().collect(Collectors.toMap(
                        r -> r[0].toString().substring(0, 10),
                        r -> ((Number) r[1]).longValue(), (a, b) -> a + b));

        List<AnalyticsChartPoint> dauChart = buildDailyChart(current, dauByDay);

        LocalDate dauTodayDate = !today.isBefore(current.from().toLocalDate()) && !today.isAfter(rangeTo)
                ? today : rangeTo;
        long dauToday = dauByDay.getOrDefault(dauTodayDate.toString(), 0L);

        long mau30 = activityLogRepository.countDistinctActiveUsersBetween(current.to().minusDays(30), current.to());
        double dauMauRatio = mau30 == 0 ? 0.0 : round1(dauToday * 100.0 / mau30);
        double avgDau = dauChart.isEmpty() ? 0.0
                : round2(dauChart.stream().mapToLong(AnalyticsChartPoint::getCount).average().orElse(0));

        AnalyticsChartPoint peakDau = dauChart.stream()
                .max(Comparator.comparingLong(AnalyticsChartPoint::getCount)).orElse(null);

        int consecutiveDrop = countConsecutiveDropDays(dauChart);
        long prevPeriodDau  = activityLogRepository.countDistinctActiveUsersBetween(previous.from(), previous.to());
        long curPeriodDau   = activityLogRepository.countDistinctActiveUsersBetween(current.from(), current.to());
        Double dauGrowth;
        if (prevPeriodDau == 0) {
            dauGrowth = curPeriodDau == 0 ? 0.0 : null;
        } else {
            dauGrowth = round1((curPeriodDau - prevPeriodDau) * 100.0 / prevPeriodDau);
        }

        DauMauSummary dauSummary = DauMauSummary.builder()
                .dauToday(dauToday).mau30Days(mau30).dauMauRatio(dauMauRatio)
                .averageDau30Days(avgDau)
                .peakDauDay(peakDau != null ? peakDau.getDate() : null)
                .peakDauCount(peakDau != null ? peakDau.getCount() : 0)
                .dauTrendStatus(classifyDauTrend(dauChart, consecutiveDrop, dauGrowth))
                .consecutiveDauDropDays(consecutiveDrop)
                .previousPeriodDau(prevPeriodDau).dauGrowthRate(dauGrowth)
                .build();

        Map<String, Long> interactionByDay = activityLogRepository
                .getInteractionsByDayBetween(current.from(), current.to()).stream()
                .collect(Collectors.toMap(r -> r[0].toString().substring(0, 10),
                        r -> ((Number) r[1]).longValue(), (a, b) -> a + b));

        List<AnalyticsChartPoint> interactionChart = buildDailyChart(current, interactionByDay);
        long totalInteractions = interactionChart.stream().mapToLong(AnalyticsChartPoint::getCount).sum();
        long days = ChronoUnit.DAYS.between(current.from().toLocalDate(), rangeTo) + 1;
        double avgInteractions = days > 0 ? round2((double) totalInteractions / days) : 0.0;

        AnalyticsChartPoint peakInteraction = interactionChart.stream()
                .max(Comparator.comparingLong(AnalyticsChartPoint::getCount)).orElse(null);

        long prevInteractions = activityLogRepository.getInteractionsByDayBetween(previous.from(), previous.to())
                .stream().mapToLong(r -> ((Number) r[1]).longValue()).sum();
        Double interactionGrowth;
        if (prevInteractions == 0) {
            interactionGrowth = totalInteractions == 0 ? 0.0 : null;
        } else {
            interactionGrowth = round1((totalInteractions - prevInteractions) * 100.0 / prevInteractions);
        }

        List<InteractionBreakdownItem> breakdown = buildInteractionBreakdown(current);

        InteractionSummary interactionSummary = InteractionSummary.builder()
                .totalInteractions(totalInteractions)
                .averageInteractionsPerDay(avgInteractions)
                .peakInteractionDay(peakInteraction != null ? peakInteraction.getDate() : null)
                .peakInteractionCount(peakInteraction != null ? peakInteraction.getCount() : 0)
                .interactionTrendStatus(classifyInteractionTrend(interactionChart, interactionGrowth))
                .interactionGrowthRate(interactionGrowth)
                .topInteractionType(breakdown.isEmpty() ? null : breakdown.get(0).getType())
                .build();

        return EngagementAnalyticsResponse.builder()
                .dauMau(DauMauAnalyticsResponse.builder()
                        .summary(dauSummary).chartData(dauChart)
                        .insights(limitInsights(buildDauInsights(dauSummary, dauChart, dauTodayDate)))
                        .build())
                .interactions(InteractionAnalyticsResponse.builder()
                        .summary(interactionSummary).breakdown(breakdown)
                        .chartData(interactionChart)
                        .insights(limitInsights(buildInteractionInsights(interactionSummary, breakdown, interactionChart, avgInteractions)))
                        .build())
                .build();
    }

    // ── Engagement helpers ────────────────────────────────────────────────────

    private List<AnalyticsChartPoint> buildDailyChart(DateRange range, Map<String, Long> countByDay) {
        List<AnalyticsChartPoint> result = new ArrayList<>();
        LocalDate cur = range.from().toLocalDate();
        LocalDate to  = range.to().toLocalDate();
        while (!cur.isAfter(to)) {
            String key = cur.toString();
            result.add(AnalyticsChartPoint.builder()
                    .date(key)
                    .label(String.format("%02d/%02d", cur.getDayOfMonth(), cur.getMonthValue()))
                    .count(countByDay.getOrDefault(key, 0L))
                    .build());
            cur = cur.plusDays(1);
        }
        return result;
    }

    private int countConsecutiveDropDays(List<AnalyticsChartPoint> chart) {
        int n = chart.size();
        if (n < 2) return 0;
        int streak = 0;
        for (int i = n - 1; i >= 1; i--) {
            if (chart.get(i).getCount() < chart.get(i - 1).getCount()) streak++;
            else break;
        }
        return streak;
    }

    private String classifyDauTrend(List<AnalyticsChartPoint> chart, int consecutiveDrop, Double growth) {
        if (consecutiveDrop >= 3) return "Giảm cuối kỳ";
        if (growth != null && growth >= 10) return "Tăng";
        if (growth != null && growth <= -10) return "Giảm";
        if (chart.size() >= 5) {
            double avg = chart.stream().mapToLong(AnalyticsChartPoint::getCount).average().orElse(0);
            if (avg > 0) {
                long above = chart.stream().filter(p -> p.getCount() > avg * 1.5).count();
                long below = chart.stream().filter(p -> p.getCount() < avg * 0.5).count();
                if (above + below >= chart.size() / 3) return "Không ổn định";
            }
        }
        return "Ổn định";
    }

    private String classifyInteractionTrend(List<AnalyticsChartPoint> chart, Double growth) {
        if (growth != null && growth <= INTERACTION_DROP_PCT) return "Giảm mạnh";
        if (chart.size() >= 5) {
            double avg = chart.stream().mapToLong(AnalyticsChartPoint::getCount).average().orElse(0);
            if (avg > 0 && chart.stream().filter(p -> p.getCount() >= avg * 2).count() >= 2) return "Không ổn định";
        }
        if (growth != null && growth >= 10) return "Tăng";
        return "Ổn định";
    }

    private List<InteractionBreakdownItem> buildInteractionBreakdown(DateRange range) {
        Map<String, Long> raw = new HashMap<>();
        for (Object[] row : activityLogRepository.getInteractionBreakdownBetween(range.from(), range.to())) {
            raw.put(row[0].toString(), ((Number) row[1]).longValue());
        }
        List<String> order = List.of("POST_CREATED", "COMMENT_ADDED", "REACTION_ADDED", "POST_SHARED", "FRIEND_REQUEST_SENT");
        long total = raw.values().stream().mapToLong(Long::longValue).sum();
        List<InteractionBreakdownItem> items = new ArrayList<>();
        for (String action : order) {
            long count = raw.getOrDefault(action, 0L);
            int pct = total == 0 ? 0 : (int) Math.round(count * 100.0 / total);
            items.add(InteractionBreakdownItem.builder()
                    .type(ACTION_LABELS.get(action)).count(count).percentage(pct).build());
        }
        items.sort(Comparator.comparingLong(InteractionBreakdownItem::getCount).reversed());
        return items;
    }

    private List<AnalyticsInsight> buildDauInsights(DauMauSummary s, List<AnalyticsChartPoint> chart, LocalDate dauTodayDate) {
        List<AnalyticsInsight> insights = new ArrayList<>();
        if (s.getMau30Days() < MAU_MIN_SAMPLE) {
            insights.add(AnalyticsInsight.builder().type("insufficient_data").level("warning")
                    .title("Chưa đủ dữ liệu để đánh giá DAU/MAU")
                    .message(String.format("MAU hiện chỉ có %d người dùng (cần ít nhất %d).", s.getMau30Days(), MAU_MIN_SAMPLE))
                    .actionSuggestion("Tiếp tục thu thập dữ liệu trước khi đưa ra quyết định vận hành.").build());
        }
        if (s.getConsecutiveDauDropDays() >= 3 && chart.size() > s.getConsecutiveDauDropDays()) {
            AnalyticsChartPoint last   = chart.get(chart.size() - 1);
            AnalyticsChartPoint before = chart.get(chart.size() - 1 - s.getConsecutiveDauDropDays());
            insights.add(AnalyticsInsight.builder().type("consecutive_drop").level("warning")
                    .title("DAU đang giảm liên tục")
                    .message(String.format("DAU giảm %d ngày liên tiếp, từ %d ngày %s xuống %d ngày %s.",
                            s.getConsecutiveDauDropDays(), before.getCount(), before.getLabel(),
                            last.getCount(), last.getLabel()))
                    .actionSuggestion("Kiểm tra push notification, nội dung mới và lỗi hệ thống.").build());
        }
        if (s.getAverageDau30Days() > 0 && s.getDauToday() < s.getAverageDau30Days()) {
            insights.add(AnalyticsInsight.builder().type("below_average").level("warning")
                    .title("DAU hôm nay thấp hơn trung bình")
                    .message(String.format("DAU ngày %s là %d, thấp hơn trung bình %.1f/ngày.",
                            dauTodayDate.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM")),
                            s.getDauToday(), s.getAverageDau30Days()))
                    .actionSuggestion("Xem xét chiến dịch kích hoạt lại hoặc thông báo nhắc người dùng.").build());
        }
        if (s.getDauGrowthRate() != null && s.getDauGrowthRate() >= 10
                && insights.stream().noneMatch(i -> "consecutive_drop".equals(i.getType()))) {
            insights.add(AnalyticsInsight.builder().type("trend").level("success")
                    .title("DAU đang tăng trưởng")
                    .message(String.format("DAU kỳ này tăng %.1f%% so với kỳ trước.", s.getDauGrowthRate())).build());
        }
        return insights;
    }

    private List<AnalyticsInsight> buildInteractionInsights(
            InteractionSummary s, List<InteractionBreakdownItem> breakdown,
            List<AnalyticsChartPoint> chart, double avgPerDay) {
        List<AnalyticsInsight> insights = new ArrayList<>();
        if (s.getTotalInteractions() == 0) {
            insights.add(AnalyticsInsight.builder().type("no_data").level("info")
                    .title("Chưa có tương tác trong kỳ")
                    .message("Không ghi nhận tương tác nào trong khoảng thời gian đã chọn.")
                    .actionSuggestion("Khuyến khích người dùng đăng bài, bình luận hoặc phản ứng.").build());
            return insights;
        }
        InteractionBreakdownItem top = breakdown.isEmpty() ? null : breakdown.get(0);
        if (top != null && top.getPercentage() >= DOMINANT_INTERACTION_PCT) {
            insights.add(AnalyticsInsight.builder().type("dominant_interaction").level("info")
                    .title(top.getType() + " là tương tác nổi bật nhất")
                    .message(String.format("%s chiếm %d%% tổng tương tác trong kỳ.", top.getType(), top.getPercentage()))
                    .actionSuggestion("Tạo thêm nội dung gợi ý để cân bằng giữa tiêu thụ và sáng tạo.").build());
        }
        if (s.getInteractionGrowthRate() != null && s.getInteractionGrowthRate() <= INTERACTION_DROP_PCT) {
            insights.add(AnalyticsInsight.builder().type("sharp_decline").level("danger")
                    .title("Tương tác giảm mạnh")
                    .message(String.format("Tổng tương tác giảm %.1f%% so với kỳ trước.", Math.abs(s.getInteractionGrowthRate())))
                    .actionSuggestion("Rà soát lỗi hệ thống và nội dung mới, cân nhắc push notification.").build());
        }
        if (s.getPeakInteractionCount() >= avgPerDay * 2 && avgPerDay > 0) {
            String peakLabel = chart.stream().filter(p -> p.getDate().equals(s.getPeakInteractionDay()))
                    .map(AnalyticsChartPoint::getLabel).findFirst().orElse(s.getPeakInteractionDay());
            insights.add(AnalyticsInsight.builder().type("interaction_spike").level("warning")
                    .title("Tương tác tăng đột biến")
                    .message(String.format("Ngày %s có %d tương tác — gấp %.1f lần trung bình.",
                            peakLabel, s.getPeakInteractionCount(), s.getPeakInteractionCount() / avgPerDay))
                    .actionSuggestion("Xem xét nội dung/sự kiện ngày đó để nhân rộng mô hình thành công.").build());
        }
        return insights;
    }

    private List<AnalyticsInsight> limitInsights(List<AnalyticsInsight> insights) {
        insights.sort(Comparator.comparingInt(i -> switch (i.getLevel()) {
            case "danger"  -> 0;
            case "warning" -> 1;
            case "success" -> 2;
            default        -> 3;
        }));
        return insights.stream().limit(MAX_INSIGHTS).toList();
    }

    // ── Shared helpers ────────────────────────────────────────────────────────

    private List<PeriodCountResponse> mapPeriodRows(List<Object[]> rows) {
        return rows.stream()
                .map(r -> PeriodCountResponse.builder()
                        .period(r[0].toString())
                        .count(((Number) r[1]).longValue())
                        .build())
                .toList();
    }

    private static double growthPercent(long current, long previous) {
        if (previous == 0) return current > 0 ? 100.0 : 0.0;
        return Math.round((current - previous) * 1000.0 / previous) / 10.0;
    }

    private static double round1(double v) { return Math.round(v * 10.0)  / 10.0; }
    private static double round2(double v) { return Math.round(v * 100.0) / 100.0; }

    private DateRange resolveRange(LocalDate from, LocalDate to) {
        LocalDate safeTo   = to   != null ? to   : LocalDate.now();
        LocalDate safeFrom = from != null ? from : safeTo.minusDays(29);
        if (safeFrom.isAfter(safeTo)) { LocalDate t = safeFrom; safeFrom = safeTo; safeTo = t; }
        return new DateRange(safeFrom.atStartOfDay(), safeTo.atTime(LocalTime.MAX));
    }

    private DateRange resolveCompareRange(DateRange current, String compareMode) {
        LocalDate fromDate = current.from().toLocalDate();
        LocalDate toDate   = current.to().toLocalDate();
        return switch (compareMode == null ? "previous_period" : compareMode) {
            case "previous_week"  -> new DateRange(fromDate.minusWeeks(1).atStartOfDay(),  toDate.minusWeeks(1).atTime(LocalTime.MAX));
            case "previous_month" -> new DateRange(fromDate.minusMonths(1).atStartOfDay(), toDate.minusMonths(1).atTime(LocalTime.MAX));
            case "previous_year"  -> new DateRange(fromDate.minusYears(1).atStartOfDay(),  toDate.minusYears(1).atTime(LocalTime.MAX));
            default -> {
                long days = ChronoUnit.DAYS.between(fromDate, toDate) + 1;
                LocalDate prevTo   = fromDate.minusDays(1);
                LocalDate prevFrom = prevTo.minusDays(days - 1);
                yield new DateRange(prevFrom.atStartOfDay(), prevTo.atTime(LocalTime.MAX));
            }
        };
    }

    private DateRange buildPreviousPeriod(DateRange current) {
        LocalDate from = current.from().toLocalDate();
        LocalDate to   = current.to().toLocalDate();
        long days      = ChronoUnit.DAYS.between(from, to) + 1;
        LocalDate prevTo   = from.minusDays(1);
        LocalDate prevFrom = prevTo.minusDays(days - 1);
        return new DateRange(prevFrom.atStartOfDay(), prevTo.atTime(LocalTime.MAX));
    }

    private record DateRange(LocalDateTime from, LocalDateTime to) {}
}
