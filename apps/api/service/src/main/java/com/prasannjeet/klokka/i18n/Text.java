package com.prasannjeet.klokka.i18n;

// Every catalogue key the API renders, in one place so CatalogueTest can prove each exists in both languages.
// Plural keys are listed by their base name (the `_one` / `_other` pair is checked for both).
public enum Text {

    HOURS_ADDED_TITLE("notifications.hoursAdded.title", true),
    HOURS_ADDED_BODY("notifications.hoursAdded.body"),
    HOURS_ADDED_RANGE("notifications.hoursAdded.range"),
    HOURS_CHANGED_TITLE("notifications.hoursChanged.title"),
    HOURS_CHANGED_BODY("notifications.hoursChanged.body"),
    HOURS_CHANGED_NOTE("notifications.hoursChanged.note"),
    HOURS_REMOVED_TITLE("notifications.hoursRemoved.title"),
    HOURS_REMOVED_BODY("notifications.hoursRemoved.body"),
    HOURS_REMOVED_MANY_TITLE("notifications.hoursRemoved.titleMany", true),
    INVITE_ACCEPTED_TITLE("notifications.inviteAccepted.title"),
    INVITE_ACCEPTED_BODY("notifications.inviteAccepted.body"),
    ENTRY_FLAGGED_TITLE("notifications.entryFlagged.title"),
    ENTRY_FLAGGED_BODY("notifications.entryFlagged.body"),
    FLAG_FIXED_TITLE("notifications.flagFixed.title"),
    FLAG_FIXED_BODY("notifications.flagFixed.body"),
    FLAG_DISMISSED_TITLE("notifications.flagDismissed.title"),
    FLAG_DISMISSED_BODY("notifications.flagDismissed.body"),
    MONTH_CLOSED_TITLE("notifications.monthClosed.title"),
    MONTH_CLOSED_BODY("notifications.monthClosed.body"),
    MONTH_CLOSED_BODY_HOURS_ONLY("notifications.monthClosed.bodyHoursOnly"),
    MONTH_CLOSED_HINT("notifications.monthClosed.hint"),
    MONTH_REOPENED_TITLE("notifications.monthReopened.title"),
    MONTH_REOPENED_BODY("notifications.monthReopened.body"),
    HOURS_VALUE("common.hoursValue"),
    INVITATION_HEADLINE("invitation.invitedYouTo"),
    INVITATION_BODY("invitation.logsYourHoursHint"),
    INVITATION_EXPIRED("invitation.expired"),
    DIGEST_SUBJECT("email.digest.subject"),
    DIGEST_SUBJECT_EMPLOYER("email.digest.subjectEmployer"),
    DIGEST_INTRO("email.digest.intro"),
    DIGEST_YOUR_HOURS("email.digest.yourHours"),
    DIGEST_TEAM_HOURS("email.digest.teamHours"),
    DIGEST_MONTH_SO_FAR("email.digest.monthSoFar"),
    DIGEST_UNSUBSCRIBE("email.digest.unsubscribe"),
    EMAIL_GREETING("api.email.greeting"),
    EMAIL_DIGEST_WORKSPACE("api.email.digest.workspace"),
    EMAIL_DIGEST_NOTHING("api.email.digest.nothing"),
    EMAIL_FOOTER("api.email.footer"),
    CSV_DATE("api.csv.date"),
    CSV_WEEKDAY("api.csv.weekday"),
    CSV_MEMBER("api.csv.member"),
    CSV_HOURS("api.csv.hours"),
    CSV_NOTE("api.csv.note"),
    CSV_RATE("api.csv.rate"),
    CSV_AMOUNT("api.csv.amount"),
    PUSH_WORKSPACE_PREFIX("api.push.workspacePrefix");

    private final String key;
    private final boolean plural;

    Text(String key) {
        this(key, false);
    }

    Text(String key, boolean plural) {
        this.key = key;
        this.plural = plural;
    }

    public String key() {
        return key;
    }

    public boolean plural() {
        return plural;
    }
}
