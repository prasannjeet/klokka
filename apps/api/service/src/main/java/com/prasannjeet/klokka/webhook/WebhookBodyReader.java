package com.prasannjeet.klokka.webhook;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prasannjeet.klokka.contract.model.LogtoWebhookEvent;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.ext.Provider;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Type;
import org.jboss.resteasy.reactive.server.spi.ResteasyReactiveResourceInfo;
import org.jboss.resteasy.reactive.server.spi.ServerMessageBodyReader;
import org.jboss.resteasy.reactive.server.spi.ServerRequestContext;

// Reads the Logto webhook body as raw bytes (kept for the HMAC check) and then as the contract model.
@Provider
@Consumes(MediaType.APPLICATION_JSON)
public class WebhookBodyReader implements ServerMessageBodyReader<LogtoWebhookEvent> {

    @Inject
    ObjectMapper mapper;

    @Inject
    WebhookRawBody rawBody;

    @Override
    public boolean isReadable(Class<?> type, Type genericType, ResteasyReactiveResourceInfo target, MediaType mediaType) {
        return LogtoWebhookEvent.class.equals(type);
    }

    @Override
    public LogtoWebhookEvent readFrom(Class<LogtoWebhookEvent> type, Type genericType, MediaType mediaType,
            ServerRequestContext context) throws WebApplicationException, IOException {
        try (InputStream in = context.getInputStream()) {
            byte[] bytes = in.readAllBytes();
            rawBody.set(bytes);
            return mapper.readValue(bytes, LogtoWebhookEvent.class);
        }
    }

    @Override
    public boolean isReadable(Class<?> type, Type genericType, java.lang.annotation.Annotation[] annotations, MediaType mediaType) {
        return LogtoWebhookEvent.class.equals(type);
    }

    @Override
    public LogtoWebhookEvent readFrom(Class<LogtoWebhookEvent> type, Type genericType, java.lang.annotation.Annotation[] annotations,
            MediaType mediaType, jakarta.ws.rs.core.MultivaluedMap<String, String> httpHeaders, InputStream entityStream)
            throws IOException {
        throw new UnsupportedOperationException("only the server-side reader is used");
    }
}
