package project.kconnecta.admin.backend.feature.policy.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import project.kconnecta.admin.backend.feature.policy.entity.PolicyKeyword;

import java.util.List;

public interface PolicyKeywordRepository extends JpaRepository<PolicyKeyword, String> {

    List<PolicyKeyword> findAllByOrderByCategoryAscValueAsc();

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM PolicyKeyword")
    void deleteAllKeywords();
}
