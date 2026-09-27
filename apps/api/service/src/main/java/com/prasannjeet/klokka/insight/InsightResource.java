package com.prasannjeet.klokka.insight;

import static com.prasannjeet.klokka.error.KlokkaException.notImplemented;

import com.prasannjeet.klokka.contract.api.InsightsApi;
import com.prasannjeet.klokka.contract.model.MemberInsights;
import com.prasannjeet.klokka.contract.model.MemberMonth;
import com.prasannjeet.klokka.contract.model.WorkspaceInsights;
import io.quarkus.security.Authenticated;
import java.util.UUID;

// E3 and E4 (CHQ-121, CHQ-122, CHQ-124, CHQ-125, CHQ-126): 501 NOT_IMPLEMENTED until then.
@Authenticated
public class InsightResource implements InsightsApi {

    @Override
    public MemberInsights getMemberInsights(UUID workspaceId, UUID membershipId, String month) {
        throw notImplemented("getMemberInsights");
    }

    @Override
    public MemberMonth getMemberMonth(UUID workspaceId, UUID membershipId, String month) {
        throw notImplemented("getMemberMonth");
    }

    @Override
    public WorkspaceInsights getWorkspaceInsights(UUID workspaceId, String month) {
        throw notImplemented("getWorkspaceInsights");
    }
}
