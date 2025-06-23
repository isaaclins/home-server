package com.isaaclins.homeserverexamplejava.service;

import com.isaaclins.homeserverexamplejava.dto.LoginRequest;
import com.isaaclins.homeserverexamplejava.dto.LoginResponse;
import com.isaaclins.homeserverexamplejava.entity.UserEntity;
import com.isaaclins.homeserverexamplejava.repository.UserRepository;
import com.isaaclins.homeserverexamplejava.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    public LoginResponse authenticate(LoginRequest loginRequest) {
        try {
            Optional<UserEntity> userOpt = userRepository.findByUsernameAndEnabled(
                    loginRequest.getUsername(), true);

            if (userOpt.isEmpty()) {
                return new LoginResponse(false, "Invalid username or password");
            }

            UserEntity user = userOpt.get();

            // Check password (supports both SHA-256 for existing users and BCrypt for new
            // ones)
            if (!isPasswordValid(loginRequest.getPassword(), user.getPassword())) {
                return new LoginResponse(false, "Invalid username or password");
            }

            // Generate tokens
            String token = jwtUtils.generateJwtToken(user.getUsername(), user.getRole().name());
            String refreshToken = jwtUtils.generateRefreshToken(user.getUsername());

            log.info("User {} authenticated successfully", user.getUsername());

            return new LoginResponse(token, refreshToken, user.getUsername(), user.getRole().name());

        } catch (Exception e) {
            log.error("Authentication error for user {}: {}", loginRequest.getUsername(), e.getMessage());
            return new LoginResponse(false, "Authentication failed");
        }
    }

    private boolean isPasswordValid(String plainPassword, String hashedPassword) {
        // First try BCrypt (for new users)
        try {
            if (passwordEncoder.matches(plainPassword, hashedPassword)) {
                return true;
            }
        } catch (Exception e) {
            // If BCrypt fails, try SHA-256 (for compatibility with existing users)
        }

        // Try SHA-256 for backward compatibility
        try {
            String sha256Hash = sha256(plainPassword);
            return sha256Hash.equals(hashedPassword);
        } catch (Exception e) {
            log.error("Error validating password: {}", e.getMessage());
            return false;
        }
    }

    private String sha256(String input) throws NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hashBytes = digest.digest(input.getBytes());

        StringBuilder hexString = new StringBuilder();
        for (byte b : hashBytes) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) {
                hexString.append('0');
            }
            hexString.append(hex);
        }
        return hexString.toString();
    }

    public Optional<UserEntity> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public UserEntity createUser(String username, String email, String password, UserEntity.Role role) {
        UserEntity user = new UserEntity();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password)); // Use BCrypt for new users
        user.setRole(role);
        user.setEnabled(true);

        return userRepository.save(user);
    }

    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }
}
