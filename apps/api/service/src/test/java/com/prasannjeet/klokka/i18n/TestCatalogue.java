package com.prasannjeet.klokka.i18n;

import com.fasterxml.jackson.databind.ObjectMapper;

// The real catalogue for a plain JUnit test (no Quarkus): the same JSON the API loads from the classpath.
public final class TestCatalogue {

    private TestCatalogue() {}

    public static Catalogue load() {
        Catalogue catalogue = new Catalogue();
        catalogue.mapper = new ObjectMapper();
        catalogue.load();
        return catalogue;
    }
}
