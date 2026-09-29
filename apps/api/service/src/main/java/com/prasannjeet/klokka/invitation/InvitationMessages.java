package com.prasannjeet.klokka.invitation;

import com.prasannjeet.klokka.contract.model.Language;
import com.prasannjeet.klokka.i18n.Formats;
import com.prasannjeet.klokka.logto.LogtoModels.MessagePayload;
import com.prasannjeet.klokka.me.MeRepository;
import com.prasannjeet.klokka.persistence.MembershipEntity;
import com.prasannjeet.klokka.persistence.WorkspaceEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.Instant;
import java.time.ZoneId;

// The invitation email's values (CHQ-148). It is written in the inviting employer's language, since the invitee has no
// account and so no language setting yet; the expiry is the date in the workspace's own time zone.
@ApplicationScoped
public class InvitationMessages {

    @Inject
    MeRepository users;

    public MessagePayload of(WorkspaceEntity workspace, MembershipEntity invitee, MembershipEntity inviter, Instant expires, String link) {
        Language language = users.findPreferences(inviter.userId).map(p -> p.language).orElse(Language.SV);
        String expiresOn = Formats.longDate(expires.atZone(ZoneId.of(workspace.timezone)).toLocalDate(), language);
        return new MessagePayload(link, language.toString(), invitee.displayName, inviter.displayName, workspace.name,
                workspace.emoji, expiresOn);
    }
}
