package com.prasannjeet.klokka.error;

import jakarta.ws.rs.core.Response.Status;

// The stable machine code every error carries (RFC 9457 `code`). Mirrors the ProblemCode enum of the contract
// one to one; ProblemCodeTest fails the build if the two drift. Clients branch on the code, never on `detail`.
public enum ProblemCode {

    VALIDATION(400),
    UNAUTHENTICATED(401),
    FORBIDDEN(403),
    NOT_FOUND(404),
    CONFLICT(409),
    MONTH_LOCKED(409),
    MEMBER_NOT_ACTIVE(409),
    INVITATION_EXPIRED(410),
    INVITATION_EMAIL_MISMATCH(403),
    FLAG_ALREADY_OPEN(409),
    INVALID_SIGNATURE(401),
    NOT_IMPLEMENTED(501),
    INTERNAL(500);

    private final int status;

    ProblemCode(int status) {
        this.status = status;
    }

    public int status() {
        return status;
    }

    public String title() {
        Status known = Status.fromStatusCode(status);
        return known == null ? "Error" : known.getReasonPhrase();
    }

    public com.prasannjeet.klokka.contract.model.ProblemCode wire() {
        return com.prasannjeet.klokka.contract.model.ProblemCode.fromValue(name());
    }
}
