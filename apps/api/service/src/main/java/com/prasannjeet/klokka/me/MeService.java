package com.prasannjeet.klokka.me;

import static com.prasannjeet.klokka.contract.model.Role.EMPLOYER;

import com.prasannjeet.klokka.auth.CurrentUser;
import com.prasannjeet.klokka.config.KlokkaConfig;
import com.prasannjeet.klokka.contract.model.Language;
import com.prasannjeet.klokka.contract.model.Me;
import com.prasannjeet.klokka.contract.model.MyWorkspace;
import com.prasannjeet.klokka.contract.model.Preferences;
import com.prasannjeet.klokka.contract.model.PreferencesUpdate;
import com.prasannjeet.klokka.contract.model.PushTokenRegistration;
import com.prasannjeet.klokka.contract.model.ThemePreference;
import com.prasannjeet.klokka.contract.model.UserProfile;
import com.prasannjeet.klokka.contract.model.UserProfileUpdate;
import com.prasannjeet.klokka.error.KlokkaException;
import com.prasannjeet.klokka.persistence.AppUserEntity;
import com.prasannjeet.klokka.persistence.MembershipEntity;
import com.prasannjeet.klokka.persistence.UserPreferenceEntity;
import com.prasannjeet.klokka.persistence.WorkspaceEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

// The signed-in user's own account: created on first sight, refreshed on every /me, plus their preferences,
// their memberships as the workspace switcher shows them, and their push tokens.
@ApplicationScoped
public class MeService {

    @Inject
    MeRepository repository;

    @Inject
    CurrentUser currentUser;

    @Inject
    Clock clock;

    @Inject
    KlokkaConfig config;

    @Transactional
    public Me me(Optional<String> acceptLanguage) {
        AppUserEntity user = ensureUser(acceptLanguage);
        return assemble(user, ensurePreferences(user.id, acceptLanguage));
    }

    @Transactional
    public Me updateProfile(UserProfileUpdate update) {
        AppUserEntity user = ensureUser(Optional.empty());
        if (update.getName() != null) user.displayName = update.getName().trim();
        // Jackson gives an explicit null the same as an absent field here; both clear the emoji only when the
        // property was sent. The contract says null clears, so treat a present-null as clear.
        if (update.getAvatarEmoji() != null) user.avatarEmoji = update.getAvatarEmoji().isBlank() ? null : update.getAvatarEmoji();
        return assemble(user, ensurePreferences(user.id, Optional.empty()));
    }

    @Transactional
    public Preferences updatePreferences(PreferencesUpdate update) {
        AppUserEntity user = ensureUser(Optional.empty());
        UserPreferenceEntity preferences = ensurePreferences(user.id, Optional.empty());
        if (update.getLanguage() != null) preferences.language = update.getLanguage();
        if (update.getPushEnabled() != null) preferences.pushEnabled = update.getPushEnabled();
        if (update.getDigestEnabled() != null) preferences.digestEnabled = update.getDigestEnabled();
        if (update.getTheme() != null) preferences.theme = update.getTheme();
        preferences.updatedAt = clock.instant();
        return toPreferences(preferences);
    }

    @Transactional
    public void registerPushToken(PushTokenRegistration registration) {
        AppUserEntity user = ensureUser(Optional.empty());
        repository.upsertPushToken(user.id, registration.getToken(), registration.getPlatform(),
                registration.getDeviceName(), clock.instant());
    }

    @Transactional
    public void deletePushToken(String token) {
        repository.disablePushToken(currentUser.id(), token, clock.instant());
    }

    // The signed-in user's row for other services (workspace creation, invitation accept), created on first sight.
    @Transactional
    public AppUserEntity ensureCurrentUser() {
        AppUserEntity user = ensureUser(Optional.empty());
        ensurePreferences(user.id, Optional.empty());
        return user;
    }

    // The language a user's notifications are rendered in.
    public Language languageOf(String userId) {
        return repository.findPreferences(userId).map(p -> p.language).orElse(Language.fromValue(config.defaultLanguage()));
    }

