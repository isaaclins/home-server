package com.example.auth.config;

import com.example.auth.model.Role;
import com.example.auth.model.User;
import com.example.auth.repository.RoleRepository;
import com.example.auth.repository.UserRepository;
import com.example.auth.service.PasswordHashingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Set;
import java.util.UUID;

@Configuration
public class StartupSeeder {
    private static final Logger log = LoggerFactory.getLogger(StartupSeeder.class);

    @Bean
    CommandLineRunner seed(UserRepository userRepo, RoleRepository roleRepo, PasswordHashingService hashingService) {
        return args -> {
            Role adminRole = roleRepo.findByName("ROLE_ADMIN").orElseGet(() -> {
                Role r = new Role();
                r.setName("ROLE_ADMIN");
                return roleRepo.save(r);
            });

            String randomPwd = UUID.randomUUID().toString().substring(0, 12);

            User admin = userRepo.findByUsername("admin").orElse(null);
            if (admin == null) {
                admin = new User();
                admin.setUsername("admin");
                admin.setEnabled(true);
            }
            admin.setPasswordHash(hashingService.hashPassword(randomPwd));
            admin.setMustChangePwd(true);
            admin.setRoles(Set.of(adminRole));
            userRepo.save(admin);

            log.info("*********************************");
            log.info(" Super-admin login refreshed");
            log.info(" Username: admin");
            log.info(" Temporary Password: {}", randomPwd);
            log.info("*********************************");
        };
    }
}
