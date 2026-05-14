package project.kconnecta.admin.backend.config.security;

import java.security.Principal;
import java.util.UUID;

public class AdminPrincipal implements Principal {

    private final UUID userId;
    private final String username;

    public AdminPrincipal(UUID userId, String username) {
        this.userId = userId;
        this.username = username;
    }

    @Override
    public String getName() {
        return username;
    }

    public UUID getUserId() {
        return userId;
    }
}
