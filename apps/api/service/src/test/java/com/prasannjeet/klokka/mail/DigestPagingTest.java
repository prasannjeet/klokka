package com.prasannjeet.klokka.mail;

import static org.assertj.core.api.Assertions.assertThat;

import com.prasannjeet.klokka.support.Fake;
import com.prasannjeet.klokka.support.MutableClock;
import com.prasannjeet.klokka.support.TestData;
import io.agroal.api.AgroalDataSource;
import io.quarkus.mailer.Mail;
import io.quarkus.mailer.MockMailbox;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// The digest sweep with a page of one user and one job line per email (CHQ-189): every user is reached in one run,
// a user who never touched the setting gets it (on by default), and the email lists only what fits, pointing at the
// workbook for the rest.
@QuarkusTest
@TestProfile(DigestPagingTest.SmallPages.class)
class DigestPagingTest {

    public static class SmallPages implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of("klokka.digest.batch-size", "1", "klokka.digest.max-jobs-in-email", "1");
        }
    }

    @Inject
    AgroalDataSource dataSource;

    @Inject
    MutableClock clock;

    @Inject
    DigestJob job;

    @Inject
    MockMailbox mailbox;

    TestData data;

    @BeforeEach
    void setUp() {
        data = new TestData(dataSource);
        Fake.reset();
        mailbox.clear();
        for (String table : List.of("hour_entry_change", "job", "hour_entry", "membership")) {
            data.run("delete from " + table + " where workspace_id in (select id from workspace where slug like 'digestp-%')");
        }
        data.run("delete from workspace where slug like 'digestp-%'");
        data.run("update user_preference set digest_enabled = false");
    }

    @AfterEach
    void tearDown() {
        clock.reset();
    }

    @Test
    void everyUserIsReachedAcrossPagesAndTheEmailPointsAtTheFileForTheRest() throws IOException {
        String run = UUID.randomUUID().toString().substring(0, 8);
        String employer = "usr_dp_" + run + "_a";
        String anna = "usr_dp_" + run + "_b";
        String omar = "usr_dp_" + run + "_c";
        String slug = "digestp-" + run;
        // New accounts with the stored defaults: the digest is on without anyone turning it on.
        data.user(employer, "boss-" + run + "@example.com", "Bo Ss");
        data.user(anna, "anna-" + run + "@example.com", "Anna Berg");
        data.user(omar, "omar-" + run + "@example.com", "Omar Ali");
        assertThat(data.count("select count(*) from user_preference where logto_user_id in (?, ?, ?) and digest_enabled", employer, anna, omar))
                .isEqualTo(3);
        data.run("update user_preference set language = 'en' where logto_user_id in (?, ?, ?)", employer, anna, omar);
        UUID ws = data.workspace("Paging Corp", slug, false, "NONE", "Europe/Stockholm");
        data.member(ws, employer, "EMPLOYER", "Bo Ss", "boss-" + run + "@example.com", null, "ACTIVE");
        UUID a = data.member(ws, anna, "EMPLOYEE", "Anna Berg", "anna-" + run + "@example.com", null, "ACTIVE");
        UUID o = data.member(ws, omar, "EMPLOYEE", "Omar Ali", "omar-" + run + "@example.com", null, "ACTIVE");
        data.entry(ws, a, LocalDate.of(2026, 9, 14), new BigDecimal("4.00"), null, employer);
        data.entry(ws, a, LocalDate.of(2026, 9, 15), new BigDecimal("5.00"), null, employer);
        data.entry(ws, o, LocalDate.of(2026, 9, 16), new BigDecimal("3.00"), null, employer);

        clock.set(Instant.parse("2026-09-21T05:15:00Z"));
        DigestJob.Result result = job.run();
        assertThat(result.sent()).isEqualTo(3);
        assertThat(result.budgetOut()).isFalse();

        Mail boss = mailbox.getMailsSentTo("boss-" + run + "@example.com").getFirst();
        // One job line fits; the other two are in the workbook, which has all three.
        assertThat(boss.getHtml()).contains("2 more jobs are in the attached file.");
        assertThat(boss.getText()).contains("2 more jobs are in the attached file.");
        try (ReadableWorkbook workbook = DigestJobTest.workbook(boss.getAttachments().getFirst())) {
            // Header, Anna's two jobs and total, Omar's job and total.
            assertThat(workbook.findSheet("Jobs").orElseThrow().read()).hasSize(6);
        }
        Mail own = mailbox.getMailsSentTo("anna-" + run + "@example.com").getFirst();
        assertThat(own.getText()).contains("1 more job is in the attached file.");
        assertThat(mailbox.getMailsSentTo("omar-" + run + "@example.com").getFirst().getText()).doesNotContain("more job");
    }
}
