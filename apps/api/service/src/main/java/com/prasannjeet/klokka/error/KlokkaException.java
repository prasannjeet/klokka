package com.prasannjeet.klokka.error;

import com.prasannjeet.klokka.contract.model.FieldError;
import java.util.List;

// The one exception type that crosses into REST: a ProblemCode, a developer-facing detail, optional field errors.
// ProblemMapper turns it into application/problem+json. Causes are preserved, never swallowed.
public class KlokkaException extends RuntimeException {

    private final ProblemCode code;
    private final List<FieldError> errors;

    public KlokkaException(ProblemCode code, String detail) {
        this(code, detail, List.of(), null);
    }

    public KlokkaException(ProblemCode code, String detail, Throwable cause) {
        this(code, detail, List.of(), cause);
    }

    public KlokkaException(ProblemCode code, String detail, List<FieldError> errors, Throwable cause) {
        super(detail, cause);
        this.code = code;
        this.errors = List.copyOf(errors);
    }

    public ProblemCode code() {
        return code;
    }

    public List<FieldError> errors() {
        return errors;
    }

    public static KlokkaException notImplemented(String operationId) {
        return new KlokkaException(ProblemCode.NOT_IMPLEMENTED, operationId + " is not implemented yet.");
    }

    public static KlokkaException notFound(String what) {
        return new KlokkaException(ProblemCode.NOT_FOUND, what + " was not found.");
    }

    public static KlokkaException forbidden(String detail) {
        return new KlokkaException(ProblemCode.FORBIDDEN, detail);
    }

    public static KlokkaException validation(String field, String message) {
        return new KlokkaException(ProblemCode.VALIDATION, field + ": " + message,
                List.of(new FieldError().field(field).message(message)), null);
    }
}
