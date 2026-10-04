package com.prasannjeet.klokka.place;

import static com.prasannjeet.klokka.error.KlokkaException.notFound;
import static com.prasannjeet.klokka.error.ProblemCode.MAPS_NOT_CONFIGURED;
import static com.prasannjeet.klokka.error.ProblemCode.MAPS_UNAVAILABLE;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.prasannjeet.klokka.auth.Access;
import com.prasannjeet.klokka.auth.WorkspaceAccess;
import com.prasannjeet.klokka.config.KlokkaConfig;
import com.prasannjeet.klokka.contract.model.JobLocation;
import com.prasannjeet.klokka.contract.model.PlaceSuggestion;
import com.prasannjeet.klokka.error.KlokkaException;
import com.prasannjeet.klokka.me.MeService;
import com.prasannjeet.klokka.persistence.JobEntity;
import com.prasannjeet.klokka.persistence.JobRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.ProcessingException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import java.io.File;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

// Job locations through Google Maps Platform (CHQ-156). The key stays here: clients search, pick and see maps through
// these operations only. Search, details, reverse geocoding and recent places are the employer's; the map image is
// any member's (the employee sees where their job is). Map images are kept on disk, so a card seen again costs
// Google nothing.
@ApplicationScoped
public class PlaceService {

    private static final Logger LOG = Logger.getLogger(PlaceService.class);
    private static final String DETAILS_FIELDS = "id,displayName,formattedAddress,location";
    private static final int MAP_ZOOM = 15;
    private static final int MAP_SCALE = 2;
    private static final String MARKER = "color:0xFF006E|";
    // The Nightshift palette for a dark map; the light map only hides points of interest.
    private static final List<String> DARK_STYLE = List.of(
            "element:geometry|color:0x1a1033",
            "element:labels.text.fill|color:0xb4a4e4",
            "element:labels.text.stroke|color:0x0d0620",
            "feature:road|element:geometry|color:0x3a2a6a",
            "feature:water|element:geometry|color:0x14304a",
            "feature:poi|visibility:off");
    private static final List<String> LIGHT_STYLE = List.of("feature:poi|visibility:off");

    @Inject
    WorkspaceAccess access;

    @Inject
    JobRepository jobs;

    @Inject
    MeService me;

    @Inject
    KlokkaConfig config;

    @Inject
    ObjectMapper mapper;

    @Inject
    @RestClient
    GooglePlacesApi places;

    @Inject
    @RestClient
    GoogleMapsApi maps;

    private final Path cacheDir = Path.of(System.getProperty("java.io.tmpdir"), "klokka-maps");

    @Transactional
    public List<PlaceSuggestion> autocomplete(UUID workspaceId, String input, UUID session) {
        Access a = access.employer(workspaceId);
        String key = key();
        ObjectNode body = mapper.createObjectNode().put("input", input.trim())
                .put("languageCode", me.languageOf(a.userId()).toString());
        if (session != null) body.put("sessionToken", session.toString());
        if (a.workspace().country != null) body.putArray("includedRegionCodes").add(a.workspace().country.toLowerCase());
        JsonNode response = call(() -> places.autocomplete(key, body), "autocomplete");
        List<PlaceSuggestion> out = new ArrayList<>();
        for (JsonNode s : response.path("suggestions")) {
            JsonNode p = s.path("placePrediction");
            if (p.isMissingNode() || p.path("placeId").asText().isEmpty()) continue;
            String main = p.path("structuredFormat").path("mainText").path("text").asText(p.path("text").path("text").asText());
            String secondary = p.path("structuredFormat").path("secondaryText").path("text").asText(null);
            out.add(new PlaceSuggestion().placeId(p.path("placeId").asText()).primaryText(main).secondaryText(secondary));
            if (out.size() == config.maps().suggestions()) break;
        }
        return out;
    }

    @Transactional
    public JobLocation place(UUID workspaceId, String placeId, UUID session) {
        Access a = access.employer(workspaceId);
        String key = key();
        JsonNode p = call(() -> places.details(key, DETAILS_FIELDS, placeId, session == null ? null : session.toString(),
                me.languageOf(a.userId()).toString()), "details");
        JsonNode location = p.path("location");
        if (location.isMissingNode()) throw notFound("Place " + placeId);
        String address = p.path("formattedAddress").asText(null);
        String name = p.path("displayName").path("text").asText(address == null ? placeId : address);
        return new JobLocation().placeId(p.path("id").asText(placeId)).name(clip(name, 200)).address(clip(address, 300))
                .latitude(coordinate(location.path("latitude").decimalValue()))
                .longitude(coordinate(location.path("longitude").decimalValue()));
    }

