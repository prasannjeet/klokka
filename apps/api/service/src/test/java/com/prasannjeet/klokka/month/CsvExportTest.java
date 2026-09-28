package com.prasannjeet.klokka.month;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

// The formula guard of the export: a cell a person typed never starts with a character a spreadsheet evaluates.
class CsvExportTest {

    @ParameterizedTest
    @ValueSource(strings = {"=HYPERLINK(\"https://evil.example\")", "+cmd|' /C calc'!A0", "-2 h lunch", "@SUM(A1)", "\t=1+1", "\r=1+1"})
    void aCellThatCouldBeAFormulaGetsALeadingApostrophe(String typed) {
        assertThat(CsvExport.text(typed)).isEqualTo("'" + typed);
    }

    @ParameterizedTest
    @ValueSource(strings = {"Maria Lind", "Delivery day, stayed to unload", "2 h lunch (=short day)", "", " -not at start", "Åsa"})
    void ordinaryTextIsLeftExactlyAsTyped(String typed) {
        assertThat(CsvExport.text(typed)).isEqualTo(typed);
    }
}
