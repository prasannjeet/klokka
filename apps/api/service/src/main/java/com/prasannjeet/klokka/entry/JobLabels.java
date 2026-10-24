package com.prasannjeet.klokka.entry;

// A job's main label on every surface (CHQ-191): its title when it has one, else its place's name, else null (the
// caller says "No place" or "Job"). The same rule as @klokka/core's jobLabel, so push, digest and apps agree.
public final class JobLabels {

    private JobLabels() {}

    public static String label(String title, String placeName) {
        if (title != null && !title.isBlank()) return title.trim();
        if (placeName != null && !placeName.isBlank()) return placeName.trim();
        return null;
    }

    // The place as a second line: only when a title took the main label.
    public static String secondLine(String title, String placeName) {
        if (title == null || title.isBlank() || placeName == null || placeName.isBlank()) return null;
        return placeName.trim();
    }
}
