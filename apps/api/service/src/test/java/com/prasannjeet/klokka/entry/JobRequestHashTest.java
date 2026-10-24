package com.prasannjeet.klokka.entry;

import static org.assertj.core.api.Assertions.assertThat;

import com.prasannjeet.klokka.contract.model.JobWrite;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;

// The retry fingerprint covers every field of the body: a retry that changes only the title (CHQ-191) is a
// different request.
class JobRequestHashTest {

    private static JobWrite body(String title) {
        return new JobWrite().hours(new BigDecimal("3")).requestId(UUID.fromString("8f1c2d3e-4b5a-4c6d-9e8f-7a6b5c4d3e2f"))
                .startTime("09:00").title(title).note("Counter");
    }

    @Test
    void bodiesThatDifferOnlyInTitleHashDifferently() {
        assertThat(JobRequestHash.of(body("Window cleaning"))).isNotEqualTo(JobRequestHash.of(body("Deep clean")));
        assertThat(JobRequestHash.of(body("Window cleaning"))).isNotEqualTo(JobRequestHash.of(body(null)));
        UUID job = UUID.randomUUID();
        assertThat(JobRequestHash.ofScheduleChange(job, body("Window cleaning"))).isNotEqualTo(JobRequestHash.ofScheduleChange(job, body(null)));
        // Positive control: the same body hashes the same.
        assertThat(JobRequestHash.of(body("Window cleaning"))).isEqualTo(JobRequestHash.of(body("Window cleaning")));
    }
}
