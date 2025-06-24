package com.isaaclins.homeserverexamplejava.service;

import com.isaaclins.homeserverexamplejava.dto.SetupRequest;
import com.isaaclins.homeserverexamplejava.entity.SystemConfig;
import com.isaaclins.homeserverexamplejava.repository.SystemConfigRepository;
import com.isaaclins.homeserverexamplejava.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;
import java.nio.charset.StandardCharsets;

@Service
public class SetupService {

    private static final String SETUP_COMPLETED_KEY = "setup.completed";
    private static final String MASTER_PASSWORD_KEY = "security.master.password";
    private static final String MASTER_SALT_KEY = "security.master.salt";

    @Autowired
    private SystemConfigRepository systemConfigRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordHashingService passwordHashingService;

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Check if the initial setup has been completed
     */
    public boolean isSetupCompleted() {
        return systemConfigRepository.findByConfigKey(SETUP_COMPLETED_KEY)
                .map(config -> "true".equals(config.getConfigValue()))
                .orElse(false);
    }

    /**
     * Generate a secure salt for password hashing
     */
    private String generateSalt() {
        byte[] salt = new byte[32];
        secureRandom.nextBytes(salt);
        return Base64.getEncoder().encodeToString(salt);
    }

    /**
     * Perform the master password setup only
     */
    @Transactional
    public void performSetup(SetupRequest setupRequest) {
        if (isSetupCompleted()) {
            throw new IllegalStateException("Setup has already been completed");
        }

        // Validate passwords match
        if (!setupRequest.isMasterPasswordMatching()) {
            throw new IllegalArgumentException("Master passwords do not match");
        }

        // Generate salt and hash master password using custom secure hashing (no
        // BCrypt)
        String masterSalt = generateSalt();
        String hashedMasterPassword = hashPasswordSecurely(setupRequest.getMasterPassword(), masterSalt);

        // Save master password and salt
        systemConfigRepository.save(new SystemConfig(
                MASTER_PASSWORD_KEY,
                hashedMasterPassword,
                "Master password hash for user registration (PBKDF2 + SHA-512)"));

        systemConfigRepository.save(new SystemConfig(
                MASTER_SALT_KEY,
                masterSalt,
                "Salt for master password hashing"));

        // Mark setup as completed
        systemConfigRepository.save(new SystemConfig(
                SETUP_COMPLETED_KEY,
                "true",
                "Indicates if initial setup has been completed"));
    }

    /**
     * Custom secure password hashing that supports unlimited length
     * Uses PBKDF2 with SHA-512 instead of BCrypt to avoid 72-byte limitation
     */
    private String hashPasswordSecurely(String password, String salt) {
        try {
            // Use PBKDF2 with SHA-512 - supports unlimited password length
            javax.crypto.spec.PBEKeySpec spec = new javax.crypto.spec.PBEKeySpec(
                    password.toCharArray(),
                    salt.getBytes(StandardCharsets.UTF_8),
                    100000, // iterations
                    512); // key length in bits

            javax.crypto.SecretKeyFactory factory = javax.crypto.SecretKeyFactory.getInstance("PBKDF2WithHmacSHA512");
            byte[] hash = factory.generateSecret(spec).getEncoded();

            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException("Error hashing password", e);
        }
    }

    /**
     * Verify password against stored hash using the same secure method
     */
    public boolean verifyMasterPassword(String password) {
        var saltConfig = systemConfigRepository.findByConfigKey(MASTER_SALT_KEY);
        var passwordConfig = systemConfigRepository.findByConfigKey(MASTER_PASSWORD_KEY);

        if (saltConfig.isEmpty() || passwordConfig.isEmpty()) {
            return false;
        }

        String salt = saltConfig.get().getConfigValue();
        String storedHash = passwordConfig.get().getConfigValue();

        // Hash the provided password with the same method and compare
        String hashedPassword = hashPasswordSecurely(password, salt);
        return hashedPassword.equals(storedHash);
    }

    /**
     * Reset setup (for development/testing purposes)
     */
    @Transactional
    public void resetSetup() {
        systemConfigRepository.deleteAll();
        userRepository.deleteAll();
    }
}
