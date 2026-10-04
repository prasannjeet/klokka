package com.prasannjeet.klokka.me;

import com.prasannjeet.klokka.auth.CurrentUser;
import com.prasannjeet.klokka.logto.LogtoService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.Clock;
import org.jboss.logging.Logger;

// DELETE /me (CHQ-157). Logto organizations first, so a Logto failure leaves the database as it was; then one
// transaction for Klokka's rows; then the Logto user. Every step is safe to repeat (Logto's 404 counts as done), so
// a call that failed halfway is finished by calling again.
@ApplicationScoped
public class AccountDeletionService {

    private static final Logger LOG = Logger.getLogger(AccountDeletionService.class);

    @Inject
    CurrentUser currentUser;

    @Inject
    AccountDeletionRepository repository;

    @Inject
    LogtoService logto;

    @Inject
    Clock clock;

    public void deleteCurrentUser() {
        String userId = currentUser.id();
        for (String organizationId : repository.ownedOrganizations(userId)) logto.deleteOrganization(organizationId);
        AccountDeletionRepository.Counts counts = repository.deleteAccountData(userId, clock.instant());
        logto.deleteUser(userId);
        LOG.infof("account %s deleted: %d workspace(s) deleted, %d membership(s) deactivated, %d removed",
                userId, counts.workspacesDeleted(), counts.membershipsDeactivated(), counts.membershipsRemoved());
    }
}
