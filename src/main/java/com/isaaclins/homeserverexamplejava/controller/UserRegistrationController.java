package com.isaaclins.homeserverexamplejava.controller;

import com.isaaclins.homeserverexamplejava.dto.UserRegistrationRequest;
import com.isaaclins.homeserverexamplejava.entity.UserEntity;
import com.isaaclins.homeserverexamplejava.service.SetupService;
import com.isaaclins.homeserverexamplejava.service.UserRegistrationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/register")
public class UserRegistrationController {

    @Autowired
    private UserRegistrationService userRegistrationService;

    @Autowired
    private SetupService setupService;

    /**
     * Display the registration page
     */
    @GetMapping
    public String showRegistration(Model model,
            @RequestParam(defaultValue = "false") boolean admin) {

        // Redirect to setup if not completed
        if (!setupService.isSetupCompleted()) {
            return "redirect:/setup";
        }

        UserRegistrationRequest registrationRequest = new UserRegistrationRequest();

        // Set default role based on parameter and existing users
        if (admin || !userRegistrationService.hasAdminUsers()) {
            registrationRequest.setRole("ADMIN");
        } else {
            registrationRequest.setRole("USER");
        }

        model.addAttribute("registrationRequest", registrationRequest);
        model.addAttribute("isFirstAdmin", !userRegistrationService.hasAdminUsers());
        model.addAttribute("hasUsers", userRegistrationService.hasAnyUsers());

        return "register";
    }

    /**
     * Process user registration
     */
    @PostMapping
    public String processRegistration(@Valid @ModelAttribute UserRegistrationRequest registrationRequest,
            BindingResult bindingResult,
            Model model,
            RedirectAttributes redirectAttributes) {

        // Redirect to setup if not completed
        if (!setupService.isSetupCompleted()) {
            return "redirect:/setup";
        }

        // Validate password confirmation
        if (!registrationRequest.isPasswordMatching()) {
            bindingResult.rejectValue("passwordConfirmation", "error.password.mismatch",
                    "Passwords do not match");
        }

        if (bindingResult.hasErrors()) {
            model.addAttribute("isFirstAdmin", !userRegistrationService.hasAdminUsers());
            model.addAttribute("hasUsers", userRegistrationService.hasAnyUsers());
            return "register";
        }

        try {
            // Register the user
            UserEntity user = userRegistrationService.registerUser(registrationRequest);

            if (user.getRole() == UserEntity.Role.ADMIN) {
                redirectAttributes.addFlashAttribute("successMessage",
                        "Admin user '" + user.getUsername() + "' registered successfully! You can now log in.");
            } else {
                redirectAttributes.addFlashAttribute("successMessage",
                        "User '" + user.getUsername() + "' registered successfully!");
            }

            // If this was the first user or first admin, redirect to login
            if (user.getRole() == UserEntity.Role.ADMIN &&
                    userRegistrationService.findAdminCount() == 1) {
                return "redirect:/login";
            }

            // Otherwise, stay on registration page for more users
            return "redirect:/register";

        } catch (IllegalArgumentException e) {
            model.addAttribute("error", e.getMessage());
            model.addAttribute("isFirstAdmin", !userRegistrationService.hasAdminUsers());
            model.addAttribute("hasUsers", userRegistrationService.hasAnyUsers());
            return "register";
        } catch (Exception e) {
            model.addAttribute("error", "An error occurred during registration. Please try again.");
            model.addAttribute("isFirstAdmin", !userRegistrationService.hasAdminUsers());
            model.addAttribute("hasUsers", userRegistrationService.hasAnyUsers());
            return "register";
        }
    }
}
