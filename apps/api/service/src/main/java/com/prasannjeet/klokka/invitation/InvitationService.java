package com.prasannjeet.klokka.invitation;

import static com.prasannjeet.klokka.contract.model.MemberStatus.ACTIVE;
import static com.prasannjeet.klokka.contract.model.MemberStatus.DEACTIVATED;
import static com.prasannjeet.klokka.contract.model.MemberStatus.INVITED;
import static com.prasannjeet.klokka.error.KlokkaException.forbidden;
import static com.prasannjeet.klokka.error.KlokkaException.notFound;
import static com.prasannjeet.klokka.error.ProblemCode.CONFLICT;
import static com.prasannjeet.klokka.error.ProblemCode.INVITATION_EMAIL_MISMATCH;
import static com.prasannjeet.klokka.error.ProblemCode.INVITATION_EXPIRED;
import static com.prasannjeet.klokka.error.ProblemCode.MEMBER_NOT_ACTIVE;

import com.prasannjeet.klokka.contract.model.Invitation;
import com.prasannjeet.klokka.contract.model.InvitationAccepted;
import com.prasannjeet.klokka.contract.model.InvitationLocalized;
import com.prasannjeet.klokka.contract.model.InvitationStatus;
import com.prasannjeet.klokka.contract.model.Language;
import com.prasannjeet.klokka.error.KlokkaException;
import com.prasannjeet.klokka.i18n.Catalogue;
import com.prasannjeet.klokka.i18n.Text;
import com.prasannjeet.klokka.logto.LogtoService;
import com.prasannjeet.klokka.mail.EmailSendRepository;
import com.prasannjeet.klokka.mail.MailService;
import com.prasannjeet.klokka.me.MeService;
import com.prasannjeet.klokka.member.MemberViews;
import com.prasannjeet.klokka.notification.NotificationService;
import com.prasannjeet.klokka.persistence.AppUserEntity;
import com.prasannjeet.klokka.persistence.MembershipEntity;
import com.prasannjeet.klokka.persistence.WorkspaceEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

// The invite link (CHQ-113 lookup, CHQ-114 accept). Accepting binds the signed-in Logto user to the membership,
// accepts the Logto organization invitation (which adds them to the organization with the EMPLOYEE role),
// records the sign-up verification email in the ledger, and tells the employer. Repeat-safe.
@ApplicationScoped
public class InvitationService {

    @Inject
    InvitationRepository repository;

    @Inject
    MeService me;

    @Inject
    LogtoService logto;

    @Inject
    MailService mail;

    @Inject
    NotificationService notifications;

    @Inject
    Catalogue catalogue;

    @Inject
    Clock clock;

    @Transactional
    public Invitation lookup(String token, Language lang) {
        MembershipEntity m = repository.findByToken(token).orElseThrow(() -> notFound("Invitation"));
        WorkspaceEntity w = repository.workspaceOf(m);
        String inviter = repository.employerOf(m).map(e -> e.displayName).orElse(w.name);
        Language language = lang == null ? Language.SV : lang;
        InvitationStatus status = MemberViews.invitationStatus(m, clock.instant());
        Instant expires = m.invitationExpiresAt == null ? m.invitedAt : m.invitationExpiresAt;
        return new Invitation()
                .workspaceName(w.name)
                .workspaceEmoji(w.emoji)
                .workspaceColour(w.colour)
                .inviterName(inviter)
                .email(m.email)
                .role(m.role)
                .status(status)
                .expiresAt(expires.atOffset(ZoneOffset.UTC))
                .language(language)
                .localized(new InvitationLocalized()
                        .headline(status == InvitationStatus.EXPIRED
                                ? catalogue.t(language, Text.INVITATION_EXPIRED.key(), Map.of("name", inviter))
                                : catalogue.t(language, Text.INVITATION_HEADLINE.key(), Map.of("name", inviter, "workspace", w.name)))
                        .body(catalogue.t(language, Text.INVITATION_BODY.key(), Map.of("workspace", w.name))));
    }

    @Transactional
    public InvitationAccepted accept(String token, Optional<String> acceptLanguage) {
        AppUserEntity user = me.ensureCurrentUser(acceptLanguage);
        MembershipEntity m = repository.findByToken(token).orElseThrow(() -> notFound("Invitation"));
        WorkspaceEntity w = repository.workspaceOf(m);
        if (m.status == ACTIVE || m.status == DEACTIVATED) {
            if (user.id.equals(m.userId)) {
                if (m.status == DEACTIVATED) throw new KlokkaException(MEMBER_NOT_ACTIVE, "This membership has been deactivated.");
                return accepted(m, w);
            }
            throw forbidden("This invitation was already accepted by another account.");
        }
        Instant now = clock.instant();
        if (m.invitationExpiresAt == null || !m.invitationExpiresAt.isAfter(now)) {
            throw new KlokkaException(INVITATION_EXPIRED, "The invitation expired at " + m.invitationExpiresAt + ".");
        }
        String email = emailOf(user);
        if (email == null || !email.equalsIgnoreCase(m.email)) {
            throw new KlokkaException(INVITATION_EMAIL_MISMATCH, "The invitation was sent to " + m.email + ".");
        }
        if (repository.findByUserInWorkspace(m.workspaceId, user.id).isPresent()) {
            throw new KlokkaException(CONFLICT, "You are already a member of this workspace.");
        }
        if (m.logtoInvitationId != null) logto.acceptInvitation(m.logtoInvitationId, user.id);
        else logto.addMember(w.logtoOrgId, user.id, m.role);
        m.userId = user.id;
        m.status = ACTIVE;
        m.joinedAt = now;
        // The name the employer typed stays unless the person chose one; the email's local part never replaces it.
        // Without a chosen name the invitation's name becomes the profile name too (and Logto's, for its emails).
        if (me.hasChosenName(user)) {
            m.displayName = user.displayName;
        } else {
            user.displayName = m.displayName;
            logto.updateUserNameQuietly(user.id, m.displayName);
        }
        m.avatarEmoji = user.avatarEmoji;
        mail.recordExternal(EmailSendRepository.KIND_VERIFICATION, m.email, m.workspaceId, m.id, user.id);
        repository.employerOf(m).filter(e -> e.userId != null)
                .ifPresent(e -> notifications.inviteAccepted(w, e.userId, m.id, m.displayName));
        return accepted(m, w);
    }

    // The token has no email claim; the profile mirror (webhook) usually has it, else Logto is asked directly.
    private String emailOf(AppUserEntity user) {
        if (user.email != null) return user.email;
        Optional<String> fromLogto = logto.findUser(user.id).map(u -> u.primaryEmail());
        fromLogto.ifPresent(e -> user.email = e.toLowerCase(Locale.ROOT));
        return fromLogto.map(e -> e.toLowerCase(Locale.ROOT)).orElse(null);
    }

    private static InvitationAccepted accepted(MembershipEntity m, WorkspaceEntity w) {
        return new InvitationAccepted().workspaceId(w.id).membershipId(m.id).workspaceName(w.name).role(m.role);
    }
}
