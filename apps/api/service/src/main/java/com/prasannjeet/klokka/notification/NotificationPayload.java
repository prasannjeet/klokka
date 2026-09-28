package com.prasannjeet.klokka.notification;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.Map;

// The jsonb payload of a notification row as a mutable map, read and written through the one ObjectMapper.
public final class NotificationPayload {

    private static final TypeReference<LinkedHashMap<String, Object>> MAP = new TypeReference<>() {};

    private NotificationPayload() {}

    public static Map<String, Object> read(ObjectMapper mapper, String json) {
        try {
            return json == null ? new LinkedHashMap<>() : mapper.readValue(json, MAP);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("notification payload is not valid JSON", e);
        }
    }

    public static String write(ObjectMapper mapper, Map<String, Object> payload) {
        try {
            return mapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("notification payload cannot be serialized", e);
        }
    }
}
