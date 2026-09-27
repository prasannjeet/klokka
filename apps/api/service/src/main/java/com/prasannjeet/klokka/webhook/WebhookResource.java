package com.prasannjeet.klokka.webhook;

import static com.prasannjeet.klokka.error.KlokkaException.notImplemented;

import com.prasannjeet.klokka.contract.api.WebhooksApi;
import com.prasannjeet.klokka.contract.model.LogtoWebhookEvent;
import jakarta.annotation.security.PermitAll;

// E1 (CHQ-108/CHQ-109): 501 NOT_IMPLEMENTED until then. No bearer: Logto signs the body (logto-signature-sha-256).
@PermitAll
public class WebhookResource implements WebhooksApi {

    @Override
    public void logtoWebhook(String logtoSignatureSha256, LogtoWebhookEvent logtoWebhookEvent) {
        throw notImplemented("logtoWebhook");
    }
}
