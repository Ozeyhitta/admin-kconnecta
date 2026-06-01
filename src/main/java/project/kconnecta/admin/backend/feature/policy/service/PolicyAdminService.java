package project.kconnecta.admin.backend.feature.policy.service;

import tools.jackson.databind.JsonNode;

public interface PolicyAdminService {

    JsonNode getConfig();

    JsonNode saveConfig(JsonNode config, String updatedBy);
}
