package com.prasannjeet.klokka.persistence;

import com.prasannjeet.klokka.contract.model.Language;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

// The contract's Language enum is `sv`/`en` on the wire (its constants are SV/EN); store the wire value.
@Converter
public class LanguageConverter implements AttributeConverter<Language, String> {

    @Override
    public String convertToDatabaseColumn(Language language) {
        return language == null ? null : language.toString();
    }

    @Override
    public Language convertToEntityAttribute(String value) {
        return value == null ? null : Language.fromValue(value);
    }
}
