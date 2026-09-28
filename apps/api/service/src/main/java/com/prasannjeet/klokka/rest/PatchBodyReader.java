package com.prasannjeet.klokka.rest;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.exc.MismatchedInputException;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.ext.Provider;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Type;
import java.util.HashSet;
import java.util.Set;
import org.jboss.resteasy.reactive.server.spi.ResteasyReactiveResourceInfo;
import org.jboss.resteasy.reactive.server.spi.ServerMessageBodyReader;
import org.jboss.resteasy.reactive.server.spi.ServerRequestContext;

// Reads every contract `*Update` body through a JSON tree first, so the service can ask JsonFieldPresence which
// properties were sent, then maps it with the same ObjectMapper Quarkus uses (validation runs afterwards as usual).
@Provider
@Consumes(MediaType.APPLICATION_JSON)
public class PatchBodyReader implements ServerMessageBodyReader<Object> {

    private static final String MODEL_PACKAGE = "com.prasannjeet.klokka.contract.model";

    @Inject
    ObjectMapper mapper;

    @Inject
    JsonFieldPresence presence;

    @Override
    public boolean isReadable(Class<?> type, Type genericType, ResteasyReactiveResourceInfo target, MediaType mediaType) {
        return type.getPackageName().equals(MODEL_PACKAGE) && type.getSimpleName().endsWith("Update");
    }

    @Override
    public Object readFrom(Class<Object> type, Type genericType, MediaType mediaType, ServerRequestContext context)
            throws WebApplicationException, IOException {
        try (InputStream in = context.getInputStream()) {
            JsonNode tree = mapper.readTree(in);
            if (tree == null || tree.isMissingNode()) {
                throw MismatchedInputException.from(mapper.createParser(""), type, "The request body is empty.");
            }
            Set<String> names = new HashSet<>();
            tree.fieldNames().forEachRemaining(names::add);
            presence.record(names);
            return mapper.treeToValue(tree, type);
        }
    }

    @Override
    public boolean isReadable(Class<?> type, Type genericType, java.lang.annotation.Annotation[] annotations, MediaType mediaType) {
        return isReadable(type, genericType, (ResteasyReactiveResourceInfo) null, mediaType);
    }

    @Override
    public Object readFrom(Class<Object> type, Type genericType, java.lang.annotation.Annotation[] annotations, MediaType mediaType,
            jakarta.ws.rs.core.MultivaluedMap<String, String> httpHeaders, InputStream entityStream) throws IOException {
        throw new UnsupportedOperationException("only the server-side reader is used");
    }
}
