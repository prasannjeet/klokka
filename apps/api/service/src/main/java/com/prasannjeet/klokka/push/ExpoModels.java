package com.prasannjeet.klokka.push;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.Map;

// Expo push request and response shapes; unknown fields are ignored on the way in.
public final class ExpoModels {

    private ExpoModels() {}

    public static final String DEVICE_NOT_REGISTERED = "DeviceNotRegistered";

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Message(String to, String title, String body, Map<String, Object> data, String sound, String channelId,
            String priority) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Ticket(String status, String id, String message, Details details) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Details(String error) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SendResponse(List<Ticket> data) {}

    public record ReceiptsRequest(List<String> ids) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Receipt(String status, String message, Details details) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ReceiptsResponse(Map<String, Receipt> data) {}
}