    // Create on first sight (a complete row, persisted once), then refresh what the token knows on every call.
    private AppUserEntity ensureUser(Optional<String> acceptLanguage) {
        String id = currentUser.id();
        Instant now = clock.instant();
        Optional<String> email = currentUser.email();
        Optional<String> name = currentUser.name();
        AppUserEntity user = repository.findUser(id).orElseGet(() -> {
            AppUserEntity created = new AppUserEntity();
            created.id = id;
            created.createdAt = now;
            created.lastSeenAt = now;
            created.email = email.orElse(null);
            created.displayName = name.orElseGet(() -> email.map(MeService::localPart).orElse(""));
            repository.persistUser(created);
            return created;
        });
        if (email.isPresent()) user.email = email.get();
        if (name.isPresent()) user.displayName = name.get();
        if (user.displayName.isBlank() && user.email != null) user.displayName = localPart(user.email);
        user.lastSeenAt = now;
        return user;
    }

    private static String localPart(String email) {
        return email.split("@")[0];
    }

    private UserPreferenceEntity ensurePreferences(String userId, Optional<String> acceptLanguage) {
        return repository.findPreferences(userId).orElseGet(() -> {
            UserPreferenceEntity preferences = new UserPreferenceEntity();
            preferences.userId = userId;
            preferences.language = initialLanguage(acceptLanguage);
            preferences.pushEnabled = true;
            preferences.digestEnabled = false;
            preferences.theme = ThemePreference.SYSTEM;
            preferences.updatedAt = clock.instant();
            repository.persistPreferences(preferences);
            return preferences;
        });
    }

    // Swedish when the device says Swedish, otherwise the configured default (D16).
    Language initialLanguage(Optional<String> acceptLanguage) {
        String header = acceptLanguage.orElse("").toLowerCase(Locale.ROOT);
        for (String part : header.split(",")) {
            String tag = part.trim().split(";")[0].trim();
            if (tag.equals("sv") || tag.startsWith("sv-")) return Language.SV;
            if (tag.equals("en") || tag.startsWith("en-")) return Language.EN;
        }
        return Language.fromValue(config.defaultLanguage());
    }

    private Me assemble(AppUserEntity user, UserPreferenceEntity preferences) {
        List<MyWorkspace> workspaces = repository.listMemberships(user.id).stream()
                .map(row -> toMyWorkspace(user.id, row.membership(), row.workspace()))
                .toList();
        return new Me()
                .user(toProfile(user))
                .preferences(toPreferences(preferences))
                .workspaces(workspaces)
                .platformAdmin(currentUser.platformAdmin())
                .pushTokenRegistered(repository.hasPushToken(user.id));
    }

    private MyWorkspace toMyWorkspace(String userId, MembershipEntity membership, WorkspaceEntity workspace) {
        boolean employer = membership.role == EMPLOYER;
        YearMonth month = YearMonth.now(clock.withZone(zone(workspace.timezone)));
        LocalDate from = month.atDay(1);
        LocalDate to = month.atEndOfMonth();
        return new MyWorkspace()
                .workspaceId(workspace.id)
                .membershipId(membership.id)
                .name(workspace.name)
                .slug(workspace.slug)
                .colour(workspace.colour)
                .emoji(workspace.emoji)
                .role(membership.role)
                .memberStatus(membership.status)
                .showPay(workspace.showPay)
                .currency(workspace.currency)
                .timezone(workspace.timezone)
                .weekStart(workspace.weekStart)
                .memberCount(employer ? (int) repository.memberCount(workspace.id) : null)
                .employerName(employer ? null : repository.employerName(workspace.id).orElse(null))
                .hoursThisMonth(repository.hoursBetween(workspace.id, employer ? null : membership.id, from, to))
                .unreadNotifications((int) repository.unreadNotifications(userId, workspace.id));
    }

    private static ZoneId zone(String timezone) {
        try {
            return ZoneId.of(timezone);
        } catch (RuntimeException e) {
            throw new KlokkaException(com.prasannjeet.klokka.error.ProblemCode.INTERNAL,
                    "workspace has an invalid time zone: " + timezone, e);
        }
    }

    private static UserProfile toProfile(AppUserEntity user) {
        return new UserProfile()
                .id(user.id)
                .email(user.email)
                .name(user.displayName)
                .avatarEmoji(user.avatarEmoji)
                .avatarUrl(null)
                .createdAt(user.createdAt.atOffset(ZoneOffset.UTC));
    }

    private static Preferences toPreferences(UserPreferenceEntity preferences) {
        return new Preferences()
                .language(preferences.language)
                .pushEnabled(preferences.pushEnabled)
                .digestEnabled(preferences.digestEnabled)
                .theme(preferences.theme);
    }
}
