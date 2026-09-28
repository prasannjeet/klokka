package com.prasannjeet.klokka.member;

import static com.prasannjeet.klokka.contract.model.MemberStatus.ACTIVE;
import static com.prasannjeet.klokka.contract.model.MemberStatus.DEACTIVATED;
import static com.prasannjeet.klokka.contract.model.MemberStatus.INVITED;
import static com.prasannjeet.klokka.error.KlokkaException.validation;
import static com.prasannjeet.klokka.error.ProblemCode.CONFLICT;

import com.prasannjeet.klokka.auth.Access;
import com.prasannjeet.klokka.auth.WorkspaceAccess;
import com.prasannjeet.klokka.config.KlokkaConfig;
import com.prasannjeet.klokka.contract.model.Member;
import com.prasannjeet.klokka.contract.model.MemberInvite;
import com.prasannjeet.klokka.contract.model.MemberStatus;
import com.prasannjeet.klokka.contract.model.MemberUpdate;
import com.prasannjeet.klokka.contract.model.Role;
import com.prasannjeet.klokka.domain.WorkspaceId;
import com.prasannjeet.klokka.error.KlokkaException;
import com.prasannjeet.klokka.logto.LogtoService;
import com.prasannjeet.klokka.mail.EmailSendRepository;
import com.prasannjeet.klokka.mail.MailService;
import com.prasannjeet.klokka.month.Months;
import com.prasannjeet.klokka.persistence.EntryRepository;
import com.prasannjeet.klokka.persistence.MembershipEntity;
import com.prasannjeet.klokka.persistence.MembershipRepository;
import com.prasannjeet.klokka.rest.JsonFieldPresence;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

// Members of a workspace (CHQ-113, CHQ-116): invitations through Logto organization invitations, PATCH with
// absent-versus-null semantics, deactivate instead of delete once hours exist so history stays visible.
@ApplicationScoped
public class MemberService {

    private static final SecureRandom RANDOM = new SecureRandom();

    @Inject
    WorkspaceAccess access;

    @Inject
    MembershipRepository memberships;

    @Inject
    EntryRepository entries;

    @Inject
    LogtoService logto;

    @Inject
    MailService mail;

    @Inject
    KlokkaConfig config;

    @Inject
    JsonFieldPresence presence;

    @Inject
    Clock clock;

    @Transactional
    public List<Member> list(UUID workspaceId, MemberStatus status, String month) {
        Access a = access.member(workspaceId);
        YearMonth ym = Months.parseOrCurrent(month, a.workspace(), clock);
        Instant now = clock.instant();
        WorkspaceId id = a.workspaceId();
        Map<UUID, BigDecimal> hours = entries.hoursPerMember(id, ym.atDay(1), ym.atEndOfMonth());
        Map<UUID, Long> days = entries.daysPerMember(id, ym.atDay(1), ym.atEndOfMonth());
        Map<UUID, LocalDate> last = entries.lastEntryDates(id);
        return memberships.listMembers(id).stream()
                .filter(m -> status == null || m.status == status)
                .map(m -> MemberViews.toMember(a, m, ym, hours.get(m.id), days.getOrDefault(m.id, 0L), last.get(m.id), now))
                .toList();
    }

    @Transactional
    public Member get(UUID workspaceId, UUID membershipId, String month) {
        Access a = access.employerOrSelf(workspaceId, membershipId);
        MembershipEntity m = access.target(a, membershipId);
        return view(a, m, Months.parseOrCurrent(month, a.workspace(), clock));
    }

    @Transactional
    public Member invite(UUID workspaceId, MemberInvite invite) {
        Access a = access.employer(workspaceId);
        WorkspaceId id = a.workspaceId();
        String email = invite.getEmail().trim().toLowerCase(Locale.ROOT);
        String name = invite.getName().trim();
        if (name.isEmpty()) throw validation("name", "must not be blank");
        if (memberships.findByEmail(id, email).isPresent()) {
            throw new KlokkaException(CONFLICT, email + " already belongs to a member of this workspace.");
        }
        mail.requireBudget(config.invitation().emailBudget());
        Instant now = clock.instant();
        MembershipEntity m = new MembershipEntity();
        m.id = UUID.randomUUID();
        m.workspaceId = id.value();
        m.role = Role.EMPLOYEE;
        m.displayName = name;
        m.email = email;
        m.hourlyRate = invite.getHourlyRate();
        m.status = INVITED;
        m.invitedAt = now;
        m.invitationToken = newToken();
        memberships.persistMember(id, m);
        sendInvitation(a, m, now);
        return view(a, m, Months.current(a.workspace(), clock));
    }

