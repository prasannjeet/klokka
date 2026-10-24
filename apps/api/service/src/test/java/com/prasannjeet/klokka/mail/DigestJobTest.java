package com.prasannjeet.klokka.mail;

import static org.assertj.core.api.Assertions.assertThat;

import com.prasannjeet.klokka.config.KlokkaConfig;
import com.prasannjeet.klokka.support.Fake;
import com.prasannjeet.klokka.support.MutableClock;
import com.prasannjeet.klokka.support.TestData;
import io.agroal.api.AgroalDataSource;
import io.quarkus.mailer.Attachment;
import io.quarkus.mailer.Mail;
import io.quarkus.arc.ClientProxy;
import io.quarkus.mailer.MockMailbox;
import io.quarkus.test.junit.QuarkusMock;
import io.quarkus.test.junit.QuarkusTest;
import io.smallrye.mutiny.Multi;
import jakarta.enterprise.inject.Vetoed;
import jakarta.inject.Inject;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.dhatim.fastexcel.reader.Row;
import org.dhatim.fastexcel.reader.Sheet;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// The weekly digest (CHQ-133, CHQ-189): due from Monday at 07:00 workspace time until the end of Wednesday, on by
// default, once per ISO week, in the user's language, with one Excel workbook per workspace, ledgered against the
// daily quota with a reserve left for invitations, skipped when there is nothing to report.
@QuarkusTest
class DigestJobTest {

    private static final String NORA = "usr_dg_nora";
    private static final String MARIA = "usr_dg_maria";
    private static final String GONE = "usr_dg_gone";

    @Inject
    AgroalDataSource dataSource;

    @Inject
    MutableClock clock;

    @Inject
    DigestJob job;

    @Inject
    MockMailbox mailbox;

    @Inject
    KlokkaConfig config;

    @Inject
    MailService mailService;

    TestData data;
    UUID ws;
    String slug;

    @BeforeEach
    void setUp() {
        data = new TestData(dataSource);
        Fake.reset();
        mailbox.clear();
        // Each test starts from its own workspace: the ones earlier tests made, and their ledger rows, go.
        for (String table : List.of("hour_entry_change", "job", "hour_entry", "membership")) {
            data.run("delete from " + table + " where workspace_id in (select id from workspace where slug like 'digest-%')");
        }
        data.run("delete from workspace where slug like 'digest-%'");
        data.run("delete from email_send where recipient in ('maria@example.com', 'nora@cafenord.example', 'fill@example.com', 'gone@example.com')");
        data.run("update user_preference set digest_enabled = false");
        data.user(NORA, "nora@cafenord.example", "Nora Lind");
        data.user(MARIA, "maria@example.com", "Maria Lind");
        data.preferences(NORA, "en", true, true);
        data.preferences(MARIA, "sv", true, true);
        slug = "digest-" + UUID.randomUUID().toString().substring(0, 8);
        ws = data.workspace("Digest Corp", slug, false, "NONE", "Europe/Stockholm");
        data.member(ws, NORA, "EMPLOYER", "Nora Lind", "nora@cafenord.example", null, "ACTIVE");
        UUID maria = data.member(ws, MARIA, "EMPLOYEE", "Maria Lind", "maria@example.com", null, "ACTIVE");
        // Week 38 (14 to 20 September): Maria 4 h on Monday and 6.5 h on Friday.
        data.entry(ws, maria, LocalDate.of(2026, 9, 14), new BigDecimal("4.00"), null, NORA);
        data.entry(ws, maria, LocalDate.of(2026, 9, 18), new BigDecimal("6.50"), null, NORA);
        data.run("delete from digest_run where logto_user_id in (?, ?, ?)", NORA, MARIA, GONE);
    }

    @AfterEach
    void tearDown() {
        clock.reset();
    }

