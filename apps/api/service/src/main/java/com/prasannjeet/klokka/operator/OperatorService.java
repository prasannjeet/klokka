package com.prasannjeet.klokka.operator;

import static com.prasannjeet.klokka.error.KlokkaException.notFound;
import static com.prasannjeet.klokka.error.ProblemCode.CONFLICT;

import com.prasannjeet.klokka.config.KlokkaConfig;
import com.prasannjeet.klokka.contract.model.HealthStatus;
import com.prasannjeet.klokka.contract.model.InvitationStatus;
import com.prasannjeet.klokka.contract.model.Language;
import com.prasannjeet.klokka.contract.model.MemberStatus;
import com.prasannjeet.klokka.contract.model.NotificationKind;
import com.prasannjeet.klokka.contract.model.OperatorCoalescing;
import com.prasannjeet.klokka.contract.model.OperatorDependency;
import com.prasannjeet.klokka.contract.model.OperatorDeploy;
import com.prasannjeet.klokka.contract.model.OperatorEmailVolume;
import com.prasannjeet.klokka.contract.model.OperatorHealth;
import com.prasannjeet.klokka.contract.model.OperatorInAppVolume;
import com.prasannjeet.klokka.contract.model.OperatorInvitation;
import com.prasannjeet.klokka.contract.model.OperatorInvitationPage;
import com.prasannjeet.klokka.contract.model.OperatorInvitationSummary;
import com.prasannjeet.klokka.contract.model.OperatorPushVolume;
import com.prasannjeet.klokka.contract.model.OperatorUser;
import com.prasannjeet.klokka.contract.model.OperatorUserPage;
import com.prasannjeet.klokka.contract.model.OperatorVolume;
import com.prasannjeet.klokka.contract.model.OperatorVolumeDay;
import com.prasannjeet.klokka.contract.model.OperatorVolumeKind;
import com.prasannjeet.klokka.contract.model.OperatorWorkspace;
import com.prasannjeet.klokka.contract.model.OperatorWorkspacePage;
import com.prasannjeet.klokka.contract.model.OperatorWorkspaceSummary;
import com.prasannjeet.klokka.contract.model.Role;
import com.prasannjeet.klokka.domain.WorkspaceId;
import com.prasannjeet.klokka.error.KlokkaException;
import com.prasannjeet.klokka.logto.LogtoService;
import com.prasannjeet.klokka.mail.EmailSendRepository;
import com.prasannjeet.klokka.mail.MailService;
import com.prasannjeet.klokka.month.Months;
import com.prasannjeet.klokka.persistence.MembershipEntity;
import com.prasannjeet.klokka.persistence.MembershipRepository;
import com.prasannjeet.klokka.persistence.WorkspaceEntity;
import com.prasannjeet.klokka.persistence.WorkspaceRepository;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

// The operator console (CHQ-141): aggregates only, never a person's hours. Guarded by OperatorResource's role.
@ApplicationScoped
public class OperatorService {

    private static final int DEFAULT_PAGE_SIZE = 12;

    @Inject
    OperatorRepository repository;

    @Inject
    WorkspaceRepository workspaces;

    @Inject
    MembershipRepository memberships;

    @Inject
    LogtoService logto;

    @Inject
    MailService mail;

    @Inject
    HealthProbe probe;

    @Inject
    KlokkaConfig config;

    @Inject
    Clock clock;

    private Instant startedAt;

    void onStart(@Observes StartupEvent event) {
        startedAt = clock.instant();
    }

