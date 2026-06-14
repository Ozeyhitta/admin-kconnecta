package project.kconnecta.admin.backend.feature.moderation.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import project.kconnecta.admin.backend.feature.moderation.dto.request.ModerationCheckRequest;
import project.kconnecta.admin.backend.feature.moderation.dto.response.ModerationCheckResponse;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class GeminiModerationService {

    private static final String GEMINI_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";

    private static final String PROMPT_TEMPLATE = """
            Bạn là hệ thống kiểm duyệt nội dung. Hãy phân tích nội dung sau và trả về kết quả JSON CHÍNH XÁC theo định dạng dưới đây, không thêm gì khác.

            Nội dung cần kiểm tra:
            \"\"\"\
            %s
            \"\"\"\

            Trả lời ĐÚNG ĐỊNH DẠNG JSON sau:
            {
              "flagged": true/false,
              "categories": {
                "hate": true/false,
                "harassment": true/false,
                "self-harm": true/false,
                "sexual": true/false,
                "violence": true/false,
                "spam": true/false,
                "misinformation": true/false
              },
              "categoryScores": {
                "hate": 0.0,
                "harassment": 0.0,
                "self-harm": 0.0,
                "sexual": 0.0,
                "violence": 0.0,
                "spam": 0.0,
                "misinformation": 0.0
              }
            }

            - "flagged": true nếu bất kỳ category nào vi phạm
            - Scores từ 0.0 (không vi phạm) đến 1.0 (vi phạm rõ ràng)
            """;

    @Value("${gemini.api-key:}")
    private String apiKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public ModerationCheckResponse check(ModerationCheckRequest req) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Gemini API key not configured");
        }

        String content = buildContent(req);
        if (content.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "At least one of text or imageUrl is required");
        }

        try {
            String prompt = String.format(PROMPT_TEMPLATE, content);
            Map<String, Object> body = Map.of(
                    "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))
            );

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            String bodyStr = objectMapper.writeValueAsString(body);

            var entity = new org.springframework.http.HttpEntity<>(bodyStr, headers);
            var resp = restTemplate.exchange(
                    GEMINI_URL + "?key=" + apiKey,
                    org.springframework.http.HttpMethod.POST,
                    entity,
                    String.class);

            if (resp.getBody() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Empty response from Gemini");
            }

            return parseResponse(objectMapper.readTree(resp.getBody()));
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Gemini moderation call failed: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Gemini API error: " + e.getMessage());
        }
    }

    private String buildContent(ModerationCheckRequest req) {
        StringBuilder sb = new StringBuilder();
        if (req.text() != null && !req.text().isBlank()) {
            sb.append(req.text());
        }
        if (req.imageUrl() != null && !req.imageUrl().isBlank()) {
            if (!sb.isEmpty()) sb.append("\n");
            sb.append("[Image URL: ").append(req.imageUrl()).append("]");
        }
        return sb.toString().strip();
    }

    private ModerationCheckResponse parseResponse(JsonNode root) {
        try {
            String text = root.path("candidates").get(0)
                    .path("content").path("parts").get(0)
                    .path("text").asText().strip();
            if (text.startsWith("```")) {
                text = text.replaceAll("(?s)```[a-z]*\\n?", "").strip();
            }

            JsonNode result = objectMapper.readTree(text);
            boolean flagged = result.path("flagged").asBoolean(false);

            Map<String, Boolean> categories = new LinkedHashMap<>();
            Map<String, Double> scores = new LinkedHashMap<>();

            result.path("categories").fields()
                    .forEachRemaining(e -> categories.put(e.getKey(), e.getValue().asBoolean()));
            result.path("categoryScores").fields()
                    .forEachRemaining(e -> scores.put(e.getKey(), e.getValue().asDouble()));

            return ModerationCheckResponse.builder()
                    .flagged(flagged)
                    .categories(categories)
                    .categoryScores(scores)
                    .categoryAppliedInputTypes(Collections.emptyMap())
                    .build();
        } catch (Exception e) {
            log.warn("Failed to parse Gemini moderation response: {}", e.getMessage());
            return ModerationCheckResponse.builder()
                    .flagged(false)
                    .categories(Collections.emptyMap())
                    .categoryScores(Collections.emptyMap())
                    .categoryAppliedInputTypes(Collections.emptyMap())
                    .build();
        }
    }
}
