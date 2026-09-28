package com.prasannjeet.klokka.notification;

import static com.prasannjeet.klokka.error.KlokkaException.notFound;
import static com.prasannjeet.klokka.error.KlokkaException.validation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prasannjeet.klokka.auth.CurrentUser;
import com.prasannjeet.klokka.config.KlokkaConfig;
import com.prasannjeet.klokka.contract.model.Language;
import com.prasannjeet.klokka.contract.model.Notification;
import com.prasannjeet.klokka.contract.model.NotificationKind;
import com.prasannjeet.klokka.contract.model.NotificationLink;
import com.prasannjeet.klokka.contract.model.NotificationPage;
import com.prasannjeet.klokka.persistence.NotificationEntity;
import com.prasannjeet.klokka.persistence.WorkspaceEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

// Writes every notification (the feature services call in, inside their own transaction) and serves the
// notification centre. HOURS_CHANGED is coalesced per (recipient, workspace, actor) while the row is unpushed:
// a sitting's changes merge into one row whose push is delayed by the quiet window, capped by max-delay (CHQ-132).
@ApplicationScoped
public class NotificationService {

    @Inject
    NotificationRepository repository;

    @Inject
    NotificationTexts texts;

    @Inject
    ObjectMapper mapper;

    @Inject
    KlokkaConfig config;

    @Inject
    Clock clock;

    @Inject
    CurrentUser currentUser;

    // ---- producers (called inside the caller's transaction)

    public void hoursChanged(WorkspaceEntity workspace, String recipientUserId, UUID membershipId, String actorId, String actorName,
            LocalDate date, BigDecimal before, BigDecimal after, String note) {
        if (recipientUserId == null || recipientUserId.equals(actorId)) return;
        Instant now = clock.instant();
        String key = "HOURS:" + recipientUserId + ":" + workspace.id + ":" + actorId;
        NotificationEntity row = repository.findOpenByKey(key).orElse(null);
        Map<String, Object> payload = row == null ? new LinkedHashMap<>() : NotificationPayload.read(mapper, row.payload);
        @SuppressWarnings("unchecked")
        Map<String, Object> changes = (Map<String, Object>) payload.computeIfAbsent("changes", k -> new LinkedHashMap<String, Object>());
        @SuppressWarnings("unchecked")
        Map<String, Object> change = (Map<String, Object>) changes.get(date.toString());
        Map<String, Object> merged = new LinkedHashMap<>();
        merged.put("before", change == null ? before : change.get("before"));
        merged.put("after", after);
        changes.put(date.toString(), merged);
        payload.put("actorId", actorId);
        payload.put("actorName", actorName);
        payload.put("membershipId", membershipId.toString());
        payload.put("workspaceName", workspace.name);
        payload.put("note", note);
        payload.put("changeCount", ((Number) payload.getOrDefault("changeCount", 0)).intValue() + 1);
        if (row == null) {
            row = newRow(recipientUserId, workspace.id, NotificationKind.HOURS_CHANGED, now);
            row.coalesceKey = key;
            row.pushDueAt = now.plus(config.push().quietWindow());
            row.payload = NotificationPayload.write(mapper, payload);
            repository.persistNotification(row);
            return;
        }
        Instant slid = now.plus(config.push().quietWindow());
        Instant cap = row.createdAt.plus(config.push().maxDelay());
        row.pushDueAt = slid.isBefore(cap) ? slid : cap;
        row.updatedAt = now;
        row.readAt = null;
        row.payload = NotificationPayload.write(mapper, payload);
    }

    public void inviteAccepted(WorkspaceEntity workspace, String employerUserId, UUID membershipId, String memberName) {
        Map<String, Object> payload = base(workspace, memberName);
        payload.put("membershipId", membershipId.toString());
        immediate(employerUserId, workspace, NotificationKind.INVITE_ACCEPTED, payload);
    }

    public void entryFlagged(WorkspaceEntity workspace, String employerUserId, UUID membershipId, UUID entryId, UUID flagId,
            String memberName, LocalDate date, BigDecimal loggedHours, BigDecimal suggestedHours, String message) {
        Map<String, Object> payload = base(workspace, memberName);
        payload.put("membershipId", membershipId.toString());
        payload.put("entryId", entryId.toString());
        payload.put("flagId", flagId.toString());
        payload.put("date", date.toString());
        payload.put("loggedHours", loggedHours);
        payload.put("suggestedHours", suggestedHours);
        payload.put("message", message);
        immediate(employerUserId, workspace, NotificationKind.ENTRY_FLAGGED, payload);
    }

    public void flagResolved(WorkspaceEntity workspace, String recipientUserId, UUID membershipId, UUID entryId, UUID flagId,
            String resolverName, LocalDate date, String action, BigDecimal hoursNow, String note) {
        if (recipientUserId == null) return;
        Map<String, Object> payload = base(workspace, resolverName);
        payload.put("membershipId", membershipId.toString());
        payload.put("entryId", entryId.toString());
        payload.put("flagId", flagId.toString());
        payload.put("date", date.toString());
        payload.put("action", action);
        payload.put("hours", hoursNow);
        payload.put("note", note);
        immediate(recipientUserId, workspace, NotificationKind.FLAG_RESOLVED, payload);
    }

