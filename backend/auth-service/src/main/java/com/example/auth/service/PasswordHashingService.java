package com.example.auth.service;

import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

@Service
public class PasswordHashingService {
    public String hashPassword(String rawPassword) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-512");
            byte[] sha = md.digest(rawPassword.getBytes(StandardCharsets.UTF_8));
            String shaHex = bytesToHex(sha);
            return BCrypt.hashpw(shaHex, BCrypt.gensalt());
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-512 not available", e);
        }
    }

    public boolean matches(String rawPassword, String storedHash) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-512");
            byte[] sha = md.digest(rawPassword.getBytes(StandardCharsets.UTF_8));
            String shaHex = bytesToHex(sha);
            return BCrypt.checkpw(shaHex, storedHash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-512 not available", e);
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
