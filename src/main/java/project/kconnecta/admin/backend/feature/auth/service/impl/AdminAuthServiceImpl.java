package project.kconnecta.admin.backend.feature.auth.service.impl;

import project.kconnecta.admin.backend.feature.auth.service.AdminAuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import project.kconnecta.admin.backend.common.enums.AccountRole;
import project.kconnecta.admin.backend.common.enums.AccountStatus;
import project.kconnecta.admin.backend.common.util.JwtUtil;
import project.kconnecta.admin.backend.entity.Account;
import project.kconnecta.admin.backend.exception.ResourceNotFoundException;
import project.kconnecta.admin.backend.feature.auth.dto.request.AdminInitRequest;
import project.kconnecta.admin.backend.feature.auth.dto.request.AdminLoginRequest;
import project.kconnecta.admin.backend.feature.auth.dto.response.AdminInitResponse;
import project.kconnecta.admin.backend.feature.auth.dto.response.AdminLoginResponse;
import project.kconnecta.admin.backend.feature.user.repository.AccountRepository;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminAuthServiceImpl implements AdminAuthService {

    private final AccountRepository accountRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Override
    public AdminLoginResponse login(AdminLoginRequest request) {
        Account account = accountRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        if (account.getRole() != AccountRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: insufficient privileges");
        }

        if (account.getStatus() == AccountStatus.BLOCKED || account.getStatus() == AccountStatus.DELETED) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản đã bị khóa hoặc không có quyền truy cập");
        }

        if (!passwordEncoder.matches(request.getPassword(), account.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String displayName = account.getUser() != null
                ? account.getUser().getUsername()
                : account.getEmail();

        String token = jwtUtil.generateToken(account.getId(), displayName, account.getRole());

        return AdminLoginResponse.builder()
                .token(token)
                .id(account.getId().toString())
                .email(account.getEmail())
                .role(account.getRole().name())
                .build();
    }

    @Override
    @Transactional
    public AdminInitResponse init(AdminInitRequest request) {
        boolean adminExists = accountRepository
                .findByRole(AccountRole.ADMIN, PageRequest.of(0, 1))
                .hasContent();

        if (adminExists) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Admin account already exists. Use /login instead."
            );
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

        return AdminInitResponse.builder()
                .message("Admin account created. This endpoint is now locked.")
                .email(account.getEmail())
                .id(account.getId().toString())
                .build();
    }
}
