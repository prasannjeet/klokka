package com.prasannjeet.klokka.webhook;

import jakarta.enterprise.context.RequestScoped;

// The exact bytes Logto signed. The signature covers the raw body, so it is captured before Jackson parses it.
@RequestScoped
public class WebhookRawBody {

    private byte[] bytes = new byte[0];

    void set(byte[] bytes) {
        this.bytes = bytes;
    }

    public byte[] bytes() {
        return bytes;
    }
}
