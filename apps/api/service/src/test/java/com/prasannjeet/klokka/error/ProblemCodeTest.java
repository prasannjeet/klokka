package com.prasannjeet.klokka.error;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import org.junit.jupiter.api.Test;

// The service's ProblemCode and the contract's ProblemCode must be the same set, or a client could receive a code
// the spec never listed (or the spec could promise one the server never sends).
class ProblemCodeTest {

    @Test
    void everyServiceCodeIsInTheContract() {
        for (ProblemCode code : ProblemCode.values()) {
            assertThat(code.wire().toString()).isEqualTo(code.name());
        }
    }

    @Test
    void everyContractCodeExistsInTheService() {
        String[] contract = Arrays.stream(com.prasannjeet.klokka.contract.model.ProblemCode.values())
                .map(com.prasannjeet.klokka.contract.model.ProblemCode::toString)
                .toArray(String[]::new);
        String[] service = Arrays.stream(ProblemCode.values()).map(Enum::name).toArray(String[]::new);
        assertThat(service).containsExactlyInAnyOrder(contract);
    }

    @Test
    void statusesAreHttpErrorStatuses() {
        for (ProblemCode code : ProblemCode.values()) {
            assertThat(code.status()).isBetween(400, 599);
            assertThat(code.title()).isNotBlank();
        }
        assertThat(ProblemCode.NOT_IMPLEMENTED.status()).isEqualTo(501);
        assertThat(ProblemCode.INVITATION_EXPIRED.status()).isEqualTo(410);
    }
}
