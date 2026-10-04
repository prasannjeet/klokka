package com.prasannjeet.klokka.place;

import com.prasannjeet.klokka.contract.api.PlacesApi;
import com.prasannjeet.klokka.contract.model.JobLocation;
import com.prasannjeet.klokka.contract.model.PlaceSuggestion;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import java.io.File;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

// /workspaces/{id}/places/* and /map.png (CHQ-156).
@Authenticated
public class PlaceResource implements PlacesApi {

    @Inject
    PlaceService service;

    @Override
    public List<PlaceSuggestion> autocompletePlaces(String input, UUID workspaceId, UUID session) {
        return service.autocomplete(workspaceId, input, session);
    }

    @Override
    public File getMapImage(BigDecimal latitude, BigDecimal longitude, Integer width, Integer height, UUID workspaceId, Boolean dark) {
        return service.mapImage(workspaceId, latitude, longitude, width, height, Boolean.TRUE.equals(dark));
    }

    @Override
    public JobLocation getPlace(UUID workspaceId, String placeId, UUID session) {
        return service.place(workspaceId, placeId, session);
    }

    @Override
    public List<JobLocation> listRecentPlaces(UUID workspaceId) {
        return service.recent(workspaceId);
    }

    @Override
    public JobLocation reverseGeocode(BigDecimal latitude, BigDecimal longitude, UUID workspaceId) {
        return service.reverse(workspaceId, latitude, longitude);
    }

}
