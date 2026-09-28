package com.prasannjeet.klokka.member;

import com.prasannjeet.klokka.auth.Access;
import com.prasannjeet.klokka.contract.model.InvitationStatus;
import com.prasannjeet.klokka.contract.model.Member;
import com.prasannjeet.klokka.contract.model.MemberInvitationState;
import com.prasannjeet.klokka.contract.model.MemberMonthFigures;
import com.prasannjeet.klokka.contract.model.MemberStatus;
import com.prasannjeet.klokka.persistence.MembershipEntity;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;

// Membership rows as the contract's Member, with the money and invitation fields cleared for callers who may
// not see them (CHQ-127/128: employees see their own rate only, and only while pay is on).
public final class MemberViews {

    private MemberViews() {}

    public static boolean maySeeRate(Access access, MembershipEntity target) {
        return access.workspace().showPay && (access.employer() || access.isSelf(target.id));
    }

    public static BigDecimal earnings(BigDecimal hours, BigDecimal rate) {
        if (hours == null || rate == null) return null;
        return hours.multiply(rate).setScale(2, RoundingMode.HALF_UP);
    }

    public static InvitationStatus invitationStatus(MembershipEntity m, Instant now) {
        if (m.status == MemberStatus.ACTIVE || m.status == MemberStatus.DEACTIVATED) return InvitationStatus.ACCEPTED;
        if (m.invitationExpiresAt != null && !m.invitationExpiresAt.isAfter(now)) return InvitationStatus.EXPIRED;
        return InvitationStatus.PENDING;
    }

    public static Member toMember(Access access, MembershipEntity m, YearMonth month, BigDecimal hours, long daysWorked,
            LocalDate lastEntry, Instant now) {
        boolean rate = maySeeRate(access, m);
        boolean full = access.employer() || access.isSelf(m.id);
        Member member = new Member()
                .id(m.id)
                .workspaceId(m.workspaceId)
                .userId(m.userId)
                .displayName(m.displayName)
                .email(m.email)
                .avatarEmoji(m.avatarEmoji)
                .role(m.role)
                .status(m.status)
                .hourlyRate(rate ? m.hourlyRate : null)
                .invitedAt(m.invitedAt.atOffset(ZoneOffset.UTC))
                .joinedAt(m.joinedAt == null ? null : m.joinedAt.atOffset(ZoneOffset.UTC))
                .month(new MemberMonthFigures()
                        .month(month.toString())
                        .hours(hours == null ? BigDecimal.ZERO : hours)
                        .daysWorked((int) daysWorked)
                        .earnings(rate ? earnings(hours == null ? BigDecimal.ZERO : hours, m.hourlyRate) : null))
                .lastEntryDate(full ? lastEntry : null);
        if (full && m.status == MemberStatus.INVITED && m.invitationSentAt != null) {
            member.invitation(new MemberInvitationState()
                    .status(invitationStatus(m, now))
                    .sentAt(m.invitationSentAt.atOffset(ZoneOffset.UTC))
                    .expiresAt(m.invitationExpiresAt.atOffset(ZoneOffset.UTC))
                    .resendCount(m.invitationResendCount));
        }
        return member;
    }
}
