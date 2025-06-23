package com.isaaclins.homeserverexamplejava.controller;

import com.isaaclins.homeserverexamplejava.dto.SetupRequest;
import com.isaaclins.homeserverexamplejava.service.SetupService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/setup")
public class SetupController {

    @Autowired
    private SetupService setupService;

    /**
     * Display the setup page
     */
    @GetMapping
    public String showSetup(Model model) {
        // Redirect if setup is already completed
        if (setupService.isSetupCompleted()) {
            return "redirect:/register";
        }

        SetupRequest setupRequest = new SetupRequest();
        model.addAttribute("setupRequest", setupRequest);

        return "setup";
    }

    /**
     * Process the master password setup
     */
    @PostMapping
    public String processSetup(@Valid @ModelAttribute SetupRequest setupRequest,
            BindingResult bindingResult,
            Model model,
            RedirectAttributes redirectAttributes) {

        // Redirect if setup is already completed
        if (setupService.isSetupCompleted()) {
            return "redirect:/register";
        }

        // Validate master password
        if (!setupRequest.isMasterPasswordMatching()) {
            bindingResult.rejectValue("masterPasswordConfirmation", "error.password.mismatch",
                    "Passwords do not match");
        }

        if (bindingResult.hasErrors()) {
            return "setup";
        }

        try {
            // Perform the setup
            setupService.performSetup(setupRequest);

            redirectAttributes.addFlashAttribute("successMessage",
                    "Master password setup completed! Please register your first admin user.");
            return "redirect:/register?admin=true";

        } catch (IllegalArgumentException e) {
            model.addAttribute("error", e.getMessage());
            return "setup";
        } catch (Exception e) {
            model.addAttribute("error", "An error occurred during setup. Please try again.");
            return "setup";
        }
    }

    /**
     * Reset setup (for development purposes)
     */
    @PostMapping("/reset")
    public String resetSetup(RedirectAttributes redirectAttributes) {
        try {
            setupService.resetSetup();
            redirectAttributes.addFlashAttribute("successMessage", "Setup has been reset.");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Failed to reset setup.");
        }
        return "redirect:/setup";
    }
}
