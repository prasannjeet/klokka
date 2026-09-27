package com.prasannjeet.klokka.arch;

import static com.tngtech.archunit.base.DescribedPredicate.not;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAnyPackage;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.simpleNameEndingWith;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.methods;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.prasannjeet.klokka.domain.WorkspaceId;
import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaMethod;
import com.tngtech.archunit.core.domain.JavaMethodCall;
import com.tngtech.archunit.core.domain.JavaModifier;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.PermitAll;
import jakarta.annotation.security.RolesAllowed;
import org.junit.jupiter.api.Test;

// The structural rules of AGENTS.md, each with a positive control on a fixture in arch.fixture so a rule that
// silently stopped matching would be caught: resources never touch repositories (a service sits between),
// every workspace repository method takes a WorkspaceId, only repositories use Panache, and every resource
// carries a security annotation.
class ArchitectureTest {

    // Repositories that are user-, operator- or webhook-scoped by design; everything else works inside a workspace.
    private static final String[] WORKSPACE_EXEMPT_PACKAGES = {
            "com.prasannjeet.klokka.me..", "com.prasannjeet.klokka.operator..", "com.prasannjeet.klokka.webhook.."
    };
    private static final String PANACHE = "io.quarkus.hibernate.orm.panache..";

    @Test
    void resourcesNeverTouchARepository() {
        resourcesNeverTouchARepositoryRule().check(AnalyzedClasses.main());
    }

    @Test
    void resourceRuleFiresOnTheLeakyFixture() {
        assertThatThrownBy(() -> resourcesNeverTouchARepositoryRule().check(AnalyzedClasses.tests()))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("LeakyResource");
    }

    @Test
    void everyWorkspaceRepositoryMethodTakesAWorkspaceId() {
        workspaceRepositoryRule().check(AnalyzedClasses.main());
    }

    @Test
    void workspaceRepositoryRuleFiresOnTheLeakyFixture() {
        assertThatThrownBy(() -> workspaceRepositoryRule().check(AnalyzedClasses.tests()))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("LeakyRepository");
    }

    @Test
    void onlyRepositoriesUsePanache() {
        onlyRepositoriesUsePanacheRule().check(AnalyzedClasses.main());
    }

    @Test
    void panacheRuleFiresOnTheLeakyFixture() {
        assertThatThrownBy(() -> onlyRepositoriesUsePanacheRule().check(AnalyzedClasses.tests()))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("LeakyService");
    }

    @Test
    void everyResourceCarriesASecurityAnnotation() {
        resourcesAreGuardedRule().check(AnalyzedClasses.main());
    }

    @Test
    void guardRuleFiresOnTheUnguardedFixture() {
        assertThatThrownBy(() -> resourcesAreGuardedRule().check(AnalyzedClasses.tests()))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("UnguardedResource");
    }

    private static ArchRule resourcesNeverTouchARepositoryRule() {
        return noClasses().that().haveSimpleNameEndingWith("Resource")
                .should().dependOnClassesThat().haveSimpleNameEndingWith("Repository")
                .because("a resource validates and delegates; the service owns the transaction and the rules");
    }

    private static ArchRule workspaceRepositoryRule() {
        DescribedPredicate<JavaClass> workspaceRepositories =
                simpleNameEndingWith("Repository").and(not(resideInAnyPackage(WORKSPACE_EXEMPT_PACKAGES)));
        return methods().that().areDeclaredInClassesThat(workspaceRepositories)
                .and().arePublic()
                .and().doNotHaveModifier(JavaModifier.STATIC)
                .should(haveAParameterOfType(WorkspaceId.class))
                .because("workspace isolation is enforced in the application as well as in the database");
    }

    private static ArchRule onlyRepositoriesUsePanacheRule() {
        return noClasses().that(not(simpleNameEndingWith("Repository")))
                .should().dependOnClassesThat().resideInAPackage(PANACHE)
                .orShould().callMethodWhere(resolvesToAPanacheMethod())
                .because("the inherited Panache finders bypass the WorkspaceId parameter; only a repository may use them");
    }

    private static ArchRule resourcesAreGuardedRule() {
        return classes().that().haveSimpleNameEndingWith("Resource")
                .should().beAnnotatedWith(Authenticated.class)
                .orShould().beAnnotatedWith(RolesAllowed.class)
                .orShould().beAnnotatedWith(PermitAll.class)
                .because("every endpoint states who may call it (deny-unannotated-endpoints is on as well)");
    }

    private static ArchCondition<JavaMethod> haveAParameterOfType(Class<?> type) {
        return new ArchCondition<>("have a parameter of type " + type.getSimpleName()) {
            @Override
            public void check(JavaMethod method, ConditionEvents events) {
                boolean satisfied = method.getRawParameterTypes().stream().anyMatch(t -> t.isEquivalentTo(type));
                String message = method.getFullName() + (satisfied ? " takes a " : " does not take a ") + type.getSimpleName();
                events.add(new SimpleConditionEvent(method, satisfied, message));
            }
        };
    }

    private static DescribedPredicate<JavaMethodCall> resolvesToAPanacheMethod() {
        return new DescribedPredicate<>("resolve to a method declared by Panache") {
            @Override
            public boolean test(JavaMethodCall call) {
                return call.getTarget().resolveMember()
                        .map(method -> method.getOwner().getPackageName().startsWith("io.quarkus.hibernate.orm.panache"))
                        .orElse(false);
            }
        };
    }
}
