package project.kconnecta.admin.backend.feature.stats.dto.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class NewUsersInsight {
    String type;    // trend | peak | gap | slowdown
    String level;   // warning | info | success
    String title;
    String message;
}
