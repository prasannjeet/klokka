package com.prasannjeet.klokka.push;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prasannjeet.klokka.config.KlokkaConfig;
import com.prasannjeet.klokka.contract.model.Language;
import com.prasannjeet.klokka.i18n.Catalogue;
import com.prasannjeet.klokka.i18n.Text;
import com.prasannjeet.klokka.notification.NotificationPayload;
import com.prasannjeet.klokka.notification.NotificationRepository;
import com.prasannjeet.klokka.notification.NotificationTexts;
import com.prasannjeet.klokka.persistence.NotificationEntity;
import com.prasannjeet.klokka.persistence.WorkspaceEntity;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

// The push jobs (CHQ-130/132). sweep(): every minute, claim due notification rows (SKIP LOCKED, bounded), render
// each in its recipient's language, send in Expo batches, record tickets, close the rows. receipts(): every
// 15 minutes, fetch receipts for tickets older than the receipt delay; DeviceNotRegistered deletes the token.
// A failed Expo call pushes the rows' due time forward instead of dropping them, and is logged every time.
@ApplicationScoped
public class PushSweeper {

    private static final Logger LOG = Logger.getLogger(PushSweeper.class);
    private static final String STATUS_SENT = "SENT";
    private static final String STATUS_DELIVERED = "DELIVERED";
    private static final String STATUS_FAILED = "FAILED";

    @Inject
    NotificationRepository repository;

    @Inject
    NotificationTexts texts;

    @Inject
    Catalogue catalogue;

    @Inject
    ObjectMapper mapper;

    @Inject
    KlokkaConfig config;

    @Inject
    Clock clock;

    @Inject
    @RestClient
    ExpoPushApi expo;

    public record SweepResult(int notifications, int messages, int failed) {}

    @Scheduled(every = "1m", identity = "push-sweeper", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void scheduledSweep() {
        SweepResult result = sweep();
        if (result.notifications() > 0) LOG.infof("push sweep: %d notification(s), %d message(s), %d failed", result.notifications(), result.messages(), result.failed());
    }

    @Transactional
    public SweepResult sweep() {
        Instant now = clock.instant();
        List<NotificationEntity> due = repository.claimDue(now, config.push().batchSize());
        if (due.isEmpty()) return new SweepResult(0, 0, 0);
        List<ExpoModels.Message> messages = new ArrayList<>();
        List<NotificationEntity> owners = new ArrayList<>();
        List<String> tokens = new ArrayList<>();
        for (NotificationEntity row : due) {
            NotificationRepository.Recipient recipient = repository.recipient(row.userId)
                    .orElse(new NotificationRepository.Recipient(Language.fromValue(config.defaultLanguage()), true));
            row.pushedAt = now;
            if (!recipient.pushEnabled()) continue;
            List<String> deviceTokens = repository.enabledTokens(row.userId);
            if (deviceTokens.isEmpty()) continue;
            WorkspaceEntity workspace = repository.workspaceOf(row).orElse(null);
            Map<String, Object> payload = NotificationPayload.read(mapper, row.payload);
            NotificationTexts.Rendered rendered = texts.render(row.kind, payload, recipient.language(), workspace == null ? "SEK" : workspace.currency);
            String title = workspace == null ? rendered.title()
                    : catalogue.t(recipient.language(), Text.PUSH_WORKSPACE_PREFIX.key(), Map.of("workspace", workspace.name, "title", rendered.title()));
            Map<String, Object> data = new HashMap<>();
            data.put("notificationId", row.id.toString());
            data.put("kind", row.kind.toString());
            if (row.workspaceId != null) data.put("workspaceId", row.workspaceId.toString());
            for (String token : deviceTokens) {
                messages.add(new ExpoModels.Message(token, title, rendered.body(), data, "default", "default", "high"));
                owners.add(row);
                tokens.add(token);
            }
        }
        int failed = 0;
        for (int start = 0; start < messages.size(); start += config.push().batchSize()) {
            int end = Math.min(start + config.push().batchSize(), messages.size());
            failed += sendBatch(messages.subList(start, end), owners.subList(start, end), tokens.subList(start, end), now);
        }
        return new SweepResult(due.size(), messages.size(), failed);
    }

    private int sendBatch(List<ExpoModels.Message> batch, List<NotificationEntity> owners, List<String> tokens, Instant now) {
        ExpoModels.SendResponse response;
        try {
            response = expo.send(batch);
        } catch (RuntimeException e) {
            LOG.errorf(e, "Expo push send failed for %d message(s); retrying after the quiet window", batch.size());
            Instant retry = now.plus(config.push().quietWindow());
            for (NotificationEntity row : owners) {
                row.pushedAt = null;
                row.pushDueAt = retry;
            }
            return batch.size();
        }
        List<ExpoModels.Ticket> data = response == null || response.data() == null ? List.of() : response.data();
        int failed = 0;
        for (int i = 0; i < batch.size(); i++) {
            ExpoModels.Ticket ticket = i < data.size() ? data.get(i) : null;
            NotificationEntity row = owners.get(i);
            String token = tokens.get(i);
            if (ticket == null || !"ok".equals(ticket.status()) || ticket.id() == null) {
                String error = ticket == null || ticket.details() == null ? "NoTicket" : ticket.details().error();
                failed++;
                repository.recordDelivery("err-" + UUID.randomUUID(), row.id, token, STATUS_FAILED, error, now);
                if (ExpoModels.DEVICE_NOT_REGISTERED.equals(error)) repository.deleteToken(token);
                continue;
            }
            repository.recordDelivery(ticket.id(), row.id, token, STATUS_SENT, null, now);
        }
        return failed;
    }

    @Scheduled(every = "15m", identity = "push-receipts", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void scheduledReceipts() {
        int checked = receipts();
        if (checked > 0) LOG.infof("push receipts: %d ticket(s) checked", checked);
    }

    @Transactional
    public int receipts() {
        Instant now = clock.instant();
        List<NotificationRepository.PendingDelivery> pending =
                repository.claimPendingReceipts(now.minus(config.push().receiptDelay()), config.push().batchSize());
        if (pending.isEmpty()) return 0;
        ExpoModels.ReceiptsResponse response;
        try {
            response = expo.receipts(new ExpoModels.ReceiptsRequest(pending.stream().map(NotificationRepository.PendingDelivery::ticketId).toList()));
        } catch (RuntimeException e) {
            LOG.errorf(e, "Expo receipt check failed for %d ticket(s); they stay pending", pending.size());
            return 0;
        }
        Map<String, ExpoModels.Receipt> receipts = response == null || response.data() == null ? Map.of() : response.data();
        for (NotificationRepository.PendingDelivery delivery : pending) {
            ExpoModels.Receipt receipt = receipts.get(delivery.ticketId());
            if (receipt == null) {
                repository.receipt(delivery.ticketId(), STATUS_SENT, null, now);
                continue;
            }
            if ("ok".equals(receipt.status())) {
                repository.receipt(delivery.ticketId(), STATUS_DELIVERED, null, now);
                continue;
            }
            String error = receipt.details() == null ? "Unknown" : receipt.details().error();
            repository.receipt(delivery.ticketId(), STATUS_FAILED, error, now);
            if (ExpoModels.DEVICE_NOT_REGISTERED.equals(error)) repository.deleteToken(delivery.token());
        }
        return pending.size();
    }
}
