package com.prasannjeet.klokka.month;

import com.prasannjeet.klokka.contract.api.MonthsApi;
import com.prasannjeet.klokka.contract.model.MonthStatus;
import com.prasannjeet.klokka.contract.model.MonthSummary;
import io.quarkus.security.Authenticated;
import io.vertx.ext.web.RoutingContext;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.Context;
import java.util.UUID;

// /workspaces/{id}/months/{month} (CHQ-120, CHQ-122, CHQ-129). The CSV sets Content-Disposition on the Vert.x
// response because the generated interface returns the body as a String.
@Authenticated
public class MonthResource implements MonthsApi {

    @Inject
    MonthService service;

    @Context
    RoutingContext routing;

    @Override
    public String exportMonthCsv(UUID workspaceId, String month, UUID membershipId) {
        MonthService.Csv csv = service.csv(workspaceId, month, membershipId);
        routing.response().putHeader("Content-Disposition", "attachment; filename=\"" + csv.fileName() + "\"");
        return csv.body();
    }

    @Override
    public MonthStatus getMonth(UUID workspaceId, String month) {
        return service.status(workspaceId, month);
    }

    @Override
    public MonthSummary getMonthSummary(UUID workspaceId, String month) {
        return service.summary(workspaceId, month);
    }

    @Override
    public MonthStatus lockMonth(UUID workspaceId, String month) {
        return service.lock(workspaceId, month);
    }

    @Override
    public MonthStatus unlockMonth(UUID workspaceId, String month) {
        return service.unlock(workspaceId, month);
    }
}
