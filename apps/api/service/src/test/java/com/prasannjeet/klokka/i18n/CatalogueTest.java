package com.prasannjeet.klokka.i18n;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.prasannjeet.klokka.contract.model.Language;
import com.prasannjeet.klokka.support.FakeServers;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Map;
import org.junit.jupiter.api.Test;

// The catalogue the API renders from is the clients' catalogue (D2): every key the API uses exists in both
// languages (plural pairs included), placeholders are filled, a missing one fails loudly. The FakeServers resource
// declared here applies to every @QuarkusTest in the module (fake Logto and Expo, a fixed webhook signing key).
@QuarkusTest
@QuarkusTestResource(FakeServers.class)
class CatalogueTest {

    @Inject
    Catalogue catalogue;

    @Test
    void everyKeyTheApiUsesExistsInBothLanguages() {
        for (Text text : Text.values()) {
            for (Language language : Language.values()) {
                if (text.plural()) {
                    assertThat(catalogue.has(language, text.key() + "_one")).as("%s_one in %s", text.key(), language).isTrue();
                    assertThat(catalogue.has(language, text.key() + "_other")).as("%s_other in %s", text.key(), language).isTrue();
                } else {
                    assertThat(catalogue.has(language, text.key())).as("%s in %s", text.key(), language).isTrue();
                }
            }
        }
    }

    @Test
    void everyApiPrefixedKeyIsUsedByTheApi() {
        // api.* keys were added for the API alone; an unused one is dead text in both files.
        for (Text text : Text.values()) {
            assertThat(catalogue.has(Language.SV, text.key())).isEqualTo(catalogue.has(Language.EN, text.key()));
        }
        assertThat(catalogue.has(Language.SV, "api.csv.date")).isTrue();
    }

    @Test
    void interpolationAndPluralsFollowTheCatalogue() {
        assertThat(catalogue.plural(Language.EN, Text.HOURS_ADDED_TITLE.key(), 1, Map.of("name", "Nora", "hours", "4")))
                .isEqualTo("Nora added 1 day, 4 h");
        assertThat(catalogue.plural(Language.SV, Text.HOURS_ADDED_TITLE.key(), 5, Map.of("name", "Nora", "hours", "22,5")))
                .isEqualTo("Nora lade till 5 dagar, 22,5 h");
        assertThatThrownBy(() -> catalogue.t(Language.EN, Text.HOURS_ADDED_BODY.key(), Map.of("hours", "4 h")))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("{week}");
        assertThatThrownBy(() -> catalogue.t(Language.EN, "no.such.key")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void formatsFollowTheLanguage() {
        assertThat(Formats.number(new BigDecimal("22.50"), Language.SV)).isEqualTo("22,5");
        assertThat(Formats.number(new BigDecimal("8.00"), Language.EN)).isEqualTo("8");
        assertThat(Formats.hours(new BigDecimal("4.25"), Language.EN, catalogue)).isEqualTo("4.25 h");
        assertThat(Formats.money(new BigDecimal("15840"), "SEK", Language.SV)).contains("15").contains("840").contains("kr");
        assertThat(Formats.month(YearMonth.of(2026, 9), Language.SV)).isEqualTo("september 2026");
        assertThat(Formats.month(YearMonth.of(2026, 9), Language.EN)).isEqualTo("September 2026");
        assertThat(Formats.shortDate(LocalDate.of(2026, 9, 23), Language.EN)).startsWith("Wed 23");
    }
}
