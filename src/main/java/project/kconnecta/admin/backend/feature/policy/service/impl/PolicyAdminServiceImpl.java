package project.kconnecta.admin.backend.feature.policy.service.impl;

import project.kconnecta.admin.backend.feature.policy.service.PolicyAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import project.kconnecta.admin.backend.feature.policy.dto.PolicyKeywordMergeResult;
import project.kconnecta.admin.backend.feature.policy.dto.PolicySaveRequest;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Service
@RequiredArgsConstructor
public class PolicyAdminServiceImpl implements PolicyAdminService {

    private final RestTemplate restTemplate;
    private final JsonMapper jsonMapper;

    @Value("${user-service.url:http://localhost:8080}")
    private String userServiceUrl;

    @Value("${user-service.internal-key:kconnecta-internal-secret}")
    private String internalKey;

    @Override
    public JsonNode getConfig() {
        try {
            return fetchConfigFromUserService();
        } catch (JacksonException e) {
            throw new IllegalStateException("Invalid policy response from user service", e);
        }
    }

    private JsonNode fetchConfigFromUserService() throws JacksonException {
        HttpHeaders headers = internalHeaders();
        ResponseEntity<String> response = restTemplate.exchange(
                userServiceUrl + "/api/internal/policies",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                String.class
        );
        if (response.getBody() == null || response.getBody().isBlank()) {
            return jsonMapper.createObjectNode();
        }
        JsonNode root = jsonMapper.readTree(response.getBody());
        return root.path("config");
    }

    @Override
    public JsonNode saveConfig(JsonNode config, String updatedBy) {
        HttpHeaders headers = internalHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        PolicySaveRequest body = new PolicySaveRequest(config, updatedBy);
        ResponseEntity<JsonNode> response = restTemplate.exchange(
                userServiceUrl + "/api/internal/policies",
                HttpMethod.PUT,
                new HttpEntity<>(body, headers),
                JsonNode.class
        );
        return response.getBody();
    }

    @Override
    public PolicyKeywordMergeResult mergeDefaultKeywords(String updatedBy) {
        HttpHeaders headers = internalHeaders();
        String url = UriComponentsBuilder
                .fromUriString(userServiceUrl + "/api/internal/policies/merge-default-keywords")
                .queryParam("updatedBy", updatedBy != null && !updatedBy.isBlank() ? updatedBy : "admin-merge")
                .encode(StandardCharsets.UTF_8)
                .build()
                .toUriString();
        ResponseEntity<PolicyKeywordMergeResult> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                new HttpEntity<>(headers),
                PolicyKeywordMergeResult.class
        );
        PolicyKeywordMergeResult body = response.getBody();
        if (body == null) {
            throw new IllegalStateException("Empty merge response from user service");
        }
        return body;
    }

    @Override
    public JsonNode resetToDefault(String updatedBy) {
        HttpHeaders headers = internalHeaders();
        String url = UriComponentsBuilder
                .fromUriString(userServiceUrl + "/api/internal/policies/reset-to-default")
                .queryParam("updatedBy", updatedBy != null && !updatedBy.isBlank() ? updatedBy : "admin-reset")
                .encode(StandardCharsets.UTF_8)
                .build()
                .toUriString();
        ResponseEntity<JsonNode> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                new HttpEntity<>(headers),
                JsonNode.class
        );
        JsonNode body = response.getBody();
        if (body == null) {
            throw new IllegalStateException("Empty reset response from user service");
        }
        return body;
    }

    private HttpHeaders internalHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Internal-Key", internalKey);
        return headers;
    }
}
