package com.prasannjeet.klokka.notification;

import static com.prasannjeet.klokka.error.KlokkaException.notImplemented;

import com.prasannjeet.klokka.contract.api.NotificationsApi;
import com.prasannjeet.klokka.contract.model.NotificationPage;
import io.quarkus.security.Authenticated;
import java.util.UUID;

// E6 (CHQ-131): 501 NOT_IMPLEMENTED until then.
@Authenticated
public class NotificationResource implements NotificationsApi {

    @Override
    public NotificationPage listNotifications(UUID workspaceId, Boolean unreadOnly, String cursor, Integer limit) {
        throw notImplemented("listNotifications");
    }

    @Override
    public void markAllNotificationsRead(UUID workspaceId) {
        throw notImplemented("markAllNotificationsRead");
    }

    @Override
    public void markNotificationRead(UUID notificationId) {
        throw notImplemented("markNotificationRead");
    }
}