    @Transactional
    public OperatorWorkspacePage workspaces(String q, Boolean pay, String month, Integer page, Integer pageSize, String sort) {
        YearMonth ym = month == null ? YearMonth.from(clock.instant().atOffset(ZoneOffset.UTC)) : Months.parse(month);
        int p = page == null ? 1 : page;
        int size = pageSize == null ? DEFAULT_PAGE_SIZE : pageSize;
        LocalDate from = ym.atDay(1);
        LocalDate to = ym.atEndOfMonth();
        List<OperatorWorkspace> items = repository.workspaces(q, pay, from, to, sort, (p - 1) * size, size).stream()
                .map(r -> new OperatorWorkspace().id(r.id()).name(r.name()).slug(r.slug()).emoji(r.emoji())
                        .memberCount((int) (r.active() + r.invited())).activeCount((int) r.active()).invitedCount((int) r.invited())
                        .deactivatedCount((int) r.deactivated()).monthHours(BigDecimal.valueOf(r.monthHours())).showPay(r.showPay())
                        .createdAt(r.createdAt().atOffset(ZoneOffset.UTC))
                        .lastActivityAt(r.lastActivity() == null ? null : r.lastActivity().atOffset(ZoneOffset.UTC)))
                .toList();
        Instant monthStart = from.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant monthEnd = to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant weekAgo = clock.instant().minus(java.time.Duration.ofDays(7));
        OperatorWorkspaceSummary summary = new OperatorWorkspaceSummary()
                .month(ym.toString())
                .workspaces((int) repository.scalar("select count(*) from workspace"))
                .newThisMonth((int) repository.scalar("select count(*) from workspace where created_at >= :f and created_at < :t", "f", monthStart, "t", monthEnd))
                .members((int) repository.scalar("select count(*) from membership"))
                .membersActive((int) repository.scalar("select count(*) from membership where status = 'ACTIVE'"))
                .membersInvited((int) repository.scalar("select count(*) from membership where status = 'INVITED'"))
                .membersDeactivated((int) repository.scalar("select count(*) from membership where status = 'DEACTIVATED'"))
                .hoursThisMonth(BigDecimal.valueOf(repository.scalarDouble("select coalesce(sum(hours), 0) from hour_entry where deleted_at is null and work_date between :f and :t", "f", from, "t", to)))
                .activeLast7Days((int) repository.scalar("select count(distinct workspace_id) from hour_entry where updated_at >= :w", "w", weekAgo));
        return new OperatorWorkspacePage().items(items).page(p).pageSize(size).total((int) repository.countWorkspaces(q, pay)).summary(summary);
    }

    @Transactional
    public OperatorUserPage users(String q, Role role, Integer page, Integer pageSize) {
        int p = page == null ? 1 : page;
        int size = pageSize == null ? DEFAULT_PAGE_SIZE : pageSize;
        String roleName = role == null ? null : role.name();
        List<OperatorUser> items = repository.users(q, roleName, (p - 1) * size, size).stream()
                .map(r -> new OperatorUser().id(r.id()).name(r.name()).email(r.email() == null ? "" : r.email())
                        .workspaceCount((int) (r.employerOf() + r.employeeOf())).employerOf((int) r.employerOf()).employeeOf((int) r.employeeOf())
                        .language(Language.fromValue(r.language())).pushRegistered(r.pushRegistered()).platformAdmin(false)
                        .lastSeenAt(r.lastSeenAt() == null ? null : r.lastSeenAt().atOffset(ZoneOffset.UTC))
                        .createdAt(r.createdAt().atOffset(ZoneOffset.UTC)))
                .toList();
        return new OperatorUserPage().items(items).page(p).pageSize(size)
                .total((int) repository.countUsers(q, roleName))
                .users((int) repository.scalar("select count(*) from app_user"))
                .employers((int) repository.scalar("select count(distinct logto_user_id) from membership where role = 'EMPLOYER' and logto_user_id is not null"))
                .employees((int) repository.scalar("select count(distinct logto_user_id) from membership where role = 'EMPLOYEE' and logto_user_id is not null"));
    }

