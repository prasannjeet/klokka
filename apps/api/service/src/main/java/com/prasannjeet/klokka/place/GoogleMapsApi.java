package com.prasannjeet.klokka.place;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

// The classic Maps hosts: Geocoding (reverse) and the Static Maps API. These take the key as a query parameter.
@RegisterRestClient(configKey = "google-maps")
public interface GoogleMapsApi {

    @GET
    @Path("/maps/api/geocode/json")
    @Produces(MediaType.APPLICATION_JSON)
    JsonNode reverse(@QueryParam("latlng") String latlng, @QueryParam("language") String language, @QueryParam("key") String key);

    @GET
    @Path("/maps/api/staticmap")
    @Produces("image/png")
    Response staticMap(@QueryParam("center") String center, @QueryParam("zoom") int zoom, @QueryParam("size") String size,
            @QueryParam("scale") int scale, @QueryParam("markers") String markers, @QueryParam("style") List<String> styles,
            @QueryParam("key") String key);
}
