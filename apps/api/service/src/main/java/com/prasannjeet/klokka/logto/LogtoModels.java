package com.prasannjeet.klokka.logto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.Map;

// Request and response shapes of the Management API calls in LogtoManagementApi. Responses ignore what Klokka
// does not read; requests omit nulls so Logto's validator sees only what was meant.
public final class LogtoModels {

    private LogtoModels() {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Organization(String id, String name, String description) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record CreateOrganization(String name, String description, Map<String, Object> customData) {}

    public record UserIds(List<String> userIds) {}

    public record OrganizationRoleIds(List<String> organizationRoleIds) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record CreateInvitation(String organizationId, String invitee, String inviterId, long expiresAt,
            List<String> organizationRoleIds, MessagePayload messagePayload) {}

    public record MessagePayload(String link) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Invitation(String id, String organizationId, String invitee, String status, String acceptedUserId,
            Long expiresAt) {}

    public record InvitationStatusUpdate(String status, String acceptedUserId) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record User(String id, String primaryEmail, String name, String username) {}

    public record UserUpdate(String name) {}
}
