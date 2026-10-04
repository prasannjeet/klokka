package com.prasannjeet.klokka.place;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;

import com.prasannjeet.klokka.support.Fake;
import com.prasannjeet.klokka.support.FakeServers;
import com.prasannjeet.klokka.support.TestData;
import io.agroal.api.AgroalDataSource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// Places (CHQ-156): the API proxies Google with its own key, so no client ever holds one; maps are cached on disk.
@QuarkusTest
class PlaceResourceTest {

    private static final String NORA = "usr_place_nora";
    private static final String MARIA = "usr_place_maria";

    @Inject
    AgroalDataSource dataSource;

    TestData data;
    UUID ws;
    UUID maria;

    @BeforeEach
    void setUp() {
        data = new TestData(dataSource);
        Fake.reset();
        data.user(NORA, "nora@places.example", "Nora Lind");
        data.user(MARIA, "maria@places.example", "Maria Lind");
        ws = data.workspace("Places AB", "places-" + UUID.randomUUID().toString().substring(0, 8), false, "NONE", "Europe/Stockholm");
        data.run("update workspace set country = 'SE' where id = ?", ws);
        data.member(ws, NORA, "EMPLOYER", "Nora Lind", "nora@places.example", null, "ACTIVE");
        maria = data.member(ws, MARIA, "EMPLOYEE", "Maria Lind", "maria@places.example", null, "ACTIVE");
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void searchPickAndReverseGoThroughTheServerKey() {
        String session = UUID.randomUUID().toString();
        given().when().get("/v1/workspaces/" + ws + "/places/autocomplete?input=Kungsg&session=" + session).then().statusCode(200)
                .body("", hasSize(2)).body("[0].placeId", is("place-kungsgatan-12")).body("[0].primaryText", is("Kungsgatan 12"))
                .body("[0].secondaryText", is("Stockholm")).body("[1].primaryText", is("Kungsgatan 44, Stockholm"));
        given().when().get("/v1/workspaces/" + ws + "/places/place-kungsgatan-12?session=" + session).then().statusCode(200)
                .body("name", is("Café Nord")).body("address", is("Kungsgatan 12, 111 35 Stockholm"))
                .body("latitude", is(59.33459f)).body("longitude", is(18.06324f));
        given().when().get("/v1/workspaces/" + ws + "/places/reverse?latitude=59.31721&longitude=18.06302").then().statusCode(200)
                .body("name", is("Hornsgatan 40")).body("placeId", is("place-hornsgatan-40"));
        given().when().get("/v1/workspaces/" + ws + "/places/missing").then().statusCode(404);

        List<Map<String, Object>> requests = Fake.list("placesRequests");
        assertThat(requests.get(0)).containsEntry("key", FakeServers.MAPS_KEY).containsEntry("sessionToken", session)
                .containsEntry("includedRegionCodes", List.of("se"));
        assertThat(requests.get(1)).containsEntry("key", FakeServers.MAPS_KEY).containsEntry("fieldMask", "id,displayName,formattedAddress,location");
    }

    @Test
    @TestSecurity(user = NORA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = NORA)})
    void recentPlacesAreDistinctAndNewestFirst() {
        String jobs = "/v1/workspaces/" + ws + "/members/" + maria + "/entries/";
        String cafe = "{\"hours\":2,\"location\":{\"placeId\":\"p-cafe\",\"name\":\"Café Nord\",\"latitude\":59.3,\"longitude\":18.0}}";
        String store = "{\"hours\":2,\"location\":{\"placeId\":\"p-store\",\"name\":\"Lager\",\"latitude\":59.31,\"longitude\":18.01}}";
        given().contentType("application/json").body(cafe).when().post(jobs + "2026-09-21/jobs").then().statusCode(201);
        given().contentType("application/json").body(store).when().post(jobs + "2026-09-22/jobs").then().statusCode(201);
        given().contentType("application/json").body(cafe).when().post(jobs + "2026-09-23/jobs").then().statusCode(201);
        given().when().get("/v1/workspaces/" + ws + "/places/recent").then().statusCode(200)
                .body("", hasSize(2)).body("[0].name", is("Café Nord")).body("[1].name", is("Lager"));
    }

    @Test
    @TestSecurity(user = MARIA)
    @OidcSecurity(claims = {@Claim(key = "sub", value = MARIA)})
    void anEmployeeSeesTheMapCachedButCannotSearch() {
        // A fresh point per run: the map cache lives on disk across runs.
        String lat = String.format(java.util.Locale.ROOT, "59.%05d", new java.util.Random().nextInt(100000));
        String url = "/v1/workspaces/" + ws + "/map.png?latitude=" + lat + "&longitude=18.06324&width=360&height=120&dark=true";
        byte[] png = given().when().get(url).then().statusCode(200).contentType("image/png")
                .header("Cache-Control", "private, max-age=604800, immutable").extract().asByteArray();
        assertThat(png).isEqualTo(FakeServers.PNG);
        given().when().get(url).then().statusCode(200);
        List<String> maps = Fake.list("mapsRequests");
        assertThat(maps).hasSize(1);
        assertThat(maps.get(0)).contains("center=" + new java.math.BigDecimal(lat).stripTrailingZeros().toPlainString() + ",18.06324").contains("scale=2").contains("key=" + FakeServers.MAPS_KEY);

        // Google refusing (Static API not enabled) is a typed problem, not a broken image.
        given().when().get("/v1/workspaces/" + ws + "/map.png?latitude=" + FakeServers.MAP_REFUSED_LATITUDE + "&longitude=18&width=360&height=120")
                .then().statusCode(502).body("code", is("MAPS_UNAVAILABLE"));
        given().when().get("/v1/workspaces/" + ws + "/places/autocomplete?input=Kungsg").then().statusCode(403);
    }
}
