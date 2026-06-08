package project.kconnecta.admin.backend.feature.auth.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import project.kconnecta.admin.backend.common.util.JwtUtil;
import project.kconnecta.admin.backend.config.security.AdminTokenBlacklistService;
import project.kconnecta.admin.backend.feature.auth.dto.request.AdminInitRequest;
import project.kconnecta.admin.backend.feature.auth.dto.request.AdminLoginRequest;
import project.kconnecta.admin.backend.feature.auth.service.AdminAuthService;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/auth")
@RequiredArgsConstructor
public class AdminAuthController {

    private final AdminAuthService adminAuthService;
    private final JwtUtil jwtUtil;
    private final AdminTokenBlacklistService tokenBlacklistService;

    @Value("${admin.bootstrap.key:}")
    private String bootstrapKey;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AdminLoginRequest request) {
        return ResponseEntity.ok(adminAuthService.login(request));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();
            try {
                java.time.Instant expiry = jwtUtil.extractClaims(token).getExpiration().toInstant();
                tokenBlacklistService.blacklistToken(token, expiry);
            } catch (Exception ignored) {
                // Token already invalid — nothing to blacklist
            }
        }
        return ResponseEntity.ok(Map.of("message", "Dang xuat thanh cong"));
    }

    @PostMapping("/init")
    public ResponseEntity<?> init(
            @RequestHeader(value = "X-Bootstrap-Key", required = false) String providedKey,
            @Valid @RequestBody AdminInitRequest request) {
        if (bootstrapKey.isBlank() || !bootstrapKey.equals(providedKey)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Missing or invalid bootstrap key"));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(adminAuthService.init(request));
    }
}
