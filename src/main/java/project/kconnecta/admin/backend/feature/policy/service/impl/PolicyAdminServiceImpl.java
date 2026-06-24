package project.kconnecta.admin.backend.feature.policy.service.impl;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.admin.backend.feature.policy.dto.PolicyKeywordMergeResult;
import project.kconnecta.admin.backend.feature.policy.entity.PlatformPolicy;
import project.kconnecta.admin.backend.feature.policy.repository.PlatformPolicyRepository;
import project.kconnecta.admin.backend.feature.policy.service.PolicyAdminService;
import project.kconnecta.admin.backend.feature.policy.service.PolicyKeywordAdminService;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

import java.io.IOException;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class PolicyAdminServiceImpl implements PolicyAdminService {

    private final PlatformPolicyRepository repository;
    private final PolicyKeywordAdminService keywordService;
    private final JsonMapper jsonMapper;

    @PostConstruct
    void ensurePolicyExists() {
        if (repository.existsById(PlatformPolicy.SINGLETON_ID)) {
            return;
        }
        try {
            JsonNode defaultConfig = loadDefaultConfigJson();
            ObjectNode withoutKeywords = (ObjectNode) defaultConfig.deepCopy();
            withoutKeywords.remove("keywords");
            withoutKeywords.set("auditLog", jsonMapper.createArrayNode());

            PlatformPolicy policy = PlatformPolicy.builder()
                    .id(PlatformPolicy.SINGLETON_ID)
                    .configJson(jsonMapper.writeValueAsString(withoutKeywords))
                    .updatedAt(LocalDateTime.now())
                    .updatedBy("system")
                    .build();
            repository.save(policy);
            keywordService.resetFromDefault(defaultConfig.path("keywords"));
            log.info("Seeded platform policy from default-config.json");
        } catch (IOException e) {
            throw new IllegalStateException("Failed to seed default platform policy", e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public JsonNode getConfig() {
        return buildMergedConfig();
    }

    @Override
    @Transactional
    public JsonNode saveConfig(JsonNode config, String updatedBy) {
        if (config == null || config.isNull()) {
            throw new IllegalArgumentException("config is required");
        }
        try {
            ObjectNode mutable = (ObjectNode) jsonMapper.readTree(jsonMapper.writeValueAsString(config));
            JsonNode keywords = mutable.path("keywords");
            keywordService.replaceAll(keywords.isMissingNode() || !keywords.isArray()
                    ? jsonMapper.createArrayNode()
                    : keywords);
            mutable.remove("keywords");
            persistConfigWithoutKeywords(mutable, updatedBy, true);
            return buildMergedConfig();
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid policy JSON", e);
        }
    }

    @Override
    @Transactional
    public PolicyKeywordMergeResult mergeDefaultKeywords(String updatedBy) {
        try {
            JsonNode defaultKeywords = loadDefaultConfigJson().path("keywords");
            PolicyKeywordMergeResult result = keywordService.mergeFromDefault(defaultKeywords);
            if (result.added() > 0) {
                touchMetadata(updatedBy != null ? updatedBy : "admin-merge");
            }
            return result;
        } catch (IOException e) {
            throw new IllegalStateException("Failed to merge default policy keywords", e);
        }
    }

    @Override
    @Transactional
    public JsonNode resetToDefault(String updatedBy) {
        try {
            JsonNode defaultConfig = loadDefaultConfigJson();
            ObjectNode withoutKeywords = (ObjectNode) defaultConfig.deepCopy();
            withoutKeywords.remove("keywords");
            withoutKeywords.set("auditLog", jsonMapper.createArrayNode());

            keywordService.resetFromDefault(defaultConfig.path("keywords"));
            persistConfigWithoutKeywords(
                    withoutKeywords,
                    updatedBy != null ? updatedBy : "admin-reset",
                    true);
            log.info("Reset platform policy to default config");
            return buildMergedConfig();
        } catch (IOException e) {
            throw new IllegalStateException("Failed to reset policy to default", e);
        }
    }

    private JsonNode buildMergedConfig() {
        try {
            ObjectNode merged = (ObjectNode) loadDefaultConfigJson().deepCopy();
            merged.remove("keywords");
            ObjectNode dbConfig = (ObjectNode) parseRawConfigFromDb().deepCopy();
            dbConfig.remove("keywords");
            deepMerge(merged, dbConfig);
            merged.set("keywords", keywordService.findAllAsJsonArray());
            return merged;
        } catch (IOException e) {
            throw new IllegalStateException("Invalid policy JSON in database", e);
        }
    }

    private static ObjectNode deepMerge(ObjectNode base, ObjectNode override) {
        for (var prop : override.properties()) {
            String field = prop.getKey();
            JsonNode o = prop.getValue();
            JsonNode b = base.get(field);
            if (o != null && o.isObject() && b != null && b.isObject()) {
                deepMerge((ObjectNode) b, (ObjectNode) o);
            } else {
                base.set(field, o);
            }
        }
        return base;
    }

    private JsonNode loadDefaultConfigJson() throws IOException {
        ClassPathResource resource = new ClassPathResource("policy/default-config.json");
        return jsonMapper.readTree(resource.getInputStream());
    }

    private JsonNode parseRawConfigFromDb() throws IOException {
        return jsonMapper.readTree(getEntity().getConfigJson());
    }

    private PlatformPolicy getEntity() {
        return repository.findById(PlatformPolicy.SINGLETON_ID)
                .orElseThrow(() -> new IllegalStateException("Platform policy not initialized"));
    }

    private void persistConfigWithoutKeywords(ObjectNode configWithoutKeywords, String updatedBy, boolean touchMetadata) {
        configWithoutKeywords.remove("keywords");
        try {
            PlatformPolicy entity = getEntity();
            entity.setConfigJson(jsonMapper.writeValueAsString(configWithoutKeywords));
            if (touchMetadata) {
                entity.setUpdatedAt(LocalDateTime.now());
                entity.setUpdatedBy(updatedBy != null ? updatedBy : "admin");
            }
            repository.save(entity);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid policy JSON", e);
        }
    }

    private void touchMetadata(String updatedBy) {
        PlatformPolicy entity = getEntity();
        entity.setUpdatedAt(LocalDateTime.now());
        entity.setUpdatedBy(updatedBy);
        repository.save(entity);
    }
}
