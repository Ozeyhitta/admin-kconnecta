package project.kconnecta.admin.backend.feature.user.repository;

import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import project.kconnecta.admin.backend.feature.user.document.UserDocument;

public interface UserElasticsearchRepository extends ElasticsearchRepository<UserDocument, String> {
}
