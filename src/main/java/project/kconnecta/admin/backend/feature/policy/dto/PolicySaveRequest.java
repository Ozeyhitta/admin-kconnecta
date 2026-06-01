package project.kconnecta.admin.backend.feature.policy.dto;

import tools.jackson.databind.JsonNode;

public record PolicySaveRequest(JsonNode config, String updatedBy) {
}
