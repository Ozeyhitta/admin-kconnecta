package project.kconnecta.admin.backend.feature.search.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import project.kconnecta.admin.backend.feature.search.ElasticsearchSyncService;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/v1/admin/elasticsearch")
@RequiredArgsConstructor
public class ElasticsearchAdminController {

    private final ElasticsearchSyncService syncService;

    @PostMapping("/reindex")
    public ResponseEntity<Map<String, String>> triggerReindex() {
        if (!syncService.isElasticsearchAlive()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("message", "Elasticsearch is offline or disabled."));
        }

        CompletableFuture.runAsync(syncService::reindexAll);

        return ResponseEntity.ok(Map.of("message", "Reindexing triggered in background."));
    }
}
