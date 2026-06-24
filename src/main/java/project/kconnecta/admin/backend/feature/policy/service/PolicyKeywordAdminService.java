package project.kconnecta.admin.backend.feature.policy.service;

import project.kconnecta.admin.backend.feature.policy.dto.PolicyKeywordMergeResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;

public interface PolicyKeywordAdminService {

    ArrayNode findAllAsJsonArray();

    void replaceAll(JsonNode keywords);

    PolicyKeywordMergeResult mergeFromDefault(JsonNode defaultKeywords);

    void resetFromDefault(JsonNode defaultKeywords);
}