    @Test
    void sendsOncePerWeekAtMondaySevenLocalTime() throws IOException {
        // Monday 21 September 2026, 06:30 in Stockholm (04:30Z): too early.
        clock.set(Instant.parse("2026-09-21T04:30:00Z"));
        assertThat(job.run().sent()).isZero();
        assertThat(mailbox.getTotalMessagesSent()).isZero();

        // 07:15 in Stockholm: both opted-in users get last week's digest, each in their language.
        clock.set(Instant.parse("2026-09-21T05:15:00Z"));
        DigestJob.Result result = job.run();
        assertThat(result.sent()).isEqualTo(2);
        List<Mail> toMaria = mailbox.getMailsSentTo("maria@example.com");
        assertThat(toMaria).hasSize(1);
        assertThat(toMaria.get(0).getSubject()).isEqualTo("Din vecka 38 på Digest Corp");
        assertThat(toMaria.get(0).getText()).contains("Hej Maria Lind,").contains("Dina timmar vecka 38: 10,5 h").contains("September 2026 hittills: 10,5 h")
                .contains("Stäng av veckosammanfattningen under Inställningar.");
        List<Mail> toNora = mailbox.getMailsSentTo("nora@cafenord.example");
        assertThat(toNora).hasSize(1);
        assertThat(toNora.get(0).getSubject()).isEqualTo("Week 38 at Digest Corp: 10.5 h");
        assertThat(toNora.get(0).getText()).contains("Team hours in week 38: 10.5 h");
        // The HTML version (CHQ-148): same numbers in the designed layout, a week grid with the busiest day marked.
        String sv = toMaria.get(0).getHtml();
        assertThat(sv).contains("<html lang=\"sv\">").contains("Vecka 38.").contains("10,5 timmar.").contains("Hej Maria Lind,")
                .contains("Digest Corp").contains("14\u201320 september").contains(">Mån<").contains(">Tor<").contains(">Sön<").contains(">ledig<")
                .contains(">4<").contains("Dina timmar vecka 38").contains("September 2026 hittills").contains("Öppna Klokka")
                .contains("Stäng av veckosammanfattningen under Inställningar.").doesNotContain("{m.").doesNotContain("{w.");
        assertThat(sv).containsPattern("background:#FF006E;[^>]*>6,5<");
        String en = toNora.get(0).getHtml();
        // Kept for a look in a real mail client (target/ is not committed).
        java.nio.file.Files.writeString(java.nio.file.Path.of("target/digest-sv.html"), sv);
        java.nio.file.Files.writeString(java.nio.file.Path.of("target/digest-en.html"), en);
        assertThat(en).contains("<html lang=\"en\">").contains("Week 38.").contains("10.5 hours.").contains(">Mon<")
                .contains("Team hours in week 38").contains("Open Klokka").contains(">off<");
        assertThat(data.count("select count(*) from email_send where kind = 'DIGEST' and recipient in ('maria@example.com', 'nora@cafenord.example') and status = 'SENT'")).isEqualTo(2);
        // CHQ-189: the employer's email has the team table and everyone's jobs; the employee's only their own.
        assertThat(en).contains("Team this week").contains(">Maria Lind<").contains(">Jobs<").contains("No place").contains(">4 h<")
                .contains("Last week in Excel: klokka-" + slug + "-2026-W38.xlsx").doesNotContain("more job");
        assertThat(sv).doesNotContain("Teamet den här veckan").contains(">Jobb<").contains("Ingen plats").contains(">6,5 h<")
                .contains("Förra veckan i Excel: klokka-" + slug + "-2026-W38.xlsx");
        assertThat(toNora.get(0).getText()).contains("Team this week").contains("Maria Lind: Mon 4, Fri 6.5 (10.5 h)").contains("Jobs")
                .contains("Mon 14 Sept").contains("  No place  4 h");
        // One workbook per workspace, parsed back: the employer's lists Maria's two days and a total.
        Attachment file = toNora.get(0).getAttachments().getFirst();
        assertThat(toNora.get(0).getAttachments()).hasSize(1);
        assertThat(file.getName()).isEqualTo("klokka-" + slug + "-2026-W38.xlsx");
        assertThat(file.getContentType()).isEqualTo("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        try (ReadableWorkbook workbook = workbook(file)) {
            assertThat(workbook.getSheets().map(Sheet::getName).toList()).containsExactly("Jobs", "Hours");
            List<Row> jobs = workbook.findSheet("Jobs").orElseThrow().read();
            assertThat(jobs).hasSize(4);
            assertThat(jobs.get(3).getCellText(1)).isEqualTo("Total");
            assertThat(jobs.get(3).getCellAsNumber(5).orElseThrow()).isEqualByComparingTo("10.5");
            assertThat(workbook.findSheet("Hours").orElseThrow().read()).hasSize(3);
        }
        try (ReadableWorkbook workbook = workbook(toMaria.get(0).getAttachments().getFirst())) {
            assertThat(workbook.getSheets().map(Sheet::getName).toList()).containsExactly("Jobb", "Timmar");
            assertThat(workbook.findSheet("Timmar").orElseThrow().read()).hasSize(2);
        }
        assertThat(data.query("select iso_week from digest_run where logto_user_id = ?", MARIA)).containsExactly(List.of("2026-W38"));

        // Later the same Monday, and again on Tuesday: nothing more.
        clock.set(Instant.parse("2026-09-21T09:00:00Z"));
        assertThat(job.run().sent()).isZero();
        clock.set(Instant.parse("2026-09-22T09:00:00Z"));
        assertThat(job.run().sent()).isZero();
        assertThat(mailbox.getTotalMessagesSent()).isEqualTo(2);
    }

