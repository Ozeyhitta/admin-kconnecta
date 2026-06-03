package project.kconnecta.admin.backend.feature.activitylog.support;

import project.kconnecta.admin.backend.common.enums.ActivityLogSeverity;
import project.kconnecta.admin.backend.common.enums.ActivityLogStatus;
import project.kconnecta.admin.backend.entity.UserActivityLog;

import java.util.Map;
import java.util.Set;

/**
 * Derives display fields and abnormal flags for activity logs.
 * Legacy rows without status/severity/IP get sensible defaults from action_type.
 */
public final class ActivityLogMapper {

    private static final Map<String, String> ACTION_LABELS = Map.ofEntries(
            Map.entry("LOGIN", "Đăng nhập"),
            Map.entry("LOGOUT", "Đăng xuất"),
            Map.entry("LOGIN_FAILED", "Đăng nhập thất bại"),
            Map.entry("REGISTER", "Đăng ký"),
            Map.entry("GOOGLE_LOGIN", "Đăng nhập Google"),
            Map.entry("PASSWORD_CHANGED", "Đổi mật khẩu"),
            Map.entry("RESET_PASSWORD", "Reset mật khẩu"),
            Map.entry("POST_CREATED", "Tạo bài viết"),
            Map.entry("POST_DELETED", "Xóa bài viết"),
            Map.entry("COMMENT_ADDED", "Bình luận"),
            Map.entry("COMMENT_CREATED", "Bình luận"),
            Map.entry("REACTION_ADDED", "Thả cảm xúc"),
            Map.entry("POST_SHARED", "Chia sẻ bài"),
            Map.entry("FRIEND_REQUEST_SENT", "Gửi lời mời kết bạn"),
            Map.entry("FRIEND_ACCEPTED", "Chấp nhận kết bạn"),
            Map.entry("MESSAGE_SENT", "Gửi tin nhắn"),
            Map.entry("MESSAGE_BLOCKED_SPAM", "Tin nhắn bị chặn (spam)"),
            Map.entry("MESSAGE_BLOCKED_KEYWORD", "Tin nhắn bị chặn (từ khóa)"),
            Map.entry("REPORT_CREATED", "Tạo báo cáo"),
            Map.entry("ACCOUNT_LOCKED", "Khóa tài khoản"),
            Map.entry("ACCOUNT_REVIEW_REQUESTED", "Yêu cầu mở khóa tài khoản"),
            Map.entry("CHAT_RESTRICTED", "Hạn chế chat")
    );

    private static final Set<String> INHERENTLY_ABNORMAL = Set.of(
            "LOGIN_FAILED",
            "MESSAGE_BLOCKED_SPAM",
            "MESSAGE_BLOCKED_KEYWORD",
            "ACCOUNT_LOCKED",
            "ACCOUNT_REVIEW_REQUESTED",
            "CHAT_RESTRICTED"
    );

    private ActivityLogMapper() {}

    public static String resolveActionLabel(UserActivityLog log) {
        if (log.getActionLabel() != null && !log.getActionLabel().isBlank()) {
            return log.getActionLabel();
        }
        return ACTION_LABELS.getOrDefault(log.getActionType(), log.getActionType());
    }

    public static String resolveStatus(UserActivityLog log) {
        if (log.getStatus() != null && !log.getStatus().isBlank()) {
            return log.getStatus();
        }
        return switch (log.getActionType()) {
            case "LOGIN_FAILED" -> ActivityLogStatus.FAILED.name();
            case "MESSAGE_BLOCKED_SPAM", "MESSAGE_BLOCKED_KEYWORD", "CHAT_RESTRICTED" ->
                    ActivityLogStatus.BLOCKED.name();
            default -> ActivityLogStatus.SUCCESS.name();
        };
    }

    public static String resolveSeverity(UserActivityLog log) {
        if (log.getSeverity() != null && !log.getSeverity().isBlank()) {
            return log.getSeverity();
        }
        return switch (log.getActionType()) {
            case "LOGIN_FAILED", "MESSAGE_BLOCKED_SPAM", "MESSAGE_BLOCKED_KEYWORD", "ACCOUNT_REVIEW_REQUESTED" ->
                    ActivityLogSeverity.WARNING.name();
            case "ACCOUNT_LOCKED", "CHAT_RESTRICTED" -> ActivityLogSeverity.HIGH.name();
            default -> ActivityLogSeverity.INFO.name();
        };
    }

