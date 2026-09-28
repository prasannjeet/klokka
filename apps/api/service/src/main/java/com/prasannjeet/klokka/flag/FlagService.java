package com.prasannjeet.klokka.flag;

import static com.prasannjeet.klokka.error.KlokkaException.forbidden;
import static com.prasannjeet.klokka.error.KlokkaException.notFound;
import static com.prasannjeet.klokka.error.KlokkaException.validation;
import static com.prasannjeet.klokka.error.ProblemCode.CONFLICT;
import static com.prasannjeet.klokka.error.ProblemCode.FLAG_ALREADY_OPEN;

import com.prasannjeet.klokka.auth.Access;
import com.prasannjeet.klokka.auth.WorkspaceAccess;
import com.prasannjeet.klokka.contract.model.Actor;
import com.prasannjeet.klokka.contract.model.EntryChangeKind;
import com.prasannjeet.klokka.contract.model.Flag;
import com.prasannjeet.klokka.contract.model.FlagCreate;
import com.prasannjeet.klokka.contract.model.FlagResolution;
import com.prasannjeet.klokka.contract.model.FlagResolutionAction;
import com.prasannjeet.klokka.contract.model.FlagResolve;
import com.prasannjeet.klokka.contract.model.FlagStatus;
import com.prasannjeet.klokka.entry.EntryViews;
import com.prasannjeet.klokka.entry.EntryWriter;
import com.prasannjeet.klokka.entry.HoursRounding;
import com.prasannjeet.klokka.error.KlokkaException;
import com.prasannjeet.klokka.notification.NotificationService;
import com.prasannjeet.klokka.persistence.EntryFlagEntity;
import com.prasannjeet.klokka.persistence.EntryRepository;
import com.prasannjeet.klokka.persistence.FlagRepository;
import com.prasannjeet.klokka.persistence.HourEntryChangeEntity;
import com.prasannjeet.klokka.persistence.HourEntryEntity;
import com.prasannjeet.klokka.persistence.MembershipEntity;
import com.prasannjeet.klokka.persistence.MembershipRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

// Flags (CHQ-135): an employee objects to their own entry, the employer fixes it (through the entries funnel,
// with history) or dismisses it, and both sides are told.
@ApplicationScoped
public class FlagService {

    @Inject
    WorkspaceAccess access;

    @Inject
    FlagRepository flags;

    @Inject
    EntryRepository entries;

    @Inject
    MembershipRepository memberships;

    @Inject
    EntryWriter writer;

    @Inject
    NotificationService notifications;

    @Inject
    Clock clock;

    @Transactional
    public Flag raise(UUID workspaceId, UUID entryId, FlagCreate body) {
        Access a = access.member(workspaceId);
        HourEntryEntity entry = entries.findEntry(a.workspaceId(), entryId).filter(e -> e.deletedAt == null)
                .orElseThrow(() -> notFound("Entry " + entryId));
        if (!a.isSelf(entry.membershipId)) throw forbidden("Only the member the entry belongs to can flag it.");
        if (flags.findOpenForEntry(a.workspaceId(), entryId).isPresent()) {
            throw new KlokkaException(FLAG_ALREADY_OPEN, "This entry already has an open flag.");
        }
        Instant now = clock.instant();
        EntryFlagEntity flag = new EntryFlagEntity();
        flag.id = UUID.randomUUID();
        flag.workspaceId = entry.workspaceId;
        flag.entryId = entry.id;
        flag.membershipId = entry.membershipId;
        flag.raisedBy = a.userId();
        flag.reason = body.getReason();
        flag.message = body.getMessage().trim();
        flag.loggedHours = entry.hours;
        flag.suggestedHours = body.getSuggestedHours();
        flag.status = FlagStatus.OPEN;
        flag.createdAt = now;
        flags.persistFlag(a.workspaceId(), flag);
        HourEntryChangeEntity change = writer.history(a, entry, EntryChangeKind.FLAGGED, null, null, null, null, a.userId(), now);
        change.flagId = flag.id;
        memberships.findEmployer(a.workspaceId()).filter(e -> e.userId != null).ifPresent(employer ->
                notifications.entryFlagged(a.workspace(), employer.userId, entry.membershipId, entry.id, flag.id,
                        a.membership().displayName, entry.workDate, entry.hours, flag.suggestedHours, flag.message));
        return view(a, flag, entry);
    }

