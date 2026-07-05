package project.kconnecta.admin.backend.feature.search;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.stereotype.Service;
import project.kconnecta.admin.backend.entity.Account;
import project.kconnecta.admin.backend.entity.Post;
import project.kconnecta.admin.backend.entity.PostComment;
import project.kconnecta.admin.backend.entity.PostReport;
import project.kconnecta.admin.backend.entity.PostShare;
import project.kconnecta.admin.backend.entity.User;
import project.kconnecta.admin.backend.feature.comment.document.CommentDocument;
import project.kconnecta.admin.backend.feature.comment.repository.CommentAdminRepository;
import project.kconnecta.admin.backend.feature.comment.repository.CommentElasticsearchRepository;
import project.kconnecta.admin.backend.feature.post.document.PostDocument;
import project.kconnecta.admin.backend.feature.post.repository.PostAdminRepository;
import project.kconnecta.admin.backend.feature.post.repository.PostElasticsearchRepository;
import project.kconnecta.admin.backend.feature.post.repository.PostShareAdminRepository;
import project.kconnecta.admin.backend.feature.report.document.ReportDocument;
import project.kconnecta.admin.backend.feature.report.repository.PostReportAdminRepository;
import project.kconnecta.admin.backend.feature.report.repository.ReportElasticsearchRepository;
import project.kconnecta.admin.backend.feature.user.document.UserDocument;
import project.kconnecta.admin.backend.feature.user.repository.AccountRepository;
import project.kconnecta.admin.backend.feature.user.repository.UserElasticsearchRepository;
import project.kconnecta.admin.backend.feature.user.repository.UserRepository;
import project.kconnecta.admin.backend.feature.conversation.document.ConversationDocument;
import project.kconnecta.admin.backend.feature.conversation.repository.ConversationAdminRepository;
import project.kconnecta.admin.backend.feature.conversation.repository.ConversationElasticsearchRepository;
import project.kconnecta.admin.backend.feature.conversation.dto.response.AdminConversationSummaryResponse;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class ElasticsearchSyncService {

    @Value("${app.elasticsearch.enabled:true}")
    private boolean elasticsearchEnabled;

    private final ElasticsearchOperations elasticsearchOperations;

    // JPA repositories for DB read
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final PostAdminRepository postAdminRepository;
    private final PostShareAdminRepository postShareAdminRepository;
    private final CommentAdminRepository commentAdminRepository;
    private final PostReportAdminRepository postReportAdminRepository;
    private final ConversationAdminRepository conversationAdminRepository;

    // Elasticsearch repositories for writes
    private final UserElasticsearchRepository userElasticsearchRepository;
    private final PostElasticsearchRepository postElasticsearchRepository;
    private final CommentElasticsearchRepository commentElasticsearchRepository;
    private final ReportElasticsearchRepository reportElasticsearchRepository;
    private final ConversationElasticsearchRepository conversationElasticsearchRepository;

    public boolean isElasticsearchAlive() {
        if (!elasticsearchEnabled) {
            return false;
        }
        try {
            // A fresh Elasticsearch project has no indices yet. Reaching the
            // server successfully is enough here; reindexAll() creates the
            // required indices immediately afterwards.
            elasticsearchOperations.indexOps(UserDocument.class).exists();
            return true;
        } catch (Exception e) {
            log.debug("[ElasticSearch] Health check failed: {}", e.getMessage());
            return false;
        }
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        if (!elasticsearchEnabled) {
            log.info("[ElasticSearch] Disabled by configuration flag.");
            return;
        }
        CompletableFuture.runAsync(this::reindexAll)
                .exceptionally(ex -> {
                    log.warn("[ElasticSearch] Startup indexing failed (Elasticsearch is offline): {}", ex.getMessage());
                    return null;
                });
    }

    public synchronized void reindexAll() {
        if (!isElasticsearchAlive()) {
            log.warn("[ElasticSearch] Server is not reachable. Skipping reindexing.");
            return;
        }

        log.info("[ElasticSearch] Initializing indices and mappings...");
        try {
            initializeIndex(UserDocument.class);
            initializeIndex(PostDocument.class);
            initializeIndex(CommentDocument.class);
            initializeIndex(ReportDocument.class);
            initializeIndex(ConversationDocument.class);
        } catch (Exception e) {
            log.warn("[ElasticSearch] Mapping initialization failed: {}", e.getMessage());
            return;
        }

        log.info("[ElasticSearch] Started background full reindexing...");
        try {
            reindexUsers();
            reindexPostsAndShares();
            reindexComments();
            reindexReports();
            reindexConversations();
            log.info("[ElasticSearch] Full reindexing completed successfully.");
        } catch (Exception e) {
            log.error("[ElasticSearch] Error during reindexing: {}", e.getMessage(), e);
        }
    }

    private <T> void initializeIndex(Class<T> clazz) {
        var indexOps = elasticsearchOperations.indexOps(clazz);
        if (!indexOps.exists()) {
            indexOps.create();
            indexOps.putMapping(indexOps.createMapping());
        }
    }

    // ── Reindexing specific entities ──────────────────────────────────────────

    private void reindexUsers() {
        List<Account> accounts = accountRepository.findAll();
        List<UserDocument> docs = new ArrayList<>();
        for (Account account : accounts) {
            User user = userRepository.findByAccount_Id(account.getId()).orElse(null);
            docs.add(mapUser(account, user));
        }
        if (!docs.isEmpty()) {
            userElasticsearchRepository.saveAll(docs);
            log.info("[ElasticSearch] Indexed {} users.", docs.size());
        }
    }

    private void reindexPostsAndShares() {
        List<Post> posts = postAdminRepository.findAllWithAuthor();
        List<PostDocument> docs = new ArrayList<>();
        for (Post post : posts) {
            docs.add(mapPost(post));
        }

        List<PostShare> shares = postShareAdminRepository.findAllWithDetails();
        for (PostShare share : shares) {
            docs.add(mapShare(share));
        }

        if (!docs.isEmpty()) {
            postElasticsearchRepository.saveAll(docs);
            log.info("[ElasticSearch] Indexed {} posts and shares.", docs.size());
        }
    }

    private void reindexComments() {
        List<PostComment> comments = commentAdminRepository.findAllWithDetails();
        List<CommentDocument> docs = comments.stream().map(this::mapComment).toList();
        if (!docs.isEmpty()) {
            commentElasticsearchRepository.saveAll(docs);
            log.info("[ElasticSearch] Indexed {} comments.", docs.size());
        }
    }

    private void reindexReports() {
        List<PostReport> reports = postReportAdminRepository.findAllWithDetails();
        List<ReportDocument> docs = reports.stream().map(this::mapReport).toList();
        if (!docs.isEmpty()) {
            reportElasticsearchRepository.saveAll(docs);
            log.info("[ElasticSearch] Indexed {} reports.", docs.size());
        }
    }

    private void reindexConversations() {
        List<AdminConversationSummaryResponse> summaries = conversationAdminRepository.findSummaries(
                null, "last_message_at", "DESC", 10000, 0
        );
        List<ConversationDocument> docs = summaries.stream().map(this::mapConversation).toList();
        if (!docs.isEmpty()) {
            conversationElasticsearchRepository.saveAll(docs);
            log.info("[ElasticSearch] Indexed {} conversations.", docs.size());
        }
    }

    // ── Realtime Async Sync APIs ─────────────────────────────────────────────

    public void syncUser(UUID accountId) {
        if (!isElasticsearchAlive()) return;
        CompletableFuture.runAsync(() -> {
            try {
                accountRepository.findById(accountId).ifPresent(account -> {
                    User user = userRepository.findByAccount_Id(account.getId()).orElse(null);
                    userElasticsearchRepository.save(mapUser(account, user));
                });
            } catch (Exception e) {
                log.warn("[ElasticSearch] Realtime user sync failed: {}", e.getMessage());
            }
        });
    }

    public void syncPost(UUID postId) {
        if (!isElasticsearchAlive()) return;
        CompletableFuture.runAsync(() -> {
            try {
                postAdminRepository.findByIdWithAuthor(postId).ifPresent(post ->
                    postElasticsearchRepository.save(mapPost(post))
                );
            } catch (Exception e) {
                log.warn("[ElasticSearch] Realtime post sync failed: {}", e.getMessage());
            }
        });
    }

    public void syncShare(UUID shareId) {
        if (!isElasticsearchAlive()) return;
        CompletableFuture.runAsync(() -> {
            try {
                postShareAdminRepository.findByIdWithDetails(shareId).ifPresent(share ->
                    postElasticsearchRepository.save(mapShare(share))
                );
            } catch (Exception e) {
                log.warn("[ElasticSearch] Realtime share sync failed: {}", e.getMessage());
            }
        });
    }

    public void syncComment(UUID commentId) {
        if (!isElasticsearchAlive()) return;
        CompletableFuture.runAsync(() -> {
            try {
                commentAdminRepository.findByIdWithDetails(commentId).ifPresent(comment ->
                    commentElasticsearchRepository.save(mapComment(comment))
                );
            } catch (Exception e) {
                log.warn("[ElasticSearch] Realtime comment sync failed: {}", e.getMessage());
            }
        });
    }

    public void syncReport(UUID reportId) {
        if (!isElasticsearchAlive()) return;
        CompletableFuture.runAsync(() -> {
            try {
                postReportAdminRepository.findByIdWithDetails(reportId).ifPresent(report ->
                    reportElasticsearchRepository.save(mapReport(report))
                );
            } catch (Exception e) {
                log.warn("[ElasticSearch] Realtime report sync failed: {}", e.getMessage());
            }
        });
    }

    public void deleteUser(UUID accountId) {
        if (!isElasticsearchAlive()) return;
        CompletableFuture.runAsync(() -> {
            try {
                userElasticsearchRepository.deleteById(accountId.toString());
            } catch (Exception e) {
                log.warn("[ElasticSearch] Realtime user delete failed: {}", e.getMessage());
            }
        });
    }

    public void deletePostOrShare(UUID id) {
        if (!isElasticsearchAlive()) return;
        CompletableFuture.runAsync(() -> {
            try {
                postElasticsearchRepository.deleteById(id.toString());
            } catch (Exception e) {
                log.warn("[ElasticSearch] Realtime post delete failed: {}", e.getMessage());
            }
        });
    }

    public void deleteComment(UUID commentId) {
        if (!isElasticsearchAlive()) return;
        CompletableFuture.runAsync(() -> {
            try {
                commentElasticsearchRepository.deleteById(commentId.toString());
            } catch (Exception e) {
                log.warn("[ElasticSearch] Realtime comment delete failed: {}", e.getMessage());
            }
        });
    }

    public void deleteReport(UUID reportId) {
        if (!isElasticsearchAlive()) return;
        CompletableFuture.runAsync(() -> {
            try {
                reportElasticsearchRepository.deleteById(reportId.toString());
            } catch (Exception e) {
                log.warn("[ElasticSearch] Realtime report delete failed: {}", e.getMessage());
            }
        });
    }

    public void syncConversation(String id) {
        if (!isElasticsearchAlive()) return;
        CompletableFuture.runAsync(() -> {
            try {
                String[] parts = id.split("_", 2);
                if (parts.length == 2) {
                    conversationAdminRepository.findSummaryByUserPair(UUID.fromString(parts[0]), UUID.fromString(parts[1]))
                        .ifPresent(summary -> conversationElasticsearchRepository.save(mapConversation(summary)));
                }
            } catch (Exception e) {
                log.warn("[ElasticSearch] Realtime conversation sync failed: {}", e.getMessage());
            }
        });
    }

    public void deleteConversation(String id) {
        if (!isElasticsearchAlive()) return;
        CompletableFuture.runAsync(() -> {
            try {
                conversationElasticsearchRepository.deleteById(id);
            } catch (Exception e) {
                log.warn("[ElasticSearch] Realtime conversation delete failed: {}", e.getMessage());
            }
        });
    }

    // ── Mapping Helpers ───────────────────────────────────────────────────────

    private UserDocument mapUser(Account account, User user) {
        return UserDocument.builder()
                .id(account.getId().toString())
                .email(account.getEmail())
                .username(user != null ? user.getUsername() : "")
                .fullName(user != null ? user.getFullName() : "")
                .role(account.getRole().name())
                .status(account.getStatus().name())
                .createdAt(toEpoch(account.getCreatedAt()))
                .build();
    }

    private PostDocument mapPost(Post post) {
        User author = post.getAuthor();
        return PostDocument.builder()
                .id(post.getId().toString())
                .content(post.getContent())
                .authorName(author != null ? author.getFullName() : "")
                .authorUsername(author != null ? author.getUsername() : "")
                .status(post.getStatus() != null ? post.getStatus().name() : "PUBLISHED")
                .postType("ORIGINAL")
                .createdAt(toEpoch(post.getCreatedAt()))
                .updatedAt(toEpoch(post.getUpdatedAt()))
                .build();
    }

    private PostDocument mapShare(PostShare share) {
        User author = share.getSharer();
        Post orig = share.getPost();
        return PostDocument.builder()
                .id(share.getId().toString())
                .content(share.getSharedContent() != null ? share.getSharedContent() : (orig != null ? orig.getContent() : ""))
                .authorName(author != null ? author.getFullName() : "")
                .authorUsername(author != null ? author.getUsername() : "")
                .status("PUBLISHED")
                .postType("SHARE")
                .createdAt(toEpoch(share.getCreatedAt()))
                .updatedAt(toEpoch(share.getCreatedAt()))
                .build();
    }

    private CommentDocument mapComment(PostComment comment) {
        User author = comment.getUser();
        return CommentDocument.builder()
                .id(comment.getId().toString())
                .content(comment.getContent())
                .authorName(author != null ? author.getFullName() : "")
                .authorUsername(author != null ? author.getUsername() : "")
                .authorId(author != null ? author.getId().toString() : "")
                .postId(comment.getPost() != null ? comment.getPost().getId().toString() : "")
                .status(comment.getStatus() != null ? comment.getStatus() : "APPROVED")
                .createdAt(toEpoch(comment.getCreatedAt()))
                .build();
    }

    private ReportDocument mapReport(PostReport report) {
        User reporter = report.getReporter();
        Post post = report.getPost();
        return ReportDocument.builder()
                .id(report.getId().toString())
                .reason(report.getReason() != null ? report.getReason() : "")
                .category(report.getCategory() != null ? report.getCategory().name() : "")
                .reporterUsername(reporter != null ? reporter.getUsername() : "")
                .targetPostContent(post != null ? post.getContent() : "")
                .postId(post != null ? post.getId().toString() : "")
                .createdAt(toEpoch(report.getCreatedAt()))
                .build();
    }

    private ConversationDocument mapConversation(AdminConversationSummaryResponse summary) {
        return ConversationDocument.builder()
                .id(summary.getId())
                .user1Id(summary.getUser1Id())
                .user1Username(summary.getUser1Username())
                .user1FullName(summary.getUser1FullName())
                .user1AvatarUrl(summary.getUser1AvatarUrl())
                .user2Id(summary.getUser2Id())
                .user2Username(summary.getUser2Username())
                .user2FullName(summary.getUser2FullName())
                .user2AvatarUrl(summary.getUser2AvatarUrl())
                .messageCount(summary.getMessageCount())
                .unreadCount(summary.getUnreadCount())
                .lastMessageContent(summary.getLastMessageContent())
                .lastMessageSenderId(summary.getLastMessageSenderId())
                .lastMessageAt(toEpoch(summary.getLastMessageAt()))
                .status(summary.getStatus())
                .reportCount(0L)
                .build();
    }

    private Long toEpoch(LocalDateTime dt) {
        if (dt == null) return System.currentTimeMillis();
        return dt.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
    }
}
