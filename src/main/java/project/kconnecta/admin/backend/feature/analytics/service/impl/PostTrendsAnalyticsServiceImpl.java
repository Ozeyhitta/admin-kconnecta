package project.kconnecta.admin.backend.feature.analytics.service.impl;

import project.kconnecta.admin.backend.feature.analytics.service.PostTrendsAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.admin.backend.common.enums.PostStatus;
import project.kconnecta.admin.backend.entity.Post;
import project.kconnecta.admin.backend.entity.User;
import project.kconnecta.admin.backend.feature.analytics.dto.response.AnalyticsSummaryResponse;
import project.kconnecta.admin.backend.feature.analytics.dto.response.ChartDataResponse;
import project.kconnecta.admin.backend.feature.analytics.dto.response.PostTrendsResponse;
import project.kconnecta.admin.backend.feature.analytics.dto.response.TopPostResponse;
import project.kconnecta.admin.backend.feature.analytics.dto.response.TopicTrendResponse;
import project.kconnecta.admin.backend.feature.analytics.dto.response.TrendAlertResponse;
import project.kconnecta.admin.backend.feature.analytics.repository.PostAnalyticsRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class PostTrendsAnalyticsServiceImpl implements PostTrendsAnalyticsService {

    private final PostAnalyticsRepository repository;

    // ── Trend-score weights ─────────────────────────────────────────────────
    // Original spec: view*0.1 + like*1 + comment*2 + share*3 + save*3 - report*5.
    // This schema has no `view` and no `save` tables, so those signals are 0 and
    // the formula collapses to the four available signals below.
    private static final double LIKE_WEIGHT = 1.0;
    private static final double COMMENT_WEIGHT = 2.0;
    private static final double SHARE_WEIGHT = 3.0;
    private static final double REPORT_WEIGHT = -5.0;
    private static final double[] WEIGHTS = {LIKE_WEIGHT, COMMENT_WEIGHT, SHARE_WEIGHT, REPORT_WEIGHT};
    private static final int LIKE = 0, COMMENT = 1, SHARE = 2, REPORT = 3;

    // ── Growth classification thresholds (percent) ──────────────────────────
    private static final double STRONG_UP_PCT = 50.0;  // "Tăng mạnh"
    private static final double UP_PCT = 10.0;          // "Tăng"
    private static final double DOWN_PCT = -10.0;       // below this → "Giảm"; between → "Ổn định"

    // ── Alert thresholds ────────────────────────────────────────────────────
    private static final long REPORT_COUNT_THRESHOLD = 5;       // report_count >= 5
    private static final double REPORT_RATE_THRESHOLD = 0.10;    // report_rate >= 10%
    private static final double VIRAL_FACTOR = 2.0;             // 24h score > 2x topic avg
    private static final double TOPIC_SURGE_PCT = 50.0;         // topic growth_rate >= 50%
    private static final long COMMENT_HIGH = 10;                // "comment cao"
    private static final long REPORT_HIGH = 3;                  // "report cao"

    // ── Output sizes ────────────────────────────────────────────────────────
    private static final int TOP_POSTS_LIMIT = 10;
    private static final int TOP_TOPICS_BAR = 10;
    private static final int TOP_TOPICS_LINE = 5;

    private static final String FALLBACK_TOPIC = "khác"; // posts without any hashtag
    private static final int MAX_TAGS_PER_POST = 10;
    private static final Pattern HASHTAG = Pattern.compile("#([\\p{L}\\p{N}_]+)");

    @Override
    @Transactional(readOnly = true)
    public PostTrendsResponse getPostTrends(String range) {
        int days = "30d".equalsIgnoreCase(range) ? 30 : 7;
        String normalizedRange = days == 30 ? "30d" : "7d";

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime curFrom = now.minusDays(days);          // start of current window
        LocalDateTime prevFrom = now.minusDays((long) days * 2); // start of previous window
        LocalDateTime last24hFrom = now.minusHours(24);
        LocalDate curFromDate = curFrom.toLocalDate();

        // 1. Pull the four interaction aggregates (4 grouped queries, no N+1).
        Map<UUID, PostAgg> aggregates = new HashMap<>();
        accumulate(aggregates, repository.aggregateReactions(prevFrom, curFrom, last24hFrom), LIKE, curFromDate);
        accumulate(aggregates, repository.aggregateComments(prevFrom, curFrom, last24hFrom), COMMENT, curFromDate);
        accumulate(aggregates, repository.aggregateShares(prevFrom, curFrom, last24hFrom), SHARE, curFromDate);
        accumulate(aggregates, repository.aggregateReports(prevFrom, curFrom, last24hFrom), REPORT, curFromDate);

        if (aggregates.isEmpty()) {
            return emptyResponse(normalizedRange, curFromDate, now);
        }

        // 2. Load post metadata + author in ONE query, skip deleted posts.
        Map<UUID, Post> postsById = new HashMap<>();
        for (Post p : repository.findAllWithAuthorByIdIn(aggregates.keySet())) {
            if (p.getStatus() != PostStatus.DELETED) {
                postsById.put(p.getId(), p);
            }
        }

        // 3. Build per-post derived data (scores, growth, topics).
        List<PostData> posts = new ArrayList<>();
        for (Map.Entry<UUID, PostAgg> e : aggregates.entrySet()) {
            Post post = postsById.get(e.getKey());
            if (post == null) {
                continue; // interaction on a deleted/missing post → ignore
            }
            posts.add(buildPostData(post, e.getValue()));
        }
        if (posts.isEmpty()) {
            return emptyResponse(normalizedRange, curFromDate, now);
        }

        // 4. Group posts into hashtag topics.
        Map<String, TopicAgg> topics = groupByTopic(posts);

        // 5. Assemble the response sections.
        List<TopicTrendResponse> topicTrends = buildTopicTrends(topics);
        List<TopPostResponse> topPosts = buildTopPosts(posts);
        List<TrendAlertResponse> alerts = buildAlerts(posts, topics);
        ChartDataResponse chartData = buildChartData(topics, curFromDate, now.toLocalDate());
        AnalyticsSummaryResponse summary = buildSummary(normalizedRange, posts, topics, alerts.size(), now);

        return PostTrendsResponse.builder()
                .summary(summary)
                .topicTrends(topicTrends)
                .topPosts(topPosts)
                .alerts(alerts)
                .chartData(chartData)
                .build();
    }

    // ────────────────────────────────────────────────────────────────────────
    // Aggregation
    // ────────────────────────────────────────────────────────────────────────

    /** Folds one interaction table's grouped rows into the per-post accumulator. */
    private void accumulate(Map<UUID, PostAgg> map, List<Object[]> rows, int source, LocalDate curFromDate) {
        double weight = WEIGHTS[source];
        for (Object[] r : rows) {
            UUID postId = toUuid(r[0]);
            LocalDate day = toLocalDate(r[1]);
            long cntDay = toLong(r[2]);
            long cur = toLong(r[3]);
            long prev = toLong(r[4]);
            long last24h = toLong(r[5]);

            PostAgg agg = map.computeIfAbsent(postId, k -> new PostAgg());
            agg.curRaw[source] += cur;
            agg.prevScore += weight * prev;
            agg.score24h += weight * last24h;

            // Only current-window days feed the per-day chart.
            if (!day.isBefore(curFromDate)) {
                agg.dailyScore.merge(day, weight * cntDay, (a, b) -> a + b);
            }
        }
    }

    private PostData buildPostData(Post post, PostAgg agg) {
        double curScore = agg.curScore();
        double growth = growthPercent(curScore, agg.prevScore);
        return new PostData(
                post,
                agg,
                round1(curScore),
                round1(agg.prevScore),
                growth,
                classify(growth),
                extractTopics(post.getContent()));
    }

    // ────────────────────────────────────────────────────────────────────────
    // Topic grouping
    // ────────────────────────────────────────────────────────────────────────

    private Map<String, TopicAgg> groupByTopic(List<PostData> posts) {
        Map<String, TopicAgg> topics = new HashMap<>();
        for (PostData pd : posts) {
            for (String topic : pd.topics) {
                TopicAgg ta = topics.computeIfAbsent(topic, k -> new TopicAgg());
                ta.postCount++;
                ta.score += pd.trendScore;
                ta.prevScore += pd.previousScore;
                ta.reportCount += pd.agg.curRaw[REPORT];
                ta.commentCount += pd.agg.curRaw[COMMENT];
                ta.posts.add(pd);
                pd.agg.dailyScore.forEach((d, v) -> ta.dailyScore.merge(d, v, (a, b) -> a + b));
            }
        }
        return topics;
    }

    private List<TopicTrendResponse> buildTopicTrends(Map<String, TopicAgg> topics) {
        return topics.entrySet().stream()
                .map(e -> {
                    TopicAgg t = e.getValue();
                    double growth = growthPercent(t.score, t.prevScore);
                    return TopicTrendResponse.builder()
                            .topic(e.getKey())
                            .postCount(t.postCount)
                            .topicScore(round1(t.score))
                            .previousScore(round1(t.prevScore))
                            .growthRate(growth)
                            .trendLabel(classify(growth))
                            .reportCount(t.reportCount)
                            .commentCount(t.commentCount)
                            .build();
                })
                .sorted(Comparator.comparingDouble(TopicTrendResponse::getTopicScore).reversed())
                .toList();
    }

    // ────────────────────────────────────────────────────────────────────────
    // Top posts
    // ────────────────────────────────────────────────────────────────────────

    private List<TopPostResponse> buildTopPosts(List<PostData> posts) {
        return posts.stream()
                .sorted(Comparator.comparingDouble((PostData p) -> p.trendScore).reversed())
                .limit(TOP_POSTS_LIMIT)
                .map(pd -> {
                    Post post = pd.post;
                    User author = post.getAuthor();
                    return TopPostResponse.builder()
                            .postId(post.getId())
                            .content(snippet(post.getContent()))
                            .authorId(author != null ? author.getId() : null)
                            .authorName(author != null ? author.getFullName() : null)
                            .authorUsername(author != null ? author.getUsername() : null)
                            .authorAvatarUrl(author != null ? author.getAvatarUrl() : null)
                            .status(post.getStatus() != null ? post.getStatus().name() : null)
                            .createdAt(post.getCreatedAt())
                            .trendScore(pd.trendScore)
                            .previousScore(pd.previousScore)
                            .growthRate(pd.growthRate)
                            .trendLabel(pd.trendLabel)
                            .likeCount(pd.agg.curRaw[LIKE])
                            .commentCount(pd.agg.curRaw[COMMENT])
                            .shareCount(pd.agg.curRaw[SHARE])
                            .reportCount(pd.agg.curRaw[REPORT])
                            .topics(new ArrayList<>(pd.topics))
                            .build();
                })
                .toList();
    }

    // ────────────────────────────────────────────────────────────────────────
    // Alerts
    // ────────────────────────────────────────────────────────────────────────

    private List<TrendAlertResponse> buildAlerts(List<PostData> posts, Map<String, TopicAgg> topics) {
        List<TrendAlertResponse> alerts = new ArrayList<>();

        // Per-post rules.
        for (PostData pd : posts) {
            long report = pd.agg.curRaw[REPORT];
            long comment = pd.agg.curRaw[COMMENT];
            long totalInteractions = pd.agg.totalInteractions();
            double reportRate = totalInteractions == 0 ? 0.0 : (double) report / totalInteractions;

            // Rule 1: report spike — report_count >= 5 OR report_rate >= 10%.
            if (report >= REPORT_COUNT_THRESHOLD || (report > 0 && reportRate >= REPORT_RATE_THRESHOLD)) {
                alerts.add(TrendAlertResponse.builder()
                        .id("REPORT_SPIKE:" + pd.post.getId())
                        .type("REPORT_SPIKE")
                        .severity("HIGH")
                        .scope("post")
                        .targetId(pd.post.getId().toString())
                        .targetLabel(snippet(pd.post.getContent()))
                        .title("Bài viết bị báo cáo nhiều")
                        .message(String.format(
                                "Bài viết có %d báo cáo (tỉ lệ %.1f%% trên %d tương tác). Cần xem xét kiểm duyệt.",
                                report, reportRate * 100, totalInteractions))
                        .metrics(Map.of(
                                "reportCount", report,
                                "reportRate", round1(reportRate * 100),
                                "totalInteractions", totalInteractions))
                        .build());
            }

            // Rule 4: controversial — comment cao AND report cao.
            if (comment >= COMMENT_HIGH && report >= REPORT_HIGH) {
                alerts.add(TrendAlertResponse.builder()
                        .id("CONTROVERSIAL:" + pd.post.getId())
                        .type("CONTROVERSIAL")
                        .severity("HIGH")
                        .scope("post")
                        .targetId(pd.post.getId().toString())
                        .targetLabel(snippet(pd.post.getContent()))
                        .title("Bài viết gây tranh cãi")
                        .message(String.format(
                                "Bài viết có lượng bình luận cao (%d) đi kèm nhiều báo cáo (%d) — dấu hiệu nội dung gây tranh cãi.",
                                comment, report))
                        .metrics(Map.of("commentCount", comment, "reportCount", report))
                        .build());
            }
        }

        // Rule 2: viral post — 24h trend_score > 2x the average of posts in the same topic.
        // De-duplicate so a single post viral across several topics only alerts once.
        Set<UUID> viralAlerted = new java.util.HashSet<>();
        for (Map.Entry<String, TopicAgg> e : topics.entrySet()) {
            TopicAgg t = e.getValue();
            double avg24h = t.averageScore24h();
            if (avg24h <= 0) {
                continue;
            }
            for (PostData pd : t.posts) {
                if (pd.agg.score24h > VIRAL_FACTOR * avg24h
                        && pd.agg.score24h > 0
                        && viralAlerted.add(pd.post.getId())) {
                    alerts.add(TrendAlertResponse.builder()
                            .id("VIRAL_POST:" + pd.post.getId())
                            .type("VIRAL_POST")
                            .severity("MEDIUM")
                            .scope("post")
                            .targetId(pd.post.getId().toString())
                            .targetLabel(snippet(pd.post.getContent()))
                            .title("Bài viết tăng tương tác đột biến")
                            .message(String.format(
                                    "Điểm tương tác 24h (%.1f) cao gấp hơn %.0f lần trung bình chủ đề #%s (%.1f).",
                                    pd.agg.score24h, VIRAL_FACTOR, e.getKey(), avg24h))
                            .metrics(Map.of(
                                    "score24h", round1(pd.agg.score24h),
                                    "topicAvg24h", round1(avg24h),
                                    "topic", e.getKey()))
                            .build());
                }
            }
        }

        // Rule 3: topic surge — topic growth_rate >= 50%.
        for (Map.Entry<String, TopicAgg> e : topics.entrySet()) {
            TopicAgg t = e.getValue();
            double growth = growthPercent(t.score, t.prevScore);
            if (growth >= TOPIC_SURGE_PCT && t.score > 0) {
                alerts.add(TrendAlertResponse.builder()
                        .id("TOPIC_SURGE:" + e.getKey())
                        .type("TOPIC_SURGE")
                        .severity("MEDIUM")
                        .scope("topic")
                        .targetId(e.getKey())
                        .targetLabel("#" + e.getKey())
                        .title("Chủ đề đang bùng nổ")
                        .message(String.format(
                                "Chủ đề #%s tăng trưởng %.1f%% so với kỳ trước (%d bài viết).",
                                e.getKey(), growth, t.postCount))
                        .metrics(Map.of("growthRate", growth, "postCount", t.postCount))
                        .build());
            }
        }

        // HIGH first, then MEDIUM, then INFO.
        alerts.sort(Comparator.comparingInt(a -> severityRank(a.getSeverity())));
        return alerts;
    }

    // ────────────────────────────────────────────────────────────────────────
    // Charts
    // ────────────────────────────────────────────────────────────────────────

    private ChartDataResponse buildChartData(Map<String, TopicAgg> topics, LocalDate from, LocalDate to) {
        List<Map.Entry<String, TopicAgg>> sorted = topics.entrySet().stream()
                .sorted(Comparator.comparingDouble((Map.Entry<String, TopicAgg> e) -> e.getValue().score).reversed())
                .toList();

        // Bar chart — top topics by score.
        List<ChartDataResponse.TopicScorePoint> bar = sorted.stream()
                .limit(TOP_TOPICS_BAR)
                .map(e -> ChartDataResponse.TopicScorePoint.builder()
                        .topic(e.getKey())
                        .score(round1(e.getValue().score))
                        .postCount(e.getValue().postCount)
                        .build())
                .toList();

        // Line chart — shared date axis + a series per top topic.
        List<String> dates = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            dates.add(d.toString());
        }
        List<ChartDataResponse.TopicSeries> series = sorted.stream()
                .limit(TOP_TOPICS_LINE)
                .map(e -> {
                    Map<LocalDate, Double> daily = e.getValue().dailyScore;
                    List<Double> data = dates.stream()
                            .map(ds -> round1(daily.getOrDefault(LocalDate.parse(ds), 0.0)))
                            .toList();
                    return ChartDataResponse.TopicSeries.builder()
                            .topic(e.getKey())
                            .data(data)
                            .build();
                })
                .toList();

        return ChartDataResponse.builder()
                .topicBar(bar)
                .topicDaily(ChartDataResponse.TopicDailySeries.builder().dates(dates).series(series).build())
                .build();
    }

    // ────────────────────────────────────────────────────────────────────────
    // Summary
    // ────────────────────────────────────────────────────────────────────────

    private AnalyticsSummaryResponse buildSummary(String range, List<PostData> posts,
                                                  Map<String, TopicAgg> topics, int alertCount, LocalDateTime now) {
        long totalInteractions = 0;
        long totalReports = 0;
        double scoreSum = 0;
        for (PostData pd : posts) {
            totalInteractions += pd.agg.totalInteractions();
            totalReports += pd.agg.curRaw[REPORT];
            scoreSum += pd.trendScore;
        }

        String topTopic = null;
        double topTopicScore = 0;
        for (Map.Entry<String, TopicAgg> e : topics.entrySet()) {
            if (topTopic == null || e.getValue().score > topTopicScore) {
                topTopic = e.getKey();
                topTopicScore = e.getValue().score;
            }
        }

        return AnalyticsSummaryResponse.builder()
                .range(range)
                .totalPosts(posts.size())
                .totalInteractions(totalInteractions)
                .totalReports(totalReports)
                .totalTopics(topics.size())
                .totalAlerts(alertCount)
                .topTopic(topTopic)
                .topTopicScore(round1(topTopicScore))
                .avgTrendScore(round1(scoreSum / posts.size()))
                .generatedAt(now)
                .build();
    }

    private PostTrendsResponse emptyResponse(String range, LocalDate from, LocalDateTime now) {
        List<String> dates = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(now.toLocalDate()); d = d.plusDays(1)) {
            dates.add(d.toString());
        }
        return PostTrendsResponse.builder()
                .summary(AnalyticsSummaryResponse.builder()
                        .range(range)
                        .totalPosts(0).totalInteractions(0).totalReports(0)
                        .totalTopics(0).totalAlerts(0)
                        .topTopic(null).topTopicScore(0).avgTrendScore(0)
                        .generatedAt(now)
                        .build())
                .topicTrends(List.of())
                .topPosts(List.of())
                .alerts(List.of())
                .chartData(ChartDataResponse.builder()
                        .topicBar(List.of())
                        .topicDaily(ChartDataResponse.TopicDailySeries.builder()
                                .dates(dates).series(List.of()).build())
                        .build())
                .build();
    }

    // ────────────────────────────────────────────────────────────────────────
    // Helpers
    // ────────────────────────────────────────────────────────────────────────

    /** Hashtags from content, lowercased & de-duplicated; falls back to "khác" when none. */
    private Set<String> extractTopics(String content) {
        Set<String> tags = new LinkedHashSet<>();
        if (content != null) {
            Matcher m = HASHTAG.matcher(content);
            while (m.find() && tags.size() < MAX_TAGS_PER_POST) {
                tags.add(m.group(1).toLowerCase(java.util.Locale.ROOT));
            }
        }
        if (tags.isEmpty()) {
            tags.add(FALLBACK_TOPIC);
        }
        return tags;
    }

    private static String snippet(String content) {
        if (content == null) {
            return "";
        }
        String trimmed = content.strip();
        return trimmed.length() <= 140 ? trimmed : trimmed.substring(0, 140) + "…";
    }

    /**
     * (current - previous) / |previous| * 100, rounded to 1 decimal.
     * Handles previous == 0: a non-zero current is treated as +/-100% (a brand-new trend),
     * while 0→0 stays flat at 0%.
     */
    private static double growthPercent(double current, double previous) {
        if (previous == 0.0) {
            if (current > 0) return 100.0;
            if (current < 0) return -100.0;
            return 0.0;
        }
        return round1((current - previous) / Math.abs(previous) * 100.0);
    }

    private static String classify(double growthPct) {
        if (growthPct >= STRONG_UP_PCT) return "Tăng mạnh";
        if (growthPct >= UP_PCT) return "Tăng";
        if (growthPct > DOWN_PCT) return "Ổn định";
        return "Giảm";
    }

    private static int severityRank(String severity) {
        return switch (severity) {
            case "HIGH" -> 0;
            case "MEDIUM" -> 1;
            default -> 2;
        };
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    private static UUID toUuid(Object o) {
        return o instanceof UUID u ? u : UUID.fromString(o.toString());
    }

    private static LocalDate toLocalDate(Object o) {
        if (o instanceof java.sql.Date d) return d.toLocalDate();
        if (o instanceof LocalDate ld) return ld;
        if (o instanceof java.sql.Timestamp ts) return ts.toLocalDateTime().toLocalDate();
        return LocalDate.parse(o.toString());
    }

    private static long toLong(Object o) {
        return o == null ? 0L : ((Number) o).longValue();
    }

    // ────────────────────────────────────────────────────────────────────────
    // In-memory accumulators
    // ────────────────────────────────────────────────────────────────────────

    /** Mutable per-post accumulator. */
    private static final class PostAgg {
        /** Raw current-window counts indexed by LIKE/COMMENT/SHARE/REPORT. */
        final long[] curRaw = new long[4];
        /** Weighted trend_score for the previous window. */
        double prevScore;
        /** Weighted trend_score in the trailing 24h. */
        double score24h;
        /** Weighted score per day inside the current window (for the line chart). */
        final Map<LocalDate, Double> dailyScore = new HashMap<>();

        double curScore() {
            return curRaw[LIKE] * LIKE_WEIGHT
                    + curRaw[COMMENT] * COMMENT_WEIGHT
                    + curRaw[SHARE] * SHARE_WEIGHT
                    + curRaw[REPORT] * REPORT_WEIGHT;
        }

        long totalInteractions() {
            return curRaw[LIKE] + curRaw[COMMENT] + curRaw[SHARE] + curRaw[REPORT];
        }
    }

    /** Mutable per-topic accumulator. */
    private static final class TopicAgg {
        long postCount;
        double score;
        double prevScore;
        long reportCount;
        long commentCount;
        final Map<LocalDate, Double> dailyScore = new HashMap<>();
        final List<PostData> posts = new ArrayList<>();

        double averageScore24h() {
            if (posts.isEmpty()) return 0.0;
            double sum = 0;
            for (PostData p : posts) sum += p.agg.score24h;
            return sum / posts.size();
        }
    }

    /** Derived per-post view model used across the response sections. */
    private record PostData(
            Post post,
            PostAgg agg,
            double trendScore,
            double previousScore,
            double growthRate,
            String trendLabel,
            Set<String> topics) {
    }
}
