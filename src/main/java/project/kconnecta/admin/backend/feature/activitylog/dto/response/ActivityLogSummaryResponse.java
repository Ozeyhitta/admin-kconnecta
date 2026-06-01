package project.kconnecta.admin.backend.feature.activitylog.dto.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ActivityLogSummaryResponse {
    long totalLogs;
    long failedLoginCount;
    long blockedMessageCount;
    long suspiciousActivityCount;
    String topActiveUser;
    String topActiveUserFullName;
    long topActiveUserLogCount;
}
