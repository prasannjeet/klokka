package com.prasannjeet.klokka.place;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

// Google Places API (New): https://developers.google.com/maps/documentation/places/web-service/op-overview. The
// key travels in a header, never in a URL that could be logged.
@RegisterRestClient(configKey = "google-places")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public interface GooglePlacesApi {

    @POST
    @Path("/v1/places:autocomplete")
    JsonNode autocomplete(@HeaderParam("X-Goog-Api-Key") String key, JsonNode body);

    @GET
    @Path("/v1/places/{placeId}")
    JsonNode details(@HeaderParam("X-Goog-Api-Key") String key, @HeaderParam("X-Goog-FieldMask") String fieldMask,
            @PathParam("placeId") String placeId, @QueryParam("sessionToken") String sessionToken,
            @QueryParam("languageCode") String languageCode);
}
