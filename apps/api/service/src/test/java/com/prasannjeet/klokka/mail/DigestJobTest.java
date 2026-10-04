package com.prasannjeet.klokka.mail;

import static org.assertj.core.api.Assertions.assertThat;

import com.prasannjeet.klokka.support.Fake;
import com.prasannjeet.klokka.support.MutableClock;
import com.prasannjeet.klokka.support.TestData;
import io.agroal.api.AgroalDataSource;
import io.quarkus.mailer.Mail;
import io.quarkus.mailer.MockMailbox;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// The weekly digest (CHQ-133): Monday at 07:00 workspace time, opt-in only, once per ISO week, in the user's
// language, ledgered against the quota, skipped when there is nothing to report.
@QuarkusTest
class DigestJobTest {

    private static final String NORA = "usr_dg_nora";
    private static final String MARIA = "usr_dg_maria";

    @Inject
    AgroalDataSource dataSource;

    @Inject
    MutableClock clock;

    @Inject
    DigestJob job;

    @Inject
    MockMailbox mailbox;

    TestData data;
    UUID ws;

    @BeforeEach
    void setUp() {
        data = new TestData(dataSource);
        Fake.reset();
        mailbox.clear();
        data.run("update user_preference set digest_enabled = false");
        data.user(NORA, "nora@cafenord.example", "Nora Lind");
        data.user(MARIA, "maria@example.com", "Maria Lind");
        data.preferences(NORA, "en", true, true);
        data.preferences(MARIA, "sv", true, true);
        ws = data.workspace("Digest Corp", "digest-" + UUID.randomUUID().toString().substring(0, 8), false, "NONE", "Europe/Stockholm");
        data.member(ws, NORA, "EMPLOYER", "Nora Lind", "nora@cafenord.example", null, "ACTIVE");
        UUID maria = data.member(ws, MARIA, "EMPLOYEE", "Maria Lind", "maria@example.com", null, "ACTIVE");
        // Week 38 (14 to 20 September): Maria 4 h on Monday and 6.5 h on Friday.
        data.entry(ws, maria, LocalDate.of(2026, 9, 14), new BigDecimal("4.00"), null, NORA);
        data.entry(ws, maria, LocalDate.of(2026, 9, 18), new BigDecimal("6.50"), null, NORA);
        data.run("delete from digest_run where logto_user_id in (?, ?)", NORA, MARIA);
    }

    @AfterEach
    void tearDown() {
        clock.reset();
    }

    @Test
    void sendsOncePerWeekAtMondaySevenLocalTime() throws java.io.IOException {
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
        assertThat(toMaria.get(0).getText()).contains("Hej Maria Lind,").contains("Dina timmar vecka 38: 10,5 h").contains("september 2026 hittills: 10,5 h")
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
}
