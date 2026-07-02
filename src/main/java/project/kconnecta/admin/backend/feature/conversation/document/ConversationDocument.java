package project.kconnecta.admin.backend.feature.conversation.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;
import org.springframework.data.elasticsearch.annotations.Setting;

import java.util.UUID;

@Document(indexName = "conversations", createIndex = false)
@Setting(settingPath = "elasticsearch-settings.json")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationDocument {

    @Id
    private String id; // user1Id_user2Id

    @Field(type = FieldType.Keyword)
    private UUID user1Id;

    @Field(type = FieldType.Text, analyzer = "vi_analyzer", searchAnalyzer = "vi_analyzer")
    private String user1Username;

    @Field(type = FieldType.Text, analyzer = "vi_analyzer", searchAnalyzer = "vi_analyzer")
    private String user1FullName;

    @Field(type = FieldType.Keyword)
    private String user1AvatarUrl;

    @Field(type = FieldType.Keyword)
    private UUID user2Id;

    @Field(type = FieldType.Text, analyzer = "vi_analyzer", searchAnalyzer = "vi_analyzer")
    private String user2Username;

    @Field(type = FieldType.Text, analyzer = "vi_analyzer", searchAnalyzer = "vi_analyzer")
    private String user2FullName;

    @Field(type = FieldType.Keyword)
    private String user2AvatarUrl;

    @Field(type = FieldType.Long)
    private Long messageCount;

    @Field(type = FieldType.Long)
    private Long unreadCount;

    @Field(type = FieldType.Text, analyzer = "vi_analyzer", searchAnalyzer = "vi_analyzer")
    private String lastMessageContent;

    @Field(type = FieldType.Keyword)
    private UUID lastMessageSenderId;

    @Field(type = FieldType.Long)
    private Long lastMessageAt; // millisecond timestamp

    @Field(type = FieldType.Keyword)
    private String status;

    @Field(type = FieldType.Long)
    private Long reportCount;
}
