package project.kconnecta.admin.backend.feature.report.repository;

import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import project.kconnecta.admin.backend.feature.report.document.ReportDocument;

public interface ReportElasticsearchRepository extends ElasticsearchRepository<ReportDocument, String> {
}
