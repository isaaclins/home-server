package com.isaaclins.homeserver.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Username is required")
    @Size(min = 1, max = 50, message = "Username must be at most 50 characters")
    @Column(unique = true, nullable = false)
    private String username;

    @NotBlank(message = "Email is required")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    @Pattern(regexp = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", message = "Email should be valid and contain only ASCII characters")
    @Column(unique = true, nullable = false)
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 128, message = "Password must be between 8 and 128 characters")
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.WRITE_ONLY)
    private String hashedPassword;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Indicates if this user has administrative privileges
    @Column(nullable = false)
    private Boolean isAdmin = false;

    // Account status
    @Column(nullable = false)
    private Boolean isActive = true;

    // Account lockout
    @Column(nullable = false)
    private Boolean isLocked = false;

    // Failed login attempts
    @Column(nullable = false)
    private Integer failedLoginAttempts = 0;

    // Last login timestamp
    private LocalDateTime lastLogin;

    // Last password change
    private LocalDateTime lastPasswordChange;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        lastPasswordChange = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Sets the password by hashing it with BCrypt
     */
    public void setPassword(String plainPassword) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);
        this.hashedPassword = encoder.encode(plainPassword);
        this.lastPasswordChange = LocalDateTime.now();
    }

    /**
     * Checks if the password matches the stored hash
     */
    public boolean checkPassword(String plainPassword) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);
        return encoder.matches(plainPassword, this.hashedPassword);
    }

    /**
     * Locks the account
     */
    public void lockAccount() {
        this.isLocked = true;
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Unlocks the account and resets failed login attempts
     */
    public void unlockAccount() {
        this.isLocked = false;
        this.failedLoginAttempts = 0;
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Increments failed login attempts
     */
    public void incrementFailedLoginAttempts() {
        this.failedLoginAttempts++;
        this.updatedAt = LocalDateTime.now();

        // Lock account after 5 failed attempts
        if (this.failedLoginAttempts >= 5) {
            lockAccount();
        }
    }

    /**
     * Resets failed login attempts on successful login
     */
    public void resetFailedLoginAttempts() {
        this.failedLoginAttempts = 0;
        this.lastLogin = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Checks if the account is usable (active and not locked)
     */
    public boolean isAccountUsable() {
        return isActive && !isLocked;
    }
}
