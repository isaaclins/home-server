package com.isaaclins.homeserver;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Basic smoke test to verify the Spring Boot application context loads correctly.
 * This test ensures the application can start without errors.
 */
@SpringBootTest
@ActiveProfiles("test")
class BackendApplicationTest {

    /**
     * Test that verifies the Spring application context loads successfully.
     * This is a smoke test - if the context fails to load, the test will fail.
     */
    @Test
    void contextLoads() {
        // This test will pass if the application context loads successfully
        // Spring Boot will automatically fail the test if context loading fails
    }
}