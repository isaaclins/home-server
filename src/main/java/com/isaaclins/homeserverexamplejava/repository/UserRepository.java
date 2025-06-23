package com.isaaclins.homeserverexamplejava.repository;

import com.isaaclins.homeserverexamplejava.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, Long> {

    Optional<UserEntity> findByUsername(String username);

    Optional<UserEntity> findByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    Optional<UserEntity> findByUsernameAndEnabled(String username, boolean enabled);

    List<UserEntity> findByRole(UserEntity.Role role);

    Optional<UserEntity> findFirstByRole(UserEntity.Role role);
}
