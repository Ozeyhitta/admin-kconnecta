package project.kconnecta.admin.backend.common.util;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import project.kconnecta.admin.backend.common.enums.MediaType;
import project.kconnecta.admin.backend.entity.PostMedia;

import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryPostMediaService {

    private final Cloudinary cloudinary;

    @Value("${cloudinary.cloud-name:}")
    private String cloudName;

    public void deletePostAssets(List<PostMedia> media, String legacyImageUrl) {
        if (cloudName == null || cloudName.isBlank()) {
            log.warn("Cloudinary is not configured; post media assets were not deleted");
            return;
        }

        Set<String> seen = new HashSet<>();
        for (PostMedia item : media) {
            deleteIfManaged(item.getFileUrl(), item.getMediaType(), seen);
            deleteIfManaged(item.getThumbnailUrl(), MediaType.IMAGE, seen);
        }

        boolean legacyAlreadyIncluded = media.stream()
                .anyMatch(item -> legacyImageUrl != null && legacyImageUrl.equals(item.getFileUrl()));
        if (!legacyAlreadyIncluded) {
            deleteIfManaged(legacyImageUrl, MediaType.IMAGE, seen);
        }
    }

    private void deleteIfManaged(String url, MediaType mediaType, Set<String> seen) {
        if (url == null) {
            return;
        }
        String trimmed = url.trim();
        if (trimmed.isBlank() || !seen.add(trimmed) || !isManagedPostMediaUrl(trimmed)) {
            return;
        }

        String publicId = extractPublicId(trimmed);
        if (publicId == null || publicId.isBlank()) {
            return;
        }

        try {
            cloudinary.uploader().destroy(
                    publicId,
                    ObjectUtils.asMap("resource_type", resolveResourceType(trimmed, mediaType)));
        } catch (IOException | RuntimeException exception) {
            // Match the User backend: a temporary Cloudinary problem must not prevent
            // an administrator from removing an abusive post from the database.
            log.warn("Failed to delete Cloudinary post asset {}: {}", trimmed, exception.getMessage());
        }
    }

    private static boolean isManagedPostMediaUrl(String url) {
        return url.contains("/kconnecta/post-images/")
                || url.contains("/kconnecta/post-files/")
                || url.contains("post-media-");
    }

    private static String resolveResourceType(String url, MediaType mediaType) {
        if (url.contains("/video/upload/") || mediaType == MediaType.VIDEO) {
            return "video";
        }
        if (url.contains("/raw/upload/") || mediaType == MediaType.DOCUMENT) {
            return "raw";
        }
        return "image";
    }

    private static String extractPublicId(String url) {
        try {
            int uploadIndex = url.indexOf("/upload/");
            if (uploadIndex < 0) {
                return null;
            }

            String[] parts = url.substring(uploadIndex + "/upload/".length()).split("/");
            int start = parts.length > 0 && parts[0].matches("v\\d+") ? 1 : 0;
            String publicId = String.join("/", java.util.Arrays.copyOfRange(parts, start, parts.length));
            int queryIndex = publicId.indexOf('?');
            if (queryIndex >= 0) {
                publicId = publicId.substring(0, queryIndex);
            }
            int extensionIndex = publicId.lastIndexOf('.');
            return extensionIndex < 0 ? publicId : publicId.substring(0, extensionIndex);
        } catch (RuntimeException exception) {
            return null;
        }
    }
}