    @Transactional
    public Member update(UUID workspaceId, UUID membershipId, MemberUpdate update) {
        Access a = access.employer(workspaceId);
        MembershipEntity m = access.target(a, membershipId);
        if (update.getDisplayName() != null) {
            String name = update.getDisplayName().trim();
            if (name.isEmpty()) throw validation("displayName", "must not be blank");
            m.displayName = name;
        }
        if (presence.sent("hourlyRate")) m.hourlyRate = update.getHourlyRate();
        if (update.getStatus() != null && update.getStatus() != m.status) {
            MemberStatus wanted = update.getStatus();
            if (m.role == Role.EMPLOYER) throw new KlokkaException(CONFLICT, "The employer's own membership cannot change status.");
            if (m.status == INVITED || wanted == INVITED) {
                throw new KlokkaException(CONFLICT, "An invited member becomes active by accepting the invitation.");
            }
            if (wanted == DEACTIVATED) {
                m.status = DEACTIVATED;
                m.deactivatedAt = clock.instant();
            } else {
                m.status = ACTIVE;
                m.deactivatedAt = null;
            }
        }
        return view(a, m, Months.current(a.workspace(), clock));
    }

    @Transactional
    public void remove(UUID workspaceId, UUID membershipId) {
        Access a = access.employer(workspaceId);
        MembershipEntity m = access.target(a, membershipId);
        if (m.role == Role.EMPLOYER) throw new KlokkaException(CONFLICT, "The employer cannot be removed from their own workspace.");
        WorkspaceId id = a.workspaceId();
        if (m.status == INVITED) {
            logto.revokeInvitationQuietly(m.logtoInvitationId);
            memberships.deleteMember(id, m);
            return;
        }
        if (entries.hasLiveEntries(id, m.id)) {
            if (m.status == ACTIVE) {
                m.status = DEACTIVATED;
                m.deactivatedAt = clock.instant();
            }
            return;
        }
        if (m.userId != null) logto.removeMember(a.workspace().logtoOrgId, m.userId);
        memberships.deleteMember(id, m);
    }

    @Transactional
    public Member resend(UUID workspaceId, UUID membershipId) {
        Access a = access.employer(workspaceId);
        MembershipEntity m = access.target(a, membershipId);
        if (m.status != INVITED) throw new KlokkaException(CONFLICT, "Only an invited member can be sent the invitation again.");
        mail.requireBudget(1);
        logto.revokeInvitationQuietly(m.logtoInvitationId);
        m.invitationResendCount++;
        sendInvitation(a, m, clock.instant());
        return view(a, m, Months.current(a.workspace(), clock));
    }

    // Creates the Logto invitation (which sends the email through the tenant connector) and records the cost.
    private void sendInvitation(Access a, MembershipEntity m, Instant now) {
        Instant expires = now.plus(config.invitation().lifetime());
        String link = config.webBaseUrl().toString().replaceAll("/+$", "") + "/join?token=" + m.invitationToken;
        m.logtoInvitationId = logto.createInvitation(a.workspace().logtoOrgId, m.email, a.userId(), expires, link);
        m.invitationSentAt = now;
        m.invitationExpiresAt = expires;
        mail.recordExternal(EmailSendRepository.KIND_INVITATION, m.email, m.workspaceId, m.id, null);
    }

    private Member view(Access a, MembershipEntity m, YearMonth ym) {
        WorkspaceId id = a.workspaceId();
        BigDecimal hours = entries.hoursPerMember(id, ym.atDay(1), ym.atEndOfMonth()).get(m.id);
        long days = entries.daysPerMember(id, ym.atDay(1), ym.atEndOfMonth()).getOrDefault(m.id, 0L);
        LocalDate last = entries.lastEntryDates(id).get(m.id);
        return MemberViews.toMember(a, m, ym, hours, days, last, clock.instant());
    }

    static String newToken() {
        byte[] bytes = new byte[16];
        RANDOM.nextBytes(bytes);
        return "inv_" + HexFormat.of().formatHex(bytes);
    }
}
