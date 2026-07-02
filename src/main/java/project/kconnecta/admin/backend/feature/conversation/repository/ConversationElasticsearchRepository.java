package project.kconnecta.admin.backend.feature.conversation.repository;

import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import project.kconnecta.admin.backend.feature.conversation.document.ConversationDocument;

public interface ConversationElasticsearchRepository extends ElasticsearchRepository<ConversationDocument, String> {
}
