package com.isaaclins.homeserverexamplejava.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

/**
 * Enhanced password hashing service that supports unlimited password length
 * by using SHA-512 pre-hashing before BCrypt.
 * 
 * This approach was popularized by Dropbox and is considered secure:
 * https://dropbox.tech/security/how-dropbox-securely-stores-your-passwords
 */
@Service
public class PasswordHashingService {

    @Value("${app.security.pepper:default-pepper-change-in-production}")
    private String pepper;

    private final BCryptPasswordEncoder bcryptEncoder = new BCryptPasswordEncoder(12);

    /**
     * Hash a password using SHA-512 pre-hashing followed by BCrypt.
     * This allows unlimited password length while maintaining BCrypt's security
     * benefits.
     * 
     * @param password The plaintext password (can be any length)
     * @return The hashed password
     */
    public String hashPassword(String password) {
        try {
            // Pre-hash with SHA-512 to create fixed-length input for BCrypt
            String sha512Hash = sha512PreHash(password);

            // Apply BCrypt to the SHA-512 hash (always 88 characters)
            return bcryptEncoder.encode(sha512Hash);

        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-512 algorithm not available", e);
        }
    }

    /**
     * Hash a password with additional salt and pepper using SHA-512 pre-hashing.
     * Used for master password hashing with extra security layers.
     * 
     * @param password The plaintext password
     * @param salt     The salt to add
     * @return The hashed password
     */
    public String hashPasswordWithSaltAndPepper(String password, String salt) {
        try {
            // Create a combined input that includes password, pepper, and salt
            String combinedInput = password + ":" + pepper + ":" + salt;

            // Pre-hash the entire combined input with SHA-512
            // This ensures any length input becomes a fixed 88-character hash
            String sha512Hash = sha512PreHash(combinedInput);

            // Apply BCrypt to the SHA-512 hash (guaranteed to be within limits)
            return bcryptEncoder.encode(sha512Hash);

        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-512 algorithm not available", e);
        }
    }

    /**
     * Verify a password against a stored hash.
     * 
     * @param password       The plaintext password to verify
     * @param hashedPassword The stored hash
     * @return true if the password matches, false otherwise
     */
    public boolean verifyPassword(String password, String hashedPassword) {
        try {
            // Pre-hash the password with SHA-512
            String sha512Hash = sha512PreHash(password);

            // Verify against the BCrypt hash
            return bcryptEncoder.matches(sha512Hash, hashedPassword);

        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-512 algorithm not available", e);
        }
    }

    /**
     * Verify a password with salt and pepper against a stored hash.
     * 
     * @param password       The plaintext password to verify
     * @param salt           The salt used during hashing
     * @param hashedPassword The stored hash
     * @return true if the password matches, false otherwise
     */
    public boolean verifyPasswordWithSaltAndPepper(String password, String salt, String hashedPassword) {
        try {
            // Create the same combined input as during hashing
            String combinedInput = password + ":" + pepper + ":" + salt;

            // Pre-hash with SHA-512
            String sha512Hash = sha512PreHash(combinedInput);

            // Verify against the BCrypt hash
            return bcryptEncoder.matches(sha512Hash, hashedPassword);

        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-512 algorithm not available", e);
        }
    }

    /**
     * Pre-hash a password using SHA-512 to create a fixed-length input for BCrypt.
     * This ensures the input to BCrypt is always within its 72-byte limit while
     * allowing unlimited original password length.
     * 
     * @param password The password to pre-hash
     * @return Base64-encoded SHA-512 hash (always 88 characters, well within
     *         BCrypt's
     *         limit)
     */
    private String sha512PreHash(String password) throws NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-512");
        byte[] hashBytes = digest.digest(password.getBytes(StandardCharsets.UTF_8));

        // Base64 encode the hash (results in 88 characters, well within BCrypt's
        // 72-byte limit)
        return Base64.getEncoder().encodeToString(hashBytes);
    }
}
