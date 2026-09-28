package com.prasannjeet.klokka.i18n;

import static org.assertj.core.api.Assertions.assertThat;

import com.prasannjeet.klokka.contract.model.Language;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class FormatsTest {

    @Test
    void shortDatesNeverEndWithAPeriodSoSentencesDoNotDoubleIt() {
        LocalDate date = LocalDate.of(2026, 9, 24);
        assertThat(Formats.shortDate(date, Language.SV)).isEqualTo("tors 24 sep");
        assertThat(Formats.shortDate(date, Language.EN)).doesNotEndWith(".").startsWith("Thu 24 Sep");
        assertThat(Formats.shortDate(LocalDate.of(2026, 5, 7), Language.SV)).isEqualTo("tors 7 maj");
    }
}
