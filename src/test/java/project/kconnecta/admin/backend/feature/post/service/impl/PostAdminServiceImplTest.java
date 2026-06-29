package project.kconnecta.admin.backend.feature.post.service.impl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import project.kconnecta.admin.backend.common.enums.PostStatus;
import project.kconnecta.admin.backend.entity.Account;
import project.kconnecta.admin.backend.entity.Post;
import project.kconnecta.admin.backend.entity.PostShare;
import project.kconnecta.admin.backend.entity.User;
import project.kconnecta.admin.backend.feature.post.dto.response.PostAdminResponse;
import project.kconnecta.admin.backend.feature.post.dto.response.PostShareDetailResponse;
import project.kconnecta.admin.backend.feature.post.repository.PostAdminRepository;
import project.kconnecta.admin.backend.feature.post.repository.PostMediaAdminRepository;
import project.kconnecta.admin.backend.common.util.CloudinaryPostMediaService;
import project.kconnecta.admin.backend.feature.post.repository.PostShareAdminRepository;
import project.kconnecta.admin.backend.feature.report.repository.PostReportAdminRepository;
import project.kconnecta.admin.backend.feature.live.repository.LiveSessionAdminRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PostAdminServiceImplTest {

    private PostAdminRepository postAdminRepository;
    private PostMediaAdminRepository postMediaAdminRepository;
    private CloudinaryPostMediaService cloudinaryPostMediaService;
    private PostShareAdminRepository postShareAdminRepository;
    private PostReportAdminRepository postReportAdminRepository;
    private LiveSessionAdminRepository liveSessionAdminRepository;
    private PostAdminServiceImpl service;

    private final UUID postId = UUID.randomUUID();
    private final UUID shareId = UUID.randomUUID();
    private final UUID originalId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        postAdminRepository = mock(PostAdminRepository.class);
        postMediaAdminRepository = mock(PostMediaAdminRepository.class);
        cloudinaryPostMediaService = mock(CloudinaryPostMediaService.class);
        postShareAdminRepository = mock(PostShareAdminRepository.class);
        postReportAdminRepository = mock(PostReportAdminRepository.class);
        liveSessionAdminRepository = mock(LiveSessionAdminRepository.class);
        service = new PostAdminServiceImpl(
                postAdminRepository,
                postMediaAdminRepository,
                cloudinaryPostMediaService,
                postShareAdminRepository,
                postReportAdminRepository,
                liveSessionAdminRepository
        );

        when(postReportAdminRepository.countByPostIds(any())).thenReturn(List.of());
        when(postReportAdminRepository.findLatestByPostIds(any())).thenReturn(List.of());
    }

    private User user(String username) {
        User u = mock(User.class);
        Account account = mock(Account.class);
        when(u.getId()).thenReturn(UUID.randomUUID());
        when(account.getId()).thenReturn(UUID.randomUUID());
        when(u.getAccount()).thenReturn(account);
        when(u.getUsername()).thenReturn(username);
        when(u.getFullName()).thenReturn(username);
        return u;
    }

    @Test
    void getPosts_all_mergesAndSortsByRecency_withCompositeShareId() {
        LocalDateTime newer = LocalDateTime.of(2026, 6, 1, 12, 0);
        LocalDateTime older = LocalDateTime.of(2026, 5, 1, 12, 0);

        User author = user("author");
        User originalAuthor = user("originalAuthor");
        User sharer = user("sharer");

        Post post = mock(Post.class);
        when(post.getId()).thenReturn(postId);
        when(post.getUpdatedAt()).thenReturn(newer);
        when(post.getAuthor()).thenReturn(author);
        when(post.getStatus()).thenReturn(PostStatus.PUBLISHED);

        Post original = mock(Post.class);
        when(original.getId()).thenReturn(originalId);
        when(original.getStatus()).thenReturn(PostStatus.PUBLISHED);
        when(original.getAuthor()).thenReturn(originalAuthor);
        when(original.getContent()).thenReturn("original content");

        PostShare share = mock(PostShare.class);
        when(share.getId()).thenReturn(shareId);
        when(share.getCreatedAt()).thenReturn(older);
        when(share.getSharer()).thenReturn(sharer);
        when(share.getPost()).thenReturn(original);

        when(postAdminRepository.findAllFiltered(any(), any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(post), PageRequest.of(0, 20), 1));
        when(postShareAdminRepository.findAllFiltered(any(), any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(share), PageRequest.of(0, 20), 1));

        Page<PostAdminResponse> result = service.getPosts(
                0, 20, "updatedAt", "desc", null, null, null, null, null, "ALL");

        assertEquals(2, result.getContent().size());
        assertEquals(2, result.getTotalElements());

        PostAdminResponse first = result.getContent().get(0);
        PostAdminResponse second = result.getContent().get(1);

        // newest (the original post, updated in June) before the older share (May)
        assertEquals(PostAdminResponse.KIND_ORIGINAL, first.getKind());
        assertEquals(postId.toString(), first.getId());
        assertEquals(author.getAccount().getId(), first.getAuthorAccountId());

        assertEquals(PostAdminResponse.KIND_SHARE, second.getKind());
        assertTrue(second.getId().startsWith(PostAdminResponse.SHARE_ID_PREFIX));
        assertTrue(second.getId().endsWith(shareId.toString()));
        // a share inherits the original post's status
        assertEquals(PostStatus.PUBLISHED, second.getStatus());
        assertEquals(originalId.toString(), second.getOriginalPostId());
        assertEquals(sharer.getAccount().getId(), second.getAuthorAccountId());
    }

    @Test
    void getShareById_returnsShareWithEmbeddedOriginal_andInheritedReportCount() {
        User originalAuthor = user("originalAuthor");
        User sharer = user("sharer");

        Post original = mock(Post.class);
        when(original.getId()).thenReturn(originalId);
        when(original.getStatus()).thenReturn(PostStatus.PUBLISHED);
        when(original.getAuthor()).thenReturn(originalAuthor);

        PostShare share = mock(PostShare.class);
        when(share.getId()).thenReturn(shareId);
        when(share.getSharer()).thenReturn(sharer);
        when(share.getPost()).thenReturn(original);

        when(postShareAdminRepository.findByIdWithDetails(shareId)).thenReturn(Optional.of(share));
        when(postReportAdminRepository.countByPost_Id(originalId)).thenReturn(4L);

        PostShareDetailResponse detail = service.getShareById(shareId);

        assertEquals(shareId, detail.getShareId());
        assertTrue(detail.getId().startsWith(PostAdminResponse.SHARE_ID_PREFIX));
        assertEquals(sharer.getAccount().getId(), detail.getSharerAccountId());
        assertEquals(originalId.toString(), detail.getOriginal().getId());
        assertEquals(originalAuthor.getAccount().getId(), detail.getOriginal().getAuthorAccountId());
        assertEquals(4L, detail.getOriginal().getReportCount());
    }

    @Test
    void deleteShare_detachesChildrenAndComments_beforeDeletingShare() {
        PostShare share = mock(PostShare.class);
        when(postShareAdminRepository.findById(shareId)).thenReturn(Optional.of(share));

        service.deleteShare(shareId);

        var ordered = inOrder(postShareAdminRepository);
        ordered.verify(postShareAdminRepository).detachChildren(shareId);
        ordered.verify(postShareAdminRepository).deleteCommentsByShareId(shareId);
        ordered.verify(postShareAdminRepository).delete(share);
    }
}
