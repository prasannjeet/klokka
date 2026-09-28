package com.prasannjeet.klokka.support;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;
import org.eclipse.microprofile.config.ConfigProvider;

// The test-side view of FakeServers: what Logto and Expo were asked, and a way to register fake Logto users.
public final class Fake {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final HttpClient HTTP = HttpClient.newHttpClient();

    private Fake() {}

    public static String baseUrl() {
        return ConfigProvider.getConfig().getValue("test.fake.base-url", String.class);
    }

    public static Map<String, Object> state() {
        try {
            HttpResponse<String> response = HTTP.send(HttpRequest.newBuilder(URI.create(baseUrl() + "/__state")).GET().build(),
                    HttpResponse.BodyHandlers.ofString());
            return JSON.readValue(response.body(), new TypeReference<>() {});
        } catch (IOException | InterruptedException e) {
            throw new IllegalStateException(e);
        }
    }

    @SuppressWarnings("unchecked")
    public static <T> List<T> list(String key) {
        return (List<T>) state().get(key);
    }

    public static void reset() {
        post("/__reset", "");
    }

    public static void user(String id, String email, String name) {
        try {
            post("/__users", JSON.writeValueAsString(Map.of("id", id, "email", email, "name", name)));
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    private static void post(String path, String body) {
        try {
            HTTP.send(HttpRequest.newBuilder(URI.create(baseUrl() + path)).POST(HttpRequest.BodyPublishers.ofString(body)).build(),
                    HttpResponse.BodyHandlers.discarding());
        } catch (IOException | InterruptedException e) {
            throw new IllegalStateException(e);
        }
    }
}