    @Transactional
    public OperatorInvitationPage invitations(InvitationStatus status, String month, Integer page, Integer pageSize) {
        Instant now = clock.instant();
        YearMonth ym = month == null ? YearMonth.from(now.atOffset(ZoneOffset.UTC)) : Months.parse(month);
        Instant from = ym.atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant to = ym.plusMonths(1).atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        int p = page == null ? 1 : page;
        int size = pageSize == null ? DEFAULT_PAGE_SIZE : pageSize;
        String statusName = status == null ? null : status.name();
        Instant filterFrom = month == null ? null : from;
        List<OperatorInvitation> items = repository.invitations(statusName, filterFrom, to, now, (p - 1) * size, size).stream()
                .map(r -> new OperatorInvitation().id(r.id()).workspaceId(r.workspaceId()).workspaceName(r.workspaceName())
                        .inviteeEmail(r.email()).invitedBy(r.invitedBy() == null ? "" : r.invitedBy())
                        .sentAt(r.sentAt().atOffset(ZoneOffset.UTC))
                        .expiresAt((r.expiresAt() == null ? r.sentAt() : r.expiresAt()).atOffset(ZoneOffset.UTC))
                        .status(InvitationStatus.valueOf(r.status())).resendCount(r.resendCount())
                        .acceptedAt(r.joinedAt() == null ? null : r.joinedAt().atOffset(ZoneOffset.UTC)))
                .toList();
        long sentThisMonth = repository.scalar("select count(*) from membership where role = 'EMPLOYEE' and invitation_sent_at >= :f and invitation_sent_at < :t", "f", from, "t", to);
        long accepted = repository.scalar("select count(*) from membership where role = 'EMPLOYEE' and joined_at >= :f and joined_at < :t", "f", from, "t", to);
        Double medianHours = medianHoursToAccept(from, to);
        OperatorInvitationSummary summary = new OperatorInvitationSummary()
                .month(ym.toString())
                .pending((int) repository.scalar("select count(*) from membership where status = 'INVITED' and invitation_expires_at > :now", "now", now))
                .expiringTomorrow((int) repository.scalar("select count(*) from membership where status = 'INVITED' and invitation_expires_at > :now and invitation_expires_at <= :soon", "now", now, "soon", now.plus(java.time.Duration.ofDays(1))))
                .acceptedThisMonth((int) accepted)
                .acceptedPercent(sentThisMonth == 0 ? BigDecimal.ZERO : BigDecimal.valueOf(accepted * 100.0 / sentThisMonth).setScale(0, RoundingMode.HALF_UP))
                .expiredThisMonth((int) repository.scalar("select count(*) from membership where status = 'INVITED' and invitation_expires_at <= :now and invitation_expires_at >= :f", "now", now, "f", from))
                .resentThisMonth((int) repository.scalar("select count(*) from email_send where kind = 'INVITATION' and sent_at >= :f and sent_at < :t and membership_id in (select id from membership where invitation_resend_count > 0)", "f", from, "t", to))
                .medianHoursToAccept(medianHours == null ? null : BigDecimal.valueOf(medianHours).setScale(1, RoundingMode.HALF_UP));
        return new OperatorInvitationPage().items(items).page(p).pageSize(size)
                .total((int) repository.countInvitations(statusName, filterFrom, to, now)).summary(summary);
    }

    private Double medianHoursToAccept(Instant from, Instant to) {
        List<Object[]> rows = repository.rows("select extract(epoch from (joined_at - invitation_sent_at)) / 3600.0 from membership "
                + "where joined_at >= :f and joined_at < :t and invitation_sent_at is not null order by 1", "f", from, "t", to);
        if (rows.isEmpty()) return null;
        List<Double> values = rows.stream().map(r -> ((Number) r[0]).doubleValue()).toList();
        int n = values.size();
        return n % 2 == 1 ? values.get(n / 2) : (values.get(n / 2 - 1) + values.get(n / 2)) / 2;
    }

