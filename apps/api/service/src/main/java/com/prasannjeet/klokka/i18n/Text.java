package com.prasannjeet.klokka.i18n;

// Every catalogue key the API renders, in one place so CatalogueTest can prove each exists in both languages.
// Plural keys are listed by their base name (the `_one` / `_other` pair is checked for both).
public enum Text {

    HOURS_ADDED_ONE("notifications.hours.addedOne"),
    HOURS_CHANGED_ONE("notifications.hours.changedOne"),
    HOURS_ADDED("notifications.hours.added", true),
    HOURS_CHANGED("notifications.hours.changed", true),
    HOURS_REMOVED("notifications.hours.removed", true),
    HOURS_REVERTED("notifications.hours.reverted"),
    HOURS_BODY_ONE("notifications.hours.bodyOne"),
    HOURS_BODY_CHANGED_ONE("notifications.hours.bodyChangedOne"),
    HOURS_BODY_WEEK("notifications.hours.bodyWeek"),
    HOURS_BODY_DAYS("notifications.hours.bodyDays"),
    HOURS_RANGE_WEEK("notifications.hours.rangeWeek"),
    HOURS_RANGE("notifications.hours.range"),
    HOURS_DAY("notifications.hours.day"),
    HOURS_DAY_REMOVED("notifications.hours.dayRemoved"),
    HOURS_NOTE("notifications.hours.note"),
    INVITE_ACCEPTED_TITLE("notifications.inviteAccepted.title"),
    INVITE_ACCEPTED_BODY("notifications.inviteAccepted.body"),
    ENTRY_FLAGGED_TITLE("notifications.entryFlagged.title"),
    ENTRY_FLAGGED_BODY("notifications.entryFlagged.body"),
    ENTRY_FLAGGED_BODY_MESSAGE("notifications.entryFlagged.bodyMessage"),
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
    JOB_REMINDER_TITLE_PLACE("notifications.jobReminder.titlePlace"),
    JOB_REMINDER_TITLE("notifications.jobReminder.title"),
    JOB_REMINDER_TITLE_PLACE_TOMORROW("notifications.jobReminder.titlePlaceTomorrow"),
    JOB_REMINDER_TITLE_TOMORROW("notifications.jobReminder.titleTomorrow"),
    JOB_REMINDER_BODY("notifications.jobReminder.body"),
    JOB_REMINDER_BODY_ADDRESS("notifications.jobReminder.bodyAddress"),
    JOB_REMINDER_IN_15("notifications.jobReminder.in15"),
    JOB_REMINDER_IN_30("notifications.jobReminder.in30"),
    JOB_REMINDER_IN_60("notifications.jobReminder.in60"),
    JOB_REMINDER_IN_120("notifications.jobReminder.in120"),
    JOBS_ADDED("notifications.jobs.added"),
    JOBS_CHANGED("notifications.jobs.changed"),
    JOBS_REMOVED("notifications.jobs.removed"),
    JOBS_ADDED_MANY("notifications.jobs.addedMany", true),
    JOBS_CHANGED_MANY("notifications.jobs.changedMany", true),
    JOBS_REMOVED_MANY("notifications.jobs.removedMany", true),
    JOBS_WHEN("notifications.jobs.when"),
    JOBS_WHEN_TIME("notifications.jobs.whenTime"),
    JOBS_WHEN_PLACE("notifications.jobs.whenPlace"),
    JOBS_WHEN_TIME_PLACE("notifications.jobs.whenTimePlace"),
    JOBS_RANGE("notifications.jobs.range"),
    JOBS_MORE("notifications.jobs.more"),
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
    DIGEST_TITLE_WEEK("email.digest.title1"),
    DIGEST_TITLE_HOURS("email.digest.title2", true),
    DIGEST_TEAM_HOURS_LABEL("email.digest.teamHoursLabel"),
    DIGEST_YOUR_HOURS_LABEL("email.digest.yourHoursLabel"),
    DIGEST_MONTH_SO_FAR_LABEL("email.digest.monthSoFarLabel"),
    DIGEST_DAY_OFF("email.digest.dayOff"),
    DIGEST_ACTION("email.digest.action"),
    DIGEST_TEAM_TITLE("email.digest.teamTitle"),
    DIGEST_JOBS_TITLE("email.digest.jobsTitle"),
    DIGEST_ATTACHED("email.digest.attached"),
    DIGEST_MORE_IN_FILE("email.digest.moreInFile", true),
    DIGEST_NO_PLACE("email.digest.noPlace"),
    XLSX_SHEET_JOBS("api.xlsx.sheetJobs"),
    XLSX_SHEET_HOURS("api.xlsx.sheetHours"),
    XLSX_EMPLOYEE("api.xlsx.employee"),
    XLSX_DATE("api.xlsx.date"),
    XLSX_WEEKDAY("api.xlsx.weekday"),
    XLSX_START("api.xlsx.start"),
    XLSX_END("api.xlsx.end"),
    XLSX_HOURS("api.xlsx.hours"),
    XLSX_PLACE("api.xlsx.place"),
    XLSX_ADDRESS("api.xlsx.address"),
    XLSX_NOTE("api.xlsx.note"),
    XLSX_RECURRING("api.xlsx.recurring"),
    XLSX_YES("api.xlsx.yes"),
    XLSX_NO("api.xlsx.no"),
    XLSX_WEEK_TOTAL("api.xlsx.weekTotal"),
    XLSX_PAY("api.xlsx.pay"),
    XLSX_TOTAL("api.xlsx.total"),
    XLSX_TEAM("api.xlsx.team"),
    CSV_DATE("api.csv.date"),
    CSV_WEEKDAY("api.csv.weekday"),
    CSV_MEMBER("api.csv.member"),
    CSV_HOURS("api.csv.hours"),
    CSV_NOTE("api.csv.note"),
    CSV_RATE("api.csv.rate"),
    CSV_AMOUNT("api.csv.amount");

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
