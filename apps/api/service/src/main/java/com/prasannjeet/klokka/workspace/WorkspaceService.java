package com.prasannjeet.klokka.workspace;

import static com.prasannjeet.klokka.contract.model.MemberStatus.ACTIVE;
import static com.prasannjeet.klokka.contract.model.MemberStatus.INVITED;
import static com.prasannjeet.klokka.error.KlokkaException.validation;

import com.prasannjeet.klokka.auth.Access;
import com.prasannjeet.klokka.auth.WorkspaceAccess;
import com.prasannjeet.klokka.contract.model.Role;
import com.prasannjeet.klokka.contract.model.Rounding;
import com.prasannjeet.klokka.contract.model.WeekStart;
import com.prasannjeet.klokka.contract.model.Workspace;
import com.prasannjeet.klokka.contract.model.WorkspaceColour;
import com.prasannjeet.klokka.contract.model.WorkspaceCreate;
import com.prasannjeet.klokka.contract.model.WorkspaceUpdate;
import com.prasannjeet.klokka.domain.WorkspaceId;
import com.prasannjeet.klokka.error.KlokkaException;
import com.prasannjeet.klokka.error.ProblemCode;
import com.prasannjeet.klokka.logto.LogtoService;
import com.prasannjeet.klokka.me.MeService;
import com.prasannjeet.klokka.persistence.AppUserEntity;
import com.prasannjeet.klokka.persistence.MembershipEntity;
import com.prasannjeet.klokka.persistence.MembershipRepository;
import com.prasannjeet.klokka.persistence.WorkspaceEntity;
import com.prasannjeet.klokka.persistence.WorkspaceRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.PersistenceException;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Currency;
import java.util.List;
import java.util.UUID;
import org.jboss.logging.Logger;

// Workspaces (CHQ-112): creating one makes the Logto organization first, adds the caller as its EMPLOYER there,
// then writes workspace + membership in one transaction; if the write fails the organization is deleted again.
@ApplicationScoped
public class WorkspaceService {

    private static final Logger LOG = Logger.getLogger(WorkspaceService.class);
    private static final int SLUG_ATTEMPTS = 50;
    private static final String DEFAULT_EMOJI = "🕒";

    @Inject
    WorkspaceRepository workspaces;

    @Inject
    MembershipRepository memberships;

    @Inject
    WorkspaceAccess access;

    @Inject
    MeService me;

    @Inject
    LogtoService logto;

    @Inject
    Clock clock;

    @Transactional
    public Workspace create(WorkspaceCreate request) {
        AppUserEntity user = me.ensureCurrentUser();
        Instant now = clock.instant();
        UUID id = UUID.randomUUID();
        WorkspaceId workspaceId = WorkspaceId.of(id);
        String name = request.getName().trim();
        if (name.isEmpty()) throw validation("name", "must not be blank");

        WorkspaceEntity workspace = new WorkspaceEntity();
        workspace.id = id;
        workspace.name = name;
        workspace.slug = uniqueSlug(workspaceId, name);
        workspace.timezone = zone(request.getTimezone()).getId();
        workspace.country = request.getCountry();
        workspace.currency = currency(request.getCurrency());
        workspace.weekStart = request.getWeekStart() == null ? WeekStart.MONDAY : request.getWeekStart();
        workspace.colour = request.getColour() == null ? WorkspaceColour.PRIMARY : request.getColour();
        workspace.emoji = request.getEmoji() == null || request.getEmoji().isBlank() ? DEFAULT_EMOJI : request.getEmoji();
        workspace.showPay = Boolean.TRUE.equals(request.getShowPay());
        workspace.rounding = request.getRounding() == null ? Rounding.NONE : request.getRounding();
        workspace.defaultDayHours = request.getDefaultDayHours() == null ? new BigDecimal("8.00") : request.getDefaultDayHours();
        workspace.createdAt = now;

        String orgId = logto.createOrganization(name, id.toString());
        try {
            logto.addMember(orgId, user.id, Role.EMPLOYER);
            workspace.logtoOrgId = orgId;
            workspaces.persistWorkspace(workspaceId, workspace);

            MembershipEntity employer = new MembershipEntity();
            employer.id = UUID.randomUUID();
            employer.workspaceId = id;
            employer.userId = user.id;
            employer.role = Role.EMPLOYER;
            employer.displayName = user.displayName.isBlank() ? name : user.displayName;
            employer.email = user.email == null ? user.id.toLowerCase() + "@unknown.invalid" : user.email;
            employer.status = ACTIVE;
            employer.invitedAt = now;
            employer.joinedAt = now;
            memberships.persistMember(workspaceId, employer);
            workspaces.flushNow(workspaceId);
            return toWorkspace(new Access(workspace, employer));
        } catch (PersistenceException | KlokkaException e) {
            LOG.warnf("workspace %s could not be written after Logto organization %s was created; deleting the organization", id, orgId);
            try {
                logto.deleteOrganization(orgId);
            } catch (KlokkaException cleanup) {
                LOG.errorf(cleanup, "compensating delete of Logto organization %s failed; it is now orphaned", orgId);
            }
            if (e instanceof KlokkaException k) throw k;
            throw new KlokkaException(ProblemCode.INTERNAL, "The workspace could not be saved.", e);
        }
    }

