package com.isaaclins.homeserver.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * RegistrationCode represents a short-lived invite code that must be provided
 * by a user during registration. Codes are valid for one minute from the time
 * they are generated and are removed from the database once consumed or
 * expired.
 */
@Entity
@Table(name = "registration_codes")
@Getter
@Setter
@NoArgsConstructor
public class RegistrationCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String code;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    public RegistrationCode(String code, LocalDateTime expiresAt) {
        this.code = code;
        this.expiresAt = expiresAt;
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
}
