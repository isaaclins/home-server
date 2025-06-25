package com.example.auth.controller;

import com.example.auth.model.UsageRecord;
import com.example.auth.repository.UsageRecordRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/usage")
public class UsageController {

    private final UsageRecordRepository usageRepo;

    public UsageController(UsageRecordRepository usageRepo) {
        this.usageRepo = usageRepo;
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public List<UsageRecord> listAll() {
        return usageRepo.findAll();
    }
}
