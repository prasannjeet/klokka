package com.prasannjeet.klokka.arch;

import com.prasannjeet.klokka.config.KlokkaConfig;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import java.net.URISyntaxException;
import java.nio.file.Path;
import java.nio.file.Paths;

// The ONE ArchUnit graph pair for the whole test suite (tax-agent's KUL-230 lesson: one import per JVM, not one
// per rule class). Imported by code-source location, because surefire's argfile classpath is invisible to
// ArchUnit's package scan.
public final class AnalyzedClasses {

    private static JavaClasses main;
    private static JavaClasses tests;

    private AnalyzedClasses() {}

    public static synchronized JavaClasses main() {
        if (main == null) main = importCodeSourceOf(KlokkaConfig.class);
        return main;
    }

    public static synchronized JavaClasses tests() {
        if (tests == null) tests = importCodeSourceOf(AnalyzedClasses.class);
        return tests;
    }

    private static JavaClasses importCodeSourceOf(Class<?> anchor) {
        Path location;
        try {
            location = Paths.get(anchor.getProtectionDomain().getCodeSource().getLocation().toURI());
        } catch (URISyntaxException e) {
            throw new IllegalStateException("cannot resolve the code source of " + anchor.getName(), e);
        }
        return new ClassFileImporter().importPath(location);
    }
}
