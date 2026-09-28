package com.prasannjeet.klokka.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import io.quarkus.test.common.QuarkusTestResourceLifecycleManager;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

// A fake Logto (token endpoint + the Management API slice Klokka uses) and a fake Expo push service on one JDK
// HttpServer. Recorded calls are exposed at GET /__state (and cleared with POST /__reset) so tests read them
// over HTTP, independent of the class loader the test runs in. Applies to every @QuarkusTest.
public class FakeServers implements QuarkusTestResourceLifecycleManager {

    public static final String SIGNING_KEY = "test-signing-key";
    public static final String DEAD_TOKEN = "ExponentPushToken[dead]";
    public static final String DUPLICATE_ORG_MARKER = "DUPLICATE-ORG";
    public static final String FAIL_ORG_MARKER = "FAIL-ORG";
    public static final String FAIL_INVITE_MARKER = "fail-invite@";

    private static final ObjectMapper JSON = new ObjectMapper();
    private HttpServer server;

    private final AtomicInteger counter = new AtomicInteger();
    private final Map<String, Object> state = new LinkedHashMap<>();
    private final Map<String, Map<String, String>> users = new LinkedHashMap<>();

    @Override
    public Map<String, String> start() {
        try {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
        reset();
        server.createContext("/", this::handle);
        server.start();
        String base = "http://127.0.0.1:" + server.getAddress().getPort();
        Map<String, String> config = new LinkedHashMap<>();
        config.put("quarkus.oidc-client.token-path", base + "/oidc/token");
        config.put("quarkus.rest-client.logto.url", base + "/api");
        config.put("quarkus.rest-client.expo.url", base + "/expo");
        config.put("klokka.logto.endpoint", base);
        config.put("klokka.logto.webhook-signing-key", SIGNING_KEY);
        config.put("test.fake.base-url", base);
        config.put("klokka.mail.monthly-quota", "100");
        config.put("klokka.web-base-url", "https://app.klokka.test");
        config.put("klokka.operator.probe-timeout", "PT1S");
        return config;
    }

    @Override
    public void stop() {
        if (server != null) server.stop(0);
    }

    @SuppressWarnings("unchecked")
    private synchronized void reset() {
        state.clear();
        state.put("tokenRequests", 0);
        state.put("createdOrganizations", new ArrayList<Map<String, Object>>());
        state.put("deletedOrganizations", new ArrayList<String>());
        state.put("addedUsers", new ArrayList<Map<String, Object>>());
        state.put("assignedRoles", new ArrayList<Map<String, Object>>());
        state.put("removedUsers", new ArrayList<Map<String, Object>>());
        state.put("invitations", new ArrayList<Map<String, Object>>());
        state.put("invitationStatusUpdates", new ArrayList<Map<String, Object>>());
        state.put("deletedInvitations", new ArrayList<String>());
        state.put("pushSends", new ArrayList<List<Map<String, Object>>>());
        state.put("receiptRequests", new ArrayList<List<String>>());
        state.put("listOrganizationsCalls", 0);
        state.put("managementAuthorizations", new ArrayList<String>());
        state.put("expoAuthorizations", new ArrayList<String>());
        users.clear();
    }

    @SuppressWarnings("unchecked")
    private <T> List<T> list(String key) {
        return (List<T>) state.get(key);
    }

    private synchronized void handle(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();
        String path = exchange.getRequestURI().getPath();
        byte[] body = exchange.getRequestBody().readAllBytes();
        try {
            if (path.equals("/__state") && method.equals("GET")) {
                respond(exchange, 200, JSON.writeValueAsString(state));
            } else if (path.equals("/__reset")) {
                reset();
                respond(exchange, 204, null);
            } else if (path.equals("/__users")) {
                Map<String, String> user = JSON.readValue(body, Map.class);
                users.put(user.get("id"), user);
                respond(exchange, 204, null);
            } else if (path.equals("/oidc/token")) {
                state.put("tokenRequests", (int) state.get("tokenRequests") + 1);
                respond(exchange, 200, "{\"access_token\":\"fake-m2m-token\",\"token_type\":\"Bearer\",\"expires_in\":3600}");
            } else if (path.startsWith("/api/")) {
                this.<String>list("managementAuthorizations").add(exchange.getRequestHeaders().getFirst("Authorization"));
                management(exchange, method, path.substring(4), body);
            } else if (path.startsWith("/expo/")) {
                this.<String>list("expoAuthorizations").add(exchange.getRequestHeaders().getFirst("Authorization"));
                expo(exchange, path.substring(5), body);
            } else {
                respond(exchange, 404, "{\"message\":\"no route " + path + "\"}");
            }
        } catch (RuntimeException e) {
            respond(exchange, 500, "{\"message\":\"" + e.getMessage() + "\"}");
        }
    }

    @SuppressWarnings("unchecked")
    private void management(HttpExchange exchange, String method, String path, byte[] body) throws IOException {
        if (!"Bearer fake-m2m-token".equals(exchange.getRequestHeaders().getFirst("Authorization"))) {
            respond(exchange, 401, "{\"message\":\"no bearer\"}");
            return;
        }
        if (path.equals("/organizations") && method.equals("GET")) {
            state.put("listOrganizationsCalls", (int) state.get("listOrganizationsCalls") + 1);
            respond(exchange, 200, "[]");
        } else if (path.equals("/organizations") && method.equals("POST")) {
            Map<String, Object> request = JSON.readValue(body, Map.class);
            String name = String.valueOf(request.get("name"));
            if (name.contains(FAIL_ORG_MARKER)) {
                respond(exchange, 422, "{\"message\":\"organization name rejected\"}");
                return;
            }
            String id = name.contains(DUPLICATE_ORG_MARKER) ? "org_duplicate" : "org_" + counter.incrementAndGet();
            request.put("id", id);
            this.<Map<String, Object>>list("createdOrganizations").add(request);
            respond(exchange, 201, JSON.writeValueAsString(Map.of("id", id, "name", name)));
        } else if (path.matches("/organizations/[^/]+") && method.equals("DELETE")) {
            this.<String>list("deletedOrganizations").add(path.substring("/organizations/".length()));
            respond(exchange, 204, null);
        } else if (path.matches("/organizations/[^/]+/users") && method.equals("POST")) {
            Map<String, Object> request = JSON.readValue(body, Map.class);
            request.put("organizationId", path.split("/")[2]);
            this.<Map<String, Object>>list("addedUsers").add(request);
            respond(exchange, 201, null);
        } else if (path.matches("/organizations/[^/]+/users/[^/]+/roles") && method.equals("POST")) {
            Map<String, Object> request = JSON.readValue(body, Map.class);
            request.put("organizationId", path.split("/")[2]);
            request.put("userId", path.split("/")[4]);
            this.<Map<String, Object>>list("assignedRoles").add(request);
            respond(exchange, 201, null);
        } else if (path.matches("/organizations/[^/]+/users/[^/]+") && method.equals("DELETE")) {
            this.<Map<String, Object>>list("removedUsers").add(Map.of("organizationId", path.split("/")[2], "userId", path.split("/")[4]));
            respond(exchange, 204, null);
        } else if (path.equals("/organization-invitations") && method.equals("POST")) {
            Map<String, Object> request = JSON.readValue(body, Map.class);
            if (String.valueOf(request.get("invitee")).startsWith(FAIL_INVITE_MARKER)) {
                respond(exchange, 422, "{\"message\":\"invitee rejected\"}");
                return;
            }
            String id = "inv_" + counter.incrementAndGet();
            request.put("id", id);
            this.<Map<String, Object>>list("invitations").add(request);
            respond(exchange, 201, JSON.writeValueAsString(Map.of("id", id, "organizationId", request.get("organizationId"),
                    "invitee", request.get("invitee"), "status", "Pending", "expiresAt", request.get("expiresAt"))));
        } else if (path.matches("/organization-invitations/[^/]+/status") && method.equals("PUT")) {
            Map<String, Object> request = JSON.readValue(body, Map.class);
            String id = path.split("/")[2];
            request.put("id", id);
            this.<Map<String, Object>>list("invitationStatusUpdates").add(request);
            respond(exchange, 200, JSON.writeValueAsString(Map.of("id", id, "status", request.get("status"),
                    "acceptedUserId", request.get("acceptedUserId"))));
        } else if (path.matches("/organization-invitations/[^/]+") && method.equals("DELETE")) {
            this.<String>list("deletedInvitations").add(path.split("/")[2]);
            respond(exchange, 204, null);
        } else if (path.matches("/users/[^/]+") && method.equals("GET")) {
            Map<String, String> user = users.get(path.split("/")[2]);
            if (user == null) respond(exchange, 404, "{\"message\":\"user not found\"}");
            else respond(exchange, 200, JSON.writeValueAsString(Map.of("id", user.get("id"), "primaryEmail", user.get("email"),
                    "name", user.getOrDefault("name", ""))));
        } else {
            respond(exchange, 404, "{\"message\":\"fake logto has no " + method + " " + path + "\"}");
        }
    }

    @SuppressWarnings("unchecked")
    private void expo(HttpExchange exchange, String path, byte[] body) throws IOException {
        if (path.equals("/push/send")) {
            List<Map<String, Object>> messages = JSON.readValue(body, List.class);
            this.<List<Map<String, Object>>>list("pushSends").add(messages);
            List<Map<String, Object>> tickets = new ArrayList<>();
            for (Map<String, Object> m : messages) {
                if (DEAD_TOKEN.equals(m.get("to"))) {
                    tickets.add(Map.of("status", "error", "message", "not registered", "details", Map.of("error", "DeviceNotRegistered")));
                } else {
                    tickets.add(Map.of("status", "ok", "id", "ticket-" + counter.incrementAndGet() + "-" + m.get("to")));
                }
            }
            respond(exchange, 200, JSON.writeValueAsString(Map.of("data", tickets)));
        } else if (path.equals("/push/getReceipts")) {
            Map<String, List<String>> request = JSON.readValue(body, Map.class);
            List<String> ids = request.get("ids");
            this.<List<String>>list("receiptRequests").add(ids);
            Map<String, Object> data = new LinkedHashMap<>();
            for (String id : ids) {
                if (id.endsWith("gone]")) data.put(id, Map.of("status", "error", "details", Map.of("error", "DeviceNotRegistered")));
                else if (!id.endsWith("pending]")) data.put(id, Map.of("status", "ok"));
            }
            respond(exchange, 200, JSON.writeValueAsString(Map.of("data", data)));
        } else {
            respond(exchange, 404, "{\"message\":\"fake expo has no " + path + "\"}");
        }
    }

    private static void respond(HttpExchange exchange, int status, String json) throws IOException {
        if (json == null) {
            exchange.sendResponseHeaders(status, -1);
            exchange.close();
            return;
        }
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream out = exchange.getResponseBody()) {
            out.write(bytes);
        }
    }
}
