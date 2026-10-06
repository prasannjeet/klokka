package com.prasannjeet.klokka.persistence;

import static java.util.stream.Collectors.joining;
import static java.util.stream.Collectors.toCollection;

import com.prasannjeet.klokka.contract.model.Weekday;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.Set;

// A weekly series' days as "MONDAY,WEDNESDAY" (V4's column); read back as an EnumSet, so always Monday first.
@Converter
public class WeekdaysConverter implements AttributeConverter<Set<Weekday>, String> {

    @Override
    public String convertToDatabaseColumn(Set<Weekday> days) {
        if (days == null || days.isEmpty()) return null;
        return EnumSet.copyOf(days).stream().map(Weekday::toString).collect(joining(","));
    }

    @Override
    public Set<Weekday> convertToEntityAttribute(String value) {
        if (value == null) return EnumSet.noneOf(Weekday.class);
        return Arrays.stream(value.split(",")).map(Weekday::fromValue)
                .collect(toCollection(() -> EnumSet.noneOf(Weekday.class)));
    }
}
