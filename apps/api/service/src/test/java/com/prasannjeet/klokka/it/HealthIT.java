package com.prasannjeet.klokka.it;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;

import io.quarkus.test.junit.QuarkusIntegrationTest;
import org.junit.jupiter.api.Test;

// The packaged fast-jar boots against a Dev Services Postgres, migrates, serves the contract and guards /v1.
@QuarkusIntegrationTest
class HealthIT {

    @Test
    void theJarIsReadyServesTheContractAndGuardsTheApi() {
        given().when().get("/q/health/ready").then().statusCode(200).body("status", is("UP"));
        given().when().get("/q/openapi").then().statusCode(200);
        given().when().get("/v1/me").then().statusCode(401);
        given().when().get("/v1/invitations/inv_000000000000000000000000deadbeef").then().statusCode(404).body("code", is("NOT_FOUND"));
    }
}
