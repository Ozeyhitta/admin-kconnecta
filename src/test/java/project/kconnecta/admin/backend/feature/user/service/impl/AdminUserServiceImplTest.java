package project.kconnecta.admin.backend.feature.user.service.impl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import project.kconnecta.admin.backend.entity.Account;
import project.kconnecta.admin.backend.entity.User;
import project.kconnecta.admin.backend.feature.activitylog.repository.UserActivityLogRepository;
import project.kconnecta.admin.backend.feature.activitylog.service.ActivityLogWriterService;
import project.kconnecta.admin.backend.feature.comment.repository.CommentAdminRepository;
import project.kconnecta.admin.backend.feature.post.repository.PostAdminRepository;
import project.kconnecta.admin.backend.feature.user.dto.response.UserStatsResponse;
import project.kconnecta.admin.backend.feature.user.repository.AccountRepository;
import project.kconnecta.admin.backend.feature.user.repository.UserRepository;
import project.kconnecta.admin.backend.integration.UserBackendSessionClient;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regression test: the stats/activity endpoints receive an ACCOUNT id (the customers
 * resource record id), but the underlying tables (posts.author_id, post_comments.user_id,
 * user_activity_logs.user_id) are keyed by USER id. The service must translate
 * account id -> user id via UserRepository.findByAccount_Id before counting, otherwise
 * every stat returns 0 and the activity list is empty.
 */
class AdminUserServiceImplTest {

    private AccountRepository accountRepository;
    private PostAdminRepository postAdminRepository;
    private CommentAdminRepository commentAdminRepository;
    private UserActivityLogRepository activityLogRepository;
    private UserRepository userRepository;
    private AdminUserServiceImpl service;

    private final UUID accountId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        accountRepository = mock(AccountRepository.class);
        postAdminRepository = mock(PostAdminRepository.class);
        commentAdminRepository = mock(CommentAdminRepository.class);
        activityLogRepository = mock(UserActivityLogRepository.class);
        userRepository = mock(UserRepository.class);

        service = new AdminUserServiceImpl(
                accountRepository,
                mock(BCryptPasswordEncoder.class),
                postAdminRepository,
                commentAdminRepository,
                activityLogRepository,
                mock(ActivityLogWriterService.class),
                userRepository,
                mock(UserBackendSessionClient.class));

        Account account = mock(Account.class);
        when(account.getId()).thenReturn(accountId);
        when(accountRepository.findById(accountId)).thenReturn(Optional.of(account));

        User user = mock(User.class);
        when(user.getId()).thenReturn(userId);
        when(userRepository.findByAccount_Id(accountId)).thenReturn(Optional.of(user));
    }

    @Test
    void getUserStats_countsByResolvedUserId_notAccountId() {
        when(postAdminRepository.countByAuthorId(userId)).thenReturn(5L);
        when(commentAdminRepository.countByUserId(userId)).thenReturn(7L);
        when(activityLogRepository.countByUserIdAndActionType(userId, "REACTION_ADDED")).thenReturn(11L);
        when(activityLogRepository.countByUserIdAndActionType(userId, "POST_SHARED")).thenReturn(2L);
        when(activityLogRepository.countByUserIdAndActionType(userId, "FRIEND_REQUEST_SENT")).thenReturn(3L);
        when(activityLogRepository.countByUserIdAndActionType(userId, "LOGIN")).thenReturn(13L);
        when(activityLogRepository.countByUserId(userId)).thenReturn(41L);

        UserStatsResponse stats = service.getUserStats(accountId);

        assertEquals(5L, stats.getTotalPosts());
        assertEquals(7L, stats.getTotalComments());
        assertEquals(11L, stats.getTotalReactions());
        assertEquals(2L, stats.getTotalShares());
        assertEquals(3L, stats.getTotalFriendRequests());
        assertEquals(13L, stats.getTotalLogins());
        assertEquals(41L, stats.getTotalActivity());
    }

    @Test
    void getUserActivity_queriesByResolvedUserId() {
        when(activityLogRepository.findTop15ByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of());

        service.getUserActivity(accountId);

        verify(activityLogRepository).findTop15ByUserIdOrderByCreatedAtDesc(userId);
    }
}
