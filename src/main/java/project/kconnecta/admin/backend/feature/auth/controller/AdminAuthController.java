package project.kconnecta.admin.backend.feature.auth.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.admin.backend.common.enums.AccountRole;
import project.kconnecta.admin.backend.common.util.JwtUtil;
import project.kconnecta.admin.backend.entity.Account;
import project.kconnecta.admin.backend.exception.ResourceNotFoundException;
import project.kconnecta.admin.backend.common.enums.AccountStatus;
import project.kconnecta.admin.backend.feature.auth.dto.AdminInitRequest;
import project.kconnecta.admin.backend.feature.auth.dto.AdminLoginRequest;
import project.kconnecta.admin.backend.feature.user.repository.AccountRepository;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/auth")
@RequiredArgsConstructor
public class AdminAuthController {

    private final AccountRepository accountRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody AdminLoginRequest request) {
        Account account = accountRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        if (account.getRole() != AccountRole.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Access denied: insufficient privileges"));
        }

        if (!passwordEncoder.matches(request.getPassword(), account.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid credentials"));
        }

        String displayName = account.getUser() != null
                ? account.getUser().getUsername()
                : account.getEmail();

        String token = jwtUtil.generateToken(account.getId(), displayName, account.getRole());

        return ResponseEntity.ok(Map.of(
                "token", token,
                "id", account.getId().toString(),
                "email", account.getEmail(),
                "role", account.getRole().name()
        ));
    }

    // One-time setup endpoint — blocked once the first ADMIN account exists
    @PostMapping("/init")
    public ResponseEntity<Map<String, Object>> init(@Valid @RequestBody AdminInitRequest request) {
        boolean adminExists = accountRepository.findByRole(AccountRole.ADMIN,
                org.springframework.data.domain.PageRequest.of(0, 1)).hasContent();

        if (adminExists) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Admin account already exists. Use /login instead."));
        }

        Account account = Account.builder()
                .id(UUID.randomUUID())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .status(AccountStatus.ACTIVE)
                .role(AccountRole.ADMIN)
                .createdAt(LocalDateTime.now())
                .build();

        accountRepository.save(account);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of(
                        "message", "Admin account created. This endpoint is now locked.",
                        "email", account.getEmail(),
                        "id", account.getId().toString()
                ));
    }
}