    @Transactional
    public List<Flag> list(UUID workspaceId, FlagStatus status) {
        Access a = access.member(workspaceId);
        UUID scope = a.employer() ? null : a.membership().id;
        return flags.listFlags(a.workspaceId(), scope, status).stream()
                .map(f -> view(a, f, entries.findEntry(a.workspaceId(), f.entryId).orElseThrow()))
                .toList();
    }

    @Transactional
    public Flag resolve(UUID workspaceId, UUID flagId, FlagResolve body) {
        Access a = access.employer(workspaceId);
        EntryFlagEntity flag = flags.findFlag(a.workspaceId(), flagId).orElseThrow(() -> notFound("Flag " + flagId));
        if (flag.status != FlagStatus.OPEN) throw new KlokkaException(CONFLICT, "This flag was already resolved.");
        HourEntryEntity entry = entries.findEntry(a.workspaceId(), flag.entryId).orElseThrow(() -> notFound("Entry " + flag.entryId));
        MembershipEntity member = access.target(a, flag.membershipId);
        Instant now = clock.instant();
        String note = body.getNote() == null || body.getNote().isBlank() ? null : body.getNote().trim();
        if (body.getAction() == FlagResolutionAction.FIX) {
            if (body.getHours() == null) throw validation("hours", "is required for FIX");
            BigDecimal hours = HoursRounding.apply(body.getHours(), a.workspace().rounding, "hours");
            EntryWriter.Outcome outcome = writer.write(a, member, entry.workDate, hours, entry.note, false);
            entry = outcome.entry();
            flag.status = FlagStatus.FIXED;
            flag.resolutionHours = hours;
        } else {
            writer.requireUnlocked(a, java.time.YearMonth.from(entry.workDate));
            flag.status = FlagStatus.DISMISSED;
        }
        flag.resolutionNote = note;
        flag.resolvedBy = a.userId();
        flag.resolvedAt = now;
        HourEntryChangeEntity change = writer.history(a, entry,
                flag.status == FlagStatus.FIXED ? EntryChangeKind.FLAG_FIXED : EntryChangeKind.FLAG_DISMISSED,
                null, null, null, null, a.userId(), now);
        change.flagId = flag.id;
        notifications.flagResolved(a.workspace(), member.userId, member.id, entry.id, flag.id, a.membership().displayName,
                entry.workDate, flag.status == FlagStatus.FIXED ? "FIX" : "DISMISS", entry.hours, note);
        return view(a, flag, entry);
    }

    private Flag view(Access a, EntryFlagEntity f, HourEntryEntity entry) {
        EntryViews.Names names = new EntryViews.Names(memberships, a);
        Flag flag = new Flag()
                .id(f.id)
                .workspaceId(f.workspaceId)
                .entryId(f.entryId)
                .membershipId(f.membershipId)
                .memberName(memberships.findMember(a.workspaceId(), f.membershipId).map(m -> m.displayName).orElse(""))
                .workDate(entry.workDate)
                .loggedHours(f.loggedHours)
                .suggestedHours(f.suggestedHours)
                .reason(f.reason)
                .message(f.message)
                .status(f.status)
                .raisedAt(f.createdAt.atOffset(ZoneOffset.UTC))
                .raisedBy(names.actor(f.raisedBy))
                .resolvedAt(f.resolvedAt == null ? null : f.resolvedAt.atOffset(ZoneOffset.UTC));
        if (f.resolvedBy != null) {
            flag.resolvedBy(names.actor(f.resolvedBy));
            flag.resolution(new FlagResolution()
                    .action(f.status == FlagStatus.FIXED ? FlagResolutionAction.FIX : FlagResolutionAction.DISMISS)
                    .hours(f.resolutionHours)
                    .note(f.resolutionNote));
        }
        return flag;
    }

    static Actor actor(String id, String name) {
        return new Actor().userId(id).name(name);
    }
}
