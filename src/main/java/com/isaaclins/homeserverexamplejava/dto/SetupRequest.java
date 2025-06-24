package com.isaaclins.homeserverexamplejava.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class SetupRequest {

    @NotBlank(message = "Master password is required")
    @Size(min = 8, message = "Master password must be at least 8 characters")
    private String masterPassword;

    @NotBlank(message = "Master password confirmation is required")
    private String masterPasswordConfirmation;

    public SetupRequest() {
    }

    // Getters and Setters
    public String getMasterPassword() {
        return masterPassword;
    }

    public void setMasterPassword(String masterPassword) {
        this.masterPassword = masterPassword;
    }

    public String getMasterPasswordConfirmation() {
        return masterPasswordConfirmation;
    }

    public void setMasterPasswordConfirmation(String masterPasswordConfirmation) {
        this.masterPasswordConfirmation = masterPasswordConfirmation;
    }

    // Validation helper method
    public boolean isMasterPasswordMatching() {
        return masterPassword != null && masterPassword.equals(masterPasswordConfirmation);
    }

    // Additional validation to ensure password can be processed
    public boolean isPasswordLengthValid() {
        return masterPassword == null || masterPassword.length() <= 1000; // Reasonable limit
    }
}
