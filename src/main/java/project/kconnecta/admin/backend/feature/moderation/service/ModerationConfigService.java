package project.kconnecta.admin.backend.feature.moderation.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.admin.backend.feature.moderation.entity.ModerationConfig;
import project.kconnecta.admin.backend.feature.moderation.repository.ModerationConfigRepository;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ModerationConfigService {

    private final ModerationConfigRepository repo;

    public int getInt(String key, int defaultValue) {
        return repo.findById(key)
                .map(c -> {
                    try {
                        return Integer.parseInt(c.getValue());
                    } catch (NumberFormatException e) {
                        return defaultValue;
                    }
                })
                .orElse(defaultValue);
    }

    public Map<String, String> getAll() {
        return repo.findAll().stream()
                .collect(Collectors.toMap(ModerationConfig::getKey, ModerationConfig::getValue));
    }

    @Transactional
    public Map<String, String> update(Map<String, String> updates) {
        updates.forEach((key, value) -> {
            if (value == null || value.isBlank()) return;
            int parsed;
            try {
                parsed = Integer.parseInt(value.trim());
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Giá trị không hợp lệ cho key '" + key + "': " + value);
            }
            if (parsed <= 0) {
                throw new IllegalArgumentException("Giá trị phải lớn hơn 0 cho key '" + key + "'");
            }
            ModerationConfig config = repo.findById(key)
                    .orElse(new ModerationConfig(key, null, null));
            config.setValue(String.valueOf(parsed));
            config.setUpdatedAt(LocalDateTime.now());
            repo.save(config);
        });
        return getAll();
    }
}
