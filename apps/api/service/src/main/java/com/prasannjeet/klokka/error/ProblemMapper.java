package com.prasannjeet.klokka.error;

import static com.prasannjeet.klokka.error.ProblemCode.FORBIDDEN;
import static com.prasannjeet.klokka.error.ProblemCode.INTERNAL;
import static com.prasannjeet.klokka.error.ProblemCode.NOT_FOUND;
import static com.prasannjeet.klokka.error.ProblemCode.UNAUTHENTICATED;
import static com.prasannjeet.klokka.error.ProblemCode.VALIDATION;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.MismatchedInputException;
import com.prasannjeet.klokka.contract.model.FieldError;
import com.prasannjeet.klokka.contract.model.Problem;
import io.quarkus.hibernate.validator.runtime.jaxrs.ResteasyReactiveViolationException;
import io.quarkus.security.AuthenticationFailedException;
import io.quarkus.security.ForbiddenException;
import io.quarkus.security.UnauthorizedException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;
import java.net.URI;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import org.jboss.logging.Logger;
import org.jboss.resteasy.reactive.server.ServerExceptionMapper;

// The ONE REST error seam: every exception becomes RFC 9457 application/problem+json with a stable `code`.
// Specific mappers first (they beat Quarkus's built-in ones for the same types), then the INTERNAL catch-all
// which logs the cause and leaks nothing. The 401 for a missing bearer is issued by the HTTP layer before any
// resource runs and therefore has no body; everything after authentication comes through here.
public class ProblemMapper {

    private static final Logger LOG = Logger.getLogger(ProblemMapper.class);
    private static final URI BLANK = URI.create("about:blank");
    private static final String MEDIA_TYPE = "application/problem+json";

    @ServerExceptionMapper
    public Response klokka(KlokkaException e, UriInfo uriInfo) {
        if (e.code() == INTERNAL) LOG.error("internal failure surfaced to REST", e);
        return problem(e.code(), e.getMessage(), e.errors(), uriInfo);
    }

    // Quarkus registers its own mapper for this exact subclass (the ViolationReport shape); mapping the exact type
    // here is what makes a @Valid body failure come out as a Problem like every other error.
    @ServerExceptionMapper
    public Response restValidation(ResteasyReactiveViolationException e, UriInfo uriInfo) {
        return validation(e, uriInfo);
    }

    @ServerExceptionMapper
    public Response validation(ConstraintViolationException e, UriInfo uriInfo) {
        List<FieldError> errors = e.getConstraintViolations().stream().map(ProblemMapper::fieldError).toList();
        return problem(VALIDATION, "Validation failed for " + errors.size() + " field(s).", errors, uriInfo);
    }

    // A body that does not fit the schema (a missing required property, a wrong type) fails in Jackson before bean
    // validation runs; Quarkus's own mapper for it answers with a different shape, so map the exact type here.
    @ServerExceptionMapper
    public Response malformedBody(MismatchedInputException e, UriInfo uriInfo) {
        String field = e.getPath().stream()
                .map(JsonMappingException.Reference::getFieldName)
                .filter(Objects::nonNull)
                .collect(Collectors.joining("."));
        List<FieldError> errors = field.isEmpty()
                ? List.of()
                : List.of(new FieldError().field(field).message("missing or of the wrong type"));
        return problem(VALIDATION, "The request body does not match the schema.", errors, uriInfo);
    }

    @ServerExceptionMapper
    public Response malformedJson(JsonProcessingException e, UriInfo uriInfo) {
        return problem(VALIDATION, "The request body is not valid JSON.", List.of(), uriInfo);
    }

    @ServerExceptionMapper
    public Response unauthenticated(UnauthorizedException e, UriInfo uriInfo) {
        return problem(UNAUTHENTICATED, "A valid bearer token for the Klokka API is required.", List.of(), uriInfo);
    }

    @ServerExceptionMapper
    public Response authenticationFailed(AuthenticationFailedException e, UriInfo uriInfo) {
        return problem(UNAUTHENTICATED, "The bearer token was rejected.", List.of(), uriInfo);
    }

    @ServerExceptionMapper
    public Response forbidden(ForbiddenException e, UriInfo uriInfo) {
        return problem(FORBIDDEN, "You may not do that.", List.of(), uriInfo);
    }

    @ServerExceptionMapper
    public Response notFound(NotFoundException e, UriInfo uriInfo) {
        return problem(NOT_FOUND, "No such route or resource.", List.of(), uriInfo);
    }

    @ServerExceptionMapper
    public Response webApplication(WebApplicationException e, UriInfo uriInfo) {
        int status = e.getResponse().getStatus();
        if (status >= 500) {
            LOG.error("framework 5xx surfaced to REST", e);
            return problem(INTERNAL, "An internal error occurred.", List.of(), uriInfo);
        }
        // Any other framework 4xx (415, 405, malformed JSON) is the client's request being wrong.
        return problem(VALIDATION, e.getMessage() == null ? "The request is not valid." : e.getMessage(), List.of(),
                uriInfo);
    }

    @ServerExceptionMapper
    public Response unexpected(Throwable t, UriInfo uriInfo) {
        LOG.error("unmapped exception surfaced to REST", t);
        return problem(INTERNAL, "An internal error occurred.", List.of(), uriInfo);
    }

    private static FieldError fieldError(ConstraintViolation<?> violation) {
        String path = violation.getPropertyPath().toString();
        // Strip the method and parameter names the validator prefixes ("getMe.arg0.token" -> "token").
        int dot = path.lastIndexOf('.');
        String field = dot >= 0 ? path.substring(dot + 1) : path;
        return new FieldError().field(field).message(violation.getMessage());
    }

    private static Response problem(ProblemCode code, String detail, List<FieldError> errors, UriInfo uriInfo) {
        Problem body = new Problem()
                .type(BLANK)
                .title(code.title())
                .status(code.status())
                .detail(detail)
                .instance(uriInfo == null ? null : uriInfo.getPath())
                .code(code.wire());
        if (!errors.isEmpty()) body.errors(errors);
        return Response.status(code.status()).type(MEDIA_TYPE).entity(body).build();
    }
}
