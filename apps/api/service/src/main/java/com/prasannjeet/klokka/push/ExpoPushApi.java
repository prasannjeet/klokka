package com.prasannjeet.klokka.push;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.List;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

// Expo Push HTTP API (https://docs.expo.dev/push-notifications/sending-notifications/): up to 100 messages per
// send call, receipts by ticket id. The access token header is added by ExpoAuthHeaders when configured.
@RegisterRestClient(configKey = "expo")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public interface ExpoPushApi {

    @POST
    @Path("/push/send")
    ExpoModels.SendResponse send(List<ExpoModels.Message> messages);

    @POST
    @Path("/push/getReceipts")
    ExpoModels.ReceiptsResponse receipts(ExpoModels.ReceiptsRequest request);
}
