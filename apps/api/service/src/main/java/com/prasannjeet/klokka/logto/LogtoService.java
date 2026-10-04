package com.prasannjeet.klokka.logto;

import static com.prasannjeet.klokka.error.ProblemCode.INTERNAL;

import com.prasannjeet.klokka.config.KlokkaConfig;
import com.prasannjeet.klokka.contract.model.Role;
import com.prasannjeet.klokka.error.KlokkaException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.ProcessingException;
import jakarta.ws.rs.WebApplicationException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

// Klokka's view of Logto organizations, invitations and users. Every call is translated into a KlokkaException
// (INTERNAL, cause preserved) so a Logto outage is one problem code, and the self-check answers the health page
// without ever failing the boot.
@ApplicationScoped
public class LogtoService {

    private static final Logger LOG = Logger.getLogger(LogtoService.class);
    private static final String ACCEPTED = "Accepted";

    @Inject
    @RestClient
    LogtoManagementApi api;

    @Inject
    KlokkaConfig config;

    public record SelfCheck(boolean reachable, long latencyMs, String detail) {}

    public String createOrganization(String name, String workspaceId) {
        return call("create organization", () -> api.createOrganization(
                new LogtoModels.CreateOrganization(name, "Klokka workspace " + workspaceId, null))).id();
    }

    // An organization or user that is already gone counts as deleted, so deleting is safe to repeat.
    public void deleteOrganization(String organizationId) {
        callIgnoringNotFound("delete organization", () -> api.deleteOrganization(organizationId));
    }

    public void deleteUser(String userId) {
        callIgnoringNotFound("delete user", () -> api.deleteUser(userId));
    }

    public void addMember(String organizationId, String userId, Role role) {
        call("add organization member", () -> {
            api.addUsers(organizationId, new LogtoModels.UserIds(List.of(userId)));
            api.assignUserRoles(organizationId, userId, new LogtoModels.OrganizationRoleIds(List.of(roleId(role))));
            return null;
        });
    }

    public void removeMember(String organizationId, String userId) {
        call("remove organization member", () -> {
            api.removeUser(organizationId, userId);
            return null;
        });
    }

    // Logto sends the OrganizationInvitation email through the tenant's connector because messagePayload is set.
    public String createInvitation(String organizationId, String email, String inviterUserId, Instant expiresAt,
            LogtoModels.MessagePayload message) {
        return call("create organization invitation", () -> api.createInvitation(new LogtoModels.CreateInvitation(
                organizationId, email, inviterUserId, expiresAt.toEpochMilli(), List.of(roleId(Role.EMPLOYEE)),
                message))).id();
    }

    public void acceptInvitation(String invitationId, String userId) {
        call("accept organization invitation", () -> api.updateInvitationStatus(invitationId,
                new LogtoModels.InvitationStatusUpdate(ACCEPTED, userId)));
    }

    // Best effort: a Logto invitation that is already gone must not block Klokka's own bookkeeping.
    public void revokeInvitationQuietly(String invitationId) {
        if (invitationId == null) return;
        try {
            api.deleteInvitation(invitationId);
        } catch (WebApplicationException | ProcessingException e) {
            LOG.warnf("Logto invitation %s could not be deleted: %s", invitationId, e.getMessage());
        }
    }

    // Best effort: Logto's copy of the name feeds {{inviter.name}} in its invitation email, so a chosen name is
    // mirrored there; a failure must never fail the profile update or the accept that carried it.
    public void updateUserNameQuietly(String userId, String name) {
        try {
            api.updateUser(userId, new LogtoModels.UserUpdate(name));
        } catch (WebApplicationException | ProcessingException e) {
            LOG.warnf("Logto user %s name could not be updated: %s", userId, e.getMessage());
        }
    }

    // A profile read that never throws: first sight of a user must not fail because Logto is unreachable.
    public Optional<LogtoModels.User> findUserQuietly(String userId) {
        try {
            return findUser(userId);
        } catch (KlokkaException e) {
            LOG.warnf("Logto profile of %s not read: %s", userId, e.getMessage());
            return Optional.empty();
        }
    }

    public Optional<LogtoModels.User> findUser(String userId) {
        try {
            return Optional.ofNullable(api.getUser(userId));
        } catch (WebApplicationException e) {
            if (e.getResponse().getStatus() == 404) return Optional.empty();
            throw new KlokkaException(INTERNAL, "Logto read user failed with HTTP " + e.getResponse().getStatus(), e);
        } catch (ProcessingException e) {
            throw new KlokkaException(INTERNAL, "Logto is unreachable: " + e.getMessage(), e);
        }
    }

    // One authenticated read; never throws, so callers can put the answer on a health page or in a log line.
    public SelfCheck selfCheck() {
        long started = System.nanoTime();
        try {
            api.listOrganizations(1, 1);
            long ms = (System.nanoTime() - started) / 1_000_000;
            return new SelfCheck(true, ms, "Management API answered as " + config.logto().endpoint().getHost());
        } catch (RuntimeException e) {
            long ms = (System.nanoTime() - started) / 1_000_000;
            String reason = e instanceof WebApplicationException w ? "HTTP " + w.getResponse().getStatus() : String.valueOf(e.getMessage());
            LOG.warnf("Logto Management API self-check failed (%s): %s", config.logto().endpoint(), reason);
            return new SelfCheck(false, ms, reason);
        }
    }

    private String roleId(Role role) {
        return role == Role.EMPLOYER ? config.logto().employerRoleId() : config.logto().employeeRoleId();
    }

    private static void callIgnoringNotFound(String what, Runnable action) {
        try {
            call(what, () -> {
                action.run();
                return null;
            });
        } catch (KlokkaException e) {
            if (e.getCause() instanceof WebApplicationException w && w.getResponse().getStatus() == 404) return;
            throw e;
        }
    }

    private static <T> T call(String what, Supplier<T> action) {
        try {
            return action.get();
        } catch (WebApplicationException e) {
            String body = e.getResponse().hasEntity() ? String.valueOf(e.getResponse().readEntity(String.class)) : "";
            throw new KlokkaException(INTERNAL, "Logto " + what + " failed with HTTP " + e.getResponse().getStatus()
                    + (body.isBlank() ? "" : ": " + body), e);
        } catch (ProcessingException e) {
            throw new KlokkaException(INTERNAL, "Logto " + what + " failed: Logto is unreachable (" + e.getMessage() + ")", e);
        }
    }
}
