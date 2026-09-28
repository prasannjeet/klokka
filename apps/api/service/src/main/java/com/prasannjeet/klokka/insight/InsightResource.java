package com.prasannjeet.klokka.insight;

import com.prasannjeet.klokka.contract.api.InsightsApi;
import com.prasannjeet.klokka.contract.model.MemberInsights;
import com.prasannjeet.klokka.contract.model.MemberMonth;
import com.prasannjeet.klokka.contract.model.WorkspaceInsights;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import java.util.UUID;

// The read models (CHQ-121, CHQ-122, CHQ-124, CHQ-125, CHQ-126).
@Authenticated
public class InsightResource implements InsightsApi {

    @Inject
    InsightService service;

    @Override
    public MemberInsights getMemberInsights(UUID workspaceId, UUID membershipId, String month) {
        return service.memberInsights(workspaceId, membershipId, month);
    }

    @Override
    public MemberMonth getMemberMonth(UUID workspaceId, UUID membershipId, String month) {
        return service.memberMonth(workspaceId, membershipId, month);
    }

    @Override
    public WorkspaceInsights getWorkspaceInsights(UUID workspaceId, String month) {
        return service.workspaceInsights(workspaceId, month);
    }
}
