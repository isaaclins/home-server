package com.isaaclins.homeserver.config;

import com.isaaclins.homeserver.entity.User;
import com.isaaclins.homeserver.service.UserService;
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

        // Ensure credentials are provided and satisfy basic validation
        if (username == null || username.isBlank() || username.length() < 3 ||
                email == null || email.isBlank() ||
                password == null || password.length() < 8) {
            // Missing or invalid credentials: skip creation to avoid validation errors
            return;
        }

        if (userService.existsByUsername(username) || userService.existsByEmail(email)) {
            return; // Admin already exists
        }

        User admin = new User();
        admin.setUsername(username);
        admin.setEmail(email);
        admin.setHashedPassword(password); // TODO: hash
        admin.setIsAdmin(true);
        userService.saveUser(admin);
    }
}
