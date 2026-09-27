package com.prasannjeet.klokka.month;

import static com.prasannjeet.klokka.error.KlokkaException.notImplemented;

import com.prasannjeet.klokka.contract.api.MonthsApi;
import com.prasannjeet.klokka.contract.model.MonthStatus;
import com.prasannjeet.klokka.contract.model.MonthSummary;
import io.quarkus.security.Authenticated;
import java.util.UUID;

// E2 (CHQ-120) and E5 (CHQ-129): 501 NOT_IMPLEMENTED until then.
@Authenticated
public class MonthResource implements MonthsApi {

    @Override
    public String exportMonthCsv(UUID workspaceId, String month, UUID membershipId) {
        throw notImplemented("exportMonthCsv");
    }

    @Override
    public MonthStatus getMonth(UUID workspaceId, String month) {
        throw notImplemented("getMonth");
    }

    @Override
    public MonthSummary getMonthSummary(UUID workspaceId, String month) {
        throw notImplemented("getMonthSummary");
    }

    @Override
    public MonthStatus lockMonth(UUID workspaceId, String month) {
        throw notImplemented("lockMonth");
    }

    @Override
    public MonthStatus unlockMonth(UUID workspaceId, String month) {
        throw notImplemented("unlockMonth");
    }
}
