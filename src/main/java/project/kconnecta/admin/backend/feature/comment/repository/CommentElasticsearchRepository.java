package project.kconnecta.admin.backend.feature.comment.repository;

import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import project.kconnecta.admin.backend.feature.comment.document.CommentDocument;

public interface CommentElasticsearchRepository extends ElasticsearchRepository<CommentDocument, String> {
}
