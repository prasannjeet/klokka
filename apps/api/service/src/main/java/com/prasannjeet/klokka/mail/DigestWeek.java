package com.prasannjeet.klokka.mail;

import com.prasannjeet.klokka.member.MemberViews;
import com.prasannjeet.klokka.persistence.JobRepository.WeekJob;
import com.prasannjeet.klokka.persistence.WorkspaceEntity;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

// Last week in one workspace as one recipient may see it (CHQ-189), built once and read by both the email's job
// lists and the Excel workbook: an employer sees every member with a row last week, an employee only themself.
// `withPay` is decided by the caller (employer: the workspace shows pay; employee: that plus their own rate).
public record DigestWeek(WorkspaceEntity workspace, boolean employer, LocalDate monday, List<WeekJob> jobs, List<Member> members,
        boolean withPay) {

    public record Member(UUID membershipId, String name, BigDecimal hourlyRate) {}

    public DigestWeek {
        jobs = List.copyOf(jobs);
        members = List.copyOf(members);
    }

    public LocalDate sunday() {
        return monday.plusDays(6);
    }

    public boolean isEmpty() {
        return jobs.isEmpty();
    }

    public List<WeekJob> jobsOf(UUID membershipId) {
        return jobs.stream().filter(j -> j.membershipId().equals(membershipId)).toList();
    }

    // Monday to Sunday in order, every day present (zero when nothing was logged).
    public Map<LocalDate, BigDecimal> hoursPerDay(UUID membershipId) {
        Map<LocalDate, BigDecimal> out = emptyWeek();
        for (WeekJob job : jobs) {
            if (job.membershipId().equals(membershipId)) out.merge(job.date(), job.hours(), BigDecimal::add);
        }
        return out;
    }

    public BigDecimal total(UUID membershipId) {
        return jobs.stream().filter(j -> j.membershipId().equals(membershipId)).map(WeekJob::hours).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public BigDecimal teamTotal(LocalDate date) {
        return jobs.stream().filter(j -> j.date().equals(date)).map(WeekJob::hours).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public BigDecimal teamTotal() {
        return jobs.stream().map(WeekJob::hours).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // The member's pay for the week, or null when pay is not shown or they have no rate.
    public BigDecimal pay(Member member) {
        return withPay ? MemberViews.earnings(total(member.membershipId()), member.hourlyRate()) : null;
    }

    private Map<LocalDate, BigDecimal> emptyWeek() {
        Map<LocalDate, BigDecimal> out = new LinkedHashMap<>();
        for (int i = 0; i < 7; i++) out.put(monday.plusDays(i), BigDecimal.ZERO);
        return out;
    }
}
