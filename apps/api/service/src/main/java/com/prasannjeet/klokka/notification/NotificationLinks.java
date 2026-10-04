package com.prasannjeet.klokka.notification;

import com.prasannjeet.klokka.contract.model.NotificationKind;
import com.prasannjeet.klokka.contract.model.NotificationLink;

// The push side of a notification (the contract's registerPushToken description): the Android channel and the
// app path in `data.url`, built from the same link both clients render. The phone follows the path only when
// it matches its allowlist, so every shape here is one of those.
public final class NotificationLinks {

    private NotificationLinks() {}

    public static String channel(NotificationKind kind) {
        return switch (kind) {
            case HOURS_CHANGED -> "hours";
            case ENTRY_FLAGGED, FLAG_RESOLVED -> "flags";
            case INVITE_ACCEPTED, MONTH_CLOSED, MONTH_REOPENED -> "workspace";
            case JOB_REMINDER -> "reminders";
        };
    }

    public static String url(NotificationKind kind, NotificationLink link) {
        if (link.getWorkspaceId() == null) return "/notifications";
        String ws = "/w/" + link.getWorkspaceId();
        return switch (kind) {
            case HOURS_CHANGED -> member(ws, link, link.getDate() != null ? "/day/" + link.getDate()
                    : link.getMonth() != null ? "/month/" + link.getMonth() : null);
            case ENTRY_FLAGGED -> link.getFlagId() == null ? ws + "/notifications" : ws + "/flags/" + link.getFlagId();
            case FLAG_RESOLVED, JOB_REMINDER -> member(ws, link, link.getDate() != null ? "/day/" + link.getDate() : null);
            case INVITE_ACCEPTED -> ws + "/employees";
            case MONTH_CLOSED, MONTH_REOPENED -> member(ws, link, link.getMonth() != null ? "/month/" + link.getMonth() : null);
        };
    }

    private static String member(String ws, NotificationLink link, String tail) {
        if (link.getMembershipId() == null || tail == null) return ws + "/notifications";
        return ws + "/members/" + link.getMembershipId() + tail;
    }
}
