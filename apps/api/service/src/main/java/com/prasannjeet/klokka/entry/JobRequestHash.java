package com.prasannjeet.klokka.entry;

import static java.nio.charset.StandardCharsets.UTF_8;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.prasannjeet.klokka.contract.model.JobWrite;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

// The retry key's fingerprint of a recurring create (CHQ-162): SHA-256 hex of the body as canonical JSON. Its own
// mapper, so a change to the application's Jackson settings cannot change the hash. Sets serialize in iteration
// order, so callers put the weekdays in their canonical (Monday first) order before hashing.
final class JobRequestHash {

    private static final ObjectMapper CANONICAL = JsonMapper.builder()
            .addModule(new JavaTimeModule())
            .enable(MapperFeature.SORT_PROPERTIES_ALPHABETICALLY)
            .enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS)
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .build();

    private JobRequestHash() {}

    static String of(JobWrite body) {
        try {
            byte[] json = CANONICAL.writeValueAsString(body).getBytes(UTF_8);
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json));
        } catch (JsonProcessingException | NoSuchAlgorithmException e) {
            throw new IllegalStateException("cannot fingerprint a recurring job request", e);
        }
    }
}
