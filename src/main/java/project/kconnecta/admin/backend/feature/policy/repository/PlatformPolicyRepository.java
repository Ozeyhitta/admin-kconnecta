package project.kconnecta.admin.backend.feature.policy.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import project.kconnecta.admin.backend.feature.policy.entity.PlatformPolicy;

public interface PlatformPolicyRepository extends JpaRepository<PlatformPolicy, Long> {
}
