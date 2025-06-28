package com.isaaclins.homeserver.service;

import com.isaaclins.homeserver.entity.RegistrationCode;
import com.isaaclins.homeserver.repository.RegistrationCodeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Random;

@Service
public class RegistrationCodeService {

    private final RegistrationCodeRepository codeRepository;
    private final Random random = new Random();

    @Autowired
    public RegistrationCodeService(RegistrationCodeRepository codeRepository) {
        this.codeRepository = codeRepository;
    }

    /**
     * Generates a new numeric code valid for one minute and stores it in the
     * database.
     *
     * @return the generated code
     */
    public String generateCode() {
        String code = String.format("%06d", random.nextInt(1_000_000));
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(1);
        codeRepository.save(new RegistrationCode(code, expiresAt));
        return code;
    }

    /**
     * Validates and consumes a code. If the code exists and is not expired it will
     * be removed from the database and the method returns true.
     */
    public boolean consumeCode(String code) {
        Optional<RegistrationCode> optional = codeRepository.findByCode(code);
        if (optional.isEmpty()) {
            return false;
        }
        RegistrationCode registrationCode = optional.get();
        if (registrationCode.isExpired()) {
            // Clean up expired code
            codeRepository.delete(registrationCode);
            return false;
        }
        // Valid code, consume it
        codeRepository.delete(registrationCode);
        return true;
    }

    /**
     * Periodic cleanup (optional) but can be called to delete expired codes.
     */
    public void purgeExpiredCodes() {
        codeRepository.findAll().stream()
                .filter(RegistrationCode::isExpired)
                .forEach(codeRepository::delete);
    }

    public java.util.List<RegistrationCode> listActiveCodes() {
        purgeExpiredCodes();
        return codeRepository.findAll();
    }
}
