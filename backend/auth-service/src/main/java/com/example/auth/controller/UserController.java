package com.example.auth.controller;

import com.example.auth.model.Role;
import com.example.auth.model.User;
import com.example.auth.repository.RoleRepository;
import com.example.auth.repository.UserRepository;
import com.example.auth.service.PasswordHashingService;
import jakarta.validation.Valid;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepo;
    private final RoleRepository roleRepo;
    private final PasswordHashingService hashingService;

    public UserController(UserRepository userRepo, RoleRepository roleRepo, PasswordHashingService hashingService) {
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
        this.hashingService = hashingService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserResponse> listUsers() {
        return userRepo.findAll().stream()
                .map(UserResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createUser(@Valid @RequestBody CreateUserRequest req) {
        if (userRepo.existsByUsername(req.getUsername())) {
            return ResponseEntity.status(409).body("Username already exists");
        }
        User user = new User();
        user.setUsername(req.getUsername());
        user.setPasswordHash(hashingService.hashPassword(req.getPassword()));
        user.setMustChangePwd(true);
        user.setEnabled(true);

        // Assign roles (if provided), default USER
        Set<Role> roles;
        if (req.getRoles() == null || req.getRoles().isEmpty()) {
            Role defaultRole = roleRepo.findByName("ROLE_USER").orElseGet(() -> {
                Role r = new Role();
                r.setName("ROLE_USER");
                return roleRepo.save(r);
            });
            roles = Set.of(defaultRole);
        } else {
            roles = req.getRoles().stream()
                    .map(roleName -> {
                        String effectiveName = roleName.startsWith("ROLE_") ? roleName : "ROLE_" + roleName;
                        return roleRepo.findByName(effectiveName).orElseGet(() -> {
                            Role r = new Role();
                            r.setName(effectiveName);
                            return roleRepo.save(r);
                        });
                    })
                    .collect(Collectors.toSet());
        }
        user.setRoles(roles);
        userRepo.save(user);
        return ResponseEntity.ok(UserResponse.fromEntity(user));
    }

    @PatchMapping("/{id}/enabled")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> setEnabled(@PathVariable Long id, @RequestBody EnableRequest req) {
        return userRepo.findById(id)
                .map(u -> {
                    u.setEnabled(req.isEnabled());
                    userRepo.save(u);
                    return ResponseEntity.ok(UserResponse.fromEntity(u));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /* DTO classes */

    @Data
    public static class CreateUserRequest {
        private String username;
        private String password;
        private Set<String> roles; // e.g. ["ADMIN", "USER"]
    }

    @Data
    public static class EnableRequest {
        private boolean enabled;
    }

    @Data
    public static class UserResponse {
        private Long id;
        private String username;
        private boolean enabled;
        private boolean mustChangePwd;
        private Set<String> roles;

        public static UserResponse fromEntity(User u) {
            UserResponse r = new UserResponse();
            r.setId(u.getId());
            r.setUsername(u.getUsername());
            r.setEnabled(u.isEnabled());
            r.setMustChangePwd(u.isMustChangePwd());
            r.setRoles(u.getRoles().stream().map(Role::getName).collect(Collectors.toSet()));
            return r;
        }
    }
}
