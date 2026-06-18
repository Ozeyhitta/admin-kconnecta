package project.kconnecta.admin.backend.feature.policy.dto;

public record PolicyKeywordMergeResult(
        int added,
        int skipped,
        int totalKeywords
) {}
