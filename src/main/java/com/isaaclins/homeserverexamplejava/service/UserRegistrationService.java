package com.isaaclins.homeserverexamplejava.service;

import com.isaaclins.homeserverexamplejava.dto.UserRegistrationRequest;
import com.isaaclins.homeserverexamplejava.entity.UserEntity;
import com.isaaclins.homeserverexamplejava.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserRegistrationService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SetupService setupService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Register a new user with master password verification
     */
    @Transactional
    public UserEntity registerUser(UserRegistrationRequest request) {
        // Verify master password
        if (!setupService.verifyMasterPassword(request.getMasterPassword())) {
            throw new IllegalArgumentException("Invalid master password");
        }

        // Validate passwords match
        if (!request.isPasswordMatching()) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        // Check if username already exists
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already exists");
        }

        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }

        // Create new user
        UserEntity user = new UserEntity();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        // Set role based on request, default to USER
        try {
            user.setRole(UserEntity.Role.valueOf(request.getRole().toUpperCase()));
        } catch (IllegalArgumentException e) {
            user.setRole(UserEntity.Role.USER);
        }

        user.setEnabled(true);

        return userRepository.save(user);
    }

    /**
     * Check if any users exist in the system
     */
    public boolean hasAnyUsers() {
        return userRepository.count() > 0;
    }

    /**
     * Check if any admin users exist in the system
     */
    public boolean hasAdminUsers() {
        return userRepository.findByRole(UserEntity.Role.ADMIN).size() > 0;
    }

    /**
     * Get the count of admin users in the system
     */
    public long findAdminCount() {
        return userRepository.findByRole(UserEntity.Role.ADMIN).size();
    }
}