    // The console's only mutating action: resend an INVITED member's invitation as the workspace's employer would.
    @Transactional
    public void resendInvitation(UUID membershipId) {
        MembershipEntity m = repository.findMembership(membershipId).orElseThrow(() -> notFound("Invitation " + membershipId));
        if (m.status != MemberStatus.INVITED) throw new KlokkaException(CONFLICT, "Only a pending invitation can be resent.");
        WorkspaceId id = WorkspaceId.of(m.workspaceId);
        WorkspaceEntity w = workspaces.findWorkspace(id).orElseThrow(() -> notFound("Workspace " + m.workspaceId));
        MembershipEntity employer = memberships.findEmployer(id).orElseThrow(() -> notFound("Employer of " + w.slug));
        mail.requireBudget(1);
        logto.revokeInvitationQuietly(m.logtoInvitationId);
        Instant now = clock.instant();
        Instant expires = now.plus(config.invitation().lifetime());
        String link = config.webBaseUrl().toString().replaceAll("/+$", "") + "/join?token=" + m.invitationToken;
        m.logtoInvitationId = logto.createInvitation(w.logtoOrgId, m.email, employer.userId, expires, link);
        m.invitationSentAt = now;
        m.invitationExpiresAt = expires;
        m.invitationResendCount++;
        mail.recordExternal(EmailSendRepository.KIND_INVITATION, m.email, m.workspaceId, m.id, null);
    }

    @Transactional
    public OperatorVolume volume(String month) {
        Instant now = clock.instant();
        YearMonth ym = month == null ? YearMonth.from(now.atOffset(ZoneOffset.UTC)) : Months.parse(month);
        Instant from = ym.atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant to = ym.plusMonths(1).atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        YearMonth last = ym.minusMonths(1);
        Instant lastFrom = last.atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        int sameDay = Math.min(YearMonth.from(now.atOffset(ZoneOffset.UTC)).equals(ym) ? now.atOffset(ZoneOffset.UTC).getDayOfMonth() : ym.lengthOfMonth(), last.lengthOfMonth());
        Instant lastSamePoint = last.atDay(sameDay).plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);

