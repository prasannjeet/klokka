package com.prasannjeet.klokka.place;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerResponseContext;
import org.jboss.resteasy.reactive.server.ServerResponseFilter;

// A map for a fixed point never changes: the client keeps getMapImage's answer for a week (CHQ-156).
public class MapCacheHeaders {

    private static final String MAP_CACHE = "private, max-age=604800, immutable";

    @ServerResponseFilter
    public void cacheMaps(ContainerRequestContext request, ContainerResponseContext response) {
        if (response.getStatus() == 200 && request.getUriInfo().getPath().endsWith("/map.png")) {
            response.getHeaders().putSingle("Cache-Control", MAP_CACHE);
        }
    }
}
