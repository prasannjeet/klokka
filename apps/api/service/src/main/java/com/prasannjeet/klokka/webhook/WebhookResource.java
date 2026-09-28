package com.prasannjeet.klokka.webhook;

import com.prasannjeet.klokka.contract.api.WebhooksApi;
import com.prasannjeet.klokka.contract.model.LogtoWebhookEvent;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;

// POST /webhooks/logto: no bearer, the HMAC in logto-signature-sha-256 over the raw body is the credential.
@PermitAll
public class WebhookResource implements WebhooksApi {

    @Inject
    WebhookService service;

    @Inject
    WebhookRawBody rawBody;

    @Override
    public void logtoWebhook(String logtoSignatureSha256, LogtoWebhookEvent event) {
        service.verify(logtoSignatureSha256, rawBody.bytes());
        service.apply(event);
    }
}