        OperatorEmailVolume email = new OperatorEmailVolume()
                .sent((int) repository.scalar("select count(*) from email_send where sent_at >= :f and sent_at < :t and status <> 'FAILED'", "f", from, "t", to))
                .quota(config.mail().monthlyQuota())
                .invitations((int) repository.scalar("select count(*) from email_send where kind = 'INVITATION' and sent_at >= :f and sent_at < :t and status <> 'FAILED'", "f", from, "t", to))
                .verifications((int) repository.scalar("select count(*) from email_send where kind = 'VERIFICATION' and sent_at >= :f and sent_at < :t and status <> 'FAILED'", "f", from, "t", to))
                .digests((int) repository.scalar("select count(*) from email_send where kind = 'DIGEST' and sent_at >= :f and sent_at < :t and status <> 'FAILED'", "f", from, "t", to))
                .bounced((int) repository.scalar("select count(*) from email_send where status in ('BOUNCED', 'FAILED') and sent_at >= :f and sent_at < :t", "f", from, "t", to))
                .resetsOn(ym.plusMonths(1).atDay(1))
                .sameMonthLastMonth((int) repository.scalar("select count(*) from email_send where sent_at >= :f and sent_at < :t and status <> 'FAILED'", "f", lastFrom, "t", lastSamePoint))
                .digestOptIns((int) repository.scalar("select count(*) from user_preference where digest_enabled"))
                .digestMondays(mondays(ym));
        long pushSent = repository.scalar("select count(*) from push_delivery where sent_at >= :f and sent_at < :t", "f", from, "t", to);
        long pushFailed = repository.scalar("select count(*) from push_delivery where sent_at >= :f and sent_at < :t and status = 'FAILED'", "f", from, "t", to);
        OperatorPushVolume push = new OperatorPushVolume().sent((int) pushSent).delivered((int) (pushSent - pushFailed)).failed((int) pushFailed)
                .failedPercent(pushSent == 0 ? BigDecimal.ZERO : BigDecimal.valueOf(pushFailed * 100.0 / pushSent).setScale(1, RoundingMode.HALF_UP));
        long created = repository.scalar("select count(*) from notification where created_at >= :f and created_at < :t", "f", from, "t", to);
        long readWithinDay = repository.scalar("select count(*) from notification where created_at >= :f and created_at < :t and read_at is not null and read_at <= created_at + interval '1 day'", "f", from, "t", to);
        OperatorInAppVolume inApp = new OperatorInAppVolume().created((int) created)
                .readWithinDayPercent(created == 0 ? BigDecimal.ZERO : BigDecimal.valueOf(readWithinDay * 100.0 / created).setScale(0, RoundingMode.HALF_UP));
        OperatorCoalescing coalescing = new OperatorCoalescing()
                .sittings((int) repository.scalar("select count(*) from notification where kind = 'HOURS_CHANGED' and created_at >= :f and created_at < :t", "f", from, "t", to))
                .entryChanges((int) repository.scalar("select count(*) from hour_entry_change where kind in ('CREATED', 'UPDATED', 'DELETED') and changed_at >= :f and changed_at < :t", "f", from, "t", to));
        List<OperatorVolumeDay> perDay = new ArrayList<>();
        for (Object[] r : repository.rows("select d::date, (select count(*) from push_delivery p where p.sent_at >= d and p.sent_at < d + interval '1 day'), "
                + "(select count(*) from notification n where n.created_at >= d and n.created_at < d + interval '1 day') "
                + "from generate_series(cast(:f as timestamptz), cast(:t as timestamptz) - interval '1 day', interval '1 day') d order by d", "f", from, "t", to)) {
            perDay.add(new OperatorVolumeDay().date(localDate(r[0])).push(((Number) r[1]).intValue()).inApp(((Number) r[2]).intValue()));
        }
        List<OperatorVolumeKind> byKind = new ArrayList<>();
        for (Object[] r : repository.rows("select kind, count(*) from notification where created_at >= :f and created_at < :t group by kind order by 2 desc", "f", from, "t", to)) {
            byKind.add(new OperatorVolumeKind().kind(NotificationKind.valueOf((String) r[0])).count(((Number) r[1]).intValue()));
        }
        return new OperatorVolume().month(ym.toString()).email(email).push(push).inApp(inApp).coalescing(coalescing).perDay(perDay).byKind(byKind);
    }

    public OperatorHealth health() {
        List<OperatorDependency> dependencies = probe.probeAll();
        HealthStatus status = HealthStatus.UP;
        for (OperatorDependency d : dependencies) {
            if (d.getStatus() == HealthStatus.DOWN && ("postgres".equals(d.getName()) || "api".equals(d.getName()))) status = HealthStatus.DOWN;
            else if (d.getStatus() != HealthStatus.UP && status == HealthStatus.UP) status = HealthStatus.DEGRADED;
        }
        Instant now = clock.instant();
        Instant started = startedAt == null ? now : startedAt;
        return new OperatorHealth()
                .status(status)
                .version(config.buildVersion())
                .checkedAt(now.atOffset(ZoneOffset.UTC))
                .uptimeSeconds((int) java.time.Duration.between(started, now).toSeconds())
                .dependencies(dependencies)
                .recentDeploys(List.of(new OperatorDeploy().app("klokka-api").version(config.buildVersion()).deployedAt(started.atOffset(ZoneOffset.UTC))));
    }

    static LocalDate localDate(Object value) {
        if (value instanceof LocalDate d) return d;
        if (value instanceof java.sql.Date d) return d.toLocalDate();
        throw new IllegalStateException("unexpected date type " + value.getClass());
    }

    static int mondays(YearMonth ym) {
        int n = 0;
        for (LocalDate d = ym.atDay(1); !d.isAfter(ym.atEndOfMonth()); d = d.plusDays(1)) if (d.getDayOfWeek() == java.time.DayOfWeek.MONDAY) n++;
        return n;
    }
}
