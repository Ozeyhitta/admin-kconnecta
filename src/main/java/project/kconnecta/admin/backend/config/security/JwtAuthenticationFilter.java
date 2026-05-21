package project.kconnecta.admin.backend.config.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import project.kconnecta.admin.backend.common.util.JwtUtil;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String token = resolveToken(request);

        if (token != null) {
            if (!jwtUtil.isTokenValid(token)) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"message\":\"Invalid or expired token\"}");
                return;
            }

            Claims claims = jwtUtil.extractClaims(token);
            String roleStr = claims.get("role", String.class);
            if (roleStr != null && roleStr.startsWith("ROLE_")) {
                roleStr = roleStr.substring(5);
            }

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

        chain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7).trim();
        }
        String alt = request.getHeader("X-Admin-Token");
        if (alt != null && !alt.isBlank()) {
            return alt.trim();
        }
        return null;
    }
}
