package project.kconnecta.admin.backend.feature.auth.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import project.kconnecta.admin.backend.feature.auth.dto.request.AdminInitRequest;
import project.kconnecta.admin.backend.feature.auth.dto.request.AdminLoginRequest;
import project.kconnecta.admin.backend.feature.auth.service.AdminAuthService;

@RestController
@RequestMapping("/api/v1/admin/auth")
@RequiredArgsConstructor
public class AdminAuthController {

    private final AdminAuthService adminAuthService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AdminLoginRequest request) {
        return ResponseEntity.ok(adminAuthService.login(request));
    }

    @PostMapping("/init")
    public ResponseEntity<?> init(@Valid @RequestBody AdminInitRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminAuthService.init(request));
    }
}
