package com.prasannjeet.klokka.auth;

import static com.prasannjeet.klokka.error.ProblemCode.UNAUTHENTICATED;

import com.prasannjeet.klokka.error.KlokkaException;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import java.util.Optional;
import org.eclipse.microprofile.jwt.Claims;
import org.eclipse.microprofile.jwt.JsonWebToken;

// The signed-in user as the token describes them: the Logto user id (`sub`), whatever profile claims the token
// carries, and whether the global platform-admin role is present. What the user may do inside a workspace is
// never read from here; that is the membership table's job (docs/DECISIONS.md D1).
@RequestScoped
public class CurrentUser {

    public static final String PLATFORM_ADMIN = "platform-admin";

    @Inject
    SecurityIdentity identity;

    public String id() {
        if (identity.isAnonymous()) throw new KlokkaException(UNAUTHENTICATED, "No signed-in user.");
        if (identity.getPrincipal() instanceof JsonWebToken jwt) {
            String sub = jwt.getClaim(Claims.sub.name());
            if (sub != null && !sub.isBlank()) return sub;
        }
        return identity.getPrincipal().getName();
    }

    public Optional<String> email() {
        return claim("email").map(String::toLowerCase);
    }

    public Optional<String> name() {
        return claim("name");
    }

    public boolean platformAdmin() {
        return identity.hasRole(PLATFORM_ADMIN);
    }

    private Optional<String> claim(String name) {
        if (!(identity.getPrincipal() instanceof JsonWebToken jwt)) return Optional.empty();
        Object value = jwt.getClaim(name);
        if (!(value instanceof String s) || s.isBlank()) return Optional.empty();
        return Optional.of(s);
    }
}