    @Test
    void aWeekWithNothingToReportCostsNoEmailButIsRecorded() {
        // Every workspace these two are in (earlier tests in this class made their own): nothing logged anywhere.
        data.run("delete from hour_entry_change where workspace_id in (select workspace_id from membership where logto_user_id in (?, ?))", NORA, MARIA);
        data.run("delete from job where workspace_id in (select workspace_id from membership where logto_user_id in (?, ?))", NORA, MARIA);
        data.run("delete from hour_entry where workspace_id in (select workspace_id from membership where logto_user_id in (?, ?))", NORA, MARIA);
        clock.set(Instant.parse("2026-09-21T05:15:00Z"));
        DigestJob.Result result = job.run();
        assertThat(result.sent()).isZero();
        assertThat(mailbox.getTotalMessagesSent()).isZero();
        assertThat(data.count("select count(*) from digest_run where logto_user_id in (?, ?) and iso_week = '2026-W38'", NORA, MARIA)).isEqualTo(2);
    }

    @Test
    void theDigestStaysDueUntilWednesdayAndIsDroppedAfter() {
        // Thursday 24 September, 11:00 in Stockholm: past Monday + 2 catch-up days, last week's digest is not sent.
        clock.set(Instant.parse("2026-09-24T09:00:00Z"));
        assertThat(job.run().sent()).isZero();
        assertThat(data.count("select count(*) from digest_run where logto_user_id in (?, ?) and iso_week = '2026-W38'", NORA, MARIA)).isZero();
        // Tuesday 22 September inside the window: both get it (positive control).
        clock.set(Instant.parse("2026-09-22T09:00:00Z"));
        assertThat(job.run().sent()).isEqualTo(2);
        assertThat(mailbox.getMailsSentTo("maria@example.com").getFirst().getSubject()).isEqualTo("Din vecka 38 på Digest Corp");
    }

    @Test
    void theReserveHoldsTheDigestBackUntilTheDailyQuotaHasRoom() {
        Instant monday = Instant.parse("2026-09-21T05:15:00Z");
        clock.set(monday);
        int share = config.mail().dailyQuota() - config.digest().reserve();
        long already = data.count("select count(*) from email_send where sent_at > ? and sent_at <= ? and status <> 'FAILED'", monday.minus(Duration.ofHours(24)), monday);
        // Nothing else leaves the window in the hour this test moves forward, so the room it frees is exactly one row.
        assertThat(data.count("select count(*) from email_send where sent_at > ? and sent_at <= ? and status <> 'FAILED'",
                monday.minus(Duration.ofHours(24)), monday.minus(Duration.ofHours(23)).plus(Duration.ofMinutes(1)))).isZero();
        // The digest's share of the last 24 hours is used up (rows inside the window, one of them 23 hours old).
        fill(share - already - 1, monday);
        fill(1, monday.minus(Duration.ofHours(23)));
        DigestJob.Result held = job.run();
        assertThat(held.sent()).isZero();
        assertThat(held.budgetOut()).isTrue();
        assertThat(mailbox.getTotalMessagesSent()).isZero();
        assertThat(data.count("select count(*) from digest_run where logto_user_id in (?, ?)", NORA, MARIA)).isZero();

        // The 23-hour-old row leaves the window an hour and a minute later: room for exactly one digest (Maria first,
        // by user id); Nora waits again.
        clock.set(monday.plus(Duration.ofMinutes(61)));
        DigestJob.Result one = job.run();
        assertThat(one.sent()).isEqualTo(1);
        assertThat(one.budgetOut()).isTrue();
        assertThat(mailbox.getMailsSentTo("maria@example.com")).hasSize(1);
        assertThat(mailbox.getMailsSentTo("nora@cafenord.example")).isEmpty();

        // Once the filler is gone, the next sweep (still Monday) sends Nora's.
        data.run("delete from email_send where recipient = 'fill@example.com'");
        clock.set(monday.plus(Duration.ofMinutes(76)));
        DigestJob.Result rest = job.run();
        assertThat(rest.sent()).isEqualTo(1);
        assertThat(rest.budgetOut()).isFalse();
        assertThat(mailbox.getMailsSentTo("nora@cafenord.example")).hasSize(1);
        assertThat(mailbox.getMailsSentTo("maria@example.com")).hasSize(1);
    }