    @Transactional
    public Workspace get(UUID workspaceId) {
        return toWorkspace(access.member(workspaceId));
    }

    @Transactional
    public Workspace update(UUID workspaceId, WorkspaceUpdate update) {
        Access a = access.employer(workspaceId);
        WorkspaceEntity w = a.workspace();
        if (update.getName() != null) {
            String name = update.getName().trim();
            if (name.isEmpty()) throw validation("name", "must not be blank");
            w.name = name;
        }
        if (update.getTimezone() != null) w.timezone = zone(update.getTimezone()).getId();
        if (update.getCountry() != null) w.country = update.getCountry();
        if (update.getCurrency() != null) w.currency = currency(update.getCurrency());
        if (update.getWeekStart() != null) w.weekStart = update.getWeekStart();
        if (update.getColour() != null) w.colour = update.getColour();
        if (update.getEmoji() != null && !update.getEmoji().isBlank()) w.emoji = update.getEmoji();
        if (update.getShowPay() != null) w.showPay = update.getShowPay();
        if (update.getRounding() != null) w.rounding = update.getRounding();
        if (update.getDefaultDayHours() != null) w.defaultDayHours = update.getDefaultDayHours();
        return toWorkspace(a);
    }

    Workspace toWorkspace(Access a) {
        WorkspaceEntity w = a.workspace();
        WorkspaceId id = a.workspaceId();
        return new Workspace()
                .id(w.id)
                .name(w.name)
                .slug(w.slug)
                .timezone(w.timezone)
                .country(w.country)
                .currency(w.currency)
                .weekStart(w.weekStart)
                .colour(w.colour)
                .emoji(w.emoji)
                .showPay(w.showPay)
                .rounding(w.rounding)
                .defaultDayHours(w.defaultDayHours)
                .createdAt(w.createdAt.atOffset(ZoneOffset.UTC))
                .memberCount((int) memberships.countByStatus(id, List.of(ACTIVE, INVITED)))
                .activeMemberCount((int) memberships.countByStatus(id, List.of(ACTIVE)))
                .myRole(a.membership().role)
                .myMembershipId(a.membership().id);
    }

    private String uniqueSlug(WorkspaceId workspaceId, String name) {
        String base = Slugs.of(name);
        if (!workspaces.slugTaken(workspaceId, base)) return base;
        for (int i = 2; i <= SLUG_ATTEMPTS; i++) {
            String candidate = base + "-" + i;
            if (!workspaces.slugTaken(workspaceId, candidate)) return candidate;
        }
        return base + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    // Region ids only (CHQ-145): ZoneId.of also accepts offsets such as "UTC+1" and stores them as "UTC+01:00",
    // which Intl rejects on both clients, so anything outside the tz database's ids is a validation problem.
    static ZoneId zone(String timezone) {
        if (timezone == null || !ZoneId.getAvailableZoneIds().contains(timezone)) {
            throw validation("timezone", "is not an IANA time zone");
        }
        return ZoneId.of(timezone);
    }

    static String currency(String code) {
        try {
            return Currency.getInstance(code).getCurrencyCode();
        } catch (IllegalArgumentException e) {
            throw validation("currency", "is not an ISO 4217 code");
        }
    }
}
