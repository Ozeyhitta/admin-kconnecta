package project.kconnecta.admin.backend.feature.policy.service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;

public interface PolicyKeywordAdminService {

    ArrayNode findAllAsJsonArray();

    void replaceAll(JsonNode keywords);

    void resetFromDefault(JsonNode defaultKeywords);
}
