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
import java.util.Map;
import java.util.UUID;

// The retry key's fingerprint of a recurring create (CHQ-162) or a schedule change (CHQ-187): SHA-256 hex of the body
// as canonical JSON. Its own mapper, so a change to the application's Jackson settings cannot change the hash. Sets
// serialize in iteration order, so callers put the weekdays in their canonical (Monday first) order before hashing.
final class JobRequestHash {

    private static final ObjectMapper CANONICAL = JsonMapper.builder()
            .addModule(new JavaTimeModule())
            .enable(MapperFeature.SORT_PROPERTIES_ALPHABETICALLY)
            .enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS)
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .build();

    private JobRequestHash() {}

    static String of(JobWrite body) {
        return hash(body);
    }

    // A schedule change also names the job it was sent for, so one key cannot replay against another job (and a
    // creation's key never matches a schedule change). A title left out keeps the series' title while null clears
    // it, so the two are different requests. A creation needs no such mark: there both mean no title.
    static String ofScheduleChange(UUID jobId, JobWrite body, boolean titleSent) {
        return hash(titleSent ? Map.of("jobId", jobId, "body", body) : Map.of("jobId", jobId, "body", body, "titleLeftOut", true));
    }

    private static String hash(Object value) {
        try {
            byte[] json = CANONICAL.writeValueAsString(value).getBytes(UTF_8);
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json));
        } catch (JsonProcessingException | NoSuchAlgorithmException e) {
            throw new IllegalStateException("cannot fingerprint a recurring job request", e);
        }
    }
}
