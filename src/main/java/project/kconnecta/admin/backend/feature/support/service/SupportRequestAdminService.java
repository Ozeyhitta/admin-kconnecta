package project.kconnecta.admin.backend.feature.support.service;

import org.springframework.data.domain.Page;
import project.kconnecta.admin.backend.feature.support.dto.response.SupportRequestAdminResponse;

import java.util.UUID;

public interface SupportRequestAdminService {

    Page<SupportRequestAdminResponse> getRequests(int page, int size, String sortBy, String sortDir,
                                                  String search, String category, String status);

    SupportRequestAdminResponse getRequestById(UUID id);

    /** Cập nhật trạng thái xử lý: IN_PROGRESS | RESOLVED. */
    SupportRequestAdminResponse updateStatus(UUID id, String status);

    /** Gửi phản hồi cho người dùng qua thông báo và cập nhật trạng thái yêu cầu. */
    SupportRequestAdminResponse respond(UUID id, String message, Boolean markResolved);
}
