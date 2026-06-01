package project.kconnecta.admin.backend.feature.analytics.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.admin.backend.entity.Post;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Read-only aggregation queries that power the post-trends analytics endpoint.
 *
 * <p>Design goal: avoid N+1. Each interaction table (reactions / comments / shares / reports)
 * is scanned with a SINGLE grouped query that returns, per (post, day):
 * <ul>
 *   <li>{@code cnt_day} — total events that day (used to build the per-day line chart),</li>
 *   <li>{@code cur}     — events inside the current window (timestamp-precise),</li>
 *   <li>{@code prev}    — events inside the previous (comparison) window,</li>
 *   <li>{@code last24h} — events in the trailing 24h (for the moderation spike alert).</li>
 * </ul>
 * Everything else (weighting, topic grouping, growth, alerts) is computed in-memory in the
 * service from these four result sets, so the whole endpoint costs a fixed ~5 queries
 * regardless of how many posts/interactions exist.
 *
 * <p>Each row is {@code Object[]}: [post_id (UUID), day (date), cnt_day, cur, prev, last24h].
 * PostgreSQL's {@code FILTER (WHERE ...)} keeps the windowing accurate while still grouping by day.
 */
@Repository
public interface PostAnalyticsRepository extends JpaRepository<Post, UUID> {

    @Query(value = """
            SELECT post_id,
                   CAST(created_at AS date)                                                   AS d,
                   COUNT(*)                                                                   AS cnt_day,
                   COUNT(*) FILTER (WHERE created_at >= :curFrom)                             AS cur,
                   COUNT(*) FILTER (WHERE created_at >= :prevFrom AND created_at < :curFrom)  AS prev,
                   COUNT(*) FILTER (WHERE created_at >= :last24hFrom)                         AS last24h
            FROM public.post_reactions
            WHERE created_at >= :prevFrom
            GROUP BY post_id, CAST(created_at AS date)
            """, nativeQuery = true)
    List<Object[]> aggregateReactions(@Param("prevFrom") LocalDateTime prevFrom,
                                      @Param("curFrom") LocalDateTime curFrom,
                                      @Param("last24hFrom") LocalDateTime last24hFrom);

    @Query(value = """
            SELECT post_id,
                   CAST(created_at AS date)                                                   AS d,
                   COUNT(*)                                                                   AS cnt_day,
                   COUNT(*) FILTER (WHERE created_at >= :curFrom)                             AS cur,
                   COUNT(*) FILTER (WHERE created_at >= :prevFrom AND created_at < :curFrom)  AS prev,
                   COUNT(*) FILTER (WHERE created_at >= :last24hFrom)                         AS last24h
            FROM public.post_comments
            WHERE created_at >= :prevFrom AND is_deleted = false
            GROUP BY post_id, CAST(created_at AS date)
            """, nativeQuery = true)
    List<Object[]> aggregateComments(@Param("prevFrom") LocalDateTime prevFrom,
                                     @Param("curFrom") LocalDateTime curFrom,
                                     @Param("last24hFrom") LocalDateTime last24hFrom);

    @Query(value = """
            SELECT post_id,
                   CAST(created_at AS date)                                                   AS d,
                   COUNT(*)                                                                   AS cnt_day,
                   COUNT(*) FILTER (WHERE created_at >= :curFrom)                             AS cur,
                   COUNT(*) FILTER (WHERE created_at >= :prevFrom AND created_at < :curFrom)  AS prev,
                   COUNT(*) FILTER (WHERE created_at >= :last24hFrom)                         AS last24h
            FROM public.post_shares
            WHERE created_at >= :prevFrom
            GROUP BY post_id, CAST(created_at AS date)
            """, nativeQuery = true)
    List<Object[]> aggregateShares(@Param("prevFrom") LocalDateTime prevFrom,
                                   @Param("curFrom") LocalDateTime curFrom,
                                   @Param("last24hFrom") LocalDateTime last24hFrom);

    @Query(value = """
            SELECT post_id,
                   CAST(created_at AS date)                                                   AS d,
                   COUNT(*)                                                                   AS cnt_day,
                   COUNT(*) FILTER (WHERE created_at >= :curFrom)                             AS cur,
                   COUNT(*) FILTER (WHERE created_at >= :prevFrom AND created_at < :curFrom)  AS prev,
                   COUNT(*) FILTER (WHERE created_at >= :last24hFrom)                         AS last24h
            FROM public.post_reports
            WHERE created_at >= :prevFrom
            GROUP BY post_id, CAST(created_at AS date)
            """, nativeQuery = true)
    List<Object[]> aggregateReports(@Param("prevFrom") LocalDateTime prevFrom,
                                    @Param("curFrom") LocalDateTime curFrom,
                                    @Param("last24hFrom") LocalDateTime last24hFrom);

    /**
     * Loads post metadata + author in ONE query (JOIN FETCH) for the set of posts that had any
     * interaction in the window. This is what prevents the N+1 that a per-post author lookup
     * would otherwise cause.
     */
    @Query("SELECT p FROM Post p LEFT JOIN FETCH p.author WHERE p.id IN :ids")
    List<Post> findAllWithAuthorByIdIn(@Param("ids") Collection<UUID> ids);
}
