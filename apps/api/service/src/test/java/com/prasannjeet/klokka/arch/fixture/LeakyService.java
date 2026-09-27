package com.prasannjeet.klokka.arch.fixture;

import com.prasannjeet.klokka.persistence.MembershipEntity;
import com.prasannjeet.klokka.persistence.MembershipRepository;
import java.util.List;

// Positive control for ArchitectureTest.onlyRepositoriesUsePanacheRule: a service calling an inherited Panache
// finder on a repository, which skips the WorkspaceId parameter entirely.
public class LeakyService {

    private final MembershipRepository repository;

    public LeakyService(MembershipRepository repository) {
        this.repository = repository;
    }

    public List<MembershipEntity> everything() {
        return repository.listAll();
    }
}