    public void monthClosed(WorkspaceEntity workspace, String recipientUserId, UUID membershipId, String actorName, YearMonth month,
            BigDecimal hours, BigDecimal money) {
        if (recipientUserId == null) return;
        Map<String, Object> payload = base(workspace, actorName);
        payload.put("membershipId", membershipId.toString());
        payload.put("month", month.toString());
        payload.put("hours", hours);
        payload.put("money", money);
        immediate(recipientUserId, workspace, NotificationKind.MONTH_CLOSED, payload);
    }

    public void monthReopened(WorkspaceEntity workspace, String recipientUserId, UUID membershipId, String actorName, YearMonth month) {
        if (recipientUserId == null) return;
        Map<String, Object> payload = base(workspace, actorName);
        payload.put("membershipId", membershipId.toString());
        payload.put("month", month.toString());
        immediate(recipientUserId, workspace, NotificationKind.MONTH_REOPENED, payload);
    }

    // ---- the centre

    @Transactional
    public NotificationPage list(UUID workspaceId, boolean unreadOnly, String cursor, int limit) {
        String userId = currentUser.id();
        Instant cursorAt = null;
        UUID cursorId = null;
        if (cursor != null && !cursor.isBlank()) {
            String[] parts;
            try {
                parts = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8).split("\\|", 2);
                cursorAt = Instant.parse(parts[0]);
                cursorId = UUID.fromString(parts[1]);
            } catch (RuntimeException e) {
                throw validation("cursor", "is not a cursor this API issued");
            }
        }
        List<NotificationEntity> rows = repository.page(userId, workspaceId, unreadOnly, cursorAt, cursorId, limit + 1);
        boolean more = rows.size() > limit;
        List<NotificationEntity> pageRows = more ? rows.subList(0, limit) : rows;
        Language language = repository.recipient(userId).map(NotificationRepository.Recipient::language)
                .orElse(Language.fromValue(config.defaultLanguage()));
        List<Notification> items = new ArrayList<>();
        for (NotificationEntity row : pageRows) items.add(toNotification(row, language));
        String next = null;
        if (more) {
            NotificationEntity last = pageRows.get(pageRows.size() - 1);
            next = Base64.getUrlEncoder().withoutPadding().encodeToString((last.createdAt + "|" + last.id).getBytes(StandardCharsets.UTF_8));
        }
        return new NotificationPage().items(items).nextCursor(next).unreadCount((int) repository.countUnread(userId, workspaceId));
    }

    @Transactional
    public void markRead(UUID notificationId) {
        NotificationEntity row = repository.findOwn(currentUser.id(), notificationId)
                .orElseThrow(() -> notFound("Notification " + notificationId));
        if (row.readAt == null) row.readAt = clock.instant();
    }

    @Transactional
    public void markAllRead(UUID workspaceId) {
        repository.markAllRead(currentUser.id(), workspaceId, clock.instant());
    }

    public Notification toNotification(NotificationEntity row, Language language) {
        WorkspaceEntity workspace = repository.workspaceOf(row).orElse(null);
        Map<String, Object> payload = NotificationPayload.read(mapper, row.payload);
        NotificationTexts.Rendered rendered = texts.render(row.kind, payload, language, workspace == null ? "SEK" : workspace.currency);
        NotificationLink link = new NotificationLink()
                .workspaceId(row.workspaceId)
                .membershipId(uuidOrNull(payload.get("membershipId")))
                .entryId(uuidOrNull(payload.get("entryId")))
                .flagId(uuidOrNull(payload.get("flagId")))
                .month(payload.get("month") == null ? monthOf(row.kind, payload) : payload.get("month").toString())
                .date(payload.get("date") == null ? null : LocalDate.parse(payload.get("date").toString()));
        return new Notification()
                .id(row.id)
                .workspaceId(row.workspaceId)
                .workspaceName(workspace == null ? "" : workspace.name)
                .workspaceEmoji(workspace == null ? "" : workspace.emoji)
                .kind(row.kind)
                .title(rendered.title())
                .body(rendered.body())
                .detail(rendered.detail())
                .payload(texts.publicPayload(row.kind, payload))
                .link(link)
                .readAt(row.readAt == null ? null : row.readAt.atOffset(ZoneOffset.UTC))
                .createdAt(row.createdAt.atOffset(ZoneOffset.UTC));
    }

    private static String monthOf(NotificationKind kind, Map<String, Object> payload) {
        if (kind != NotificationKind.HOURS_CHANGED) return null;
        var changes = NotificationTexts.changes(payload);
        return changes.isEmpty() ? null : YearMonth.from(changes.firstKey()).toString();
    }

    private static UUID uuidOrNull(Object value) {
        return value == null ? null : UUID.fromString(value.toString());
    }

    private Map<String, Object> base(WorkspaceEntity workspace, String actorName) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("actorName", actorName);
        payload.put("workspaceName", workspace.name);
        return payload;
    }

    private void immediate(String recipientUserId, WorkspaceEntity workspace, NotificationKind kind, Map<String, Object> payload) {
        if (recipientUserId == null) return;
        Instant now = clock.instant();
        NotificationEntity row = newRow(recipientUserId, workspace.id, kind, now);
        row.pushDueAt = now;
        row.payload = NotificationPayload.write(mapper, payload);
        repository.persistNotification(row);
    }

    private static NotificationEntity newRow(String userId, UUID workspaceId, NotificationKind kind, Instant now) {
        NotificationEntity row = new NotificationEntity();
        row.id = UUID.randomUUID();
        row.userId = userId;
        row.workspaceId = workspaceId;
        row.kind = kind;
        row.createdAt = now;
        row.updatedAt = now;
        return row;
    }
}
