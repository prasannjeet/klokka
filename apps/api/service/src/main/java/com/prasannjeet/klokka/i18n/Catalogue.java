package com.prasannjeet.klokka.i18n;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prasannjeet.klokka.contract.model.Language;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.io.IOException;
import java.io.InputStream;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

// The ONE string catalogue (docs/DECISIONS.md D2), read from i18n/{sv,en}.json which Maven copies from
// packages/core/i18n into the jar. Keys are flat dotted paths; `{name}` placeholders; `key_one` / `key_other`
// plural pairs chosen by `count`. A missing key is a programming error and throws, never falls back to English.
@ApplicationScoped
public class Catalogue {

    @Inject
    ObjectMapper mapper;

    private final Map<Language, Map<String, String>> messages = new EnumMap<>(Language.class);

    @PostConstruct
    void load() {
        for (Language language : Language.values()) {
            String resource = "i18n/" + language + ".json";
            try (InputStream in = Thread.currentThread().getContextClassLoader().getResourceAsStream(resource)) {
                if (in == null) throw new IllegalStateException("catalogue " + resource + " is not on the classpath");
                Map<String, String> flat = new HashMap<>();
                flatten("", mapper.readTree(in), flat);
                messages.put(language, Map.copyOf(flat));
            } catch (IOException e) {
                throw new IllegalStateException("catalogue " + resource + " cannot be read", e);
            }
        }
    }

    public boolean has(Language language, String key) {
        return messages.get(language).containsKey(key);
    }

    public String t(Language language, String key) {
        return t(language, key, Map.of());
    }

    public String t(Language language, String key, Map<String, ?> params) {
        String template = messages.get(language).get(key);
        if (template == null) throw new IllegalArgumentException("catalogue key " + key + " is missing in " + language);
        return interpolate(template, params);
    }

    // `key_one` when count is exactly 1, `key_other` otherwise; `count` is always available as a placeholder.
    public String plural(Language language, String key, long count, Map<String, ?> params) {
        Map<String, Object> merged = new HashMap<>(params);
        merged.put("count", Long.toString(count));
        return t(language, key + (count == 1 ? "_one" : "_other"), merged);
    }

    private static String interpolate(String template, Map<String, ?> params) {
        StringBuilder out = new StringBuilder(template.length() + 16);
        int i = 0;
        while (i < template.length()) {
            char c = template.charAt(i);
            if (c == '{') {
                int end = template.indexOf('}', i);
                if (end > i) {
                    String name = template.substring(i + 1, end);
                    if (!params.containsKey(name)) {
                        throw new IllegalArgumentException("placeholder {" + name + "} has no value in \"" + template + "\"");
                    }
                    out.append(params.get(name));
                    i = end + 1;
                    continue;
                }
            }
            out.append(c);
            i++;
        }
        return out.toString();
    }

    private static void flatten(String prefix, JsonNode node, Map<String, String> into) {
        Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> field = fields.next();
            String key = prefix.isEmpty() ? field.getKey() : prefix + "." + field.getKey();
            if (field.getValue().isObject()) flatten(key, field.getValue(), into);
            else into.put(key, field.getValue().asText());
        }
    }
}
