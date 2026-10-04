package com.prasannjeet.klokka.entry;

import com.prasannjeet.klokka.contract.api.JobsApi;
import com.prasannjeet.klokka.contract.model.Entry;
import com.prasannjeet.klokka.contract.model.JobWrite;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import java.time.LocalDate;
import java.util.UUID;

// /members/{id}/entries/{date}/jobs and /jobs/{id} (CHQ-156).
@Authenticated
public class JobResource implements JobsApi {

    @Inject
    JobService service;

    @Override
    public Entry createJob(UUID workspaceId, UUID membershipId, LocalDate date, JobWrite jobWrite) {
        return service.create(workspaceId, membershipId, date, jobWrite);
    }

    @Override
    public Entry updateJob(UUID workspaceId, UUID jobId, JobWrite jobWrite) {
        return service.update(workspaceId, jobId, jobWrite);
    }

    @Override
    public void deleteJob(UUID workspaceId, UUID jobId) {
        service.delete(workspaceId, jobId);
    }
}