    public static String resolveDescription(UserActivityLog log) {
        if (log.getMetadata() != null && !log.getMetadata().isBlank()) {
            String meta = log.getMetadata().trim();
            if (meta.startsWith("{")) {
                return buildDescriptionFromJson(log.getActionType(), meta);
            }
            if (meta.length() > 200) {
                return meta.substring(0, 200) + "…";
            }
            return meta;
        }
        return defaultDescription(log.getActionType());
    }

    public record AbnormalResult(boolean abnormal, String reason) {}

    public static AbnormalResult detectAbnormal(
            UserActivityLog log,
            long loginBurstCount,
            long failedLoginBurstCount,
            boolean newIpOrDevice) {

        if (INHERENTLY_ABNORMAL.contains(log.getActionType())) {
            return new AbnormalResult(true, reasonForType(log.getActionType()));
        }
        if (("HIGH".equals(resolveSeverity(log)) || "WARNING".equals(resolveSeverity(log)))
                && "FAILED".equals(resolveStatus(log))) {
            return new AbnormalResult(true, "Hoạt động có mức độ cảnh báo cao");
        }
        if (loginBurstCount >= 5) {
            return new AbnormalResult(true,
                    String.format("Nhiều lần đăng nhập trong thời gian ngắn (%d lần/10 phút)", loginBurstCount));
        }
        if (failedLoginBurstCount >= 3) {
            return new AbnormalResult(true,
                    String.format("Nhiều lần đăng nhập thất bại (%d lần/15 phút)", failedLoginBurstCount));
        }
        if (newIpOrDevice && "LOGIN".equals(log.getActionType()) && log.getIpAddress() != null) {
            return new AbnormalResult(true, "Đăng nhập từ IP/thiết bị chưa từng thấy trước đó");
        }
        return new AbnormalResult(false, null);
    }

    private static String reasonForType(String actionType) {
        return switch (actionType) {
            case "LOGIN_FAILED" -> "Đăng nhập thất bại";
            case "MESSAGE_BLOCKED_SPAM" -> "Tin nhắn bị chặn do spam";
            case "MESSAGE_BLOCKED_KEYWORD" -> "Tin nhắn bị chặn do từ khóa nhạy cảm";
            case "ACCOUNT_LOCKED" -> "Tài khoản bị khóa";
            case "ACCOUNT_REVIEW_REQUESTED" -> "Người dùng yêu cầu admin xem xét mở khóa";
            case "CHAT_RESTRICTED" -> "Người dùng bị hạn chế chat";
            default -> "Hoạt động bất thường";
        };
    }

    private static String defaultDescription(String actionType) {
        return switch (actionType) {
            case "LOGIN" -> "Đăng nhập vào hệ thống";
            case "LOGOUT" -> "Đăng xuất khỏi hệ thống";
            case "LOGIN_FAILED" -> "Thử đăng nhập không thành công";
            case "POST_CREATED" -> "Đăng bài viết mới";
            case "COMMENT_ADDED", "COMMENT_CREATED" -> "Bình luận vào bài viết";
            case "MESSAGE_SENT" -> "Gửi tin nhắn";
            case "MESSAGE_BLOCKED_SPAM" -> "Tin nhắn bị chặn do spam";
            case "MESSAGE_BLOCKED_KEYWORD" -> "Tin nhắn bị chặn do từ khóa";
            case "REPORT_CREATED" -> "Tạo báo cáo vi phạm";
            case "ACCOUNT_LOCKED" -> "Tài khoản bị khóa bởi hệ thống/admin";
            case "ACCOUNT_REVIEW_REQUESTED" -> "Người dùng gửi yêu cầu xem xét mở khóa";
            case "CHAT_RESTRICTED" -> "Quyền chat bị hạn chế";
            default -> ACTION_LABELS.getOrDefault(actionType, "Hoạt động hệ thống");
        };
    }

    private static String buildDescriptionFromJson(String actionType, String json) {
        // Lightweight parse without Jackson dependency in mapper
        if (json.contains("\"reason\"")) {
            int i = json.indexOf("\"reason\"");
            int start = json.indexOf(':', i) + 1;
            int q1 = json.indexOf('"', start);
            int q2 = json.indexOf('"', q1 + 1);
            if (q1 >= 0 && q2 > q1) {
                return json.substring(q1 + 1, q2);
            }
        }
        return defaultDescription(actionType);
    }
}
