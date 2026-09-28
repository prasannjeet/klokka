package com.prasannjeet.klokka.notification;

import com.prasannjeet.klokka.contract.api.NotificationsApi;
import com.prasannjeet.klokka.contract.model.NotificationPage;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import java.util.UUID;

// The notification centre (CHQ-131): cursor paging, read, read-all.
@Authenticated
public class NotificationResource implements NotificationsApi {

    private static final int DEFAULT_LIMIT = 30;

    @Inject
    NotificationService service;

    @Override
    public NotificationPage listNotifications(UUID workspaceId, Boolean unreadOnly, String cursor, Integer limit) {
        return service.list(workspaceId, Boolean.TRUE.equals(unreadOnly), cursor, limit == null ? DEFAULT_LIMIT : limit);
    }

    @Override
    public void markAllNotificationsRead(UUID workspaceId) {
        service.markAllRead(workspaceId);
    }

    @Override
    public void markNotificationRead(UUID notificationId) {
        service.markRead(notificationId);
    }
}
