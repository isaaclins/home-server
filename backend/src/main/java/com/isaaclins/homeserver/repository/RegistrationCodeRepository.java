package com.isaaclins.homeserver.repository;

import com.isaaclins.homeserver.entity.RegistrationCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RegistrationCodeRepository extends JpaRepository<RegistrationCode, Long> {
    Optional<RegistrationCode> findByCode(String code);
}