    @Transactional
    public JobLocation reverse(UUID workspaceId, BigDecimal latitude, BigDecimal longitude) {
        Access a = access.employer(workspaceId);
        String key = key();
        JsonNode response = call(() -> maps.reverse(latitude.toPlainString() + "," + longitude.toPlainString(),
                me.languageOf(a.userId()).toString(), key), "geocode");
        if (!"OK".equals(response.path("status").asText())) {
            if ("ZERO_RESULTS".equals(response.path("status").asText())) throw notFound("An address at that point");
            throw unavailable("geocode answered " + response.path("status").asText(), null);
        }
        JsonNode first = response.path("results").path(0);
        String address = first.path("formatted_address").asText();
        String name = address.contains(",") ? address.substring(0, address.indexOf(',')) : address;
        return new JobLocation().placeId(first.path("place_id").asText(null)).name(clip(name, 200)).address(clip(address, 300))
                .latitude(coordinate(latitude)).longitude(coordinate(longitude));
    }

    @Transactional
    public List<JobLocation> recent(UUID workspaceId) {
        Access a = access.employer(workspaceId);
        return jobs.recentPlaces(a.workspaceId(), config.maps().recentPlaces()).stream().map(PlaceService::location).toList();
    }

    @Transactional
    public File mapImage(UUID workspaceId, BigDecimal latitude, BigDecimal longitude, int width, int height, boolean dark) {
        access.member(workspaceId);
        String key = key();
        String center = coordinate(latitude).toPlainString() + "," + coordinate(longitude).toPlainString();
        Path file = cacheDir.resolve(hash(center + "|" + width + "x" + height + "|" + dark) + ".png");
        if (Files.isRegularFile(file)) return file.toFile();
        Response response;
        try {
            response = maps.staticMap(center, MAP_ZOOM, width + "x" + height, MAP_SCALE, MARKER + center,
                    dark ? DARK_STYLE : LIGHT_STYLE, key);
        } catch (ProcessingException | WebApplicationException e) {
            throw unavailable("static map call failed", e);
        }
        try (response) {
            if (response.getStatus() != 200) {
                String reason = response.hasEntity() ? response.readEntity(String.class) : "";
                throw unavailable("static map answered HTTP " + response.getStatus() + ": "
                        + reason.substring(0, Math.min(200, reason.length())), null);
            }
            byte[] png = response.readEntity(byte[].class);
            return store(file, png).toFile();
        }
    }

    static JobLocation location(JobEntity j) {
        return new JobLocation().placeId(j.placeId).name(j.placeName).address(j.placeAddress).latitude(j.latitude).longitude(j.longitude);
    }

    private String key() {
        return config.maps().apiKey().filter(k -> !k.isBlank())
                .orElseThrow(() -> new KlokkaException(MAPS_NOT_CONFIGURED, "This server has no Google Maps key; locations are off."));
    }

    private JsonNode call(java.util.function.Supplier<JsonNode> request, String what) {
        try {
            return request.get();
        } catch (WebApplicationException e) {
            int status = e.getResponse().getStatus();
            if (status == 404) throw notFound("That place");
            throw unavailable("Google " + what + " answered HTTP " + status, e);
        } catch (ProcessingException e) {
            throw unavailable("Google " + what + " did not answer", e);
        }
    }

    private static KlokkaException unavailable(String detail, Throwable cause) {
        LOG.warn("maps: " + detail, cause);
        return new KlokkaException(MAPS_UNAVAILABLE, "Maps did not answer. Try again in a moment.", cause);
    }

    // Five decimals is about a metre: the precision stored and the key the map cache uses.
    private static BigDecimal coordinate(BigDecimal value) {
        return value.setScale(5, RoundingMode.HALF_UP).stripTrailingZeros();
    }

    private static String clip(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }

    private Path store(Path file, byte[] png) {
        try {
            Files.createDirectories(cacheDir);
            Path tmp = Files.createTempFile(cacheDir, "map", ".tmp");
            Files.write(tmp, png);
            Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            evict();
            return file;
        } catch (IOException e) {
            throw new UncheckedIOException("could not cache a map image in " + cacheDir, e);
        }
    }

    // ponytail: lists the folder on every new image; fine for a few thousand files, an index if the cap grows.
    private void evict() throws IOException {
        int max = config.maps().imageCacheMax();
        try (Stream<Path> files = Files.list(cacheDir)) {
            List<Path> pngs = files.filter(p -> p.toString().endsWith(".png")).toList();
            if (pngs.size() <= max) return;
            List<Path> oldest = pngs.stream().sorted(Comparator.comparingLong(PlaceService::modified)).limit(pngs.size() - max).toList();
            for (Path p : oldest) Files.deleteIfExists(p);
        }
    }

    private static long modified(Path p) {
        try {
            return Files.getLastModifiedTime(p).toMillis();
        } catch (IOException e) {
            return 0;
        }
    }

    private static String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is missing from this JVM", e);
        }
    }
}
