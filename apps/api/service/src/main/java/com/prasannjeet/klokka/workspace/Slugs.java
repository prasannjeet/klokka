package com.prasannjeet.klokka.workspace;

import java.text.Normalizer;
import java.util.Locale;

// "Café Nord" -> "cafe-nord": ASCII, lower case, hyphens, at most 60 characters, never empty.
public final class Slugs {

    private static final int MAX = 60;

    private Slugs() {}

    public static String of(String name) {
        String ascii = Normalizer.normalize(name, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+|-+$)", "");
        if (ascii.length() > MAX) ascii = ascii.substring(0, MAX).replaceAll("-+$", "");
        return ascii.isEmpty() ? "workspace" : ascii;
    }
}
