package com.isaaclins.homeserverexamplejava.service;

import com.isaaclins.homeserverexamplejava.dto.SetupRequest;
import com.isaaclins.homeserverexamplejava.entity.SystemConfig;
import com.isaaclins.homeserverexamplejava.repository.SystemConfigRepository;
import com.isaaclins.homeserverexamplejava.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;

@Service
public class SetupService {

    private static final String SETUP_COMPLETED_KEY = "setup.completed";
    private static final String MASTER_PASSWORD_KEY = "security.master.password";
    private static final String MASTER_SALT_KEY = "security.master.salt";

    @Autowired
    private SystemConfigRepository systemConfigRepository;

    @Autowired
    private UserRepository userRepository;

    @Value("${app.security.pepper:default-pepper-change-in-production}")
    private String pepper;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder(12);
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
     * Hash password with salt and pepper
     */
    private String hashPasswordWithSaltAndPepper(String password, String salt) {
        String pepperedPassword = password + pepper + salt;
        return passwordEncoder.encode(pepperedPassword);
    }

    /**
     * Verify password against stored hash
     */
    public boolean verifyMasterPassword(String password) {
        var saltConfig = systemConfigRepository.findByConfigKey(MASTER_SALT_KEY);
        var passwordConfig = systemConfigRepository.findByConfigKey(MASTER_PASSWORD_KEY);

        if (saltConfig.isEmpty() || passwordConfig.isEmpty()) {
            return false;
        }

        String salt = saltConfig.get().getConfigValue();
        String storedHash = passwordConfig.get().getConfigValue();
        String pepperedPassword = password + pepper + salt;

        return passwordEncoder.matches(pepperedPassword, storedHash);
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

        // Generate salt and hash master password
        String masterSalt = generateSalt();
        String hashedMasterPassword = hashPasswordWithSaltAndPepper(setupRequest.getMasterPassword(), masterSalt);

        // Save master password and salt
        systemConfigRepository.save(new SystemConfig(
                MASTER_PASSWORD_KEY,
                hashedMasterPassword,
                "Master password hash for user registration"));

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
     * Reset setup (for development/testing purposes)
     */
    @Transactional
    public void resetSetup() {
        systemConfigRepository.deleteAll();
        userRepository.deleteAll();
    }
}
