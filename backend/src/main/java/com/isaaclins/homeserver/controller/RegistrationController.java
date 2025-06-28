package com.isaaclins.homeserver.controller;

import com.isaaclins.homeserver.entity.User;
import com.isaaclins.homeserver.service.RegistrationCodeService;
import com.isaaclins.homeserver.service.UserService;
import jakarta.validation.Valid;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class RegistrationController {

    private final UserService userService;
    private final RegistrationCodeService codeService;

    @Autowired
    public RegistrationController(UserService userService, RegistrationCodeService codeService) {
        this.userService = userService;
        this.codeService = codeService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegistrationRequest request,
            BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            return ResponseEntity.badRequest().body("Invalid input");
        }

        // Validate one-time code
        if (!codeService.consumeCode(request.getCode())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid or expired code");
        }

        // Check duplicates
        if (userService.existsByUsername(request.getUsername())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Username already exists");
        }
        if (userService.existsByEmail(request.getEmail())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Email already exists");
        }

        User newUser = new User();
        newUser.setUsername(request.getUsername());
        newUser.setEmail(request.getEmail());
        newUser.setHashedPassword(request.getPassword()); // TODO: hash password later
        newUser.setIsAdmin(false);

        User saved = userService.saveUser(newUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @Data
    public static class RegistrationRequest {
        private String username;
        private String email;
        private String password;
        private String code;
    }
}
