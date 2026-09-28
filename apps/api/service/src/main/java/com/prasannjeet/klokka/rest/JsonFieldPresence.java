package com.prasannjeet.klokka.rest;

import jakarta.enterprise.context.RequestScoped;
import java.util.Set;

// Which top-level properties the request body actually carried. PATCH bodies distinguish "absent, leave it" from
// "null, clear it" (MemberUpdate.hourlyRate); Jackson gives both as null, so PatchBodyReader records the names.
@RequestScoped
public class JsonFieldPresence {

    private Set<String> present = Set.of();

    void record(Set<String> names) {
        present = Set.copyOf(names);
    }

    public boolean sent(String field) {
        return present.contains(field);
    }
}