    @Test
    void onlyActiveMembershipsGetADigest() {
        // Gone worked in week 38 and was deactivated since: no digest for them, now or later in the window.
        data.user(GONE, "gone@example.com", "Gone Person");
        data.preferences(GONE, "en", true, true);
        UUID gone = data.member(ws, GONE, "EMPLOYEE", "Gone Person", "gone@example.com", null, "DEACTIVATED");
        data.entry(ws, gone, LocalDate.of(2026, 9, 15), new BigDecimal("3.00"), null, NORA);
        clock.set(Instant.parse("2026-09-21T05:15:00Z"));
        DigestJob.Result result = job.run();
        assertThat(mailbox.getMailsSentTo("gone@example.com")).isEmpty();
        assertThat(data.count("select count(*) from digest_run where logto_user_id = ?", GONE)).isZero();
        // Positive control: the active employer and employee of the same workspace get theirs.
        assertThat(result.sent()).isEqualTo(2);
        assertThat(mailbox.getMailsSentTo("maria@example.com")).hasSize(1);
        assertThat(mailbox.getMailsSentTo("nora@cafenord.example")).hasSize(1);
    }

    @Test
    void aFailedSendIsNotRecordedAndStopsTheRunUntilMailWorksAgain() {
        FlakyMail flaky = new FlakyMail(ClientProxy.unwrap(mailService));
        QuarkusMock.installMockForType(flaky, MailService.class);
        clock.set(Instant.parse("2026-09-21T05:15:00Z"));
        DigestJob.Result failed = job.run();
        // The first send fails: nothing recorded, and the run stops instead of trying everyone else.
        assertThat(flaky.attempts).isEqualTo(1);
        assertThat(failed.sent()).isZero();
        assertThat(failed.considered()).isEqualTo(1);
        assertThat(failed.mailFailed()).isTrue();
        assertThat(data.count("select count(*) from digest_run where logto_user_id in (?, ?)", NORA, MARIA)).isZero();

        // The next sweep inside the window, with mail working: both are sent (positive control).
        flaky.down = false;
        clock.set(Instant.parse("2026-09-21T05:30:00Z"));
        DigestJob.Result retried = job.run();
        assertThat(retried.sent()).isEqualTo(2);
        assertThat(retried.mailFailed()).isFalse();
        assertThat(mailbox.getMailsSentTo("maria@example.com")).hasSize(1);
        assertThat(mailbox.getMailsSentTo("nora@cafenord.example")).hasSize(1);
        assertThat(data.count("select count(*) from digest_run where logto_user_id in (?, ?) and iso_week = '2026-W38'", NORA, MARIA)).isEqualTo(2);
    }

    // The real MailService behind a switch: while `down`, every send fails the way an SMTP outage does (false).
    // Vetoed: a test object handed to QuarkusMock, not a second MailService bean.
    @Vetoed
    static final class FlakyMail extends MailService {
        private final MailService real;
        volatile boolean down = true;
        int attempts;

        FlakyMail(MailService real) {
            this.real = real;
        }

        @Override
        public boolean digestBudgetLeft() {
            return real.digestBudgetLeft();
        }

        @Override
        public boolean send(String kind, String to, String subject, String text, String html, String userId, List<MailService.Attachment> attachments) {
            attempts++;
            return !down && real.send(kind, to, subject, text, html, userId, attachments);
        }
    }

    private void fill(long rows, Instant at) {
        for (long i = 0; i < rows; i++) {
            data.run("insert into email_send (id, kind, recipient, status, sent_at) values (?, 'INVITATION', 'fill@example.com', 'SENT', ?)",
                    UUID.randomUUID(), at);
        }
    }

    static ReadableWorkbook workbook(Attachment file) throws IOException {
        List<Byte> bytes = Multi.createFrom().publisher(file.getData()).collect().asList().await().indefinitely();
        byte[] data = new byte[bytes.size()];
        for (int i = 0; i < data.length; i++) data[i] = bytes.get(i);
        assertThat(data).isNotEmpty();
        return new ReadableWorkbook(new ByteArrayInputStream(data));
    }
}
