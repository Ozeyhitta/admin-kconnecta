package project.kconnecta.admin.backend.feature.moderation.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.admin.backend.feature.moderation.dto.request.ChatRestrictionRequest;
import project.kconnecta.admin.backend.feature.moderation.entity.ChatRestriction;
import project.kconnecta.admin.backend.feature.moderation.service.ChatRestrictionService;

import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class MessageModerationController {

    private final NamedParameterJdbcTemplate jdbc;
    private final ChatRestrictionService chatRestrictionService;

    @PatchMapping("/api/v1/admin/messages/{id}/hide")
    public ResponseEntity<Void> hideMessage(@PathVariable UUID id) {
        MapSqlParameterSource params = new MapSqlParameterSource().addValue("id", id);
        jdbc.update("UPDATE chat_messages SET deleted = true WHERE id = :id", params);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/api/v1/admin/users/{id}/chat-restriction")
    public ResponseEntity<ChatRestriction> restrictUser(
            @PathVariable UUID id,
            @RequestBody ChatRestrictionRequest request
    ) {
        ChatRestriction restriction = chatRestrictionService.restrict(
                id,
                request.getDurationHours(),
                request.getReason(),
                "ADMIN"
        );
        return ResponseEntity.ok(restriction);
    }

    @GetMapping("/api/v1/internal/chat-restriction/{userId}")
    public ResponseEntity<Map<String, Boolean>> checkRestriction(@PathVariable UUID userId) {
        boolean restricted = chatRestrictionService.isCurrentlyRestricted(userId);
        return ResponseEntity.ok(Map.of("restricted", restricted));
    }
}
