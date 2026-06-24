package project.kconnecta.admin.backend.feature.policy.entity;

import java.util.Locale;

public enum KeywordCategory {
    BLACKLIST,
    WATCHLIST,
    BLOCKED_DOMAIN;

    public static KeywordCategory fromJson(String raw) {
        if (raw == null || raw.isBlank()) {
            return BLACKLIST;
        }
        String normalized = raw.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "watchlist", "sensitive" -> WATCHLIST;
            case "blocked_domain" -> BLOCKED_DOMAIN;
            default -> BLACKLIST;
        };
    }

    public String toJson() {
        return name().toLowerCase(Locale.ROOT);
    }
}
