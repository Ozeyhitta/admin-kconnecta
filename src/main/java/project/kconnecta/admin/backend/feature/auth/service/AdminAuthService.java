package project.kconnecta.admin.backend.feature.auth.service;

import project.kconnecta.admin.backend.feature.auth.dto.request.AdminInitRequest;
import project.kconnecta.admin.backend.feature.auth.dto.request.AdminLoginRequest;
import project.kconnecta.admin.backend.feature.auth.dto.response.AdminInitResponse;
import project.kconnecta.admin.backend.feature.auth.dto.response.AdminLoginResponse;

public interface AdminAuthService {

    AdminLoginResponse login(AdminLoginRequest request);

    AdminInitResponse init(AdminInitRequest request);
}
