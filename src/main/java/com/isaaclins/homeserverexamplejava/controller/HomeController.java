package com.isaaclins.homeserverexamplejava.controller;

import com.isaaclins.homeserverexamplejava.service.SetupService;
import com.isaaclins.homeserverexamplejava.service.UserRegistrationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
@RequiredArgsConstructor
@Slf4j
public class HomeController {

    private final SetupService setupService;
    private final UserRegistrationService userRegistrationService;

    @GetMapping("/")
    public String home() {
        if (!setupService.isSetupCompleted()) {
            return "redirect:/setup";
        }

        if (!userRegistrationService.hasAnyUsers()) {
            return "redirect:/register?admin=true";
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
            return "redirect:/services";
        }
        return "redirect:/login";
    }

    @GetMapping("/login")
    public String login() {
        if (!setupService.isSetupCompleted()) {
            return "redirect:/setup";
        }

        if (!userRegistrationService.hasAnyUsers()) {
            return "redirect:/register?admin=true";
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
            return "redirect:/services";
        }
        return "login";
    }

    @GetMapping("/services")
    public String services(Model model) {
        if (!setupService.isSetupCompleted()) {
            return "redirect:/setup";
        }

        if (!userRegistrationService.hasAnyUsers()) {
            return "redirect:/register?admin=true";
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return "redirect:/login";
        }

        String username = auth.getName();
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(grantedAuthority -> grantedAuthority.getAuthority().equals("ROLE_ADMIN"));

        model.addAttribute("username", username);
        model.addAttribute("isAdmin", isAdmin);

        return "services";
    }

    @GetMapping("/ollama-chat")
    public String ollamaChat(Model model) {
        if (!setupService.isSetupCompleted()) {
            return "redirect:/setup";
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return "redirect:/login";
        }

        model.addAttribute("username", auth.getName());
        return "ollama-chat";
    }

    @GetMapping("/gitea-repos")
    public String giteaRepos(Model model) {
        if (!setupService.isSetupCompleted()) {
            return "redirect:/setup";
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return "redirect:/login";
        }

        model.addAttribute("username", auth.getName());
        return "gitea-repos";
    }

    @GetMapping("/admin/terminal")
    public String adminTerminal(Model model) {
        if (!setupService.isSetupCompleted()) {
            return "redirect:/setup";
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return "redirect:/login";
        }

        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(grantedAuthority -> grantedAuthority.getAuthority().equals("ROLE_ADMIN"));

        if (!isAdmin) {
            return "redirect:/services";
        }

        model.addAttribute("username", auth.getName());
        return "admin-terminal";
    }

    @GetMapping("/admin/logs")
    public String adminLogs(Model model) {
        if (!setupService.isSetupCompleted()) {
            return "redirect:/setup";
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return "redirect:/login";
        }

        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(grantedAuthority -> grantedAuthority.getAuthority().equals("ROLE_ADMIN"));

        if (!isAdmin) {
            return "redirect:/services";
        }

        model.addAttribute("username", auth.getName());
        return "admin-logs";
    }
}
