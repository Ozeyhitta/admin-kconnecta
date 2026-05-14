package project.kconnecta.admin.backend.config.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import project.kconnecta.admin.backend.common.util.JwtUtil;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);

            if (jwtUtil.isTokenValid(token)) {
                Claims claims = jwtUtil.extractClaims(token);
                String roleStr = claims.get("role", String.class);

                // Tokens without a role claim (e.g., from User backend) get no authorities
                // and will be rejected by the ROLE_ADMIN requirement on protected routes.
                List<SimpleGrantedAuthority> authorities = roleStr != null
                        ? List.of(new SimpleGrantedAuthority("ROLE_" + roleStr))
                        : Collections.emptyList();

                AdminPrincipal principal = new AdminPrincipal(
                        UUID.fromString(claims.getSubject()),
                        claims.get("username", String.class));

                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(principal, null, authorities);

                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        chain.doFilter(request, response);
    }
}
