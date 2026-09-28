package com.prasannjeet.klokka.entry;

import static com.prasannjeet.klokka.error.KlokkaException.validation;

import com.prasannjeet.klokka.contract.model.Rounding;
import java.math.BigDecimal;
import java.math.RoundingMode;

// The workspace rounding rule applied on save: NONE keeps two decimals, QUARTER snaps to 0.25 h, HALF to 0.5 h.
public final class HoursRounding {

    private static final BigDecimal MAX = new BigDecimal("24");
    private static final BigDecimal QUARTER = new BigDecimal("0.25");
    private static final BigDecimal HALF = new BigDecimal("0.5");

    private HoursRounding() {}

    public static BigDecimal apply(BigDecimal hours, Rounding rounding, String field) {
        if (hours == null) throw validation(field, "is required");
        if (hours.signum() < 0 || hours.compareTo(MAX) > 0) throw validation(field, "must be between 0 and 24");
        BigDecimal step = switch (rounding) {
            case NONE -> null;
            case QUARTER -> QUARTER;
            case HALF -> HALF;
        };
        BigDecimal rounded = step == null ? hours
                : hours.divide(step, 0, RoundingMode.HALF_UP).multiply(step);
        return rounded.setScale(2, RoundingMode.HALF_UP);
    }
}
