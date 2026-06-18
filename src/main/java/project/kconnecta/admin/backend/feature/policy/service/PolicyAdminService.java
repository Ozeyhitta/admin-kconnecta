package project.kconnecta.admin.backend.feature.policy.service;

import project.kconnecta.admin.backend.feature.policy.dto.PolicyKeywordMergeResult;
import tools.jackson.databind.JsonNode;

public interface PolicyAdminService {

    JsonNode getConfig();

    JsonNode saveConfig(JsonNode config, String updatedBy);

    PolicyKeywordMergeResult mergeDefaultKeywords(String updatedBy);

    JsonNode resetToDefault(String updatedBy);
}
