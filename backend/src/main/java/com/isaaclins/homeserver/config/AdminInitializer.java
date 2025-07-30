package com.isaaclins.homeserver.config;

import com.isaaclins.homeserver.entity.User;
import com.isaaclins.homeserver.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Creates an initial administrator account if the appropriate environment
 * variables are supplied (INITIAL_ADMIN_USERNAME, INITIAL_ADMIN_EMAIL,
 * INITIAL_ADMIN_PASSWORD). This is executed once on application startup.
 */
@Component
public class AdminInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(AdminInitializer.class);
    private final UserService userService;

    @Autowired
    public AdminInitializer(UserService userService) {
        this.userService = userService;
    }

    @Override
    public void run(String... args) {
        String username = System.getenv("INITIAL_ADMIN_USERNAME");
        String email = System.getenv("INITIAL_ADMIN_EMAIL");
        String password = System.getenv("INITIAL_ADMIN_PASSWORD");

        logger.info("AdminInitializer: Checking for admin user creation...");
        logger.debug("AdminInitializer: username={}, email={}, password={}",
                username != null ? username : "null",
                email != null ? email : "null",
                password != null ? "***" : "null");

        // Ensure credentials are provided and satisfy basic validation
        if (username == null || username.isBlank() || username.length() < 3 ||
                email == null || email.isBlank() ||
                password == null || password.length() < 8) {
            logger.warn("AdminInitializer: Missing or invalid credentials - skipping admin creation");
            logger.debug("AdminInitializer: username.length={}, email.length={}, password.length={}",
                    username != null ? username.length() : 0,
                    email != null ? email.length() : 0,
                    password != null ? password.length() : 0);
            return;
        }

        if (userService.existsByUsername(username) || userService.existsByEmail(email)) {
            logger.info("AdminInitializer: Admin user already exists - skipping creation");
            return; // Admin already exists
        }

        try {
            User admin = new User();
            admin.setUsername(username);
            admin.setEmail(email);
            admin.setHashedPassword(password); // TODO: hash
            admin.setIsAdmin(true);
            userService.saveUser(admin);
            logger.info("AdminInitializer: Successfully created admin user: {}", username);
        } catch (Exception e) {
            logger.error("AdminInitializer: Failed to create admin user: {}", e.getMessage(), e);
        }
    }
}
