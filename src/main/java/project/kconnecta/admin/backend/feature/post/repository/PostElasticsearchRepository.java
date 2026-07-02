package project.kconnecta.admin.backend.feature.post.repository;

import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import project.kconnecta.admin.backend.feature.post.document.PostDocument;

public interface PostElasticsearchRepository extends ElasticsearchRepository<PostDocument, String> {
}
