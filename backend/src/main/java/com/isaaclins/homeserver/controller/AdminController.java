package com.isaaclins.homeserver.controller;

import com.isaaclins.homeserver.service.RegistrationCodeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final RegistrationCodeService codeService;

    @Autowired
    public AdminController(RegistrationCodeService codeService) {
        this.codeService = codeService;
    }

    /**
     * Generates a one-time registration code (valid for one minute).
     * Administrators must provide a secret in the X-Admin-Secret header that
     * matches the ADMIN_SECRET environment variable.
     */
    @PostMapping("/registration-codes/generate")
    public ResponseEntity<?> generateCode(@RequestHeader("X-Admin-Secret") String adminSecret) {
        String expectedSecret = System.getenv("ADMIN_SECRET");
        if (expectedSecret == null || !expectedSecret.equals(adminSecret)) {
            return ResponseEntity.status(403).body("Forbidden: invalid admin secret");
        }
        String code = codeService.generateCode();
        java.time.LocalDateTime expiresAt = java.time.LocalDateTime.now().plusMinutes(1);
        return ResponseEntity.ok(java.util.Map.of("code", code, "expiresAt", expiresAt.toString()));
    }

    @GetMapping("/registration-codes")
    public ResponseEntity<?> listCodes(@RequestHeader("X-Admin-Secret") String adminSecret) {
        String expectedSecret = System.getenv("ADMIN_SECRET");
        if (expectedSecret == null || !expectedSecret.equals(adminSecret)) {
            return ResponseEntity.status(403).body("Forbidden: invalid admin secret");
        }
        return ResponseEntity.ok(codeService.listActiveCodes());
    }
}
