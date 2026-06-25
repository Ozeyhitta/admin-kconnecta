package project.kconnecta.admin.backend.feature.policy.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.admin.backend.feature.policy.entity.KeywordCategory;
import project.kconnecta.admin.backend.feature.policy.entity.PolicyKeyword;
import project.kconnecta.admin.backend.feature.policy.repository.PolicyKeywordRepository;
import project.kconnecta.admin.backend.feature.policy.service.PolicyKeywordAdminService;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PolicyKeywordAdminServiceImpl implements PolicyKeywordAdminService {

    private final PolicyKeywordRepository repository;
    private final JsonMapper jsonMapper;

    @Override
    @Transactional(readOnly = true)
    public ArrayNode findAllAsJsonArray() {
        ArrayNode array = jsonMapper.createArrayNode();
        for (PolicyKeyword keyword : repository.findAllByOrderByCategoryAscValueAsc()) {
            array.add(toJsonNode(keyword));
        }
        return array;
    }

    @Override
    @Transactional
    public void replaceAll(JsonNode keywords) {
        repository.deleteAllKeywords();
        if (keywords == null || !keywords.isArray() || keywords.isEmpty()) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        Set<String> seen = new HashSet<>();
        for (JsonNode kw : keywords) {
            PolicyKeyword entity = fromJsonNode(kw, now);
            if (entity.getValue().isBlank()) {
                continue;
            }
            String dedupeKey = dedupeKey(entity.getCategory(), entity.getValue());
            if (!seen.add(dedupeKey)) {
                log.warn("Skipping duplicate keyword on save: {} ({})", entity.getValue(), entity.getCategory());
                continue;
            }
            repository.save(entity);
        }
    }

    @Override
    @Transactional
    public void resetFromDefault(JsonNode defaultKeywords) {
        repository.deleteAllKeywords();
        if (defaultKeywords == null || !defaultKeywords.isArray()) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        Set<String> seen = new HashSet<>();
        for (JsonNode kw : defaultKeywords) {
            PolicyKeyword entity = fromJsonNode(kw, now);
            if (entity.getValue().isBlank()) {
                continue;
            }
            String key = dedupeKey(entity.getCategory(), entity.getValue());
            if (!seen.add(key)) {
                continue;
            }
            repository.save(entity);
        }
        log.info("Reset policy keywords table from default config (total={})", repository.count());
    }

    private ObjectNode toJsonNode(PolicyKeyword keyword) {
        ObjectNode node = jsonMapper.createObjectNode();
        node.put("id", keyword.getId());
        node.put("value", keyword.getValue());
        node.put("category", keyword.getCategory().toJson());
        if (keyword.getKeywordGroup() != null && !keyword.getKeywordGroup().isBlank()) {
            node.put("group", keyword.getKeywordGroup());
        }
        return node;
    }

    private PolicyKeyword fromJsonNode(JsonNode kw, LocalDateTime now) {
        String id = kw.path("id").asText("");
        if (id.isBlank()) {
            id = "kw-" + UUID.randomUUID();
        }
        String value = kw.path("value").asText("").trim();
        KeywordCategory category = KeywordCategory.fromJson(kw.path("category").asText(""));
        String group = kw.path("group").asText(null);
        if (group == null || group.isBlank()) {
            group = kw.path("note").asText(null);
        }
        return PolicyKeyword.builder()
                .id(id)
                .value(value)
                .category(category)
                .keywordGroup(group)
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    private static String dedupeKey(KeywordCategory category, String value) {
        return category.toJson() + "|" + value.trim().toLowerCase(Locale.ROOT);
    }
}
